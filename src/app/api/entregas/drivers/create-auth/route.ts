import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function assertCanManageDriver(request: Request, url: string, serviceRole: string, empresaId: string) {
  const auth = request.headers.get('authorization') || ''
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : ''
  if (!token) throw new Error('Sessão obrigatória para criar acesso de entregador.')

  const admin = createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user?.id) throw new Error('Sessão inválida ou expirada.')

  const { data: perfil, error } = await admin.from('perfis').select('id,empresa_id,cargo,is_master,bloqueado').eq('id', userData.user.id).maybeSingle()
  if (error || !perfil) throw new Error('Perfil não encontrado.')
  if (perfil.bloqueado) throw new Error('Usuário bloqueado.')

  const cargo = String(perfil.cargo || '').toLowerCase()
  const master = Boolean(perfil.is_master || cargo === 'master_admin' || cargo === 'super_admin')
  const adminEmpresa = ['administrador', 'empresa_admin', 'dono', 'gerente'].includes(cargo)
  if (!master && (!adminEmpresa || perfil.empresa_id !== empresaId)) throw new Error('Sem permissão para criar entregador nesta empresa.')
  return admin
}

export async function POST(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceRole) return NextResponse.json({ error: 'Service role não configurada.' }, { status: 501 })
    const body = await request.json()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '') || Math.random().toString(36).slice(2, 10) + 'VF!1'
    const empresaId = String(body.empresa_id || '')
    const name = String(body.name || 'Entregador')
    if (!email || !empresaId) return NextResponse.json({ error: 'E-mail e empresa_id são obrigatórios.' }, { status: 400 })

    const supabase = await assertCanManageDriver(request, url, serviceRole, empresaId)
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name, role: 'driver', empresa_id: empresaId } })
    if (error) throw error
    const userId = data.user?.id
    if (userId) {
      await supabase.from('perfis').upsert({ id: userId, empresa_id: empresaId, nome: name, email, cargo: 'driver', permissoes: ['entregas.portal'], plano: 'pro', updated_at: new Date().toISOString() }, { onConflict: 'id' })
    }
    return NextResponse.json({ user_id: userId, email, password_temp: password })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao criar acesso do entregador.' }, { status: error.message?.includes('permissão') ? 403 : 500 })
  }
}
