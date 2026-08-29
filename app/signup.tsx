import { Redirect } from 'expo-router';

/** Legacy route → professional register */
export default function SignupRedirect() {
  return <Redirect href="/auth/professional/register" />;
}
