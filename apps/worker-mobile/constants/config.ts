/** App configuration for Bridge Hive worker mobile. */

export { WORKER_ROLE_LABELS } from '@bridge-hive/domain';

export const APP_CONFIG = {
  timezone: 'Europe/Nicosia',
  locale: 'en-CY',
  currency: 'EUR',
  countryCode: 'CY',
  supportEmail: 'support@bridgehive.com',
  cities: ['Limassol', 'Nicosia', 'Larnaca', 'Paphos', 'Famagusta'] as const,
} as const;
