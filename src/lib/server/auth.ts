import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SessionExpiredError } from '@/core/errors/app-error'

export async function requireBearerUser(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Supabase público não configurado.')
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) throw new SessionExpiredError('Sessão obrigatória.')
  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) throw new SessionExpiredError()
  return { user: data.user, client, token }
}
