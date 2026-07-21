import { db, getCurrentUserId, getPerfilAtual, normalizeError, type AnyRecord } from './_base'
import { getEmpresaIdObrigatoria, getTenantContext, normalizarPapel } from './_tenant'
import { AuditoriaService } from './auditoria'

export type EmpresaCadastroForm = {
  nome_fantasia: string
  razao_social?: string
  codigo_empresa?: string
  cnpj?: string
  telefone?: string
  email?: string
  responsavel?: string
  plano?: string
  status?: string
}

export type UsuarioEmpresaForm = {
  nome: string
  email?: string
  telefone?: string
  cargo: 'empresa_admin' | 'gerente' | 'funcionario' | 'vendedor' | 'atendente' | 'operacional' | 'financeiro'
  setor?: string
  permissoes?: string[]
  status?: string
}

function gerarCodigoEmpresa(seed?: string) {
  const base = String(seed || crypto.randomUUID()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()
  return `VF-${base || Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`
}

export const MultiempresaService = {
  async contexto() {
    return getTenantContext()
  },

  async empresaAtual() {
    const empresaId = await getEmpresaIdObrigatoria()
    const { data, error } = await db().from('empresas').select('*').eq('id', empresaId).maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao carregar empresa atual.')
    return data
  },

  async equipeDaEmpresa() {
    const empresaId = await getEmpresaIdObrigatoria()
    const [{ data: perfis, error: perfisError }, { data: equipe, error: equipeError }] = await Promise.all([
      db().from('perfis').select('id,nome,email,telefone,cargo,permissoes,empresa_id,bloqueado,ultimo_login,created_at').eq('empresa_id', empresaId).order('nome'),
      db().from('equipe_usuarios').select('*').eq('empresa_id', empresaId).order('nome'),
    ])
    if (perfisError) throw normalizeError(perfisError, 'Erro ao carregar perfis da empresa.')
    if (equipeError) throw normalizeError(equipeError, 'Erro ao carregar equipe da empresa.')
    return { perfis: perfis ?? [], equipe: equipe ?? [] }
  },

  async criarUsuarioEmpresa(form: UsuarioEmpresaForm) {
    const ctx = await getTenantContext()
    if (!ctx.empresaId) throw new Error('Usuário sem empresa vinculada.')
    if (!ctx.isEmpresaAdmin && !ctx.isSuperAdmin && ctx.papel !== 'gerente') throw new Error('Somente administração ou gerente autorizado pode cadastrar equipe.')
    const payload = {
      empresa_id: ctx.empresaId,
      nome: form.nome,
      email: form.email || null,
      telefone: form.telefone || null,
      cargo: form.cargo === 'empresa_admin' ? 'administrador' : form.cargo,
      setor: form.setor || null,
      permissoes: form.permissoes || [],
      status: form.status || 'ativo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await db().from('equipe_usuarios').insert(payload).select('*').single()
    if (error) throw normalizeError(error, 'Erro ao cadastrar usuário da empresa.')
    await AuditoriaService.registrar('empresa.usuario.criar', 'equipe_usuarios', data.id, { cargo: payload.cargo, email: payload.email }).catch(() => null)
    return data
  },

  async listarEmpresasMaster() {
    const ctx = await getTenantContext()
    if (!ctx.isSuperAdmin) throw new Error('Acesso restrito ao Admin Master NexLabs.')
    const { data, error } = await db().from('empresas').select('*, usuarios:perfis(id,nome,cargo,email), assinatura:assinaturas_saas(status)').order('created_at', { ascending: false })
    if (error) throw normalizeError(error, 'Erro ao listar empresas no painel master.')
    return data ?? []
  },

  async criarEmpresaMaster(form: EmpresaCadastroForm) {
    const ctx = await getTenantContext()
    if (!ctx.isSuperAdmin) throw new Error('Acesso restrito ao Admin Master NexLabs.')
    const codigo = form.codigo_empresa?.trim() || gerarCodigoEmpresa(form.nome_fantasia)
    const payload: AnyRecord = {
      nome: form.nome_fantasia,
      nome_fantasia: form.nome_fantasia,
      razao_social: form.razao_social || form.nome_fantasia,
      codigo_empresa: codigo,
      matricula_empresa: codigo,
      cnpj: form.cnpj || null,
      telefone: form.telefone || null,
      email: form.email || null,
      responsavel: form.responsavel || null,
      plano: form.plano || 'trial',
      status: form.status || 'ativa',
      tipo: 'outro',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await db().from('empresas').insert(payload).select('*').single()
    if (error) throw normalizeError(error, 'Erro ao criar empresa.')
    await AuditoriaService.registrar('master.empresa.criar', 'empresas', data.id, { codigo }).catch(() => null)
    return data
  },

  async vincularAdminEmpresa(empresaId: string, form: UsuarioEmpresaForm & { user_id?: string }) {
    const ctx = await getTenantContext()
    if (!ctx.isSuperAdmin) throw new Error('Acesso restrito ao Admin Master NexLabs.')
    const payload: AnyRecord = {
      id: form.user_id || undefined,
      empresa_id: empresaId,
      nome: form.nome,
      email: form.email || null,
      telefone: form.telefone || null,
      cargo: 'administrador',
      permissoes: ['*'],
      is_master: false,
      bloqueado: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await db().from('perfis').upsert(payload).select('*').single()
    if (error) throw normalizeError(error, 'Erro ao vincular admin da empresa. Para criar login real, use convite/auth do Supabase.')
    await AuditoriaService.registrar('master.empresa.admin.vincular', 'perfis', data.id, { empresa_id: empresaId }).catch(() => null)
    return data
  },

  async registrarLogin() {
    const perfil = await getPerfilAtual().catch(() => null)
    const userId = await getCurrentUserId().catch(() => null)
    if (!perfil || !userId) return null
    const isMaster = Boolean(perfil.is_master || perfil.cargo === 'master_admin' || perfil.cargo === 'super_admin')
    if (!perfil.empresa_id && !isMaster) return null

    const updateQuery = db().from('perfis').update({ ultimo_login: new Date().toISOString() }).eq('id', userId)
    if (perfil.empresa_id) updateQuery.eq('empresa_id', perfil.empresa_id)
    await updateQuery

    try {
      if (perfil.empresa_id) {
        await db().from('logs_auditoria').insert({ empresa_id: perfil.empresa_id, usuario_id: userId, acao: 'auth.login', entidade: 'perfis', entidade_id: userId, detalhes: { papel: normalizarPapel(perfil.cargo, perfil.is_master) } })
      }
    } catch {}
    return perfil
  },
}
