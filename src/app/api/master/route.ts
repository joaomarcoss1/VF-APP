import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildDefaultSectorModuleRows, FEATURE_DEFINITIONS, SECTOR_PROFILES } from '@/lib/modules'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const masterEmails = (process.env.MASTER_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)


function getModuloCodigoFromRecord(row: any): string {
  return String(row?.modulo_codigo || row?.modulo || '').trim().replace(/^\/+/, '').replace(/\//g, '-')
}

function buildEmpresaModuloPayload(input: { empresa_id: string; modulo_codigo: string; ativo: boolean; liberado_por_master?: boolean; updated_at?: string }) {
  const moduloCodigo = getModuloCodigoFromRecord({ modulo_codigo: input.modulo_codigo })
  return { empresa_id: input.empresa_id, modulo: moduloCodigo, modulo_codigo: moduloCodigo, ativo: Boolean(input.ativo), liberado_por_master: input.liberado_por_master ?? true, updated_at: input.updated_at }
}

function adminClient() {
  if (!url || !serviceKey) throw new Error('Supabase Admin não configurado. Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel.')
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function requireMaster(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Sessão ausente.')
  const supabase = adminClient()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user?.email) throw new Error('Sessão inválida.')
  const email = data.user.email.toLowerCase()
  const { data: master } = await supabase.from('master_admins').select('email,user_id,ativo').or(`email.eq.${email},user_id.eq.${data.user.id}`).eq('ativo', true).maybeSingle()
  if (!masterEmails.includes(email) && !master) throw new Error('Acesso restrito ao administrador master. Configure MASTER_ADMIN_EMAILS ou registre o usuário em public.master_admins.')
  return { supabase, user: data.user }
}


async function masterMe(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ is_master: false })
  const supabase = adminClient()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user?.email) return NextResponse.json({ is_master: false })
  const email = data.user.email.toLowerCase()
  const { data: master } = await supabase.from('master_admins').select('email,user_id,ativo').or(`email.eq.${email},user_id.eq.${data.user.id}`).eq('ativo', true).maybeSingle()
  return NextResponse.json({ is_master: masterEmails.includes(email) || Boolean(master), email })
}

async function overview(req: NextRequest) {
  const { supabase } = await requireMaster(req)
  const [{ data: empresas }, { data: assinaturas }, { data: perfis }, { data: users }] = await Promise.all([
    supabase.from('empresas').select('*').order('created_at', { ascending: false }),
    supabase.from('assinaturas').select('*').order('proxima_cobranca', { ascending: true, nullsFirst: false }),
    supabase.from('perfis').select('*'),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])
  const usuarios = users?.users ?? []
  const empresasList = empresas ?? []
  const assinaturasList = assinaturas ?? []
  const perfisList = perfis ?? []
  const enriched = empresasList.map((empresa: any) => {
    const assinatura = assinaturasList.find((a: any) => a.empresa_id === empresa.id) ?? null
    const usuariosEmpresa = perfisList.filter((p: any) => p.empresa_id === empresa.id).map((p: any) => {
      const u = usuarios.find((x: any) => x.id === p.id)
      return { id: p.id, email: u?.email, nome: p.nome, bloqueado: p.bloqueado, ultimo_login: u?.last_sign_in_at ?? null }
    })
    return { empresa, assinatura, usuarios: usuariosEmpresa }
  })
  const receita_mensal_prevista = assinaturasList.filter((a: any) => a.tipo === 'mensal' && a.status === 'ativa').reduce((t: number, a: any) => t + Number(a.valor ?? 0), 0)
  const receita_total_vitalicia = assinaturasList.filter((a: any) => a.tipo === 'vitalicia').reduce((t: number, a: any) => t + Number(a.valor ?? 0), 0)
  const hoje = new Date()
  const limite = new Date(Date.now() + 7 * 86400000)
  const proximas_cobrancas = assinaturasList.filter((a: any) => a.tipo === 'mensal' && a.proxima_cobranca && new Date(a.proxima_cobranca) <= limite && new Date(a.proxima_cobranca) >= hoje)
  return NextResponse.json({
    total_empresas: empresasList.length,
    total_usuarios: usuarios.length,
    assinantes_ativos: assinaturasList.filter((a: any) => a.status === 'ativa').length,
    assinaturas_vencidas: assinaturasList.filter((a: any) => a.status === 'vencida' || a.status === 'bloqueada').length,
    receita_mensal_prevista,
    receita_total_vitalicia,
    proximas_cobrancas,
    empresas: enriched,
  })
}

