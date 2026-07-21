import type { FeatureKey, FeatureDefinition } from '@/lib/modules'

export type RamoAtividade =
  | 'bar_restaurante'
  | 'barbearia'
  | 'confeitaria'
  | 'roupas'
  | 'eletronicos'
  | 'prestador_servicos'
  | 'autonomo'

export type ModuloCodigo = FeatureKey | 'atendimento' | 'cozinha' | 'bar-drinks' | 'caixa'

export type RamoDefinition = {
  id: RamoAtividade
  tipoEmpresa: string
  nome: string
  curto: string
  descricao: string
  loginTitle: string
  loginSubtitle: string
  icon: string
  color: string
  gradient: string
  modules: ModuloCodigo[]
  dashboardCards: Array<{ label: string; hint: string; icon: string }>
}

export const RAMOS_ATIVIDADE: RamoDefinition[] = [
  {
    id: 'bar_restaurante', tipoEmpresa: 'restaurante', nome: 'Bar / Restaurante', curto: 'Bares e Restaurantes', icon: 'BR', color: '#F2B72E', gradient: 'from-amber-400 via-orange-500 to-red-500',
    descricao: 'Mesas, comandas, cozinha, bar, caixa e atendimento rápido.',
    loginTitle: 'Bem-vindo ao VF Nexus para Bares e Restaurantes',
    loginSubtitle: 'Entre para acessar atendimento, cozinha, bar/drinks, caixa e gestão.',
    modules: ['dashboard','atendimento','cozinha','bar-drinks','caixa','pdv','scanner','etiquetas','produtos','clientes','reservas_adiantamentos','estoque','notas-fiscais','fornecedores','vendas','financeiro','fechamento','despesas','cardapio','insumos','fichas','eventos','relatorios','equipe','configuracoes'],
    dashboardCards: [
      { label: 'Comandas abertas', hint: 'Mesas e balcão em atendimento', icon: 'CM' },
      { label: 'Pedidos em preparo', hint: 'Cozinha e bar/drinks', icon: 'CZ' },
      { label: 'Caixa do dia', hint: 'Recebimentos e fechamento', icon: 'CX' },
      { label: 'Estoque crítico', hint: 'Insumos e produtos baixos', icon: 'ES' },
    ],
  },
  {
    id: 'barbearia', tipoEmpresa: 'barbearia', nome: 'Barbearia', curto: 'Barbearia', icon: 'BB', color: '#60A5FA', gradient: 'from-blue-500 via-sky-500 to-cyan-400',
    descricao: 'Agenda, serviços, profissionais, clientes e comissões.',
    loginTitle: 'Bem-vindo ao VF Nexus para Barbearias',
    loginSubtitle: 'Entre para organizar agenda, clientes, serviços e recebimentos.',
    modules: ['dashboard','pdv','scanner','etiquetas','produtos','clientes','reservas_adiantamentos','agendamentos','ordens-servico','vendas','financeiro','fechamento','despesas','relatorios','equipe','configuracoes'],
    dashboardCards: [
      { label: 'Agenda do dia', hint: 'Atendimentos e horários', icon: 'AG' },
      { label: 'Profissionais', hint: 'Equipe em atendimento', icon: 'BB' },
      { label: 'Comissões', hint: 'Resumo por profissional', icon: 'R$' },
      { label: 'Clientes', hint: 'Histórico e retorno', icon: 'CL' },
    ],
  },
  {
    id: 'confeitaria', tipoEmpresa: 'confeitaria', nome: 'Confeitaria', curto: 'Confeitaria', icon: 'CF', color: '#F472B6', gradient: 'from-pink-400 via-rose-500 to-orange-400',
    descricao: 'Encomendas, produção, estoque, custos e entregas.',
    loginTitle: 'Bem-vindo ao VF Nexus para Confeitarias',
    loginSubtitle: 'Entre para controlar encomendas, produção, custos e entregas.',
    modules: ['dashboard','pdv','scanner','etiquetas','produtos','clientes','reservas_adiantamentos','vendas','estoque','notas-fiscais','fornecedores','financeiro','despesas','insumos','fichas','eventos','entregas','relatorios','equipe','configuracoes'],
    dashboardCards: [
      { label: 'Encomendas', hint: 'Pedidos e produção', icon: 'CF' },
      { label: 'Custos', hint: 'Fichas e insumos', icon: 'FT' },
      { label: 'Entregas', hint: 'Saídas programadas', icon: 'EN' },
      { label: 'Estoque', hint: 'Matéria-prima crítica', icon: 'ES' },
    ],
  },
  {
    id: 'roupas', tipoEmpresa: 'roupas', nome: 'Roupas', curto: 'Loja de Roupas', icon: 'RP', color: '#A78BFA', gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
    descricao: 'Produtos, estoque, vendas, etiquetas e catálogo.',
    loginTitle: 'Bem-vindo ao VF Nexus para Loja de Roupas',
    loginSubtitle: 'Entre para gerenciar produtos, estoque, vendas e etiquetas.',
    modules: ['dashboard','pdv','scanner','etiquetas','produtos','clientes','reservas_adiantamentos','vendas','estoque','notas-fiscais','fornecedores','promocoes','financeiro','despesas','cardapio','relatorios','equipe','configuracoes'],
    dashboardCards: [
      { label: 'Vendas do dia', hint: 'Resumo por canal', icon: 'VD' },
      { label: 'Estoque baixo', hint: 'Peças e variações', icon: 'ES' },
      { label: 'Mais vendidos', hint: 'Produtos em destaque', icon: 'ET' },
      { label: 'Catálogo', hint: 'Produtos para divulgação', icon: 'CT' },
    ],
  },
  {
    id: 'eletronicos', tipoEmpresa: 'eletronicos', nome: 'Eletrônicos', curto: 'Eletrônicos', icon: 'EL', color: '#22D3EE', gradient: 'from-cyan-500 via-blue-500 to-indigo-500',
    descricao: 'Produtos, assistência, vendas, estoque e garantias.',
    loginTitle: 'Bem-vindo ao VF Nexus para Eletrônicos',
    loginSubtitle: 'Entre para controlar vendas, assistência técnica, estoque e garantias.',
    modules: ['dashboard','pdv','scanner','etiquetas','produtos','clientes','reservas_adiantamentos','vendas','estoque','notas-fiscais','fornecedores','ordens-servico','financeiro','despesas','relatorios','equipe','configuracoes'],
    dashboardCards: [
      { label: 'Assistências', hint: 'OS em aberto', icon: 'OS' },
      { label: 'Garantias', hint: 'Produtos e prazos', icon: 'GT' },
      { label: 'Vendas', hint: 'Produtos e acessórios', icon: 'CM' },
      { label: 'Estoque', hint: 'Itens críticos', icon: 'ES' },
    ],
  },
  {
    id: 'prestador_servicos', tipoEmpresa: 'prestador_servico', nome: 'Prestador de Serviços', curto: 'Prestador de Serviços', icon: 'SV', color: '#34D399', gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    descricao: 'Orçamentos, ordens de serviço, clientes e financeiro.',
    loginTitle: 'Bem-vindo ao VF Nexus para Prestadores de Serviços',
    loginSubtitle: 'Entre para organizar serviços, orçamentos, clientes e financeiro.',
    modules: ['dashboard','pdv','scanner','etiquetas','produtos','clientes','reservas_adiantamentos','agendamentos','ordens-servico','vendas','financeiro','despesas','relatorios','equipe','configuracoes'],
    dashboardCards: [
      { label: 'Orçamentos', hint: 'Propostas pendentes', icon: 'OR' },
      { label: 'Ordens de serviço', hint: 'Execução e entrega', icon: 'OS' },
      { label: 'Clientes', hint: 'Histórico e recorrência', icon: 'CL' },
      { label: 'Financeiro', hint: 'Receitas e despesas', icon: 'R$' },
    ],
  },
  {
    id: 'autonomo', tipoEmpresa: 'outro', nome: 'Autônomo', curto: 'Autônomo', icon: 'AU', color: '#FACC15', gradient: 'from-yellow-400 via-amber-500 to-orange-500',
    descricao: 'Controle simples de vendas, clientes, serviços e finanças.',
    loginTitle: 'Bem-vindo ao VF Nexus para Autônomos',
    loginSubtitle: 'Entre para controlar vendas, clientes, serviços e finanças de forma simples.',
    modules: ['dashboard','pdv','scanner','etiquetas','produtos','clientes','reservas_adiantamentos','vendas','financeiro','despesas','relatorios','configuracoes'],
    dashboardCards: [
      { label: 'Vendas simples', hint: 'Recebimentos rápidos', icon: 'CM' },
      { label: 'Clientes', hint: 'Cadastro e histórico', icon: 'CL' },
      { label: 'Serviços', hint: 'Itens de cobrança', icon: 'OS' },
      { label: 'Saldo', hint: 'Resumo financeiro', icon: 'R$' },
    ],
  },
]

