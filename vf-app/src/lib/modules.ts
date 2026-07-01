import type { TipoEmpresa } from '@/types'

export type FeatureKey =
  | 'dashboard'
  | 'produtos'
  | 'servicos'
  | 'vendas'
  | 'clientes'
  | 'agendamentos'
  | 'ordens-servico'
  | 'estoque'
  | 'notas-fiscais'
  | 'fornecedores'
  | 'promocoes'
  | 'relatorios'
  | 'financeiro'
  | 'fechamento'
  | 'despesas'
  | 'comprovantes'
  | 'equipe'
  | 'auditoria'
  | 'cardapio'
  | 'insumos'
  | 'fichas'
  | 'eventos'
  | 'simulador'
  | 'ia'
  | 'diagnostico'
  | 'configuracoes'
  | 'master-admin'

export type ProductMode = 'alimentacao' | 'varejo' | 'servico' | 'hibrido'

export type FeatureDefinition = {
  key: FeatureKey
  href: string
  label: string
  mobileLabel: string
  icon: string
  description: string
  core?: boolean
  masterOnly?: boolean
}

export type SectorProfile = {
  tipo: TipoEmpresa
  label: string
  description: string
  productMode: ProductMode
  recommended: FeatureKey[]
  categories: Array<{ value: string; label: string }>
  productLabels: {
    singular: string
    plural: string
    newButton: string
    name: string
    description: string
    category: string
    cost: string
    price: string
    unit: string
    time: string
    notes: string
    emptyTitle: string
    emptyDescription: string
  }
}

export type SectorModuleConfig = {
  tipo_empresa: TipoEmpresa
  modulo: FeatureKey
  ativo: boolean
  ordem?: number
  updated_at?: string
}

