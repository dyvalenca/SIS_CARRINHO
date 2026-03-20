import { createClient } from '@supabase/supabase-js'

// Cliente para uso no browser — usa ANON KEY (respeita RLS)
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
