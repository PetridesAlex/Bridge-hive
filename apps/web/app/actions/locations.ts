'use server';

import {
  createLocationSchema,
  createWardSchema,
  createWardsBatchSchema,
  isOwnedLocationImagePath,
  prepareWardNames,
  wardNameExistsAmong,
} from '@bridge-hive/domain';
import { revalidatePath } from 'next/cache';

import { rpcErrorMessage } from '@/lib/admin/auth';
import { requireOrgMembership } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export type ActionResult = {
  error?: string;
  success?: boolean;
  locationId?: string;
  wardId?: string;
  wardName?: string;
};

export type CreatedWardRow = {
  id: string;
  name: string;
  locationId: string;
};

export type CreateWardsBatchResult = {
  error?: string;
  success?: boolean;
  created?: CreatedWardRow[];
  skippedNames?: string[];
};

function revalidateWardPaths(slug: string, locationId: string) {
  revalidatePath(`/org/${slug}/locations`);
  revalidatePath(`/org/${slug}/locations/${locationId}`);
  revalidatePath(`/org/${slug}/shifts/new`);
  revalidatePath(`/org/${slug}/shifts/new/bulk`);
}

function zodErrorMessage(error: {
  flatten: () => {
    formErrors: string[];
    fieldErrors: Record<string, string[] | undefined>;
  };
}) {
  const flat = error.flatten();
  const field = Object.values(flat.fieldErrors).flat().filter(Boolean)[0];
  return field ?? flat.formErrors[0] ?? 'Validation failed';
}

export async function createLocationAction(
  slug: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireOrgMembership(slug);
  if (!ctx.capabilities.canManageLocations) {
    return { error: 'You do not have permission to create locations.' };
  }

  const parsed = createLocationSchema.safeParse({
    organizationId: ctx.org.id,
    name: String(formData.get('name') ?? ''),
    addressLine1: String(formData.get('addressLine1') ?? '') || undefined,
    addressLine2: String(formData.get('addressLine2') ?? '') || undefined,
    city: String(formData.get('city') ?? '') || undefined,
    postalCode: String(formData.get('postalCode') ?? '') || undefined,
    countryCode: String(formData.get('countryCode') ?? 'CY') || 'CY',
    timezone: String(formData.get('timezone') ?? ctx.org.timezone) || ctx.org.timezone,
    contactName: String(formData.get('contactName') ?? '') || undefined,
    contactPhone: String(formData.get('contactPhone') ?? '') || undefined,
    contactEmail: String(formData.get('contactEmail') ?? '') || undefined,
  });

  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('locations')
    .insert({
      organization_id: v.organizationId,
      name: v.name,
      address_line1: v.addressLine1 ?? null,
      address_line2: v.addressLine2 ?? null,
      city: v.city ?? null,
      postal_code: v.postalCode ?? null,
      country_code: v.countryCode,
      timezone: v.timezone,
      contact_name: v.contactName ?? null,
      contact_phone: v.contactPhone ?? null,
      contact_email: v.contactEmail ?? null,
    })
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/org/${slug}/locations`);
  return { success: true, locationId: data.id };
}

export async function updateLocationAction(
  slug: string,
  locationId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireOrgMembership(slug);
  if (!ctx.capabilities.canManageLocations) {
    return { error: 'You do not have permission to update locations.' };
  }

  const parsed = createLocationSchema.safeParse({
    organizationId: ctx.org.id,
    name: String(formData.get('name') ?? ''),
    addressLine1: String(formData.get('addressLine1') ?? '') || undefined,
    addressLine2: String(formData.get('addressLine2') ?? '') || undefined,
    city: String(formData.get('city') ?? '') || undefined,
    postalCode: String(formData.get('postalCode') ?? '') || undefined,
    countryCode: String(formData.get('countryCode') ?? 'CY') || 'CY',
    timezone: String(formData.get('timezone') ?? ctx.org.timezone) || ctx.org.timezone,
    contactName: String(formData.get('contactName') ?? '') || undefined,
    contactPhone: String(formData.get('contactPhone') ?? '') || undefined,
    contactEmail: String(formData.get('contactEmail') ?? '') || undefined,
  });

  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from('locations')
    .update({
      name: v.name,
      address_line1: v.addressLine1 ?? null,
      address_line2: v.addressLine2 ?? null,
      city: v.city ?? null,
      postal_code: v.postalCode ?? null,
      country_code: v.countryCode,
      timezone: v.timezone,
      contact_name: v.contactName ?? null,
      contact_phone: v.contactPhone ?? null,
      contact_email: v.contactEmail ?? null,
    })
    .eq('id', locationId)
    .eq('organization_id', ctx.org.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/org/${slug}/locations`);
  revalidatePath(`/org/${slug}/locations/${locationId}`);
  return { success: true, locationId };
}

export async function setLocationImagePathAction(params: {
  slug: string;
  locationId: string;
  path: string | null;
}): Promise<ActionResult> {
  const ctx = await requireOrgMembership(params.slug);
  if (!ctx.capabilities.canManageLocations) {
    return { error: 'You do not have permission to update location images.' };
  }

  if (
    params.path != null &&
    !isOwnedLocationImagePath(ctx.org.id, params.locationId, params.path)
  ) {
    return { error: 'Invalid image path.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('set_location_image_path', {
    p_organization_id: ctx.org.id,
    p_location_id: params.locationId,
    p_path: params.path as unknown as string,
  });

  if (error) {
    return { error: rpcErrorMessage(error) };
  }

  revalidatePath(`/org/${params.slug}/locations`);
  revalidatePath(`/org/${params.slug}/locations/${params.locationId}`);
  return { success: true, locationId: params.locationId };
}