export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  { key: 'dashboard', href: '/dashboard', label: 'Dashboard', mobileLabel: 'Início', icon: '▦', description: 'Visão geral, indicadores e alertas principais.', core: true },
  { key: 'produtos', href: '/produtos', label: 'Produtos/Serviços', mobileLabel: 'Itens', icon: '🛍️', description: 'Cadastro adaptável de pratos, produtos, serviços, pacotes ou cortes.', core: true },
  { key: 'vendas', href: '/vendas', label: 'Vendas', mobileLabel: 'Vendas', icon: '🧾', description: 'Registro de vendas, descontos, entrega, taxa de serviço e comprovante WhatsApp.', core: true },
  { key: 'clientes', href: '/clientes', label: 'Clientes', mobileLabel: 'Clientes', icon: '👥', description: 'Cadastro de clientes, contatos, histórico comercial e observações.', core: true },
  { key: 'agendamentos', href: '/agendamentos', label: 'Agendamentos', mobileLabel: 'Agenda', icon: '📅', description: 'Agenda de serviços, clientes, pagamentos e comprovantes.', core: true },
  { key: 'ordens-servico', href: '/ordens-servico', label: 'Ordens de Serviço', mobileLabel: 'OS', icon: '🧰', description: 'Orçamentos, execução e finalização de serviços personalizados.' },
  { key: 'estoque', href: '/estoque', label: 'Estoque', mobileLabel: 'Estoque', icon: '📦', description: 'Controle de estoque e movimentações.' },
  { key: 'notas-fiscais', href: '/notas', label: 'Notas fiscais/abastecimento', mobileLabel: 'Notas', icon: '🧾', description: 'Base para importação de notas, compras e entrada de estoque.' },
  { key: 'fornecedores', href: '/fornecedores', label: 'Fornecedores', mobileLabel: 'Fornec.', icon: '🚚', description: 'Cadastro de fornecedores, contatos e observações.' },
  { key: 'promocoes', href: '/promocoes', label: 'Promoções', mobileLabel: 'Promo', icon: '🏷️', description: 'Promoções por período e destaque automático no cardápio.', core: true },
  { key: 'relatorios', href: '/relatorios', label: 'Relatórios', mobileLabel: 'Relat.', icon: '📊', description: 'Relatórios financeiros, vendas, estoque, margens e PDF premium.', core: true },
  { key: 'financeiro', href: '/financeiro', label: 'Financeiro', mobileLabel: 'Finanças', icon: '💰', description: 'Fluxo de caixa, contas a pagar/receber, saldos e fechamento diário.', core: true },
  { key: 'fechamento', href: '/fechamento', label: 'Fechamento diário', mobileLabel: 'Fechar', icon: '🔐', description: 'Fechamento do dia, conferência por forma de pagamento e saldo operacional.', core: true },
  { key: 'despesas', href: '/despesas', label: 'Despesas', mobileLabel: 'Despesas', icon: '💸', description: 'Gastos fixos, variáveis, impostos, mão de obra, entrega e outros.', core: true },
  { key: 'comprovantes', href: '/comprovantes', label: 'Comprovantes', mobileLabel: 'Recibos', icon: '🧾', description: 'Histórico de comprovantes de vendas e agendamentos para baixar ou reenviar.', core: true },
  { key: 'equipe', href: '/equipe', label: 'Equipe e permissões', mobileLabel: 'Equipe', icon: '👤', description: 'Controle de colaboradores, cargos, acesso e permissões operacionais.', core: true },
  { key: 'auditoria', href: '/auditoria', label: 'Auditoria', mobileLabel: 'Logs', icon: '🛡️', description: 'Histórico de ações importantes para segurança e controle empresarial.' },
  { key: 'cardapio', href: '/cardapio', label: 'Catálogo/Cardápio', mobileLabel: 'Catálogo', icon: '📖', description: 'PDF de cardápio ou catálogo com preços, descrição e promoções.' },
  { key: 'insumos', href: '/insumos', label: 'Insumos', mobileLabel: 'Insumos', icon: '🧂', description: 'Ingredientes/matéria-prima para ficha técnica e custo real.' },
  { key: 'fichas', href: '/fichas', label: 'Fichas Técnicas', mobileLabel: 'Fichas', icon: '📋', description: 'Composição de pratos/produtos por insumos e cálculo automático de custo.' },
  { key: 'eventos', href: '/eventos', label: 'Eventos/Orçamentos', mobileLabel: 'Eventos', icon: '🎉', description: 'Orçamentos por pessoas, margem, custos e produtos selecionados.' },
  { key: 'simulador', href: '/simulador', label: 'Simulador', mobileLabel: 'Simular', icon: '🔮', description: 'Simulações de preço, margem, cenário e cobrança.' },
  { key: 'diagnostico', href: '/diagnostico', label: 'Diagnóstico', mobileLabel: 'Diagn.', icon: '🧠', description: 'Insights automáticos de vendas, estoque, financeiro, clientes e margem.' },
  { key: 'ia', href: '/ia', label: 'VF Inteligência', mobileLabel: 'IA', icon: '✦', description: 'Análises e recomendações inteligentes do negócio.' },
  { key: 'configuracoes', href: '/configuracoes', label: 'Configurações', mobileLabel: 'Config.', icon: '⚙️', description: 'Identidade, paleta, logo, taxas e dados da empresa.', core: true },
  { key: 'master-admin', href: '/master-admin', label: 'Master Admin', mobileLabel: 'Master', icon: '👑', description: 'Painel do dono do SaaS: clientes, planos, bloqueios e módulos.', masterOnly: true },
]

const foodCategories = [
  { value: 'prato', label: 'Prato' }, { value: 'drink', label: 'Drink' }, { value: 'lanche', label: 'Lanche' },
  { value: 'sobremesa', label: 'Sobremesa' }, { value: 'bebida', label: 'Bebida' }, { value: 'entrada', label: 'Entrada' }, { value: 'outro', label: 'Outro' },
]
const retailBase = [
  { value: 'produto', label: 'Produto' }, { value: 'acessorio', label: 'Acessório' }, { value: 'variado', label: 'Variado' }, { value: 'outro', label: 'Outro' },
]
const serviceBase = [
  { value: 'servico', label: 'Serviço' }, { value: 'produto', label: 'Produto complementar' }, { value: 'outro', label: 'Outro' },
]

