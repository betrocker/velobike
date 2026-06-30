-- Public client booking support for the multi-tenant SaaS model.
-- Run this in Supabase SQL editor before using the client booking flow.

alter table public.tenants
  add column if not exists public_slug text unique,
  add column if not exists booking_enabled boolean not null default true;

create or replace function public.slugify_tenant_name(input text)
returns text as $$
declare
  slug text;
begin
  slug := lower(coalesce(input, 'service'));
  slug := regexp_replace(slug, '[^a-z0-9]+', '-', 'g');
  slug := regexp_replace(slug, '(^-|-$)', '', 'g');

  if slug = '' then
    slug := 'service';
  end if;

  return slug;
end;
$$ language plpgsql immutable;

create or replace function public.generate_tenant_public_slug(input text)
returns text as $$
declare
  base_slug text;
  candidate_slug text;
begin
  base_slug := public.slugify_tenant_name(input);

  loop
    candidate_slug := base_slug || '-' || substring(md5(random()::text) from 1 for 4);

    exit when not exists (
      select 1
      from public.tenants
      where public_slug = candidate_slug
    );
  end loop;

  return candidate_slug;
end;
$$ language plpgsql volatile security definer set search_path = public;

update public.tenants
set public_slug = public.generate_tenant_public_slug(name)
where public_slug is null;

alter table public.tenants
  alter column public_slug set not null;

create table if not exists public.booking_requests (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.tenants on delete cascade not null,
  client_name text not null,
  client_phone text not null,
  vehicle public.vehicle_type not null,
  problem_description text,
  preferred_date date,
  status text not null default 'new',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.booking_requests enable row level security;

drop policy if exists "Admins and staff can read own tenant booking requests"
on public.booking_requests;

create policy "Admins and staff can read own tenant booking requests"
on public.booking_requests
for select
to authenticated
using (
  tenant_id in (
    select tenant_id
    from public.profiles
    where profiles.id = auth.uid()
  )
);

drop policy if exists "Admins can update own tenant booking requests"
on public.booking_requests;

create policy "Admins can update own tenant booking requests"
on public.booking_requests
for update
to authenticated
using (
  tenant_id in (
    select tenant_id
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  tenant_id in (
    select tenant_id
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create or replace function public.get_public_tenant_by_slug(p_public_slug text)
returns table (
  id uuid,
  name text,
  public_slug text
) as $$
  select tenants.id, tenants.name, tenants.public_slug
  from public.tenants
  where tenants.public_slug = p_public_slug
    and tenants.booking_enabled = true
  limit 1;
$$ language sql stable security definer set search_path = public;

grant execute on function public.get_public_tenant_by_slug(text) to anon, authenticated;

create or replace function public.list_public_tenants()
returns table (
  id uuid,
  name text,
  public_slug text
) as $$
  select tenants.id, tenants.name, tenants.public_slug
  from public.tenants
  where tenants.booking_enabled = true
  order by tenants.name asc;
$$ language sql stable security definer set search_path = public;

grant execute on function public.list_public_tenants() to anon, authenticated;

create or replace function public.create_booking_request(
  p_public_slug text,
  p_client_name text,
  p_client_phone text,
  p_vehicle public.vehicle_type,
  p_problem_description text default null,
  p_preferred_date date default null
)
returns uuid as $$
declare
  target_tenant_id uuid;
  new_request_id uuid;
begin
  select id into target_tenant_id
  from public.tenants
  where public_slug = p_public_slug
    and booking_enabled = true;

  if target_tenant_id is null then
    raise exception 'Servis nije pronađen ili zakazivanje nije uključeno.';
  end if;

  insert into public.booking_requests (
    tenant_id,
    client_name,
    client_phone,
    vehicle,
    problem_description,
    preferred_date
  )
  values (
    target_tenant_id,
    trim(p_client_name),
    trim(p_client_phone),
    p_vehicle,
    nullif(trim(coalesce(p_problem_description, '')), ''),
    p_preferred_date
  )
  returning id into new_request_id;

  return new_request_id;
end;
$$ language plpgsql volatile security definer set search_path = public;

grant execute on function public.create_booking_request(
  text,
  text,
  text,
  public.vehicle_type,
  text,
  date
) to anon, authenticated;

create or replace function public.convert_booking_request_to_job(p_booking_request_id uuid)
returns uuid as $$
declare
  request_row public.booking_requests%rowtype;
  caller_profile public.profiles%rowtype;
  new_job_id uuid;
begin
  select * into caller_profile
  from public.profiles
  where id = auth.uid();

  if caller_profile.id is null or caller_profile.role <> 'admin' then
    raise exception 'Samo admin može da potvrdi zahtev za servis.';
  end if;

  select * into request_row
  from public.booking_requests
  where id = p_booking_request_id
    and tenant_id = caller_profile.tenant_id
    and status = 'new';

  if request_row.id is null then
    raise exception 'Zahtev nije pronađen ili je već obrađen.';
  end if;

  insert into public.jobs (
    tenant_id,
    client_name,
    client_phone,
    vehicle,
    status
  )
  values (
    request_row.tenant_id,
    request_row.client_name,
    request_row.client_phone,
    request_row.vehicle,
    'na_cekanju'
  )
  returning id into new_job_id;

  update public.booking_requests
  set status = 'converted'
  where id = request_row.id;

  return new_job_id;
end;
$$ language plpgsql volatile security definer set search_path = public;

grant execute on function public.convert_booking_request_to_job(uuid) to authenticated;

create or replace function public.handle_new_user_tenant()
returns trigger as $$
declare
  new_tenant_id uuid;
  company_name text;
  is_creating_tenant boolean;
  target_invite_code text;
  generated_code text;
begin
  company_name := new.raw_user_meta_data->>'company_name';
  is_creating_tenant := (new.raw_user_meta_data->>'is_creating_tenant')::boolean;
  target_invite_code := new.raw_user_meta_data->>'invite_code';

  if is_creating_tenant = true then
    generated_code := 'ET-' || substring(md5(random()::text) from 1 for 4);

    insert into public.tenants (name, invite_code, public_slug)
    values (
      coalesce(company_name, 'Moj Servis'),
      upper(generated_code),
      public.generate_tenant_public_slug(coalesce(company_name, 'Moj Servis'))
    )
    returning id into new_tenant_id;

    insert into public.profiles (id, tenant_id, role, full_name)
    values (new.id, new_tenant_id, 'admin', new.raw_user_meta_data->>'full_name');
  else
    select id into new_tenant_id
    from public.tenants
    where invite_code = upper(target_invite_code);

    if new_tenant_id is null then
      raise exception 'Uneti kod servisa nije validan.';
    end if;

    insert into public.profiles (id, tenant_id, role, full_name)
    values (new.id, new_tenant_id, 'staff', new.raw_user_meta_data->>'full_name');
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
