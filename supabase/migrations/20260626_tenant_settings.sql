-- Tenant-level service settings used by admin settings and public booking.

create table if not exists public.tenant_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  company_name text,
  company_address text,
  company_phone text,
  currency text not null default 'RSD' check (currency in ('RSD', 'EUR', 'BAM')),
  app_language text not null default 'sr' check (app_language in ('sr', 'en')),
  vehicle_types public.vehicle_type[] not null default array['bike', 'moto', 'scooter']::public.vehicle_type[],
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

insert into public.tenant_settings (tenant_id, company_name)
select tenants.id, tenants.name
from public.tenants
on conflict (tenant_id) do nothing;

alter table public.tenant_settings enable row level security;

drop policy if exists "Tenant members can read tenant settings"
on public.tenant_settings;

create policy "Tenant members can read tenant settings"
on public.tenant_settings
for select
to authenticated
using (
  tenant_id in (
    select tenant_id
    from public.profiles
    where profiles.id = auth.uid()
  )
);

drop policy if exists "Admins can write tenant settings"
on public.tenant_settings;

create policy "Admins can write tenant settings"
on public.tenant_settings
for all
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

create or replace function public.get_tenant_settings()
returns table (
  tenant_id uuid,
  company_name text,
  company_address text,
  company_phone text,
  currency text,
  app_language text,
  vehicle_types public.vehicle_type[],
  updated_at timestamp with time zone
) as $$
declare
  caller_profile public.profiles%rowtype;
begin
  select * into caller_profile
  from public.profiles
  where profiles.id = auth.uid();

  if caller_profile.id is null then
    raise exception 'Korisnik nije povezan sa servisom.';
  end if;

  insert into public.tenant_settings (tenant_id, company_name)
  select tenants.id, tenants.name
  from public.tenants
  where tenants.id = caller_profile.tenant_id
  on conflict on constraint tenant_settings_pkey do nothing;

  return query
  select
    tenant_settings.tenant_id,
    tenant_settings.company_name,
    tenant_settings.company_address,
    tenant_settings.company_phone,
    tenant_settings.currency,
    tenant_settings.app_language,
    tenant_settings.vehicle_types,
    tenant_settings.updated_at
  from public.tenant_settings
  where tenant_settings.tenant_id = caller_profile.tenant_id;
end;
$$ language plpgsql volatile security definer set search_path = public;

grant execute on function public.get_tenant_settings() to authenticated;

create or replace function public.update_tenant_settings(
  p_company_name text default null,
  p_company_address text default null,
  p_company_phone text default null,
  p_currency text default 'RSD',
  p_app_language text default 'sr',
  p_vehicle_types public.vehicle_type[] default array['bike', 'moto', 'scooter']::public.vehicle_type[]
)
returns public.tenant_settings as $$
declare
  caller_profile public.profiles%rowtype;
  updated_settings public.tenant_settings%rowtype;
  normalized_company_name text;
  normalized_vehicle_types public.vehicle_type[];
begin
  select * into caller_profile
  from public.profiles
  where profiles.id = auth.uid();

  if caller_profile.id is null or caller_profile.role <> 'admin' then
    raise exception 'Samo admin može da menja podešavanja servisa.';
  end if;

  normalized_company_name := nullif(trim(coalesce(p_company_name, '')), '');
  normalized_vehicle_types := coalesce(p_vehicle_types, array[]::public.vehicle_type[]);

  if array_length(normalized_vehicle_types, 1) is null then
    raise exception 'Izaberi bar jedan tip vozila.';
  end if;

  insert into public.tenant_settings (
    tenant_id,
    company_name,
    company_address,
    company_phone,
    currency,
    app_language,
    vehicle_types,
    updated_at
  )
  values (
    caller_profile.tenant_id,
    normalized_company_name,
    nullif(trim(coalesce(p_company_address, '')), ''),
    nullif(trim(coalesce(p_company_phone, '')), ''),
    p_currency,
    p_app_language,
    normalized_vehicle_types,
    timezone('utc'::text, now())
  )
  on conflict on constraint tenant_settings_pkey do update
  set
    company_name = excluded.company_name,
    company_address = excluded.company_address,
    company_phone = excluded.company_phone,
    currency = excluded.currency,
    app_language = excluded.app_language,
    vehicle_types = excluded.vehicle_types,
    updated_at = excluded.updated_at
  returning * into updated_settings;

  if normalized_company_name is not null then
    update public.tenants
    set name = normalized_company_name
    where id = caller_profile.tenant_id;
  end if;

  return updated_settings;
end;
$$ language plpgsql volatile security definer set search_path = public;

grant execute on function public.update_tenant_settings(
  text,
  text,
  text,
  text,
  text,
  public.vehicle_type[]
) to authenticated;

drop function if exists public.get_public_tenant_by_slug(text);

create or replace function public.get_public_tenant_by_slug(p_public_slug text)
returns table (
  id uuid,
  name text,
  public_slug text,
  vehicle_types public.vehicle_type[]
) as $$
  select
    tenants.id,
    tenants.name,
    tenants.public_slug,
    coalesce(
      tenant_settings.vehicle_types,
      array['bike', 'moto', 'scooter']::public.vehicle_type[]
    ) as vehicle_types
  from public.tenants
  left join public.tenant_settings
    on tenant_settings.tenant_id = tenants.id
  where tenants.public_slug = p_public_slug
    and tenants.booking_enabled = true
  limit 1;
$$ language sql stable security definer set search_path = public;

grant execute on function public.get_public_tenant_by_slug(text) to anon, authenticated;

drop function if exists public.create_booking_request(
  text,
  text,
  text,
  public.vehicle_type,
  text,
  date
);

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
  allowed_vehicle_types public.vehicle_type[];
  new_request_id uuid;
begin
  select
    tenants.id,
    coalesce(
      tenant_settings.vehicle_types,
      array['bike', 'moto', 'scooter']::public.vehicle_type[]
    )
  into target_tenant_id, allowed_vehicle_types
  from public.tenants
  left join public.tenant_settings
    on tenant_settings.tenant_id = tenants.id
  where tenants.public_slug = p_public_slug
    and tenants.booking_enabled = true;

  if target_tenant_id is null then
    raise exception 'Servis nije pronađen ili zakazivanje nije uključeno.';
  end if;

  if not (p_vehicle = any(allowed_vehicle_types)) then
    raise exception 'Servis ne prima izabrani tip vozila.';
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

    insert into public.tenant_settings (tenant_id, company_name)
    values (new_tenant_id, coalesce(company_name, 'Moj Servis'));

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
