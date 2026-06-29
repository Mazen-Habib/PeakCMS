import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client. SERVER-ONLY — bypasses RLS. Use exclusively for
 * privileged admin operations (e.g. inviting team members). Never import
 * this into a Client Component.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