async function createClientCompany(req: NextRequest) {
  const { supabase } = await requireMaster(req)
  const body = await req.json()
  if (!body.email || !body.password || !body.empresa_nome) throw new Error('Informe email, senha inicial e nome da empresa.')
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { full_name: body.nome || body.email.split('@')[0] },
  })
  if (userError) throw userError
  const { data: perfilCriado } = await supabase.from('perfis').select('empresa_id').eq('id', userData.user.id).maybeSingle()
  const empresaId = perfilCriado?.empresa_id || crypto.randomUUID()
  const { error: empresaError } = perfilCriado?.empresa_id
    ? await supabase.from('empresas').update({ nome: body.empresa_nome, tipo: body.tipo_empresa || 'restaurante', email: body.email, telefone: body.telefone || null }).eq('id', empresaId)
    : await supabase.from('empresas').insert({ id: empresaId, nome: body.empresa_nome, tipo: body.tipo_empresa || 'restaurante', email: body.email, telefone: body.telefone || null })
  if (empresaError) throw empresaError
  await supabase.from('perfis').upsert({ id: userData.user.id, empresa_id: empresaId, nome: body.nome || body.email.split('@')[0], plano: 'pro' })
  await supabase.from('configuracoes').upsert({ empresa_id: empresaId }, { onConflict: 'empresa_id' })
  const { data: cardapioExistente } = await supabase.from('cardapios').select('id').eq('empresa_id', empresaId).limit(1).maybeSingle()
  if (!cardapioExistente) await supabase.from('cardapios').insert({ empresa_id: empresaId, nome: 'Cardápio principal', descricao: 'Cardápio oficial' })
  const tipo = body.assinatura_tipo === 'vitalicia' ? 'vitalicia' : 'mensal'
  const inicio = body.data_inicio || new Date().toISOString().split('T')[0]
  const proxima = tipo === 'mensal' ? (body.proxima_cobranca || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]) : null
  const { error: assError } = await supabase.from('assinaturas').upsert({ empresa_id: empresaId, tipo, status: 'ativa', valor: Number(body.valor || 0), data_inicio: inicio, proxima_cobranca: proxima, data_vitalicia: tipo === 'vitalicia' ? inicio : null, observacoes: body.observacoes || null }, { onConflict: 'empresa_id' })
  if (assError) throw assError
  return NextResponse.json({ ok: true, empresa_id: empresaId, user_id: userData.user.id })
}

