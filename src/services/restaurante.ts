import { db, getCurrentUserId, getEmpresaId, getPerfilAtual, normalizeError } from './_base'
import { calcularPagamentoMisto, calcularTotalComanda, calcularTroco, money, type RestaurantPaymentInput } from '@/lib/restaurante-calculos'

export type RestaurantSector = 'atendimento' | 'cozinha' | 'bar_drinks' | 'caixa' | 'admin' | 'gerente'
export type TableStatus = 'livre' | 'ocupada' | 'aguardando_fechamento' | 'em_pagamento' | 'liberada' | 'bloqueada'
export type TabStatus = 'aberta' | 'itens_enviados' | 'aguardando_fechamento' | 'em_pagamento' | 'paga' | 'cancelada'
export type OrderStatus = 'novo' | 'em_preparo' | 'pronto' | 'retirado' | 'cancelado'
export type StaffSector = 'atendimento' | 'cozinha' | 'bar_drinks' | 'caixa' | 'gerente' | 'admin'

export type RestaurantTable = {
  id: string
  empresa_id?: string
  numero: string
  nome?: string | null
  status: TableStatus
  capacidade?: number | null
  total_atual?: number | null
  cliente_nome?: string | null
  garcom_nome?: string | null
  tempo_aberta_min?: number | null
  ativo?: boolean
  comanda_aberta_id?: string | null
}

export type RestaurantTab = {
  id: string
  empresa_id?: string
  mesa_id?: string | null
  mesa?: RestaurantTable | null
  cliente_id?: string | null
  operador_id?: string | null
  codigo: string
  tipo: 'mesa' | 'balcao' | 'delivery'
  status: TabStatus
  cliente_nome?: string | null
  pessoas?: number | null
  subtotal: number
  desconto: number
  taxa_servico: number
  total: number
  opened_at?: string | null
  closed_at?: string | null
  fechamento_solicitado_at?: string | null
  itens?: RestaurantTabItem[]
  pagamentos?: RestaurantTabPayment[]
}

export type RestaurantTabItem = {
  id: string
  empresa_id?: string
  comanda_id: string
  produto_id?: string | null
  nome_produto: string
  categoria?: string | null
  setor_producao: 'cozinha' | 'bar' | 'bar_drinks' | 'balcao' | 'nenhum'
  quantidade: number
  valor_unitario: number
  total: number
  observacao?: string | null
  status: 'pendente' | 'enviado' | 'preparando' | 'pronto' | 'entregue' | 'cancelado'
}

export type RestaurantOrder = {
  id: string
  empresa_id?: string
  comanda_id: string
  mesa_id?: string | null
  mesa_numero?: string | null
  codigo_comanda?: string | null
  garcom_nome?: string | null
  setor: 'cozinha' | 'bar' | 'bar_drinks'
  status: OrderStatus
  created_at?: string | null
  started_at?: string | null
  ready_at?: string | null
  delivered_at?: string | null
  itens?: RestaurantOrderItem[]
}

export type RestaurantOrderItem = {
  id: string
  order_id: string
  tab_item_id?: string
  nome_produto: string
  quantidade: number
  observacao?: string | null
  status?: string | null
}

export type RestaurantTabPayment = {
  id?: string
  forma_pagamento: string
  valor: number
  valor_recebido?: number | null
  troco?: number | null
}

export type RestaurantCashSession = {
  id: string
  empresa_id?: string
  operador_id?: string | null
  status: 'aberto' | 'fechado' | 'divergente' | 'conferido'
  valor_abertura: number
  valor_fechamento?: number | null
  valor_esperado_dinheiro?: number | null
  diferenca?: number | null
  observacao?: string | null
  opened_at?: string | null
  closed_at?: string | null
}

export type RestaurantNotification = {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'danger'
  target_sector?: RestaurantSector | string | null
  entity_type?: string | null
  entity_id?: string | null
  read_at?: string | null
  created_at?: string | null
}

export type RestaurantProduct = {
  id: string
  nome: string
  preco_venda?: number | null
  categoria?: string | null
  setor_producao?: 'cozinha' | 'bar' | 'bar_drinks' | 'balcao' | 'nenhum' | null
  disponivel?: boolean | null
  ativo?: boolean | null
  aparece_no_atendimento?: boolean | null
  ordem_atendimento?: number | null
}

export type RestaurantStaff = {
  id: string
  empresa_id?: string
  nome: string
  cpf?: string | null
  cpf_normalizado?: string | null
  setor: StaffSector
  cargo?: string | null
  pin_hash?: string | null
  ativo: boolean
  ultimo_acesso_em?: string | null
  created_at?: string | null
  updated_at?: string | null
}

function nowIso() {
  return new Date().toISOString()
}

function makeId(prefix = 'local') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function onlyDigits(value?: string | null): string {
  return String(value ?? '').replace(/\D/g, '')
}

function isMissingTable(error: any) {
  const msg = String(error?.message ?? error?.details ?? error ?? '')
  return msg.includes('does not exist') || msg.includes('relation') || msg.includes('schema cache') || msg.includes('PGRST') || msg.includes('column')
}

const ENABLE_DEMO_FALLBACK = process.env.NODE_ENV !== 'production'
function safeFallback<T>(rows: T[]): T[] {
  return ENABLE_DEMO_FALLBACK ? rows : []
}
function safeFallbackOne<T>(row: T | null): T | null {
  return ENABLE_DEMO_FALLBACK ? row : null
}

async function resolveEmpresaIdByValue(value?: string | null): Promise<string | null> {
  const clean = String(value ?? '').trim()
  if (!clean) return null
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean)
  try {
    let q: any = db().from('empresas').select('id,codigo_empresa,matricula_empresa').limit(1)
    q = uuidLike ? q.eq('id', clean) : q.or(`codigo_empresa.eq.${clean},matricula_empresa.eq.${clean}`)
    const { data, error } = await q.maybeSingle()
    if (error) return null
    return (data as any)?.id ?? null
  } catch {
    return null
  }
}

