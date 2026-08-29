import { supabase } from '@/lib/supabase';

/** Lightweight connectivity check against the Supabase Auth health endpoint. */
export async function checkSupabaseConnection(): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    const { error } = await supabase.auth.getSession();
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true, message: 'Connected to Supabase' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Supabase connection error';
    return { ok: false, message };
  }
}