async function updateSubscription(req: NextRequest) {
  const { supabase } = await requireMaster(req)
  const body = await req.json()
  if (!body.empresa_id) throw new Error('empresa_id obrigatório')
  const payload = {
    empresa_id: body.empresa_id,
    tipo: body.tipo || 'mensal',
    status: body.status || 'ativa',
    valor: Number(body.valor || 0),
    data_inicio: body.data_inicio || new Date().toISOString().split('T')[0],
    proxima_cobranca: body.tipo === 'vitalicia' ? null : body.proxima_cobranca,
    data_vitalicia: body.tipo === 'vitalicia' ? (body.data_vitalicia || body.data_inicio || new Date().toISOString().split('T')[0]) : null,
    observacoes: body.observacoes || null,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('assinaturas').upsert(payload, { onConflict: 'empresa_id' })
  if (error) throw error
  return NextResponse.json({ ok: true })
}

async function blockCompany(req: NextRequest) {
  const { supabase } = await requireMaster(req)
  const body = await req.json()
  if (!body.empresa_id) throw new Error('empresa_id obrigatório')
  const status = body.bloquear ? 'bloqueada' : 'ativa'
  const { error } = await supabase.from('assinaturas').update({ status, updated_at: new Date().toISOString(), observacoes: body.motivo || null }).eq('empresa_id', body.empresa_id)
  if (error) throw error
  await supabase.from('perfis').update({ bloqueado: Boolean(body.bloquear), motivo_bloqueio: body.motivo || null }).eq('empresa_id', body.empresa_id)
  return NextResponse.json({ ok: true })
}

async function resetPassword(req: NextRequest) {
  const { supabase } = await requireMaster(req)
  const body = await req.json()
  if (!body.user_id || !body.password) throw new Error('Informe usuário e nova senha.')
  const { error } = await supabase.auth.admin.updateUserById(body.user_id, { password: body.password })
  if (error) throw error
  return NextResponse.json({ ok: true })
}



async function modulesOverview(req: NextRequest) {
  const { supabase } = await requireMaster(req)
  let { data: rows, error } = await supabase
    .from('setor_modulos')
    .select('tipo_empresa,modulo,ativo,ordem,updated_at')
    .order('tipo_empresa')
    .order('ordem')

  if (error) throw new Error(`Tabela setor_modulos indisponível. Execute o SQL atualizado no Supabase. Detalhe: ${error.message}`)

  if (!rows?.length) {
    const defaults = buildDefaultSectorModuleRows()
    const { error: seedError } = await supabase.from('setor_modulos').upsert(defaults, { onConflict: 'tipo_empresa,modulo' })
    if (seedError) throw seedError
    const reread = await supabase.from('setor_modulos').select('tipo_empresa,modulo,ativo,ordem,updated_at').order('tipo_empresa').order('ordem')
    rows = reread.data ?? []
  }

  return NextResponse.json({
    features: FEATURE_DEFINITIONS.filter(f => !f.masterOnly),
    sectors: (Object.values(SECTOR_PROFILES) as any[]).map(s => ({ tipo: s.tipo, label: s.label, description: s.description, productMode: s.productMode })),
    configs: rows ?? [],
  })
}

async function updateModules(req: NextRequest) {
  const { supabase } = await requireMaster(req)
  const body = await req.json()
  const configs = Array.isArray(body.configs) ? body.configs : []
  if (!configs.length) throw new Error('Envie ao menos uma configuração de módulo.')
  const payload = configs.map((c: any, index: number) => ({
    tipo_empresa: c.tipo_empresa,
    modulo: c.modulo,
    ativo: Boolean(c.ativo),
    ordem: Number(c.ordem ?? index),
    updated_at: new Date().toISOString(),
  }))
  const { error } = await supabase.from('setor_modulos').upsert(payload, { onConflict: 'tipo_empresa,modulo' })
  if (error) throw error
  return NextResponse.json({ ok: true })
}


async function companyModulesOverview(req: NextRequest) {
  const { supabase } = await requireMaster(req)
  const empresaId = req.nextUrl.searchParams.get('empresa_id')
  if (!empresaId) throw new Error('empresa_id obrigatório.')
  const { data: empresa, error: empError } = await supabase.from('empresas').select('id,nome,tipo').eq('id', empresaId).maybeSingle()
  if (empError || !empresa) throw new Error('Empresa não encontrada.')

  const { data: setorRows, error: setorError } = await supabase
    .from('setor_modulos')
    .select('tipo_empresa,modulo,ativo,ordem,updated_at')
    .eq('tipo_empresa', empresa.tipo)
    .order('ordem')
  if (setorError) throw setorError

  const { data: empresaRows, error: empresaError } = await supabase
    .from('empresa_modulos')
    .select('empresa_id,modulo,modulo_codigo,ativo,ordem,updated_at,liberado_por_master,ramo_origem')
    .eq('empresa_id', empresaId)
  if (empresaError) throw empresaError

  const configs = (setorRows ?? []).map((row: any) => {
    const rowModulo = getModuloCodigoFromRecord(row)
    const override = (empresaRows ?? []).find((r: any) => getModuloCodigoFromRecord(r) === rowModulo)
    return {
      tipo_empresa: empresa.tipo,
      empresa_id: empresaId,
      modulo: rowModulo,
      modulo_codigo: rowModulo,
      ativo: override ? Boolean(override.ativo) : Boolean(row.ativo),
      ordem: Number(override?.ordem ?? row.ordem ?? 0),
      origem: override ? 'empresa' : 'setor',
    }
  })

  return NextResponse.json({ empresa, features: FEATURE_DEFINITIONS.filter(f => !f.masterOnly), configs })
}

async function updateCompanyModules(req: NextRequest) {
  const { supabase } = await requireMaster(req)
  const body = await req.json()
  const empresaId = body.empresa_id
  const configs = Array.isArray(body.configs) ? body.configs : []
  if (!empresaId) throw new Error('empresa_id obrigatório.')
  if (!configs.length) throw new Error('Envie ao menos uma configuração de módulo.')
  const payload = configs.map((c: any, index: number) => ({
    ...buildEmpresaModuloPayload({ empresa_id: empresaId, modulo_codigo: c.modulo_codigo || c.modulo, ativo: Boolean(c.ativo), liberado_por_master: true, updated_at: new Date().toISOString() }),
    ordem: Number(c.ordem ?? index),
  }))
  const { error } = await supabase.from('empresa_modulos').upsert(payload, { onConflict: 'empresa_id,modulo_codigo' })
  if (error) throw error
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get('action')
    if (action === 'me') return await masterMe(req)
    if (action === 'modules') return await modulesOverview(req)
    if (action === 'company-modules') return await companyModulesOverview(req)
    return await overview(req)
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }) }
}

export async function POST(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get('action')
    if (action === 'create-client') return await createClientCompany(req)
    if (action === 'subscription') return await updateSubscription(req)
    if (action === 'block') return await blockCompany(req)
    if (action === 'reset-password') return await resetPassword(req)
    if (action === 'modules') return await updateModules(req)
    if (action === 'company-modules') return await updateCompanyModules(req)
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Erro no painel master.' }, { status: 400 })
  }
}
