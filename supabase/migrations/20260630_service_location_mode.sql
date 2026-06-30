-- Let each service decide whether public bookings require a client address.

alter table public.tenant_settings
add column if not exists comes_to_client boolean not null default true;

drop function if exists public.get_tenant_settings();

create or replace function public.get_tenant_settings()
returns table (
  tenant_id uuid,
  comes_to_client boolean,
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
    tenant_settings.comes_to_client,
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

drop function if exists public.update_tenant_settings(
  text,
  text,
  text,
  text,
  text,
  public.vehicle_type[]
);

create or replace function public.update_tenant_settings(
  p_company_name text default null,
  p_company_address text default null,
  p_company_phone text default null,
  p_currency text default 'RSD',
  p_app_language text default 'sr',
  p_vehicle_types public.vehicle_type[] default array['bike', 'moto', 'scooter']::public.vehicle_type[],
  p_comes_to_client boolean default true
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
    comes_to_client,
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
    coalesce(p_comes_to_client, true),
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
    comes_to_client = excluded.comes_to_client,
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
  public.vehicle_type[],
  boolean
) to authenticated;

drop function if exists public.get_public_tenant_by_slug(text);

create or replace function public.get_public_tenant_by_slug(p_public_slug text)
returns table (
  id uuid,
  name text,
  public_slug text,
  comes_to_client boolean,
  vehicle_types public.vehicle_type[]
) as $$
  select
    tenants.id,
    tenants.name,
    tenants.public_slug,
    coalesce(tenant_settings.comes_to_client, true) as comes_to_client,
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
