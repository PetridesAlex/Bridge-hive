import { Redirect } from 'expo-router';

/** Legacy tab route — Support now lives under the profile stack so back returns to Account. */
export default function SupportRedirect() {
  return <Redirect href="/profile/support" />;
}
