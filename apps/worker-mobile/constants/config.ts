/** App configuration for Bridge Hive worker mobile. */

export const APP_CONFIG = {
  timezone: 'Europe/Nicosia',
  locale: 'en-CY',
  currency: 'EUR',
  countryCode: 'CY',
  supportEmail: 'support@bridgehive.com',
  cities: ['Limassol', 'Nicosia', 'Larnaca', 'Paphos', 'Famagusta'] as const,
} as const;

export const WORKER_ROLE_LABELS = {
  registered_nurse: 'Registered Nurse',
  ward_assistant: 'Ward Assistant',
} as const;
