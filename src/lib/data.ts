import type { User } from '@supabase/supabase-js';

import type { Database, Inserts, Tables, Updates } from './database.types';
import { supabase } from './supabase';

export type VehicleType = Database['public']['Enums']['vehicle_type'];
export type UserRole = Database['public']['Enums']['user_role'];

export type Tenant = Tables<'tenants'>;
export type TenantSettings = Tables<'tenant_settings'>;
export type Profile = Tables<'profiles'>;
export type Zone = Tables<'zones'>;
export type ServiceCatalogItem = Tables<'service_catalog'>;
export type InventoryItem = Tables<'inventory'>;
export type Job = Tables<'jobs'>;
export type JobItem = Tables<'job_items'>;
export type JobPart = Tables<'job_parts'>;
export type BookingRequest = Tables<'booking_requests'>;

export type PublicTenant = {
  comes_to_client?: boolean;
  id: string;
  name: string;
  public_slug: string;
  vehicle_types?: VehicleType[];
};

export type TenantContext = {
  user: User;
  profile: Profile;
  tenant: Tenant;
};

export type AssignedJob = Job & {
  assignee: Profile | null;
};

export type CreateJobInput = {
  clientName: string;
  clientPhone?: string | null;
  assignedTo?: string | null;
  vehicle: VehicleType;
  status?: string;
  totalAmount?: number;
  paidAmount?: number;
};

export type CreateServiceInput = {
  zoneId: string;
  name: string;
  basePrice?: number;
};

export type CreateInventoryItemInput = {
  name: string;
  price?: number;
  stockQuantity?: number;
};

export type CreateBookingRequestInput = {
  publicSlug: string;
  clientName: string;
  clientPhone: string;
  vehicle: VehicleType;
  problemDescription?: string | null;
  preferredDate?: string | null;
};

export type TenantSettingsInput = {
  appLanguage: string;
  comesToClient: boolean;
  companyAddress?: string | null;
  companyName?: string | null;
  companyPhone?: string | null;
  currency: string;
  vehicleTypes: VehicleType[];
};

function getDebtAmount(totalAmount = 0, paidAmount = 0) {
  return Math.max(totalAmount - paidAmount, 0);
}

export function getBookingUrl(publicSlug: string) {
  const baseUrl = process.env.EXPO_PUBLIC_BOOKING_BASE_URL ?? 'https://velobike.app';

  return `${baseUrl.replace(/\/$/, '')}/book/${publicSlug}`;
}

export class MissingProfileError extends Error {
  constructor() {
    super('No profile row exists for the current auth user.');
    this.name = 'MissingProfileError';
  }
}

export class MissingTenantError extends Error {
  constructor() {
    super('No tenant row exists for the current profile.');
    this.name = 'MissingTenantError';
  }
}

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (error.name === 'AuthSessionMissingError' || error.message === 'Auth session missing!') {
      return null;
    }

    throw error;
  }

  return data.user;
}

export async function getCurrentTenantContext(): Promise<TenantContext | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    throw new MissingProfileError();
  }

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', profile.tenant_id)
    .maybeSingle();

  if (tenantError) {
    throw tenantError;
  }

  if (!tenant) {
    throw new MissingTenantError();
  }

  return {
    user,
    profile,
    tenant,
  };
}

export async function requireCurrentTenantContext() {
  const context = await getCurrentTenantContext();

  if (!context) {
    throw new Error('User is not authenticated.');
  }

  return context;
}

export async function getTenantJobs(): Promise<Job[]> {
  const { data, error } = await supabase.rpc('get_tenant_jobs');

  if (error) {
    throw error;
  }

  return data;
}

export async function getTeamMembers(): Promise<Profile[]> {
  const { data, error } = await supabase.rpc('get_tenant_team_members');

  if (error) {
    throw error;
  }

  return data;
}

export async function getAssignableJobs(): Promise<AssignedJob[]> {
  const [jobs, teamMembers] = await Promise.all([getTenantJobs(), getTeamMembers()]);
  const membersById = new Map(teamMembers.map((member) => [member.id, member]));

  return jobs.map((job) => ({
    ...job,
    assignee: job.assigned_to ? (membersById.get(job.assigned_to) ?? null) : null,
  }));
}

export async function getTenantSettings(): Promise<TenantSettings> {
  const { data, error } = await supabase.rpc('get_tenant_settings');

  if (error) {
    throw error;
  }

  const settings = data[0];

  if (!settings) {
    throw new Error('Tenant settings were not found.');
  }

  return settings;
}

