import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Platform } from 'react-native';

/** Bundled policy is versioned with the app; online page may update separately. */
export function privacyPolicyOnlineUrl(): string {
  const base = (process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://bridgehive.app').replace(
    /\/$/,
    '',
  );
  return `${base}/privacy-policy`;
}

export async function openExternalUrl(
  url: string,
  failureMessage: string,
): Promise<boolean> {
  try {
    if (url.startsWith('mailto:')) {
      const can = await Linking.canOpenURL(url);
      if (!can) {
        Alert.alert(failureMessage);
        return false;
      }
      await Linking.openURL(url);
      return true;
    }

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
        return true;
      }
      await Linking.openURL(url);
      return true;
    }

    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    });
    return true;
  } catch {
    Alert.alert(failureMessage);
    return false;
  }
}
