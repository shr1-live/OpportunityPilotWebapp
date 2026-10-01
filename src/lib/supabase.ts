import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config, supabaseConfigured } from './config'

/** Auth only. The browser never talks to the database directly; all data goes through the API. */
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(config.supabaseUrl!, config.supabasePublishableKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null
