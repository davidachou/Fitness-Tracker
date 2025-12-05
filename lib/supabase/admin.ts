import { createClient } from '@supabase/supabase-js'

/**
 * Admin client with service role key for server-side operations
 * ONLY use this for admin operations that require elevated privileges
 * NEVER expose this client to the client-side
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