const TYPE_TO_RAMO: Record<string, RamoAtividade> = {
  restaurante: 'bar_restaurante',
  bar: 'bar_restaurante',
  hamburgueria: 'bar_restaurante',
  delivery: 'bar_restaurante',
  buffet: 'bar_restaurante',
  cafeteria: 'bar_restaurante',
  lanchonete: 'bar_restaurante',
  alimenticio: 'bar_restaurante',
  confeitaria: 'confeitaria',
  roupas: 'roupas',
  eletronicos: 'eletronicos',
  prestador_servico: 'prestador_servicos',
  barbearia: 'barbearia',
  outro: 'autonomo',
}

export function normalizeRamo(value?: string | null): RamoAtividade {
  const clean = String(value ?? '').trim().toLowerCase().replace(/[\s/-]+/g, '_')
  if (RAMOS_ATIVIDADE.some((ramo) => ramo.id === clean)) return clean as RamoAtividade
  return TYPE_TO_RAMO[clean] ?? 'autonomo'
}

export function ramoFromEmpresa(empresa?: { ramo_atividade?: string | null; tipo?: string | null } | null): RamoDefinition {
  return getRamoDefinition(empresa?.ramo_atividade || empresa?.tipo || null)
}

export function getRamoDefinition(value?: string | null): RamoDefinition {
  const id = normalizeRamo(value)
  return RAMOS_ATIVIDADE.find((ramo) => ramo.id === id) ?? RAMOS_ATIVIDADE[0]
}

