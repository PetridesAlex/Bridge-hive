import { Redirect } from 'expo-router';

/** Legacy route — personal details live at /profile/personal-information. */
export default function AccountRedirect() {
  return <Redirect href="/profile/personal-information" />;
}
