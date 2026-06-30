-- Let service admins change the team invite code.

create unique index if not exists tenants_invite_code_unique_idx
on public.tenants (invite_code);

create or replace function public.update_tenant_invite_code(p_invite_code text)
returns public.tenants as $$
declare
  caller_profile public.profiles%rowtype;
  normalized_invite_code text;
  updated_tenant public.tenants%rowtype;
begin
  select * into caller_profile
  from public.profiles
  where profiles.id = auth.uid();

  if caller_profile.id is null or caller_profile.role <> 'admin' then
    raise exception 'Samo admin može da menja kod za tim.';
  end if;

  normalized_invite_code := upper(trim(coalesce(p_invite_code, '')));

  if normalized_invite_code !~ '^[A-Z0-9-]{4,24}$' then
    raise exception 'Kod mora imati 4-24 karaktera i može sadržati slova, brojeve i crticu.';
  end if;

  if exists (
    select 1
    from public.tenants
    where tenants.invite_code = normalized_invite_code
      and tenants.id <> caller_profile.tenant_id
  ) then
    raise exception 'Ovaj kod već koristi drugi servis.';
  end if;

  update public.tenants
  set invite_code = normalized_invite_code
  where tenants.id = caller_profile.tenant_id
  returning * into updated_tenant;

  return updated_tenant;
end;
$$ language plpgsql volatile security definer set search_path = public;

grant execute on function public.update_tenant_invite_code(text) to authenticated;