async function getOperationalEmpresaId(): Promise<string> {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('vf_nexus_empresa_operacional') || window.localStorage.getItem('vf_nexus_operational_empresa_id') || window.localStorage.getItem('vf_nexus_empresa_id') || window.localStorage.getItem('vf_nexus_empresa_codigo')
    const resolved = await resolveEmpresaIdByValue(stored)
    if (resolved) {
      window.localStorage.setItem('vf_nexus_empresa_operacional', resolved)
      return resolved
    }
  }
  try {
    return await getEmpresaId()
  } catch (error) {
    const perfil = await getPerfilAtual().catch(() => null)
    if (perfil?.is_master) throw new Error('Selecione uma empresa operacional pelo código/matrícula antes de usar o VF Nexus Atendimento.')
    throw error
  }
}

function getStoredStaffId(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem('vf_nexus_staff_id')
}

function getStoredStaffSessionId(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem('vf_nexus_staff_session_id')
}

async function getStaffSessionRow(): Promise<any | null> {
  const sessionId = getStoredStaffSessionId()
  if (!sessionId) return null
  const empresaId = await getOperationalEmpresaId().catch(() => null)
  if (!empresaId) return null
  const { data, error } = await db()
    .from('restaurant_staff_sessions')
    .select('id,empresa_id,staff_id,setor,ativo,expires_at')
    .eq('id', sessionId)
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .gt('expires_at', nowIso())
    .maybeSingle()
  if (error) {
    if (isMissingTable(error)) return null
    throw normalizeError(error, 'Sessão operacional inválida.')
  }
  if (!data) return null
  const { data: staff, error: staffError } = await db()
    .from('restaurant_staff')
    .select('id,ativo,setor,nome')
    .eq('id', (data as any).staff_id)
    .eq('empresa_id', empresaId)
    .maybeSingle()
  if (staffError && !isMissingTable(staffError)) throw normalizeError(staffError, 'Funcionário da sessão não pôde ser validado.')
  return { ...(data as any), staff: staff ?? null }
}

async function allowAuthenticatedManagerFallback(): Promise<boolean> {
  const perfil = await getPerfilAtual().catch(() => null)
  const cargo = String((perfil as any)?.cargo || '').toLowerCase()
  return Boolean((perfil as any)?.is_master || ['master_admin', 'super_admin', 'administrador', 'empresa_admin', 'dono', 'gerente'].includes(cargo))
}

async function exigirSetorPermitidoInterno(setoresPermitidos: StaffSector[]): Promise<any | null> {
  const sessao = await getStaffSessionRow()
  if (!sessao) {
    if (await allowAuthenticatedManagerFallback()) return null
    throw new Error('Sessão operacional expirada ou inválida. Entre novamente pelo login do funcionário.')
  }
  const setor = String(sessao.setor || sessao.staff?.setor || '') as StaffSector
  const permitido = setoresPermitidos.includes(setor) || ['gerente', 'admin'].includes(setor)
  if (!permitido) throw new Error(`Ação bloqueada para o setor ${setor}.`)
  if (sessao.staff && sessao.staff.ativo === false) throw new Error('Funcionário inativo. Ação bloqueada.')
  return sessao
}

async function getOperationalOperatorId(): Promise<string | null> {
  return getCurrentUserId().catch(() => null)
}

function normalizeTab(tab: any): RestaurantTab {
  const itens = ((tab?.itens ?? []) as any[]).filter((item) => item.status !== 'cancelado')
  return { ...tab, itens, subtotal: money(tab?.subtotal), taxa_servico: money(tab?.taxa_servico), desconto: money(tab?.desconto), total: money(tab?.total) } as RestaurantTab
}

const demoTables: RestaurantTable[] = Array.from({ length: 12 }).map((_, index) => {
  const numero = String(index + 1).padStart(2, '0')
  return { id: `demo-mesa-${numero}`, numero, nome: `Mesa ${numero}`, status: index === 1 || index === 4 || index === 6 ? 'ocupada' : index === 3 || index === 9 ? 'aguardando_fechamento' : 'livre', capacidade: index === 4 ? 6 : 4, total_atual: [0, 57, 0, 85, 103.4, 0, 148.7, 0, 0, 42.5, 0, 0][index], cliente_nome: index === 4 ? 'João da Silva' : index === 3 ? 'Ana Paula' : index === 6 ? 'Carlos Lima' : null }
})

const demoItems: RestaurantTabItem[] = [
  { id: 'demo-item-1', comanda_id: 'demo-tab-5', nome_produto: 'Cerveja Brahma 600ml', setor_producao: 'bar_drinks', quantidade: 2, valor_unitario: 12, total: 24, observacao: 'Gelada', status: 'enviado' },
  { id: 'demo-item-2', comanda_id: 'demo-tab-5', nome_produto: 'Porção de Batata Frita', setor_producao: 'cozinha', quantidade: 1, valor_unitario: 35, total: 35, observacao: 'Com cheddar', status: 'preparando' },
  { id: 'demo-item-3', comanda_id: 'demo-tab-5', nome_produto: 'Refrigerante lata', setor_producao: 'bar_drinks', quantidade: 1, valor_unitario: 7, total: 7, status: 'enviado' },
  { id: 'demo-item-4', comanda_id: 'demo-tab-5', nome_produto: 'X-Bacon', setor_producao: 'cozinha', quantidade: 1, valor_unitario: 28, total: 28, observacao: 'Sem cebola', status: 'pendente' },
]

const demoTabs: RestaurantTab[] = [
  { id: 'demo-tab-5', mesa_id: 'demo-mesa-05', mesa: demoTables[4], codigo: '000123', tipo: 'mesa', status: 'aguardando_fechamento', cliente_nome: 'João da Silva', pessoas: 3, subtotal: 94, desconto: 0, taxa_servico: 9.4, total: 103.4, opened_at: nowIso(), itens: demoItems },
  { id: 'demo-tab-4', mesa_id: 'demo-mesa-04', mesa: demoTables[3], codigo: '000120', tipo: 'mesa', status: 'aguardando_fechamento', cliente_nome: 'Ana Paula', pessoas: 2, subtotal: 85, desconto: 0, taxa_servico: 0, total: 85, opened_at: nowIso(), itens: [] },
]

