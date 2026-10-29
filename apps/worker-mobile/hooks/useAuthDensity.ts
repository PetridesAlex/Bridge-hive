import { useEffect, useState } from 'react';
import { Keyboard, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveAuthDensity, type AuthDensity } from '@/lib/auth-density';

/** Vertical density tier for auth/first-launch screens (updates on rotate / text size). */
export function useAuthDensity(): AuthDensity {
  const { height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return resolveAuthDensity({
    height,
    insetTop: insets.top,
    insetBottom: insets.bottom,
    fontScale,
  });
}

/** True while the software keyboard is open (used to relax fit-to-screen rules). */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}
