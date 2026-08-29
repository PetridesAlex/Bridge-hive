import { Redirect } from 'expo-router';

/** Legacy route → professional login */
export default function LoginRedirect() {
  return <Redirect href="/auth/professional/login" />;
}
