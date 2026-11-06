import 'server-only';

import { isOwnedOrganizationLogoPath } from '@bridge-hive/domain';
import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';

/** Request-scoped signed logo URL. Keyed by org id + path; never shared across users. */
export const signedOrgLogoUrl = cache(async function signedOrgLogoUrl(
  organizationId: string,
  logoPath: string | null | undefined,
): Promise<string | null> {
  if (!logoPath || !isOwnedOrganizationLogoPath(organizationId, logoPath)) {
    return null;
  }
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from('organization-logos')
    .createSignedUrl(logoPath, 60 * 15);
  return data?.signedUrl ?? null;
});