export async function updateTenantSettings(input: TenantSettingsInput): Promise<TenantSettings> {
  const { data, error } = await supabase.rpc('update_tenant_settings', {
    p_app_language: input.appLanguage,
    p_comes_to_client: input.comesToClient,
    p_company_address: input.companyAddress?.trim() || null,
    p_company_name: input.companyName?.trim() || null,
    p_company_phone: input.companyPhone?.trim() || null,
    p_currency: input.currency,
    p_vehicle_types: input.vehicleTypes,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function updateTenantInviteCode(inviteCode: string): Promise<Tenant> {
  const { data, error } = await supabase.rpc('update_tenant_invite_code', {
    p_invite_code: inviteCode.trim().toUpperCase(),
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function getPendingBookingRequests(): Promise<BookingRequest[]> {
  const { tenant } = await requireCurrentTenantContext();

  const { data, error } = await supabase
    .from('booking_requests')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('status', 'new')
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function convertBookingRequestToJob(bookingRequestId: string): Promise<string> {
  const { data, error } = await supabase.rpc('convert_booking_request_to_job', {
    p_booking_request_id: bookingRequestId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function assignJobToTeamMember(
  jobId: string,
  assignedTo: string | null,
): Promise<Job> {
  const { data, error } = await supabase.rpc('assign_job_to_team_member', {
    p_assigned_to: assignedTo,
    p_job_id: jobId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function getPublicTenantBySlug(publicSlug: string): Promise<PublicTenant | null> {
  const { data, error } = await supabase.rpc('get_public_tenant_by_slug', {
    p_public_slug: publicSlug,
  });

  if (error) {
    throw error;
  }

  return data[0] ?? null;
}

export async function listPublicTenants(): Promise<PublicTenant[]> {
  const { data, error } = await supabase.rpc('list_public_tenants');

  if (error) {
    throw error;
  }

  return data;
}

export async function createBookingRequest(input: CreateBookingRequestInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_booking_request', {
    p_client_name: input.clientName.trim(),
    p_client_phone: input.clientPhone.trim(),
    p_preferred_date: input.preferredDate?.trim() || null,
    p_problem_description: input.problemDescription?.trim() || null,
    p_public_slug: input.publicSlug,
    p_vehicle: input.vehicle,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function createJob(input: CreateJobInput): Promise<Job> {
  const { tenant } = await requireCurrentTenantContext();
  const totalAmount = input.totalAmount ?? 0;
  const paidAmount = input.paidAmount ?? 0;

  const newJob: Inserts<'jobs'> = {
    tenant_id: tenant.id,
    client_name: input.clientName.trim(),
    client_phone: input.clientPhone?.trim() || null,
    assigned_to: input.assignedTo ?? null,
    vehicle: input.vehicle,
    status: input.status ?? 'na_cekanju',
    total_amount: totalAmount,
    paid_amount: paidAmount,
    debt_amount: getDebtAmount(totalAmount, paidAmount),
  };

  const { data, error } = await supabase.from('jobs').insert(newJob).select('*').single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateJob(jobId: string, updates: Updates<'jobs'>): Promise<Job> {
  const { tenant } = await requireCurrentTenantContext();

  const totalAmount = updates.total_amount;
  const paidAmount = updates.paid_amount;
  const normalizedUpdates: Updates<'jobs'> = {
    ...updates,
  };

  if (typeof totalAmount === 'number' && typeof paidAmount === 'number') {
    normalizedUpdates.debt_amount = getDebtAmount(totalAmount, paidAmount);
  }

  const { data, error } = await supabase
    .from('jobs')
    .update(normalizedUpdates)
    .eq('id', jobId)
    .eq('tenant_id', tenant.id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getZones(vehicle?: VehicleType): Promise<Zone[]> {
  let query = supabase.from('zones').select('*').order('vehicle').order('name');

  if (vehicle) {
    query = query.eq('vehicle', vehicle);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
}

export async function getServiceCatalog(): Promise<ServiceCatalogItem[]> {
  const { tenant } = await requireCurrentTenantContext();

  const { data, error } = await supabase
    .from('service_catalog')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('name');

  if (error) {
    throw error;
  }

  return data;
}

export async function createServiceCatalogItem(
  input: CreateServiceInput,
): Promise<ServiceCatalogItem> {
  const { tenant } = await requireCurrentTenantContext();

  const newService: Inserts<'service_catalog'> = {
    tenant_id: tenant.id,
    zone_id: input.zoneId,
    name: input.name.trim(),
    base_price: input.basePrice ?? 0,
  };

  const { data, error } = await supabase
    .from('service_catalog')
    .insert(newService)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getInventory(): Promise<InventoryItem[]> {
  const { tenant } = await requireCurrentTenantContext();

  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('name');

  if (error) {
    throw error;
  }

  return data;
}

export async function createInventoryItem(
  input: CreateInventoryItemInput,
): Promise<InventoryItem> {
  const { tenant } = await requireCurrentTenantContext();

  const newInventoryItem: Inserts<'inventory'> = {
    tenant_id: tenant.id,
    name: input.name.trim(),
    price: input.price ?? 0,
    stock_quantity: input.stockQuantity ?? 0,
  };

  const { data, error } = await supabase
    .from('inventory')
    .insert(newInventoryItem)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateInventoryItem(
  itemId: string,
  updates: Updates<'inventory'>,
): Promise<InventoryItem> {
  const { tenant } = await requireCurrentTenantContext();

  const { data, error } = await supabase
    .from('inventory')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('tenant_id', tenant.id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function addJobServiceItem(
  jobId: string,
  input: Pick<Inserts<'job_items'>, 'name' | 'price' | 'service_id'>,
): Promise<JobItem> {
  const newItem: Inserts<'job_items'> = {
    job_id: jobId,
    service_id: input.service_id ?? null,
    name: input.name.trim(),
    price: input.price ?? 0,
  };

  const { data, error } = await supabase.from('job_items').insert(newItem).select('*').single();

  if (error) {
    throw error;
  }

  return data;
}

export async function addJobPart(
  jobId: string,
  input: Pick<Inserts<'job_parts'>, 'name' | 'part_id' | 'price_at_sale' | 'quantity'>,
): Promise<JobPart> {
  const newPart: Inserts<'job_parts'> = {
    job_id: jobId,
    part_id: input.part_id ?? null,
    name: input.name.trim(),
    quantity: input.quantity ?? 1,
    price_at_sale: input.price_at_sale ?? 0,
  };

  const { data, error } = await supabase.from('job_parts').insert(newPart).select('*').single();

  if (error) {
    throw error;
  }

  return data;
}
