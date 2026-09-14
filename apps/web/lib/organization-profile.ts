import type { UpdateOrganizationProfileInput } from '@bridge-hive/domain';

export function formString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '');
}

export function parseOrganizationProfileFormData(formData: FormData) {
  return {
    organizationId: formString(formData, 'organizationId').trim(),
    legalName: formString(formData, 'legalName'),
    displayName: formString(formData, 'displayName'),
    organizationType: formString(formData, 'organizationType'),
    addressLine1: formString(formData, 'addressLine1'),
    addressLine2: formString(formData, 'addressLine2'),
    city: formString(formData, 'city'),
    postalCode: formString(formData, 'postalCode'),
    countryCode: formString(formData, 'countryCode'),
    taxVat: formString(formData, 'taxVat'),
    billingEmail: formString(formData, 'billingEmail'),
    primaryContactName: formString(formData, 'primaryContactName'),
    primaryContactEmail: formString(formData, 'primaryContactEmail'),
  };
}

export function profileRpcArgs(data: UpdateOrganizationProfileInput) {
  return {
    p_organization_id: data.organizationId,
    p_legal_name: data.legalName,
    p_display_name: data.displayName,
    p_billing_email: data.billingEmail,
    p_primary_contact_name: data.primaryContactName,
    p_primary_contact_email: data.primaryContactEmail,
    p_address_line1: data.addressLine1,
    p_address_line2: data.addressLine2,
    p_city: data.city,
    p_postal_code: data.postalCode,
    p_country_code: data.countryCode || undefined,
    p_tax_vat_number: data.taxVat,
    ...(data.organizationType
      ? {
          p_organization_type: data.organizationType as
            | 'hospital'
            | 'clinic'
            | 'nursing_home'
            | 'other',
        }
      : {}),
  };
}
