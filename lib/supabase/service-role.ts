import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Bypasses RLS — use only for trusted server-side operations that must act
// across more than one user's rows (e.g. propagating a group submission to
// every group member's own storage path/records). Never expose to the client.
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
