import React, { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

/** True when the user prefers reduced motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(Boolean(value));
      })
      .catch(() => undefined);

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      setReduced(Boolean(value));
    });

    return () => {
      mounted = false;
      // RN web / older APIs may return a subscription or void
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sub as any)?.remove?.();
    };
  }, []);

  return reduced;
}