const demoProducts: RestaurantProduct[] = [
  { id: 'prod-demo-1', nome: 'Cerveja Brahma 600ml', preco_venda: 12, categoria: 'Bebidas', setor_producao: 'bar_drinks', ativo: true, disponivel: true, aparece_no_atendimento: true },
  { id: 'prod-demo-2', nome: 'Porção de Batata Frita', preco_venda: 35, categoria: 'Porções', setor_producao: 'cozinha', ativo: true, disponivel: true, aparece_no_atendimento: true },
  { id: 'prod-demo-3', nome: 'Refrigerante lata', preco_venda: 7, categoria: 'Bebidas', setor_producao: 'bar_drinks', ativo: true, disponivel: true, aparece_no_atendimento: true },
  { id: 'prod-demo-4', nome: 'X-Bacon', preco_venda: 28, categoria: 'Comidas', setor_producao: 'cozinha', ativo: true, disponivel: true, aparece_no_atendimento: true },
  { id: 'prod-demo-5', nome: 'Água mineral', preco_venda: 4, categoria: 'Bebidas', setor_producao: 'bar_drinks', ativo: true, disponivel: true, aparece_no_atendimento: true },
  { id: 'prod-demo-6', nome: 'Filé mignon acebolado', preco_venda: 52, categoria: 'Comidas', setor_producao: 'cozinha', ativo: true, disponivel: true, aparece_no_atendimento: true },
]

const demoOrders: RestaurantOrder[] = [
  { id: 'demo-order-1', comanda_id: 'demo-tab-5', mesa_id: 'demo-mesa-05', mesa_numero: '05', codigo_comanda: '000123', setor: 'cozinha', status: 'novo', created_at: nowIso(), garcom_nome: 'João Silva', itens: [
    { id: 'demo-order-item-1', order_id: 'demo-order-1', nome_produto: 'X-Bacon', quantidade: 1, observacao: 'Sem cebola' },
    { id: 'demo-order-item-2', order_id: 'demo-order-1', nome_produto: 'Porção de Batata Frita', quantidade: 1, observacao: 'Com cheddar' },
  ] },
  { id: 'demo-order-2', comanda_id: 'demo-tab-2', mesa_id: 'demo-mesa-02', mesa_numero: '02', codigo_comanda: '000120', setor: 'cozinha', status: 'em_preparo', created_at: nowIso(), started_at: nowIso(), garcom_nome: 'Marina', itens: [
    { id: 'demo-order-item-3', order_id: 'demo-order-2', nome_produto: 'Filé mignon acebolado', quantidade: 1 },
  ] },
  { id: 'demo-order-3', comanda_id: 'demo-tab-7', mesa_id: 'demo-mesa-07', mesa_numero: '07', codigo_comanda: '000121', setor: 'cozinha', status: 'pronto', created_at: nowIso(), ready_at: nowIso(), garcom_nome: 'Pedro', itens: [
    { id: 'demo-order-item-4', order_id: 'demo-order-3', nome_produto: 'Parmegiana', quantidade: 1 },
  ] },
  { id: 'demo-order-4', comanda_id: 'demo-tab-5', mesa_id: 'demo-mesa-05', mesa_numero: '05', codigo_comanda: '000123', setor: 'bar_drinks', status: 'novo', created_at: nowIso(), garcom_nome: 'João Silva', itens: [
    { id: 'demo-order-item-5', order_id: 'demo-order-4', nome_produto: 'Cerveja Brahma 600ml', quantidade: 2, observacao: 'Bem gelada' },
    { id: 'demo-order-item-6', order_id: 'demo-order-4', nome_produto: 'Caipirinha limão', quantidade: 1 },
  ] },
]

function demoCash(): RestaurantCashSession {
  return { id: 'demo-cash-1', status: 'aberto', valor_abertura: 200, valor_esperado_dinheiro: 730, opened_at: nowIso() }
}

