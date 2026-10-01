/** Public, build-time configuration only. Secrets never belong in VITE_ variables. */
const env = import.meta.env

export const config = {
  apiBaseUrl: (env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:5051',
  supabaseUrl: env.VITE_SUPABASE_URL as string | undefined,
  supabasePublishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined,
  /** Local development sign-in without Supabase. Compiled out of production builds by the DEV check. */
  devAuth: import.meta.env.DEV && env.VITE_DEV_AUTH === 'true',
}

export const supabaseConfigured = Boolean(config.supabaseUrl && config.supabasePublishableKey)
