/** Android notification channel for newly published matching shifts. */
export const NEW_SHIFTS_CHANNEL = {
  id: 'new-shifts',
  name: 'New shifts',
  importance: 'high',
  /** Platform default sound. No custom audio file in phase 1. */
  sound: 'default',
  vibration: true,
  lightColor: '#E0AA18',
  color: '#0B2A43',
} as const;

export const PUSH_EXPLAINER_DISMISSED_KEY = 'bridgehive.push.explainerDismissed';