const defaultProductLabels = {
  singular: 'Produto', plural: 'Produtos', newButton: 'Novo Produto', name: 'Nome do produto', description: 'Descrição comercial',
  category: 'Categoria', cost: 'Custo de compra/produção', price: 'Preço de venda', unit: 'Unidade/rendimento', time: 'Tempo de preparo/execução',
  notes: 'Observações / modo de preparo', emptyTitle: 'Nenhum produto cadastrado', emptyDescription: 'Cadastre produtos, serviços ou itens de venda para iniciar a gestão.'
}

export const SECTOR_PROFILES: Record<TipoEmpresa, SectorProfile> = {
  alimenticio: { tipo: 'alimenticio', label: 'Alimentício geral', description: 'Pratos, bebidas, cardápio, insumos, ficha técnica e eventos.', productMode: 'alimentacao', recommended: ['dashboard','produtos','vendas','agendamentos','ordens-servico','estoque','notas-fiscais','fornecedores','promocoes','relatorios','financeiro','fechamento','despesas','cardapio','insumos','fichas','eventos','simulador','ia','diagnostico','equipe','auditoria','configuracoes'], categories: foodCategories, productLabels: { ...defaultProductLabels, singular: 'Item do cardápio', plural: 'Itens do cardápio', newButton: 'Novo item', name: 'Nome do prato/drink', cost: 'Custo calculado/manual', notes: 'Modo de preparo', emptyTitle: 'Nenhum item cadastrado', emptyDescription: 'Crie pratos, bebidas ou sobremesas e monte a ficha técnica quando precisar.' } },
  restaurante: { tipo: 'restaurante', label: 'Restaurante', description: 'Ficha técnica, insumos, cardápio, vendas, estoque e eventos.', productMode: 'alimentacao', recommended: ['dashboard','produtos','vendas','agendamentos','ordens-servico','estoque','notas-fiscais','fornecedores','promocoes','relatorios','financeiro','fechamento','despesas','cardapio','insumos','fichas','eventos','simulador','ia','diagnostico','equipe','auditoria','configuracoes'], categories: [{ value: 'prato', label: 'Prato' }, { value: 'bebida', label: 'Bebida' }, { value: 'sobremesa', label: 'Sobremesa' }, { value: 'entrada', label: 'Entrada' }, { value: 'outro', label: 'Outro' }], productLabels: { ...defaultProductLabels, singular: 'Prato/Produto', plural: 'Pratos e produtos', newButton: 'Novo prato/produto', name: 'Nome do prato/produto', notes: 'Modo de preparo' } },
  bar: { tipo: 'bar', label: 'Bar', description: 'Drinks, bebidas, petiscos, insumos, estoque, eventos e cardápio.', productMode: 'alimentacao', recommended: ['dashboard','produtos','vendas','agendamentos','ordens-servico','estoque','notas-fiscais','fornecedores','promocoes','relatorios','financeiro','fechamento','despesas','cardapio','insumos','fichas','eventos','simulador','ia','diagnostico','equipe','auditoria','configuracoes'], categories: [{ value: 'drink', label: 'Drink' }, { value: 'bebida', label: 'Bebida' }, { value: 'lanche', label: 'Petisco/Lanche' }, { value: 'outro', label: 'Outro' }], productLabels: { ...defaultProductLabels, singular: 'Drink/Produto', plural: 'Drinks e produtos', newButton: 'Novo drink/produto', name: 'Nome do drink/produto', notes: 'Receita / preparo' } },
  hamburgueria: { tipo: 'hamburgueria', label: 'Hamburgueria', description: 'Lanches, combos, insumos, ficha técnica, delivery e promoções.', productMode: 'alimentacao', recommended: ['dashboard','produtos','vendas','agendamentos','ordens-servico','estoque','notas-fiscais','fornecedores','promocoes','relatorios','financeiro','fechamento','despesas','cardapio','insumos','fichas','eventos','simulador','ia','diagnostico','equipe','auditoria','configuracoes'], categories: [{ value: 'lanche', label: 'Lanche' }, { value: 'bebida', label: 'Bebida' }, { value: 'sobremesa', label: 'Sobremesa' }, { value: 'produto', label: 'Combo' }, { value: 'outro', label: 'Outro' }], productLabels: { ...defaultProductLabels, singular: 'Lanche/Combo', plural: 'Lanches e combos', newButton: 'Novo lanche/combo', notes: 'Montagem / preparo' } },
  delivery: { tipo: 'delivery', label: 'Delivery', description: 'Produtos, entrega, vendas por canal, promoções e relatórios.', productMode: 'hibrido', recommended: ['dashboard','produtos','vendas','agendamentos','ordens-servico','estoque','notas-fiscais','fornecedores','promocoes','relatorios','financeiro','fechamento','despesas','cardapio','insumos','fichas','eventos','simulador','ia','diagnostico','equipe','auditoria','configuracoes'], categories: foodCategories, productLabels: { ...defaultProductLabels, singular: 'Produto de delivery', plural: 'Produtos de delivery', newButton: 'Novo produto', notes: 'Descrição / preparo' } },
  buffet: { tipo: 'buffet', label: 'Buffet/Eventos', description: 'Eventos, orçamento por pessoas, cardápio, insumos e fichas.', productMode: 'alimentacao', recommended: ['dashboard','produtos','vendas','agendamentos','ordens-servico','estoque','notas-fiscais','fornecedores','promocoes','relatorios','financeiro','fechamento','despesas','cardapio','insumos','fichas','eventos','simulador','ia','diagnostico','equipe','auditoria','configuracoes'], categories: [{ value: 'prato', label: 'Prato' }, { value: 'sobremesa', label: 'Sobremesa' }, { value: 'bebida', label: 'Bebida' }, { value: 'produto', label: 'Pacote' }, { value: 'outro', label: 'Outro' }], productLabels: { ...defaultProductLabels, singular: 'Item/pacote', plural: 'Itens e pacotes', newButton: 'Novo item/pacote' } },
  cafeteria: { tipo: 'cafeteria', label: 'Cafeteria', description: 'Cafés, bebidas, sobremesas, insumos e cardápio.', productMode: 'alimentacao', recommended: ['dashboard','produtos','vendas','agendamentos','ordens-servico','estoque','notas-fiscais','fornecedores','promocoes','relatorios','financeiro','fechamento','despesas','cardapio','insumos','fichas','simulador','ia','diagnostico','equipe','auditoria','configuracoes'], categories: [{ value: 'cafe', label: 'Café' }, { value: 'bebida', label: 'Bebida' }, { value: 'sobremesa', label: 'Sobremesa' }, { value: 'produto', label: 'Produto' }, { value: 'outro', label: 'Outro' }], productLabels: { ...defaultProductLabels, singular: 'Item da cafeteria', plural: 'Itens da cafeteria', newButton: 'Novo item' } },
  lanchonete: { tipo: 'lanchonete', label: 'Lanchonete', description: 'Lanches, bebidas, estoque, ficha técnica e vendas.', productMode: 'alimentacao', recommended: ['dashboard','produtos','vendas','agendamentos','ordens-servico','estoque','notas-fiscais','fornecedores','promocoes','relatorios','financeiro','fechamento','despesas','cardapio','insumos','fichas','simulador','ia','diagnostico','equipe','auditoria','configuracoes'], categories: [{ value: 'lanche', label: 'Lanche' }, { value: 'bebida', label: 'Bebida' }, { value: 'sobremesa', label: 'Sobremesa' }, { value: 'produto', label: 'Produto' }, { value: 'outro', label: 'Outro' }], productLabels: { ...defaultProductLabels, singular: 'Lanche/Produto', plural: 'Lanches e produtos', newButton: 'Novo lanche/produto' } },
  confeitaria: { tipo: 'confeitaria', label: 'Confeitaria', description: 'Bolos, doces, encomendas, insumos, fichas e agenda.', productMode: 'alimentacao', recommended: ['dashboard','produtos','vendas','agendamentos','ordens-servico','estoque','notas-fiscais','fornecedores','promocoes','relatorios','financeiro','fechamento','despesas','cardapio','insumos','fichas','eventos','simulador','ia','diagnostico','equipe','auditoria','configuracoes'], categories: [{ value: 'bolo', label: 'Bolo' }, { value: 'doce', label: 'Doce' }, { value: 'sobremesa', label: 'Sobremesa' }, { value: 'produto', label: 'Produto' }, { value: 'outro', label: 'Outro' }], productLabels: { ...defaultProductLabels, singular: 'Doce/Bolo', plural: 'Doces e bolos', newButton: 'Novo doce/bolo', notes: 'Receita / preparo' } },
  roupas: { tipo: 'roupas', label: 'Loja de roupas', description: 'Produtos diretos, estoque, fornecedores, vendas, promoções e relatórios.', productMode: 'varejo', recommended: ['dashboard','produtos','vendas','agendamentos','ordens-servico','estoque','notas-fiscais','fornecedores','promocoes','relatorios','financeiro','fechamento','despesas','cardapio','eventos','simulador','ia','diagnostico','equipe','auditoria','configuracoes'], categories: [{ value: 'roupa', label: 'Roupa' }, { value: 'calcado', label: 'Calçado' }, { value: 'acessorio', label: 'Acessório' }, { value: 'variado', label: 'Variado' }], productLabels: { ...defaultProductLabels, singular: 'Produto', plural: 'Produtos', newButton: 'Novo produto', name: 'Nome do produto', cost: 'Custo de compra', unit: 'Unidade/grade', time: 'Sem tempo de preparo', notes: 'Descrição, variações, tamanho ou observações', emptyTitle: 'Nenhum produto cadastrado', emptyDescription: 'Cadastre peças, calçados e acessórios com custo de compra, margem e estoque.' } },
  eletronicos: { tipo: 'eletronicos', label: 'Eletrônicos', description: 'Produtos, acessórios, fornecedores, estoque, garantia e vendas.', productMode: 'varejo', recommended: ['dashboard','produtos','vendas','agendamentos','ordens-servico','estoque','notas-fiscais','fornecedores','promocoes','relatorios','financeiro','fechamento','despesas','cardapio','eventos','simulador','ia','diagnostico','equipe','auditoria','configuracoes'], categories: [{ value: 'eletronico', label: 'Eletrônico' }, { value: 'acessorio', label: 'Acessório' }, { value: 'servico', label: 'Serviço técnico' }, { value: 'variado', label: 'Variado' }], productLabels: { ...defaultProductLabels, singular: 'Produto/Serviço', plural: 'Produtos e serviços', newButton: 'Novo item', cost: 'Custo de compra ou execução', notes: 'Descrição técnica / garantia / observações' } },
  loja_variedades: { tipo: 'loja_variedades', label: 'Loja de variedades', description: 'Produtos diversos, estoque, fornecedores, promoções e vendas.', productMode: 'varejo', recommended: ['dashboard','produtos','vendas','agendamentos','ordens-servico','estoque','notas-fiscais','fornecedores','promocoes','relatorios','financeiro','fechamento','despesas','cardapio','eventos','simulador','ia','diagnostico','equipe','auditoria','configuracoes'], categories: retailBase, productLabels: { ...defaultProductLabels, cost: 'Custo de compra', notes: 'Descrição ou observações do produto' } },
  prestador_servico: { tipo: 'prestador_servico', label: 'Prestador de serviço/MEI', description: 'Serviços, orçamentos, agenda, vendas/recebimentos e relatórios.', productMode: 'servico', recommended: ['dashboard','produtos','vendas','agendamentos','ordens-servico','fornecedores','promocoes','relatorios','financeiro','fechamento','despesas','simulador','ia','diagnostico','equipe','auditoria','configuracoes'], categories: serviceBase, productLabels: { ...defaultProductLabels, singular: 'Serviço', plural: 'Serviços', newButton: 'Novo serviço', name: 'Nome do serviço', description: 'Descrição do serviço', category: 'Tipo de serviço', cost: 'Custo estimado', price: 'Valor cobrado', unit: 'Unidade de cobrança', time: 'Tempo estimado', notes: 'Escopo, materiais, condições ou observações', emptyTitle: 'Nenhum serviço cadastrado', emptyDescription: 'Cadastre seus serviços, valores, custos estimados e use a agenda para organizar clientes.' } },
  barbearia: { tipo: 'barbearia', label: 'Barbearia', description: 'Serviços de corte/barba, agenda, vendas, clientes e comprovantes.', productMode: 'servico', recommended: ['dashboard','produtos','vendas','agendamentos','ordens-servico','estoque','notas-fiscais','fornecedores','promocoes','relatorios','financeiro','fechamento','despesas','simulador','ia','diagnostico','equipe','auditoria','configuracoes'], categories: [{ value: 'corte', label: 'Corte' }, { value: 'barba', label: 'Barba' }, { value: 'servico', label: 'Combo/Serviço' }, { value: 'produto', label: 'Produto de revenda' }], productLabels: { ...defaultProductLabels, singular: 'Serviço', plural: 'Serviços', newButton: 'Novo serviço', name: 'Nome do serviço', description: 'Descrição do serviço', category: 'Tipo de serviço', cost: 'Custo estimado', price: 'Valor cobrado', unit: 'Unidade de cobrança', time: 'Duração média', notes: 'Observações do atendimento', emptyTitle: 'Nenhum serviço cadastrado', emptyDescription: 'Cadastre corte, barba, combos e valores para vender e agendar.' } },
  fotografia: { tipo: 'fotografia', label: 'Fotografia', description: 'Pacotes, ensaios, agenda, orçamento, vendas e comprovantes.', productMode: 'servico', recommended: ['dashboard','produtos','vendas','agendamentos','ordens-servico','fornecedores','promocoes','relatorios','financeiro','fechamento','despesas','cardapio','simulador','ia','diagnostico','equipe','auditoria','configuracoes'], categories: [{ value: 'pacote_foto', label: 'Pacote fotográfico' }, { value: 'servico', label: 'Serviço' }, { value: 'produto', label: 'Produto/álbum' }, { value: 'outro', label: 'Outro' }], productLabels: { ...defaultProductLabels, singular: 'Pacote/Serviço', plural: 'Pacotes e serviços', newButton: 'Novo pacote/serviço', name: 'Nome do pacote/serviço', description: 'Descrição do pacote', category: 'Tipo', cost: 'Custo estimado', price: 'Valor do pacote', unit: 'Entrega/quantidade', time: 'Duração média', notes: 'Detalhes do ensaio, entrega, prazo e condições', emptyTitle: 'Nenhum pacote cadastrado', emptyDescription: 'Cadastre pacotes fotográficos, ensaios, eventos e valores para agendar clientes.' } },
  outro: { tipo: 'outro', label: 'Outro ramo', description: 'Configuração híbrida para empresas diversas.', productMode: 'hibrido', recommended: ['dashboard','produtos','vendas','agendamentos','ordens-servico','estoque','notas-fiscais','fornecedores','promocoes','relatorios','financeiro','fechamento','despesas','cardapio','simulador','ia','diagnostico','equipe','auditoria','configuracoes'], categories: retailBase.concat([{ value: 'servico', label: 'Serviço' }]), productLabels: defaultProductLabels },
}


