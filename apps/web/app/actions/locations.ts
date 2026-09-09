'use server';

import {
  createLocationSchema,
  createWardSchema,
} from '@bridge-hive/domain';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireOrgMembership } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export type ActionResult = {
  error?: string;
  success?: boolean;
};

function zodErrorMessage(error: { flatten: () => { formErrors: string[]; fieldErrors: Record<string, string[] | undefined> } }) {
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
  redirect(`/org/${slug}/locations/${data.id}`);
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
  return { success: true };
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

  const { error } = await supabase.from('wards').insert({
    location_id: parsed.data.locationId,
    name: parsed.data.name,
    instructions: parsed.data.instructions ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/org/${slug}/locations/${locationId}`);
  return { success: true };
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

  revalidatePath(`/org/${slug}/locations/${locationId}`);
  return { success: true };
}