export async function createWardAction(
  slug: string,
  locationId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireOrgMembership(slug);
  if (!ctx.capabilities.canManageWards) {
    return { error: 'You do not have permission to create wards.' };
  }

  const parsed = createWardSchema.safeParse({
    locationId,
    name: String(formData.get('name') ?? ''),
    instructions: String(formData.get('instructions') ?? '') || undefined,
  });

  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { data: location } = await supabase
    .from('locations')
    .select('id')
    .eq('id', locationId)
    .eq('organization_id', ctx.org.id)
    .maybeSingle();

  if (!location) {
    return { error: 'Location not found.' };
  }

  const { data: existingWards, error: existingError } = await supabase
    .from('wards')
    .select('id, name')
    .eq('location_id', locationId);

  if (existingError) {
    return { error: existingError.message };
  }

  if (
    wardNameExistsAmong(
      parsed.data.name,
      (existingWards ?? []).map((ward) => ward.name),
    )
  ) {
    return {
      error: `A ward / unit named “${parsed.data.name}” already exists for this location.`,
    };
  }

  const { data: created, error } = await supabase
    .from('wards')
    .insert({
      location_id: parsed.data.locationId,
      name: parsed.data.name,
      instructions: parsed.data.instructions ?? null,
    })
    .select('id, name')
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidateWardPaths(slug, locationId);
  return {
    success: true,
    wardId: created.id,
    wardName: created.name,
    locationId,
  };
}

export async function createWardsBatchAction(params: {
  slug: string;
  locationId: string;
  names: string[];
}): Promise<CreateWardsBatchResult> {
  const ctx = await requireOrgMembership(params.slug);
  if (!ctx.capabilities.canManageWards) {
    return { error: 'You do not have permission to create wards.' };
  }

  const preparedNames = prepareWardNames(params.names);
  const parsed = createWardsBatchSchema.safeParse({
    locationId: params.locationId,
    names: preparedNames,
  });

  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  if (preparedNames.length === 0) {
    return { error: 'Enter or select at least one ward / unit name.' };
  }

  const supabase = await createClient();
  const { data: location } = await supabase
    .from('locations')
    .select('id')
    .eq('id', params.locationId)
    .eq('organization_id', ctx.org.id)
    .maybeSingle();

  if (!location) {
    return { error: 'Location not found.' };
  }

  const { data: existingWards, error: existingError } = await supabase
    .from('wards')
    .select('id, name')
    .eq('location_id', params.locationId);

  if (existingError) {
    return { error: existingError.message };
  }

  const existingNames = (existingWards ?? []).map((ward) => ward.name);
  const toCreate: string[] = [];
  const skippedNames: string[] = [];

  for (const name of preparedNames) {
    if (wardNameExistsAmong(name, existingNames)) {
      skippedNames.push(name);
      continue;
    }
    toCreate.push(name);
    existingNames.push(name);
  }

  if (toCreate.length === 0) {
    return {
      success: true,
      created: [],
      skippedNames,
      error:
        skippedNames.length > 0
          ? 'Those ward / unit names are already saved for this location.'
          : undefined,
    };
  }

  const { data: inserted, error } = await supabase
    .from('wards')
    .insert(
      toCreate.map((name) => ({
        location_id: params.locationId,
        name,
        instructions: null as string | null,
      })),
    )
    .select('id, name, location_id');

  if (error) {
    return { error: error.message };
  }

  const created: CreatedWardRow[] = (inserted ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    locationId: row.location_id,
  }));

  revalidateWardPaths(params.slug, params.locationId);
  return { success: true, created, skippedNames };
}

export async function updateWardAction(
  slug: string,
  locationId: string,
  wardId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireOrgMembership(slug);
  if (!ctx.capabilities.canManageWards) {
    return { error: 'You do not have permission to update wards.' };
  }

  const parsed = createWardSchema.safeParse({
    locationId,
    name: String(formData.get('name') ?? ''),
    instructions: String(formData.get('instructions') ?? '') || undefined,
  });

  if (!parsed.success) {
    return { error: zodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { data: location } = await supabase
    .from('locations')
    .select('id')
    .eq('id', locationId)
    .eq('organization_id', ctx.org.id)
    .maybeSingle();

  if (!location) {
    return { error: 'Location not found.' };
  }

  const { data: siblings, error: siblingsError } = await supabase
    .from('wards')
    .select('id, name')
    .eq('location_id', locationId);

  if (siblingsError) {
    return { error: siblingsError.message };
  }

  const conflict = (siblings ?? []).find(
    (ward) =>
      ward.id !== wardId &&
      wardNameExistsAmong(parsed.data.name, [ward.name]),
  );
  if (conflict) {
    return {
      error: `A ward / unit named “${parsed.data.name}” already exists for this location.`,
    };
  }

  const { error } = await supabase
    .from('wards')
    .update({
      name: parsed.data.name,
      instructions: parsed.data.instructions ?? null,
    })
    .eq('id', wardId)
    .eq('location_id', locationId);

  if (error) {
    return { error: error.message };
  }

  revalidateWardPaths(slug, locationId);
  return { success: true, wardId, locationId };
}