const RAMO_FEATURES: Record<ProductMode, FeatureKey[]> = {
  // Food: reduz ruído e prioriza custo, ficha técnica, CMV, estoque e venda.
  alimentacao: ['dashboard','produtos','insumos','fichas','cardapio','estoque','vendas','clientes','financeiro','relatorios','diagnostico','comprovantes','configuracoes'],
  // Varejo: prioriza grade/variações, código de barras, estoque, compra e giro.
  varejo: ['dashboard','produtos','estoque','notas-fiscais','fornecedores','vendas','clientes','financeiro','relatorios','diagnostico','promocoes','comprovantes','configuracoes'],
  // Serviços: prioriza cliente, agenda, OS, orçamento/recebimento e materiais.
  servico: ['dashboard','produtos','clientes','agendamentos','ordens-servico','vendas','financeiro','relatorios','diagnostico','comprovantes','configuracoes'],
  // Híbrido: libera conjunto mais amplo, mas ainda organizado.
  hibrido: ['dashboard','produtos','vendas','clientes','agendamentos','ordens-servico','estoque','notas-fiscais','fornecedores','promocoes','relatorios','financeiro','fechamento','despesas','comprovantes','cardapio','insumos','fichas','eventos','simulador','diagnostico','ia','equipe','auditoria','configuracoes'],
}

