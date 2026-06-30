-- Assign service jobs to a team member from the same tenant.

alter table public.jobs
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null;

create index if not exists jobs_assigned_to_idx
on public.jobs (assigned_to);

create or replace function public.get_tenant_jobs()
returns table (
  id uuid,
  tenant_id uuid,
  client_name text,
  client_phone text,
  vehicle public.vehicle_type,
  status text,
  total_amount numeric,
  paid_amount numeric,
  debt_amount numeric,
  assigned_to uuid,
  created_at timestamp with time zone
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

  return query
  select
    jobs.id,
    jobs.tenant_id,
    jobs.client_name,
    jobs.client_phone,
    jobs.vehicle,
    jobs.status,
    jobs.total_amount,
    jobs.paid_amount,
    jobs.debt_amount,
    jobs.assigned_to,
    jobs.created_at
  from public.jobs
  where jobs.tenant_id = caller_profile.tenant_id
  order by jobs.created_at desc;
end;
$$ language plpgsql stable security definer set search_path = public;

grant execute on function public.get_tenant_jobs() to authenticated;

create or replace function public.get_tenant_team_members()
returns table (
  id uuid,
  tenant_id uuid,
  role public.user_role,
  full_name text,
  created_at timestamp with time zone
) as $$
declare
  caller_profile public.profiles%rowtype;
begin
  select * into caller_profile
  from public.profiles
  where profiles.id = auth.uid();

  if caller_profile.id is null or caller_profile.role <> 'admin' then
    raise exception 'Samo admin može da vidi članove tima.';
  end if;

  return query
  select
    profiles.id,
    profiles.tenant_id,
    profiles.role,
    profiles.full_name,
    profiles.created_at
  from public.profiles
  where profiles.tenant_id = caller_profile.tenant_id
  order by profiles.role asc, profiles.full_name asc nulls last;
end;
$$ language plpgsql stable security definer set search_path = public;

grant execute on function public.get_tenant_team_members() to authenticated;

create or replace function public.assign_job_to_team_member(
  p_job_id uuid,
  p_assigned_to uuid default null
)
returns public.jobs as $$
declare
  caller_profile public.profiles%rowtype;
  assignee_profile public.profiles%rowtype;
  updated_job public.jobs%rowtype;
begin
  select * into caller_profile
  from public.profiles
  where id = auth.uid();

  if caller_profile.id is null or caller_profile.role <> 'admin' then
    raise exception 'Samo admin može da dodeljuje poslove.';
  end if;

  if p_assigned_to is not null then
    select * into assignee_profile
    from public.profiles
    where id = p_assigned_to
      and tenant_id = caller_profile.tenant_id;

    if assignee_profile.id is null then
      raise exception 'Član tima nije pronađen u ovom servisu.';
    end if;
  end if;

  update public.jobs
  set assigned_to = p_assigned_to
  where id = p_job_id
    and tenant_id = caller_profile.tenant_id
  returning * into updated_job;

  if updated_job.id is null then
    raise exception 'Posao nije pronađen.';
  end if;

  return updated_job;
end;
$$ language plpgsql volatile security definer set search_path = public;

grant execute on function public.assign_job_to_team_member(uuid, uuid) to authenticated;