export function getDefaultModulesForRamo(value?: string | null): ModuloCodigo[] {
  return [...getRamoDefinition(value).modules]
}

export function mergeModules(defaultModules: ModuloCodigo[], overrides?: Array<{ modulo_codigo?: string | null; modulo?: string | null; ativo?: boolean | null }>): ModuloCodigo[] {
  const result = new Set(defaultModules)
  for (const item of overrides ?? []) {
    const modulo = String(item.modulo_codigo ?? item.modulo ?? '').trim() as ModuloCodigo
    if (!modulo) continue
    if (item.ativo === false) result.delete(modulo)
    else result.add(modulo)
  }
  return Array.from(result)
}

export function moduleMatchesDefinition(module: ModuloCodigo, feature: FeatureDefinition): boolean {
  return module === feature.key || module === feature.href.replace(/^\//, '')
}

export function getStoredInitialRamo(): RamoDefinition {
  if (typeof window === 'undefined') return RAMOS_ATIVIDADE[0]
  return getRamoDefinition(window.localStorage.getItem('vf_nexus_ramo_inicial'))
}

export function persistInitialRamo(ramo: RamoAtividade) {
  if (typeof window === 'undefined') return
  const def = getRamoDefinition(ramo)
  window.localStorage.setItem('vf_nexus_ramo_inicial', def.id)
  window.localStorage.setItem('vf_nexus_ramo_nome', def.nome)
  window.localStorage.setItem('vf_nexus_ramo_tipo_empresa', def.tipoEmpresa)
}