export function getRecommendedFeatureKeys(profile: SectorProfile): FeatureKey[] {
  const base = RAMO_FEATURES[profile.productMode] ?? RAMO_FEATURES.hibrido
  return Array.from(new Set(base.filter((key) => FEATURE_DEFINITIONS.some((feature) => feature.key === key && !feature.masterOnly))))
}

export const SECTOR_OPTIONS = Object.values(SECTOR_PROFILES).map(p => ({ value: p.tipo, label: p.label }))

export function getSectorProfile(tipo?: string | null): SectorProfile {
  return SECTOR_PROFILES[(tipo || 'outro') as TipoEmpresa] ?? SECTOR_PROFILES.outro
}

export function getDefaultFeatureKeys(tipo?: string | null): FeatureKey[] {
  // Antes os módulos marcados como core eram forçados em todos os ramos,
  // o que deixava food/varejo/serviços com funções desnecessárias.
  // Agora o padrão vem apenas do perfil recomendado por ramo.
  return getRecommendedFeatureKeys(getSectorProfile(tipo))
}

export function isFeatureEnabled(tipo: string | null | undefined, feature: FeatureKey, configs?: SectorModuleConfig[] | null): boolean {
  const def = FEATURE_DEFINITIONS.find(f => f.key === feature)
  if (def?.masterOnly) return false
  const sector = (tipo || 'outro') as TipoEmpresa
  const override = configs?.find(c => c.tipo_empresa === sector && c.modulo === feature)
  if (override) return Boolean(override.ativo)
  return getDefaultFeatureKeys(sector).includes(feature)
}

export function buildDefaultSectorModuleRows(): SectorModuleConfig[] {
  const rows: SectorModuleConfig[] = []
  Object.values(SECTOR_PROFILES).forEach(profile => {
    FEATURE_DEFINITIONS.filter(f => !f.masterOnly).forEach((feature, index) => {
      rows.push({ tipo_empresa: profile.tipo, modulo: feature.key, ativo: getRecommendedFeatureKeys(profile).includes(feature.key), ordem: index })
    })
  })
  return rows
}

export function pathToFeature(pathname: string): FeatureKey | null {
  const cleanPath = pathname.split('?')[0]
  if (cleanPath === '/' || cleanPath === '/dashboard') return 'dashboard'
  if (cleanPath === '/notas') return 'notas-fiscais'
  const match = FEATURE_DEFINITIONS
    .filter(f => f.href !== '/dashboard')
    .map(f => ({ ...f, cleanHref: f.href.split('?')[0] }))
    .find(f => cleanPath === f.cleanHref || cleanPath.startsWith(`${f.cleanHref}/`))
  return match?.key ?? null
}
