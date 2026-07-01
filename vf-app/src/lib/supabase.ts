// ============================================================
// VF Nexus — Supabase client
// ============================================================
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { SupabaseClient } from '@supabase/supabase-js'

type UnsafeDatabase = any

let browserClient: SupabaseClient<UnsafeDatabase> | null = null

const missingSupabaseMessage =
  'Supabase não configurado. Crie o arquivo .env.local com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.'

export function getSupabaseEnvStatus() {
  const missing = [
    ['NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key)

  return {
    ok: missing.length === 0,
    missing,
    message: missing.length ? `${missingSupabaseMessage} Variáveis ausentes: ${missing.join(', ')}.` : '',
  }
}

export function getSupabase(): SupabaseClient<UnsafeDatabase> {
  const env = getSupabaseEnvStatus()
  if (!env.ok) {
    throw new Error(env.message)
  }

  if (!browserClient) {
    browserClient = createClientComponentClient<UnsafeDatabase>()
  }
  return browserClient
}

export const createBrowserClient = getSupabase
export const SUPABASE_NOT_CONFIGURED_MESSAGE = missingSupabaseMessage