export const RestauranteService = {
  async getEmpresaOperacional(): Promise<string> {
    return getOperationalEmpresaId()
  },

  async getStaffSession(): Promise<any | null> {
    return getStaffSessionRow()
  },

  async validarStaffSession(setor?: StaffSector): Promise<boolean> {
    const sessao = await getStaffSessionRow()
    if (!sessao) return allowAuthenticatedManagerFallback()
    if (!setor) return true
    const setorSessao = String(sessao.setor || sessao.staff?.setor || '') as StaffSector
    return setorSessao === setor || ['gerente', 'admin'].includes(setorSessao)
  },

  async exigirSetorPermitido(setoresPermitidos: StaffSector[]): Promise<void> {
    await exigirSetorPermitidoInterno(setoresPermitidos)
  },

  async getStaffEmpresaId(): Promise<string> {
    const sessao = await getStaffSessionRow()
    return sessao?.empresa_id || getOperationalEmpresaId()
  },

  async encerrarStaffSession(): Promise<void> {
    const sessionId = getStoredStaffSessionId()
    if (sessionId) { try { await db().from('restaurant_staff_sessions').update({ ativo: false, ended_at: nowIso() }).eq('id', sessionId) } catch {} }
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('vf_nexus_staff_session_id')
      window.localStorage.removeItem('vf_nexus_staff_id')
      window.localStorage.removeItem('vf_nexus_staff_nome')
      window.localStorage.removeItem('vf_nexus_staff_setor')
    }
  },

  async listarMesas(): Promise<RestaurantTable[]> {
    const empresaId = await getOperationalEmpresaId().catch(() => '')
    try {
      const { data, error } = await db().from('restaurant_tables').select('*').eq('empresa_id', empresaId).eq('ativo', true).order('numero')
      if (error) throw error
      const tables = (data ?? []) as RestaurantTable[]
      return tables.length ? tables : await this.criarMesasPadrao(12)
    } catch (error) {
      if (!isMissingTable(error)) console.warn(error)
      return safeFallback(demoTables)
    }
  },

  async criarMesasPadrao(total = 12): Promise<RestaurantTable[]> {
    const empresaId = await getOperationalEmpresaId().catch(() => '')
    try {
      const rows = Array.from({ length: total }).map((_, index) => ({ empresa_id: empresaId, numero: String(index + 1).padStart(2, '0'), nome: `Mesa ${String(index + 1).padStart(2, '0')}`, status: 'livre', capacidade: 4, ativo: true }))
      const { data, error } = await db().from('restaurant_tables').insert(rows).select('*')
      if (error) throw error
      return (data ?? []) as RestaurantTable[]
    } catch (error) {
      if (!isMissingTable(error)) console.warn(error)
      return safeFallback(demoTables)
    }
  },

  async salvarMesa(form: Partial<RestaurantTable>): Promise<RestaurantTable> {
    const empresaId = await getOperationalEmpresaId()
    const payload = { empresa_id: empresaId, numero: String(form.numero ?? '').padStart(2, '0'), nome: form.nome || `Mesa ${form.numero}`, capacidade: form.capacidade ?? 4, status: form.status ?? 'livre', ativo: form.ativo ?? true, updated_at: nowIso() }
    try {
      if (form.id) {
        const { data, error } = await db().from('restaurant_tables').update(payload).eq('empresa_id', empresaId).eq('id', form.id).select().single()
        if (error) throw error
        return data as RestaurantTable
      }
      const { data, error } = await db().from('restaurant_tables').insert({ ...payload, created_at: nowIso() }).select().single()
      if (error) throw error
      return data as RestaurantTable
    } catch (error) {
      if (!isMissingTable(error) || !ENABLE_DEMO_FALLBACK) throw normalizeError(error, 'Erro ao salvar mesa.')
      return { id: form.id ?? makeId('mesa'), ...payload } as RestaurantTable
    }
  },

  async buscarComandaAbertaDaMesa(mesaId: string): Promise<RestaurantTab | null> {
    const empresaId = await getOperationalEmpresaId().catch(() => '')
    try {
      const { data, error } = await db().from('restaurant_tabs').select('*, mesa:restaurant_tables(*), itens:restaurant_tab_items(*), pagamentos:restaurant_tab_payments(*)').eq('empresa_id', empresaId).eq('mesa_id', mesaId).in('status', ['aberta', 'itens_enviados', 'aguardando_fechamento', 'em_pagamento']).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      return data ? normalizeTab(data) : null
    } catch (error) {
      if (!isMissingTable(error)) console.warn(error)
      return safeFallbackOne(demoTabs.find((tab) => tab.mesa_id === mesaId) ?? null)
    }
  },

  async abrirComanda(form: { mesa_id?: string | null; cliente_nome?: string; pessoas?: number; tipo?: 'mesa' | 'balcao' | 'delivery'; observacao?: string }): Promise<RestaurantTab> {
    await exigirSetorPermitidoInterno(['atendimento', 'gerente', 'admin'])
    const empresaId = await getOperationalEmpresaId()
    const operatorId = await getOperationalOperatorId()
    const isMesa = Boolean(form.mesa_id)
    if (isMesa) {
      const existing = await this.buscarComandaAbertaDaMesa(form.mesa_id as string)
      if (existing) return existing
    }
    const codigo = String(Date.now()).slice(-6)
    const payload = {
      empresa_id: empresaId,
      mesa_id: isMesa ? form.mesa_id : null,
      operador_id: operatorId,
      staff_id: getStoredStaffId(),
      codigo,
      tipo: isMesa ? 'mesa' : (form.tipo ?? 'balcao'),
      status: 'aberta',
      cliente_nome: form.cliente_nome || null,
      pessoas: form.pessoas || null,
      subtotal: 0,
      desconto: 0,
      taxa_servico: 0,
      total: 0,
      opened_at: nowIso(),
    }
    try {
      const { data, error } = await db().from('restaurant_tabs').insert(payload).select('*, mesa:restaurant_tables(*), itens:restaurant_tab_items(*)').single()
      if (error) throw error
      if (isMesa) await db().from('restaurant_tables').update({ status: 'ocupada', total_atual: 0, cliente_nome: form.cliente_nome || null, updated_at: nowIso() }).eq('empresa_id', empresaId).eq('id', form.mesa_id)
      return normalizeTab(data)
    } catch (error) {
      if (!isMissingTable(error) || !ENABLE_DEMO_FALLBACK) throw normalizeError(error, 'Erro ao abrir comanda.')
      return { id: makeId('tab'), codigo, tipo: payload.tipo as any, mesa_id: payload.mesa_id, mesa: isMesa ? demoTables.find((t) => t.id === form.mesa_id) ?? null : null, status: 'aberta', cliente_nome: form.cliente_nome, pessoas: form.pessoas, subtotal: 0, desconto: 0, taxa_servico: 0, total: 0, opened_at: nowIso(), itens: [] }
    }
  },

  async listarComandas(status?: TabStatus | 'todas'): Promise<RestaurantTab[]> {
    const empresaId = await getOperationalEmpresaId().catch(() => '')
    try {
      let q: any = db().from('restaurant_tabs').select('*, mesa:restaurant_tables(*), itens:restaurant_tab_items(*), pagamentos:restaurant_tab_payments(*)').eq('empresa_id', empresaId).neq('status', 'paga').neq('status', 'cancelada').order('created_at', { ascending: false }).limit(200)
      if (status && status !== 'todas') q = q.eq('status', status)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []).map(normalizeTab)
    } catch (error) {
      if (!isMissingTable(error)) console.warn(error)
      return safeFallback(status && status !== 'todas' ? demoTabs.filter((tab) => tab.status === status) : demoTabs)
    }
  },

  async buscarComanda(id: string): Promise<RestaurantTab | null> {
    const empresaId = await getOperationalEmpresaId().catch(() => '')
    if (id.startsWith('demo')) return safeFallbackOne(demoTabs.find((tab) => tab.id === id) ?? demoTabs[0])
    try {
      const { data, error } = await db().from('restaurant_tabs').select('*, mesa:restaurant_tables(*), itens:restaurant_tab_items(*), pagamentos:restaurant_tab_payments(*)').eq('empresa_id', empresaId).eq('id', id).maybeSingle()
      if (error) throw error
      return data ? normalizeTab(data) : null
    } catch (error) {
      if (!isMissingTable(error)) console.warn(error)
      return safeFallbackOne(demoTabs[0])
    }
  },

  async listarProdutos(search?: string): Promise<RestaurantProduct[]> {
    const empresaId = await getOperationalEmpresaId().catch(() => '')
    try {
      let q: any = db().from('produtos').select('id,nome,preco_venda,categoria,setor_producao,disponivel,ativo,aparece_no_atendimento,ordem_atendimento').eq('empresa_id', empresaId).eq('ativo', true).order('ordem_atendimento', { ascending: true }).order('nome')
      q = q.or('aparece_no_atendimento.is.null,aparece_no_atendimento.eq.true')
      if (search?.trim()) q = q.ilike('nome', `%${search.trim()}%`)
      const { data, error } = await q.limit(100)
      if (error) throw error
      return (data ?? []) as RestaurantProduct[]
    } catch (error) {
      if (!isMissingTable(error)) console.warn(error)
      const s = search?.trim().toLowerCase()
      return safeFallback(s ? demoProducts.filter((p) => p.nome.toLowerCase().includes(s)) : demoProducts)
    }
  },

  async adicionarItem(comandaId: string, product: RestaurantProduct, quantidade = 1, observacao?: string): Promise<RestaurantTabItem> {
    await exigirSetorPermitidoInterno(['atendimento', 'gerente', 'admin'])
    const empresaId = await getOperationalEmpresaId()
    const total = money(quantidade * money(product.preco_venda))
    const payload = {
      empresa_id: empresaId,
      comanda_id: comandaId,
      produto_id: product.id,
      nome_produto: product.nome,
      categoria: product.categoria ?? null,
      setor_producao: product.setor_producao ?? 'balcao',
      quantidade,
      valor_unitario: money(product.preco_venda),
      total,
      observacao: observacao || null,
      status: 'pendente',
    }
    try {
      const { data, error } = await db().from('restaurant_tab_items').insert(payload).select().single()
      if (error) throw error
      await this.recalcularComanda(comandaId)
      return data as RestaurantTabItem
    } catch (error) {
      if (!isMissingTable(error) || !ENABLE_DEMO_FALLBACK) throw normalizeError(error, 'Erro ao adicionar item.')
      return { id: makeId('item'), ...payload } as RestaurantTabItem
    }
  },

  async atualizarQuantidadeItem(itemId: string, quantidade: number): Promise<void> {
    await exigirSetorPermitidoInterno(['atendimento', 'gerente', 'admin'])
    const empresaId = await getOperationalEmpresaId()
    if (itemId.startsWith('demo')) return
    const novaQuantidade = money(quantidade)
    if (novaQuantidade <= 0) return this.removerItem(itemId, 'Quantidade zerada')
    try {
      const { data: item, error: getError } = await db().from('restaurant_tab_items').select('id,comanda_id,valor_unitario').eq('empresa_id', empresaId).eq('id', itemId).maybeSingle()
      if (getError) throw getError
      if (!item) throw new Error('Item não encontrado.')
      const total = money(novaQuantidade * money((item as any).valor_unitario))
      await db().from('restaurant_tab_items').update({ quantidade: novaQuantidade, total, updated_at: nowIso() }).eq('empresa_id', empresaId).eq('id', itemId).throwOnError()
      await this.recalcularComanda((item as any).comanda_id)
    } catch (error) {
      if (!isMissingTable(error)) throw normalizeError(error, 'Erro ao atualizar quantidade do item.')
    }
  },

  async removerItem(itemId: string, motivo = 'Removido pelo atendimento'): Promise<void> {
    await exigirSetorPermitidoInterno(['atendimento', 'gerente', 'admin'])
    const empresaId = await getOperationalEmpresaId()
    if (itemId.startsWith('demo')) return
    try {
      const { data: item, error: getError } = await db().from('restaurant_tab_items').select('id,comanda_id').eq('empresa_id', empresaId).eq('id', itemId).maybeSingle()
      if (getError) throw getError
      if (!item) throw new Error('Item não encontrado.')
      await db().from('restaurant_tab_items').update({ status: 'cancelado', quantidade: 0, total: 0, cancelado_at: nowIso(), cancelado_motivo: motivo, updated_at: nowIso() }).eq('empresa_id', empresaId).eq('id', itemId).throwOnError()
      await this.recalcularComanda((item as any).comanda_id)
    } catch (error) {
      if (!isMissingTable(error)) throw normalizeError(error, 'Erro ao remover item.')
    }
  },

  async atualizarObservacaoItem(itemId: string, observacao: string): Promise<void> {
    const empresaId = await getOperationalEmpresaId()
    if (itemId.startsWith('demo')) return
    try {
      await db().from('restaurant_tab_items').update({ observacao: observacao || null, updated_at: nowIso() }).eq('empresa_id', empresaId).eq('id', itemId).throwOnError()
    } catch (error) {
      if (!isMissingTable(error)) throw normalizeError(error, 'Erro ao salvar observação.')
    }
  },

  async recalcularComanda(comandaId: string) {
    const empresaId = await getOperationalEmpresaId().catch(() => '')
    const comanda = await this.buscarComanda(comandaId)
    if (!comanda) return null
    const calc = calcularTotalComanda({ items: comanda.itens ?? [], desconto: comanda.desconto, taxaPercentual: 10, cobrarTaxa: true })
    try {
      await db().from('restaurant_tabs').update({ ...calc, updated_at: nowIso() }).eq('empresa_id', empresaId).eq('id', comandaId).throwOnError()
      if (comanda.mesa_id) await db().from('restaurant_tables').update({ total_atual: calc.total, updated_at: nowIso() }).eq('empresa_id', empresaId).eq('id', comanda.mesa_id)
    } catch {}
    return calc
  },

  async enviarParaCozinha(comandaId: string): Promise<void> {
    await exigirSetorPermitidoInterno(['atendimento', 'gerente', 'admin'])
    const empresaId = await getOperationalEmpresaId()
    const tab = await this.buscarComanda(comandaId)
    if (!tab) throw new Error('Comanda não encontrada.')
    const itens = (tab.itens ?? []).filter((item) => item.status === 'pendente' && ['cozinha', 'bar', 'bar_drinks'].includes(item.setor_producao))
    if (!itens.length) throw new Error('Nenhum item pendente para enviar à cozinha/bar.')
    const grupos = itens.reduce<Record<string, RestaurantTabItem[]>>((acc, item) => {
      const setor = (item.setor_producao === 'bar' || item.setor_producao === 'bar_drinks') ? 'bar_drinks' : 'cozinha'
      acc[setor] = [...(acc[setor] ?? []), item]
      return acc
    }, {})
    try {
      for (const [setor, grupo] of Object.entries(grupos)) {
        const { data: order, error } = await db().from('restaurant_orders').insert({ empresa_id: empresaId, comanda_id: comandaId, mesa_id: tab.mesa_id ?? null, setor, status: 'novo' }).select().single()
        if (error) throw error
        await db().from('restaurant_order_items').insert(grupo.map((item) => ({ empresa_id: empresaId, order_id: order.id, tab_item_id: item.id, nome_produto: item.nome_produto, quantidade: item.quantidade, observacao: item.observacao ?? null, status: 'novo' }))).throwOnError()
      }
      await db().from('restaurant_tab_items').update({ status: 'enviado', enviado_at: nowIso(), updated_at: nowIso() }).eq('empresa_id', empresaId).eq('comanda_id', comandaId).eq('status', 'pendente').in('setor_producao', ['cozinha', 'bar', 'bar_drinks']).throwOnError()
      await db().from('restaurant_tabs').update({ status: 'itens_enviados', updated_at: nowIso() }).eq('empresa_id', empresaId).eq('id', comandaId).throwOnError()
      if (grupos.cozinha?.length) await this.notificar({ target_sector: 'cozinha', title: 'Novo pedido cozinha', message: `${tab.mesa?.nome ?? 'Balcão'} · Comanda ${tab.codigo} enviada para cozinha.`, type: 'danger', entity_type: 'comanda', entity_id: comandaId })
      if (grupos.bar_drinks?.length) await this.notificar({ target_sector: 'bar_drinks', title: 'Novo pedido bar/drinks', message: `${tab.mesa?.nome ?? 'Balcão'} · Comanda ${tab.codigo} enviada para o bar.`, type: 'danger', entity_type: 'comanda', entity_id: comandaId })
    } catch (error) {
      if (!isMissingTable(error)) throw normalizeError(error, 'Erro ao enviar pedido para cozinha/bar.')
    }
  },

  async solicitarFechamento(comandaId: string): Promise<void> {
    await exigirSetorPermitidoInterno(['atendimento', 'gerente', 'admin'])
    const empresaId = await getOperationalEmpresaId()
    const tab = await this.buscarComanda(comandaId)
    if (!tab) throw new Error('Comanda não encontrada.')
    try {
      await db().from('restaurant_tabs').update({ status: 'aguardando_fechamento', fechamento_solicitado_at: nowIso(), updated_at: nowIso() }).eq('empresa_id', empresaId).eq('id', comandaId).throwOnError()
      if (tab.mesa_id) await db().from('restaurant_tables').update({ status: 'aguardando_fechamento', total_atual: tab.total, updated_at: nowIso() }).eq('empresa_id', empresaId).eq('id', tab.mesa_id).throwOnError()
      await this.notificar({ target_sector: 'caixa', title: 'Fechamento solicitado', message: `${tab.mesa?.nome ?? 'Venda balcão'} solicitou fechamento de ${money(tab.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`, type: 'warning', entity_type: 'comanda', entity_id: comandaId })
    } catch (error) {
      if (!isMissingTable(error)) throw normalizeError(error, 'Erro ao solicitar fechamento.')
    }
  },

  async listarPedidosProducao(setor: 'cozinha' | 'bar_drinks', status?: OrderStatus | 'todos'): Promise<RestaurantOrder[]> {
    const empresaId = await getOperationalEmpresaId().catch(() => '')
    try {
      let q: any = db().from('restaurant_orders').select('*, mesa:restaurant_tables(numero,nome), comanda:restaurant_tabs(codigo,cliente_nome), itens:restaurant_order_items(*)').eq('empresa_id', empresaId).eq('setor', setor).order('created_at', { ascending: true })
      if (status && status !== 'todos') q = q.eq('status', status)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []).map((order: any) => ({ ...order, mesa_numero: order.mesa?.numero ?? order.mesa_numero, codigo_comanda: order.comanda?.codigo ?? order.codigo_comanda })) as RestaurantOrder[]
    } catch (error) {
      if (!isMissingTable(error)) console.warn(error)
      const list = demoOrders.filter((o) => setor === 'bar_drinks' ? (o.setor === 'bar_drinks' || o.setor === 'bar') : o.setor === 'cozinha')
      return safeFallback(status && status !== 'todos' ? list.filter((o) => o.status === status) : list)
    }
  },

  async listarPedidosCozinha(status?: OrderStatus | 'todos'): Promise<RestaurantOrder[]> {
    return this.listarPedidosProducao('cozinha', status)
  },

  async listarPedidosBarDrinks(status?: OrderStatus | 'todos'): Promise<RestaurantOrder[]> {
    return this.listarPedidosProducao('bar_drinks', status)
  },

  async atualizarPedido(orderId: string, status: OrderStatus): Promise<void> {
    await exigirSetorPermitidoInterno(['cozinha', 'bar_drinks', 'gerente', 'admin'])
    const empresaId = await getOperationalEmpresaId()
    const operatorId = await getOperationalOperatorId()
    const patch: Record<string, any> = { status, updated_at: nowIso() }
    if (status === 'em_preparo') { patch.started_at = nowIso(); patch.operador_preparo_id = operatorId; patch.staff_preparo_id = getStoredStaffId() }
    if (status === 'pronto') patch.ready_at = nowIso()
    if (status === 'retirado') patch.delivered_at = nowIso()
    try {
      await db().from('restaurant_orders').update(patch).eq('empresa_id', empresaId).eq('id', orderId).throwOnError()
      if (status === 'pronto') {
        await this.notificar({ target_sector: 'atendimento', title: 'Pedido pronto', message: 'Pedido pronto para retirada.', type: 'success', entity_type: 'pedido', entity_id: orderId })
        await this.notificar({ target_sector: 'caixa', title: 'Pedido pronto', message: 'Pedido pronto para retirada.', type: 'success', entity_type: 'pedido', entity_id: orderId })
      }
    } catch (error) {
      if (!isMissingTable(error)) throw normalizeError(error, 'Erro ao atualizar pedido.')
    }
  },

  async caixaAberto(): Promise<RestaurantCashSession | null> {
    const empresaId = await getOperationalEmpresaId().catch(() => '')
    try {
      const { data, error } = await db().from('restaurant_cash_sessions').select('*').eq('empresa_id', empresaId).eq('status', 'aberto').order('opened_at', { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      return data as RestaurantCashSession | null
    } catch (error) {
      if (!isMissingTable(error)) console.warn(error)
      return safeFallbackOne(demoCash())
    }
  },

  async abrirCaixa(valorAbertura: number): Promise<RestaurantCashSession> {
    await exigirSetorPermitidoInterno(['caixa', 'gerente', 'admin'])
    const empresaId = await getOperationalEmpresaId()
    const operatorId = await getOperationalOperatorId()
    try {
      const { data, error } = await db().from('restaurant_cash_sessions').insert({ empresa_id: empresaId, operador_id: operatorId, status: 'aberto', valor_abertura: money(valorAbertura), valor_esperado_dinheiro: money(valorAbertura), opened_at: nowIso() }).select().single()
      if (error) throw error
      return data as RestaurantCashSession
    } catch (error) {
      if (!isMissingTable(error) || !ENABLE_DEMO_FALLBACK) throw normalizeError(error, 'Erro ao abrir caixa.')
      return safeFallbackOne({ ...demoCash(), valor_abertura: money(valorAbertura), valor_esperado_dinheiro: money(valorAbertura) }) as RestaurantCashSession
    }
  },

  async finalizarPagamento(comandaId: string, pagamentos: RestaurantPaymentInput[]): Promise<void> {
    await exigirSetorPermitidoInterno(['caixa', 'gerente', 'admin'])
    const empresaId = await getOperationalEmpresaId()
    const caixa = await this.caixaAberto()
    if (!caixa) throw new Error('Abra o caixa antes de finalizar pagamentos.')
    const tab = await this.buscarComanda(comandaId)
    if (!tab) throw new Error('Comanda não encontrada.')
    const total = money(tab.total)
    const resumo = calcularPagamentoMisto(total, pagamentos)
    if (!resumo.quitado) throw new Error('O pagamento ainda não cobre o total da comanda.')
    try {
      const payload = pagamentos.map((p) => ({ empresa_id: empresaId, comanda_id: comandaId, caixa_id: caixa.id, forma_pagamento: p.forma_pagamento, valor: money(p.valor), valor_recebido: money(p.valor_recebido ?? p.valor), troco: p.forma_pagamento === 'dinheiro' ? calcularTroco(p.valor, p.valor_recebido ?? p.valor) : 0 }))
      await db().from('restaurant_tab_payments').insert(payload).throwOnError()
      await db().from('restaurant_cash_movements').insert(payload.map((p) => ({ empresa_id: empresaId, caixa_id: caixa.id, tipo: 'venda', forma_pagamento: p.forma_pagamento, valor: p.valor, descricao: `Comanda ${tab.codigo}`, comanda_id: comandaId }))).throwOnError()
      await db().from('restaurant_tabs').update({ status: 'paga', closed_at: nowIso(), updated_at: nowIso() }).eq('empresa_id', empresaId).eq('id', comandaId).throwOnError()
      if (tab.mesa_id) await db().from('restaurant_tables').update({ status: 'livre', total_atual: 0, cliente_nome: null, updated_at: nowIso() }).eq('empresa_id', empresaId).eq('id', tab.mesa_id).throwOnError()
      await this.notificar({ target_sector: 'atendimento', title: 'Mesa liberada', message: `Comanda ${tab.codigo} foi paga e finalizada.`, type: 'success', entity_type: 'comanda', entity_id: comandaId })
    } catch (error) {
      if (!isMissingTable(error)) throw normalizeError(error, 'Erro ao finalizar pagamento.')
    }
  },

  async fecharCaixa(form: { dinheiro_informado: number; observacao?: string }): Promise<RestaurantCashSession> {
    await exigirSetorPermitidoInterno(['caixa', 'gerente', 'admin'])
    const caixa = await this.caixaAberto()
    if (!caixa) throw new Error('Nenhum caixa aberto encontrado.')
    const empresaId = await getOperationalEmpresaId()
    const diferenca = money(form.dinheiro_informado - money(caixa.valor_esperado_dinheiro ?? caixa.valor_abertura))
    try {
      const { data, error } = await db().from('restaurant_cash_sessions').update({ status: diferenca === 0 ? 'conferido' : 'divergente', valor_fechamento: money(form.dinheiro_informado), diferenca, observacao: form.observacao || null, closed_at: nowIso(), updated_at: nowIso() }).eq('empresa_id', empresaId).eq('id', caixa.id).select().single()
      if (error) throw error
      return data as RestaurantCashSession
    } catch (error) {
      if (!isMissingTable(error) || !ENABLE_DEMO_FALLBACK) throw normalizeError(error, 'Erro ao fechar caixa.')
      return { ...caixa, status: diferenca === 0 ? 'conferido' : 'divergente', valor_fechamento: form.dinheiro_informado, diferenca, observacao: form.observacao, closed_at: nowIso() }
    }
  },

  async listarFuncionarios(): Promise<RestaurantStaff[]> {
    const empresaId = await getOperationalEmpresaId().catch(() => '')
    try {
      const { data, error } = await db().from('restaurant_staff').select('*').eq('empresa_id', empresaId).order('nome')
      if (error) throw error
      return (data ?? []) as RestaurantStaff[]
    } catch (error) {
      if (!isMissingTable(error)) console.warn(error)
      return []
    }
  },

  async salvarFuncionario(form: Partial<RestaurantStaff>): Promise<RestaurantStaff> {
    const empresaId = await getOperationalEmpresaId()
    const cpfNormalizado = onlyDigits(form.cpf)
    const payload = { empresa_id: empresaId, nome: String(form.nome ?? '').trim(), cpf: form.cpf ?? null, cpf_normalizado: cpfNormalizado, setor: (String(form.setor ?? 'atendimento') === 'bar' ? 'bar_drinks' : (form.setor ?? 'atendimento')), cargo: form.cargo || form.setor || null, pin_hash: form.pin_hash || null, ativo: form.ativo ?? true, updated_at: nowIso() }
    if (!payload.nome || cpfNormalizado.length < 11) throw new Error('Informe nome completo e CPF válido.')
    try {
      if (form.id) {
        const { data, error } = await db().from('restaurant_staff').update(payload).eq('empresa_id', empresaId).eq('id', form.id).select().single()
        if (error) throw error
        return data as RestaurantStaff
      }
      const { data, error } = await db().from('restaurant_staff').insert({ ...payload, created_at: nowIso() }).select().single()
      if (error) throw error
      return data as RestaurantStaff
    } catch (error) {
      if (!isMissingTable(error) || !ENABLE_DEMO_FALLBACK) throw normalizeError(error, 'Erro ao salvar funcionário.')
      return { id: form.id ?? makeId('staff'), ...payload } as RestaurantStaff
    }
  },

  async loginFuncionario(input: { nome: string; cpf: string; codigo_empresa?: string }): Promise<RestaurantStaff> {
    const cpfNormalizado = onlyDigits(input.cpf)
    const nomeBusca = String(input.nome ?? '').trim()
    const codigo = input.codigo_empresa?.trim()
    if (!nomeBusca || cpfNormalizado.length < 11) throw new Error('Informe nome completo e CPF válido.')

    try {
      let empresaId = codigo ? await resolveEmpresaIdByValue(codigo) : null
      if (!empresaId && typeof window !== 'undefined') {
        empresaId = await resolveEmpresaIdByValue(window.localStorage.getItem('vf_nexus_empresa_operacional') || window.localStorage.getItem('vf_nexus_empresa_codigo'))
      }
      if (!empresaId) {
        throw new Error('Informe o código/matrícula da empresa para entrar no login operacional.')
      }

      let staff: RestaurantStaff | null = null
      const { data: rpcData, error: rpcError } = await db().rpc('vf_restaurante_login_staff', { p_nome: nomeBusca, p_cpf: cpfNormalizado, p_codigo_empresa: codigo || null }).maybeSingle()
      if (!rpcError && rpcData && (rpcData as RestaurantStaff).empresa_id === empresaId) staff = rpcData as RestaurantStaff

      if (!staff) {
        const { data, error } = await db()
          .from('restaurant_staff')
          .select('*')
          .eq('empresa_id', empresaId)
          .eq('cpf_normalizado', cpfNormalizado)
          .eq('ativo', true)
          .limit(1)
          .maybeSingle()
        if (error) throw error
        staff = data as RestaurantStaff | null
      }

      if (!staff) throw new Error('Funcionário não encontrado ou inativo nesta empresa.')
      if (!staff.empresa_id || staff.empresa_id !== empresaId) throw new Error('Funcionário não pertence à empresa informada.')
      if (nomeBusca && !staff.nome.toLowerCase().includes(nomeBusca.toLowerCase().split(' ')[0])) throw new Error('Nome não confere com o CPF informado.')

      let sessionId: string | null = (staff as any)?.session_id || null
      try {
        sessionId = sessionId || crypto.randomUUID()
        await db().from('restaurant_staff_sessions').insert({
          id: sessionId,
          empresa_id: empresaId,
          staff_id: staff.id,
          setor: staff.setor,
          ativo: true,
          created_at: nowIso(),
          expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        })
      } catch {}

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('vf_nexus_staff_id', staff.id)
        window.localStorage.setItem('vf_nexus_staff_nome', staff.nome)
        window.localStorage.setItem('vf_nexus_staff_setor', staff.setor)
        window.localStorage.setItem('vf_nexus_empresa_operacional', staff.empresa_id)
        if (sessionId) window.localStorage.setItem('vf_nexus_staff_session_id', sessionId)
        if (codigo) window.localStorage.setItem('vf_nexus_empresa_codigo', codigo)
      }
      await db().from('restaurant_staff').update({ ultimo_acesso_em: nowIso(), updated_at: nowIso() }).eq('empresa_id', empresaId).eq('id', staff.id)
      return staff
    } catch (error) {
      if (!isMissingTable(error)) throw normalizeError(error, 'Não foi possível acessar o setor.')
      throw error
    }
  },

  async notificar(input: Omit<RestaurantNotification, 'id' | 'created_at'>): Promise<void> {
    const empresaId = await getOperationalEmpresaId().catch(() => null)
    if (!empresaId) return
    try {
      await db().from('restaurant_notifications').insert({ empresa_id: empresaId, ...input, created_at: nowIso() })
    } catch {}
  },

  async listarNotificacoes(setor?: RestaurantSector): Promise<RestaurantNotification[]> {
    const empresaId = await getOperationalEmpresaId().catch(() => '')
    try {
      let q: any = db().from('restaurant_notifications').select('*').eq('empresa_id', empresaId).is('read_at', null).order('created_at', { ascending: false }).limit(30)
      if (setor) q = q.in('target_sector', [setor, 'todos'])
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as RestaurantNotification[]
    } catch {
      return []
    }
  },

  async marcarNotificacaoLida(id: string): Promise<void> {
    const empresaId = await getOperationalEmpresaId().catch(() => '')
    try {
      await db().from('restaurant_notifications').update({ read_at: nowIso() }).eq('empresa_id', empresaId).eq('id', id).throwOnError()
    } catch (error) {
      if (!isMissingTable(error)) throw normalizeError(error, 'Erro ao marcar notificação como lida.')
    }
  },

  async marcarNotificacoesLidas(setor?: RestaurantSector): Promise<void> {
    const empresaId = await getOperationalEmpresaId().catch(() => '')
    try {
      let q: any = db().from('restaurant_notifications').update({ read_at: nowIso() }).eq('empresa_id', empresaId).is('read_at', null)
      if (setor) q = q.in('target_sector', [setor, 'todos'])
      await q.throwOnError()
    } catch (error) {
      if (!isMissingTable(error)) throw normalizeError(error, 'Erro ao limpar notificações.')
    }
  },
}
