// ============================================================
// VF Nexus — TIPOS TYPESCRIPT
// ============================================================

export type UnidadeCompra = 'kg' | 'g' | 'litro' | 'ml' | 'unidade' | 'caixa' | 'fardo' | 'duzia'
export type UnidadeFicha  = 'kg' | 'g' | 'litro' | 'ml' | 'unidade'
export type CategoriaPlano = 'free' | 'pro' | 'enterprise'
export type TipoAssinatura = 'mensal' | 'vitalicia'
export type StatusAssinatura = 'ativa' | 'vencida' | 'bloqueada' | 'cancelada'
export type TipoDespesa = 'fixa' | 'variavel' | 'imposto' | 'mao_de_obra' | 'entrega' | 'outro'
export type TipoEmpresa = 'alimenticio' | 'restaurante' | 'bar' | 'hamburgueria' | 'delivery' | 'buffet' | 'cafeteria' | 'lanchonete' | 'confeitaria' | 'roupas' | 'eletronicos' | 'loja_variedades' | 'prestador_servico' | 'barbearia' | 'fotografia' | 'outro'
export type CategoriaProduto = 'prato' | 'drink' | 'lanche' | 'sobremesa' | 'bebida' | 'cafe' | 'entrada' | 'produto' | 'roupa' | 'calcado' | 'acessorio' | 'eletronico' | 'servico' | 'pacote_foto' | 'corte' | 'barba' | 'doce' | 'bolo' | 'variado' | 'outro'
export type TipoMovimentacao = 'entrada' | 'saida' | 'ajuste' | 'perda' | 'transferencia'
export type CanalVenda = 'local' | 'loja' | 'delivery' | 'ifood' | 'rappi' | 'whatsapp' | 'instagram' | 'site' | 'evento' | 'servico'
export type FormaPagamento = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'boleto' | 'transferencia' | 'outro'
export type StatusVenda = 'realizada' | 'cancelada' | 'estornada'
export type TipoCliente = 'cliente' | 'fornecedor' | 'lead'
export type TipoLancamentoFinanceiro = 'receita' | 'despesa'
export type StatusLancamentoFinanceiro = 'pendente' | 'pago' | 'cancelado'
export type EventoStatus = 'orcamento' | 'aprovado' | 'realizado' | 'cancelado'
export type TipoEvento = 'aniversario' | 'casamento' | 'corporativo' | 'confraternizacao' | 'buffet' | 'delivery' | 'outro'

// ---- Empresa ----
export interface Empresa {
  id: string
  nome: string
  tipo: TipoEmpresa
  cnpj?: string
  telefone?: string
  email?: string
  endereco?: string
  logo_url?: string
  cor_primaria?: string
  cor_secundaria?: string
  cor_fundo?: string
  cor_texto?: string
  cor_superficie?: string
  cor_superficie2?: string
  cor_borda?: string
  cor_menu?: string
  cor_card?: string
  cor_muted?: string
  cor_sucesso?: string
  cor_alerta?: string
  cor_erro?: string
  cor_info?: string
  modo_tema?: 'light' | 'dark' | 'custom'
  created_at: string
  updated_at: string
}

// ---- Perfil ----
export interface Perfil {
  id: string
  empresa_id: string
  nome?: string
  avatar_url?: string
  plano: CategoriaPlano
  cargo?: CargoEquipe
  permissoes?: string[]
  ultimo_login?: string
  is_master?: boolean
  bloqueado?: boolean
  motivo_bloqueio?: string
  created_at: string
  updated_at: string
}

// ---- Categoria de Insumo ----
export interface CategoriaInsumo {
  id: string
  empresa_id: string
  nome: string
  icone: string
  cor: string
  created_at: string
}

// ---- Fornecedor ----
export interface Fornecedor {
  id: string
  empresa_id: string
  nome: string
  telefone?: string
  whatsapp?: string
  email?: string
  cnpj?: string
  endereco?: string
  observacoes?: string
  ativo: boolean
  created_at: string
  updated_at: string
}

// ---- Insumo ----
export interface Insumo {
  id: string
  empresa_id: string
  categoria_id?: string
  fornecedor_id?: string
  nome: string
  descricao?: string
  unidade_compra: UnidadeCompra
  quantidade_compra: number
  valor_compra: number
  // Calculados por trigger
  custo_por_kg?: number
  custo_por_grama?: number
  custo_por_litro?: number
  custo_por_ml?: number
  custo_por_unidade?: number
  // Estoque
  estoque_atual: number
  estoque_minimo: number
  estoque_ideal: number
  data_vencimento?: string
  ativo: boolean
  data_ultima_compra: string
  created_at: string
  updated_at: string
  // Joins opcionais
  categoria?: CategoriaInsumo
  fornecedor?: Fornecedor
}

// ---- Produto ----
export interface Produto {
  id: string
  empresa_id: string
  nome: string
  descricao?: string
  categoria: CategoriaProduto
  foto_url?: string
  sku?: string
  codigo_barras?: string
  codigo_interno?: string
  estoque_minimo?: number
  imagem_url?: string
  marca?: string
  modelo?: string
  tamanho?: string
  cor?: string
  duracao_min?: number
  tipo_cadastro?: 'alimentacao' | 'varejo' | 'servico' | 'hibrido' | 'produto'
  tempo_preparo_min: number
  rendimento: number
  unidade_rendimento: string
  modo_preparo?: string
  // Custos
  custo_base?: number
  custo_frete?: number
  custo_taxas?: number
  custo_embalagem?: number
  custo_operacional?: number
  custo_outros?: number
  custo_total: number
  // Precificação
  margem_aplicada: number
  preco_venda?: number
  preco_manual?: boolean
  preco_minimo?: number
  preco_premium?: number
  // Indicadores
  cmv_percentual?: number
  margem_bruta?: number
  lucro_bruto?: number
  // Regras avançadas food/varejo
  grade?: Array<{ tamanho?: string; cor?: string; modelo?: string; sku?: string; codigo_barras?: string; estoque?: number; preco?: number }>
  margem_categoria?: number
  validade_dias?: number
  perdas_percentual?: number
  producao_lote?: number
  // Status
  ativo: boolean
  destaque: boolean
  disponivel: boolean
  setor_producao?: 'cozinha' | 'bar' | 'balcao' | 'nenhum'
  aparece_no_atendimento?: boolean
  ordem_atendimento?: number
  created_at: string
  updated_at: string
  // Joins
  ficha_tecnica?: FichaTecnica[]
}

// ---- Ficha Técnica ----
export interface FichaTecnica {
  id: string
  empresa_id: string
  produto_id: string
  insumo_id: string
  quantidade: number
  unidade: UnidadeFicha
  custo_calculado?: number
  observacao?: string
  created_at: string
  updated_at?: string
  // Joins
  insumo?: Insumo
}

// ---- Movimentação de Estoque ----
export interface MovimentacaoEstoque {
  id: string
  empresa_id: string
  insumo_id: string
  tipo: TipoMovimentacao
  quantidade: number
  unidade: string
  custo_unitario?: number
  custo_total?: number
  motivo?: string
  documento?: string
  usuario_id?: string
  created_at: string
  insumo?: Insumo
}

// ---- Venda ----
export interface Venda {
  id: string
  empresa_id: string
  cliente_id?: string
  produto_id?: string
  produto_nome: string
  quantidade: number
  preco_unitario: number
  custo_unitario: number
  subtotal?: number
  desconto: number
  taxa_entrega?: number
  taxa_servico?: number
  total: number
  lucro: number
  canal: CanalVenda
  forma_pagamento?: FormaPagamento
  cliente_nome?: string
  cliente_whatsapp?: string
  observacoes?: string
  status?: StatusVenda
  data_venda: string
  hora_venda?: string
  numero?: number
  desconto_geral?: number
  status_entrega?: 'pendente' | 'em_preparo' | 'saiu_entrega' | 'entregue' | 'cancelado'
  valor_recebido?: number
  troco?: number
  motivo_cancelamento?: string
  data_cancelamento?: string
  updated_at?: string
  created_at: string
  produto?: Produto
  itens?: VendaItem[]
  pagamentos?: VendaPagamento[]
  historico?: VendaStatusHistorico[]
}

export interface VendaItem {
  id: string
  empresa_id: string
  venda_id: string
  produto_id?: string
  produto_nome: string
  quantidade: number
  preco_unitario: number
  custo_unitario: number
  desconto?: number
  subtotal: number
  total: number
  lucro: number
  created_at: string
  produto?: Produto
}

export interface VendaStatusHistorico {
  id: string
  empresa_id: string
  venda_id: string
  status: string
  observacao?: string
  usuario_id?: string
  created_at: string
}

export interface VendaItemForm {
  produto_id?: string
  produto_nome: string
  quantidade: number
  preco_unitario: number
  custo_unitario: number
  desconto?: number
}

export type VendaCompletaForm = Omit<VendaForm, 'itens'> & {
  itens?: VendaItemForm[]
  desconto_geral?: number
}

export interface ProdutoEstoque {
  id: string
  empresa_id: string
  produto_id: string
  quantidade_atual: number
  estoque_minimo: number
  localizacao?: string
  custo_medio?: number
  updated_at: string
  produto?: Produto
}

export interface MovimentacaoProdutoEstoque {
  id: string
  empresa_id: string
  produto_id: string
  tipo: TipoMovimentacao
  quantidade: number
  custo_unitario?: number
  custo_total?: number
  motivo?: string
  documento?: string
  usuario_id?: string
  created_at: string
  produto?: Produto
}

export interface PermissaoEquipe {
  id: string
  empresa_id: string
  equipe_usuario_id?: string
  cargo?: string
  modulo: string
  acao: AcaoPermissao
  permitido: boolean
  created_at: string
}


// ---- Clientes ----
export interface Cliente {
  id: string
  empresa_id: string
  nome: string
  telefone?: string
  whatsapp?: string
  email?: string
  endereco?: string
  documento?: string
  tipo?: TipoCliente
  origem?: string
  observacoes?: string
  ativo: boolean
  total_compras?: number
  ultima_interacao?: string
  created_at: string
  updated_at: string
}

export type ClienteForm = Omit<Cliente, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>

// ---- Financeiro ----
export interface LancamentoFinanceiro {
  id: string
  empresa_id: string
  tipo: TipoLancamentoFinanceiro
  descricao: string
  categoria?: string
  valor: number
  data_vencimento: string
  data_pagamento?: string
  forma_pagamento?: FormaPagamento
  status: StatusLancamentoFinanceiro
  recorrente?: boolean
  observacoes?: string
  created_at: string
  updated_at: string
}

export type LancamentoFinanceiroForm = Omit<LancamentoFinanceiro, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>

// ---- Comprovantes ----
export interface ComprovanteHistorico {
  id: string
  empresa_id: string
  tipo: 'venda' | 'agendamento' | 'avulso'
  venda_id?: string
  agendamento_id?: string
  cliente_nome?: string
  cliente_whatsapp?: string
  descricao?: string
  total: number
  forma_pagamento?: FormaPagamento | string
  mensagem?: string
  pdf_url?: string
  enviado_whatsapp?: boolean
  created_at: string
  updated_at: string
}


// ---- Eventos ----
export interface Evento {
  id: string
  empresa_id: string
  nome: string
  tipo_evento: TipoEvento
  data_evento?: string
  pessoas: number
  margem_lucro: number
  taxa_operacional_percentual: number
  custo_operacional_extra: number
  desconto: number
  custo_produtos: number
  custo_total: number
  preco_sugerido: number
  preco_por_pessoa: number
  lucro_estimado: number
  cmv_percentual: number
  observacoes?: string
  status: EventoStatus
  created_at: string
  updated_at: string
  itens?: EventoItem[]
}

export interface EventoItem {
  id: string
  evento_id: string
  produto_id: string
  produto_nome: string
  categoria?: CategoriaProduto | string
  rendimento_unitario: number
  unidade_rendimento: string
  consumo_por_pessoa: number
  quantidade_produtos: number
  rendimento_total: number
  sobra_estimada: number
  custo_unitario: number
  preco_unitario_base: number
  custo_total: number
  receita_sugerida: number
  observacoes?: string
  created_at: string
  produto?: Produto
}

export interface EventoForm {
  nome: string
  tipo_evento: TipoEvento
  data_evento?: string
  pessoas: number
  margem_lucro: number
  taxa_operacional_percentual: number
  custo_operacional_extra: number
  desconto: number
  observacoes?: string
  status: EventoStatus
  itens: EventoItemForm[]
}

export interface EventoItemForm {
  produto_id: string
  produto_nome: string
  categoria?: CategoriaProduto | string
  rendimento_unitario: number
  unidade_rendimento: string
  consumo_por_pessoa: number
  quantidade_produtos?: number
  custo_unitario: number
  preco_unitario_base: number
  observacoes?: string
}

export interface ResultadoEventoItem {
  produto_id: string
  produto_nome: string
  categoria?: CategoriaProduto | string
  rendimento_unitario: number
  unidade_rendimento: string
  consumo_por_pessoa: number
  quantidade_produtos: number
  rendimento_total: number
  sobra_estimada: number
  custo_unitario: number
  preco_unitario_base: number
  custo_total: number
  receita_sugerida: number
  observacoes?: string
}

export interface ResultadoPrecificacaoEvento {
  pessoas: number
  margem_lucro: number
  taxa_operacional_percentual: number
  custo_operacional_extra: number
  desconto: number
  custo_produtos: number
  custo_operacional_calculado: number
  custo_total: number
  preco_sugerido: number
  preco_por_pessoa: number
  lucro_estimado: number
  cmv_percentual: number
  margem_bruta: number
  markup: number
  total_produtos: number
  total_rendimento: number
  cobertura_pessoas: number
  itens: ResultadoEventoItem[]
  cenarios: Array<{ margem: number; preco_sugerido: number; preco_por_pessoa: number; lucro_estimado: number; cmv_percentual: number }>
}


// ---- Cardápio e Promoções ----
export type StatusPromocao = 'ativa' | 'agendada' | 'expirada' | 'pausada'

export interface Promocao {
  id: string
  empresa_id: string
  produto_id: string
  nome: string
  descricao?: string
  preco_promocional: number
  desconto_percentual?: number
  data_inicio?: string
  data_fim?: string
  status: StatusPromocao
  exibir_cardapio: boolean
  destaque: boolean
  created_at: string
  updated_at: string
  produto?: Produto
}

export interface Cardapio {
  id: string
  empresa_id: string
  nome: string
  descricao?: string
  ativo: boolean
  created_at: string
  updated_at: string
  itens?: CardapioItem[]
}

export interface CardapioItem {
  id: string
  empresa_id: string
  cardapio_id: string
  produto_id: string
  categoria?: string
  descricao_cardapio?: string
  ordem: number
  exibir: boolean
  destaque: boolean
  created_at: string
  updated_at: string
  produto?: Produto
  promocao_ativa?: Promocao | null
}

export interface CardapioProdutoView {
  produto: Produto
  item?: CardapioItem
  promocao_ativa?: Promocao | null
  preco_exibido: number
  preco_original: number
  economia: number
  economia_percentual: number
  descricao_cardapio?: string
  categoria: string
  exibir: boolean
  destaque: boolean
}

export interface PromocaoForm {
  produto_id: string
  nome: string
  descricao?: string
  preco_promocional: number
  desconto_percentual?: number
  data_inicio?: string
  data_fim?: string
  status: StatusPromocao
  exibir_cardapio: boolean
  destaque: boolean
}

export interface CardapioForm {
  nome: string
  descricao?: string
  ativo: boolean
}

export interface CardapioItemForm {
  cardapio_id: string
  produto_id: string
  categoria?: string
  descricao_cardapio?: string
  ordem?: number
  exibir: boolean
  destaque: boolean
}

// ---- Configurações ----
export interface Configuracoes {
  id: string
  empresa_id: string
  margem_minima: number
  margem_ideal: number
  margem_premium: number
  cmv_meta: number
  moeda: string
  fuso_horario: string
  dias_alerta_vencimento: number
  percentual_alerta_estoque: number
  custo_fixo_mensal?: number
  percentual_impostos?: number
  taxa_cartao_percentual?: number
  taxa_delivery_percentual?: number
  taxa_servico_percentual?: number
  taxa_entrega_padrao?: number
  notificacao_agendamento_ativa?: boolean
  notificacao_agendamento_antecedencia?: '1_dia' | 'no_dia' | '30_min' | '10_min'
  cor_primaria?: string
  cor_secundaria?: string
  cor_fundo?: string
  cor_texto?: string
  cor_superficie?: string
  cor_superficie2?: string
  cor_borda?: string
  cor_menu?: string
  cor_card?: string
  cor_muted?: string
  cor_sucesso?: string
  cor_alerta?: string
  cor_erro?: string
  cor_info?: string
  modo_tema?: 'light' | 'dark' | 'custom'
  updated_at: string
}



// ---- Despesas editáveis ----
export interface Despesa {
  id: string
  empresa_id: string
  nome: string
  tipo: TipoDespesa
  valor: number
  recorrencia: 'mensal' | 'semanal' | 'diaria' | 'eventual'
  percentual?: number
  ativa: boolean
  observacoes?: string
  created_at: string
  updated_at: string
}

export interface DespesaForm {
  nome: string
  tipo: TipoDespesa
  valor: number
  recorrencia: 'mensal' | 'semanal' | 'diaria' | 'eventual'
  percentual?: number
  ativa: boolean
  observacoes?: string
}

// ---- Assinaturas e Admin Master ----
export interface Assinatura {
  id: string
  empresa_id: string
  tipo: TipoAssinatura
  status: StatusAssinatura
  valor: number
  data_inicio: string
  proxima_cobranca?: string
  data_vitalicia?: string
  observacoes?: string
  created_at: string
  updated_at: string
  empresa?: Empresa
}

export interface MasterEmpresaResumo {
  empresa: Empresa
  assinatura?: Assinatura | null
  usuarios: Array<{ id: string; email?: string; nome?: string; bloqueado?: boolean; ultimo_login?: string | null }>
}

export interface MasterDashboard {
  total_empresas: number
  total_usuarios: number
  assinantes_ativos: number
  assinaturas_vencidas: number
  receita_mensal_prevista: number
  receita_total_vitalicia: number
  proximas_cobrancas: Assinatura[]
  empresas: MasterEmpresaResumo[]
}

export interface IdentidadeEmpresa {
  empresa_id: string
  nome: string
  tipo: string
  cnpj?: string
  telefone?: string
  email?: string
  endereco?: string
  logo_url?: string
  cor_primaria: string
  cor_secundaria: string
  cor_fundo: string
  cor_texto: string
  cor_superficie?: string
  cor_superficie2?: string
  cor_borda?: string
  cor_menu?: string
  cor_card?: string
  cor_muted?: string
  cor_sucesso?: string
  cor_alerta?: string
  cor_erro?: string
  cor_info?: string
  modo_tema?: 'light' | 'dark' | 'custom'
  onboarding_concluido?: boolean
  onboarding_respostas?: Record<string, any>
}


// ---- Agendamentos ----
export type StatusAgendamento = 'agendado' | 'confirmado' | 'realizado' | 'cancelado' | 'remarcado'

export interface Agendamento {
  id: string
  empresa_id: string
  produto_id?: string
  cliente_nome: string
  cliente_whatsapp?: string
  cliente_email?: string
  servico_nome: string
  descricao?: string
  data_agendamento: string
  hora_inicio: string
  hora_fim?: string
  valor: number
  desconto: number
  taxa_servico: number
  total: number
  forma_pagamento?: FormaPagamento
  status: StatusAgendamento
  observacoes?: string
  created_at: string
  updated_at: string
  produto?: Produto
}

export interface AgendamentoForm {
  produto_id?: string
  cliente_nome: string
  cliente_whatsapp?: string
  cliente_email?: string
  servico_nome: string
  descricao?: string
  data_agendamento: string
  hora_inicio: string
  hora_fim?: string
  valor: number
  desconto: number
  taxa_servico: number
  forma_pagamento?: FormaPagamento
  status: StatusAgendamento
  observacoes?: string
}

export interface HistoricoPreco {
  id: string
  empresa_id: string
  produto_id: string
  preco_anterior?: number
  preco_novo?: number
  custo_no_momento?: number
  alterado_em: string
}

export interface ComprovantePayload {
  empresa_nome: string
  cliente_nome?: string
  cliente_whatsapp?: string
  itens: Array<{ nome: string; quantidade: number; valor_unitario: number; total: number }>
  subtotal: number
  desconto: number
  taxa_entrega?: number
  taxa_servico?: number
  total: number
  forma_pagamento?: FormaPagamento | string
  data_hora: string
  observacoes?: string
  tipo?: 'venda' | 'agendamento'
}


// ---- Notas fiscais/base de abastecimento ----
export type StatusNotaFiscal = 'rascunho' | 'importada' | 'processada' | 'cancelada'

export interface NotaFiscalBase {
  id: string
  empresa_id: string
  numero?: string
  serie?: string
  chave_acesso?: string
  fornecedor_nome?: string
  data_emissao?: string
  data_entrada?: string
  valor_produtos: number
  valor_frete?: number
  valor_impostos?: number
  valor_desconto?: number
  valor_total: number
  status: StatusNotaFiscal
  observacoes?: string
  arquivo_url?: string
  created_at: string
  updated_at: string
}

export interface NotaFiscalItem {
  id: string
  nota_id: string
  insumo_id?: string
  produto_id?: string
  descricao: string
  quantidade: number
  unidade: string
  valor_unitario: number
  valor_total: number
  created_at: string
}

export interface NotaFiscalForm {
  numero?: string
  serie?: string
  chave_acesso?: string
  fornecedor_nome?: string
  data_emissao?: string
  data_entrada?: string
  valor_produtos: number
  valor_frete?: number
  valor_impostos?: number
  valor_desconto?: number
  valor_total: number
  status?: StatusNotaFiscal
  observacoes?: string
  arquivo_url?: string
  itens?: Array<Omit<NotaFiscalItem, 'id' | 'nota_id' | 'created_at'>>
}



// ---- Fiscal / Integrações fiscais oficiais ----
export type FiscalProvider = 'focus_nfe' | 'plugnotas' | 'tecnospeed' | 'asaas' | 'outro'
export type FiscalEnvironment = 'homologacao' | 'producao'
export type DocumentoFiscalTipo = 'nfe' | 'nfce' | 'nfse'
export type DocumentoFiscalStatus = 'rascunho' | 'emitindo' | 'autorizada' | 'rejeitada' | 'cancelada' | 'inutilizada'

export interface IntegracaoFiscalConfig {
  id: string
  empresa_id: string
  provedor: FiscalProvider
  ambiente: FiscalEnvironment
  certificado_configurado: boolean
  cnpj?: string
  inscricao_estadual?: string
  inscricao_municipal?: string
  regime_tributario?: string
  cnae?: string
  serie_nfe?: string
  serie_nfce?: string
  serie_nfse?: string
  token_homologacao?: string
  token_producao?: string
  status: 'nao_configurada' | 'homologacao' | 'ativa' | 'erro'
  observacoes?: string
  created_at: string
  updated_at: string
}

export interface DocumentoFiscal {
  id: string
  empresa_id: string
  venda_id?: string
  cliente_id?: string
  tipo: DocumentoFiscalTipo
  status: DocumentoFiscalStatus
  chave_acesso?: string
  numero?: string
  serie?: string
  xml_url?: string
  danfe_url?: string
  mensagem_retorno?: string
  payload_envio?: Record<string, any>
  payload_retorno?: Record<string, any>
  created_at: string
  updated_at: string
}

export type IntegracaoFiscalConfigForm = Partial<Omit<IntegracaoFiscalConfig, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>>

// ---- Dashboard ----
export interface DashboardData {
  empresa_id: string
  total_produtos: number
  total_insumos: number
  margem_media: number
  cmv_medio: number
  faturamento_mes: number
  lucro_mes: number
  alertas_estoque_critico: number
  alertas_vencimento: number
}

// ---- Helpers de formulário ----
export type InsumoForm = Omit<Insumo, 'id' | 'empresa_id' | 'custo_por_kg' | 'custo_por_grama' | 'custo_por_litro' | 'custo_por_ml' | 'custo_por_unidade' | 'created_at' | 'updated_at' | 'categoria' | 'fornecedor'>
export type ProdutoForm = Omit<Produto, 'id' | 'empresa_id' | 'preco_minimo' | 'preco_premium' | 'cmv_percentual' | 'margem_bruta' | 'lucro_bruto' | 'created_at' | 'updated_at' | 'ficha_tecnica'>
export type FichaTecnicaForm = Omit<FichaTecnica, 'id' | 'empresa_id' | 'custo_calculado' | 'created_at' | 'updated_at' | 'insumo'>
export type FornecedorForm = Omit<Fornecedor, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>
export type VendaForm = Omit<Venda, 'id' | 'empresa_id' | 'created_at' | 'produto'>

// ---- Calculadora de precificação ----
export interface ResultadoPrecificacao {
  custo_total: number
  preco_minimo: number    // custo × 2
  preco_ideal: number     // custo × margem_ideal%
  preco_premium: number   // custo × 4
  preco_customizado: number
  cmv_percentual: number
  margem_bruta: number
  lucro_bruto: number
  lucro_liquido_estimado: number
}

// ---- Alerta de Estoque ----
export interface AlertaEstoque {
  insumo: Insumo
  tipo: 'critico' | 'baixo' | 'vencendo' | 'vencido' | 'excesso'
  mensagem: string
}

// ---- Insight de IA ----
export interface InsightIA {
  tipo: 'alerta' | 'oportunidade' | 'informacao' | 'recomendacao'
  titulo: string
  mensagem: string
  impacto?: 'alto' | 'medio' | 'baixo'
  acao?: string
}

// ---- Controle multirramo / módulos por setor ----
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
  | 'configuracoes'
  | 'master-admin'

export interface SetorModuloConfig {
  tipo_empresa: TipoEmpresa
  modulo: FeatureKey
  ativo: boolean
  ordem?: number
  updated_at?: string
}


// ---- Equipe, permissões e auditoria ----
export type CargoEquipe = 'dono' | 'administrador' | 'gerente' | 'atendente' | 'vendedor' | 'financeiro' | 'operacional' | 'contador' | 'master_admin' | 'outro'
export type StatusEquipe = 'ativo' | 'inativo' | 'convidado'
export type AcaoPermissao = 'ver' | 'criar' | 'editar' | 'excluir' | 'cancelar' | 'estornar' | 'aprovar' | 'exportar' | 'administrar' | 'impersonar'

export interface EquipeUsuario {
  id: string
  empresa_id: string
  nome: string
  email?: string
  telefone?: string
  cargo: CargoEquipe
  permissoes: string[]
  status: StatusEquipe
  observacoes?: string
  created_at: string
  updated_at: string
}

export interface EquipeUsuarioForm {
  nome: string
  email?: string
  telefone?: string
  cargo: CargoEquipe
  permissoes: string[]
  status: StatusEquipe
  observacoes?: string
}

export interface AuditoriaLog {
  id: string
  empresa_id: string
  usuario_id?: string
  acao: string
  entidade?: string
  entidade_id?: string
  detalhes?: Record<string, any>
  created_at: string
}

export interface FechamentoDiario {
  id: string
  empresa_id: string
  data_fechamento: string
  total_vendas: number
  total_receitas: number
  total_despesas: number
  saldo_final: number
  dinheiro: number
  pix: number
  cartao_credito: number
  cartao_debito: number
  outros: number
  observacoes?: string
  status: 'aberto' | 'fechado'
  created_at: string
  updated_at: string
}


// ---- Notificações push de agendamento ----
export interface PushSubscriptionRegistro {
  id: string
  empresa_id: string
  usuario_id: string
  endpoint: string
  p256dh: string
  auth_key: string
  user_agent?: string
  created_at: string
}

export interface NotificacaoAgendada {
  id: string
  empresa_id: string
  agendamento_id: string
  enviar_em: string
  enviada: boolean
  enviada_em?: string
  erro?: string
  created_at: string
}

// ---- Tipos comerciais avançados ----
export interface CategoriaFinanceira {
  id: string
  empresa_id: string
  nome: string
  tipo: 'receita' | 'despesa' | 'ambos'
  cor?: string
  ativa: boolean
  created_at: string
}

export interface CentroCusto {
  id: string
  empresa_id: string
  nome: string
  descricao?: string
  ativo: boolean
  created_at: string
}

export interface ContaPagar {
  id: string
  empresa_id: string
  fornecedor_id?: string
  categoria_id?: string
  centro_custo_id?: string
  descricao: string
  valor: number
  data_vencimento: string
  data_pagamento?: string
  forma_pagamento?: string
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado'
  recorrente?: boolean
  observacoes?: string
  created_at: string
  updated_at: string
}

export interface ContaReceber {
  id: string
  empresa_id: string
  cliente_id?: string
  venda_id?: string
  categoria_id?: string
  centro_custo_id?: string
  descricao: string
  valor: number
  data_vencimento: string
  data_recebimento?: string
  forma_pagamento?: string
  status: 'pendente' | 'recebido' | 'vencido' | 'cancelado'
  recorrente?: boolean
  observacoes?: string
  created_at: string
  updated_at: string
}

export interface VendaPagamento {
  id: string
  empresa_id: string
  venda_id: string
  forma_pagamento: string
  valor: number
  taxa?: number
  valor_recebido?: number
  troco?: number
  data_recebimento?: string
  conciliado?: boolean
  conciliado_em?: string
  status: 'pendente' | 'confirmado' | 'cancelado' | 'estornado'
  created_at: string
}

export interface Compra {
  id: string
  empresa_id: string
  fornecedor_id?: string
  numero?: string
  status: 'rascunho' | 'aprovada' | 'recebida' | 'cancelada'
  data_compra: string
  data_recebimento?: string
  valor_produtos?: number
  valor_frete?: number
  valor_taxas?: number
  desconto?: number
  valor_total?: number
  forma_pagamento?: string
  gerar_conta_pagar?: boolean
  origem?: string
  origem_id?: string
  observacoes?: string
  created_at: string
  updated_at: string
}

export interface CompraItem {
  id: string
  empresa_id: string
  compra_id: string
  produto_id?: string
  insumo_id?: string
  tipo_item: 'produto' | 'insumo'
  nome: string
  quantidade: number
  custo_unitario: number
  frete_rateado?: number
  taxas_rateadas?: number
  custo_total: number
  created_at: string
}

export interface OrdemServico {
  id: string
  empresa_id: string
  cliente_id?: string
  agendamento_id?: string
  numero?: number
  titulo: string
  descricao?: string
  status: 'aberta' | 'orcamento' | 'aprovada' | 'aprovado' | 'execucao' | 'em_execucao' | 'aguardando_material' | 'finalizada' | 'concluido' | 'entregue' | 'cancelada' | 'cancelado'
  valor_orcado?: number
  valor_final?: number
  checklist?: Array<{ titulo: string; concluido: boolean }>
  materiais?: Array<{ nome: string; quantidade: number; custo?: number }>
  fotos?: Array<{ url: string; descricao?: string }>
  assinaturas?: Array<{ nome: string; url?: string; data?: string }>
  orcamento_aprovado?: boolean
  recebimento_status?: 'pendente' | 'parcial' | 'recebido' | 'cancelado'
  data_abertura: string
  data_previsao?: string
  data_finalizacao?: string
  observacoes?: string
  created_at: string
  updated_at: string
}

export interface PlanoSaas {
  id: string
  codigo: string
  nome: string
  preco_mensal: number
  limite_produtos?: number
  limite_usuarios?: number
  limite_vendas_mes?: number
  limite_agendamentos_mes?: number
  limite_ia_dia?: number
  modulos: string[]
  ativo: boolean
  created_at: string
}

export interface DocumentoGerado {
  id: string
  empresa_id: string
  tipo: string
  titulo: string
  entidade?: string
  entidade_id?: string
  numero?: string
  url_pdf?: string
  dados?: Record<string, unknown>
  branding?: Record<string, unknown>
  created_at: string
}

// ---- V8: Varejo, Food, OS detalhada e inventário operacional ----
export interface ProdutoVariacao {
  id: string
  empresa_id: string
  produto_id: string
  sku?: string
  codigo_barras?: string
  codigo_interno?: string
  estoque_minimo?: number
  imagem_url?: string
  tamanho?: string
  cor?: string
  modelo?: string
  preco_venda?: number
  custo_medio?: number
  margem_categoria?: number
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface ProdutoVariacaoEstoque {
  id: string
  empresa_id: string
  variacao_id: string
  quantidade_atual: number
  estoque_minimo: number
  localizacao?: string
  custo_medio: number
  updated_at: string
  variacao?: ProdutoVariacao
}

export interface ProducaoLote {
  id: string
  empresa_id: string
  produto_id: string
  quantidade_produzida: number
  custo_total: number
  custo_unitario: number
  perdas_percentual: number
  data_producao: string
  validade?: string
  lote?: string
  motivo: string
  status: 'rascunho' | 'finalizada' | 'cancelada'
  usuario_id?: string
  created_at: string
  updated_at: string
}

export interface ProducaoLoteItem {
  id: string
  empresa_id: string
  producao_id: string
  insumo_id: string
  quantidade_consumida: number
  custo_unitario: number
  custo_total: number
  created_at: string
}

export interface OrcamentoServico {
  id: string
  empresa_id: string
  cliente_id?: string
  ordem_servico_id?: string
  titulo: string
  descricao?: string
  valor_servico: number
  valor_materiais: number
  taxa_deslocamento: number
  desconto: number
  valor_total: number
  status: 'rascunho' | 'enviado' | 'aprovado' | 'recusado' | 'cancelado'
  aprovado_em?: string
  validade?: string
  dados?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface InventarioEstoque {
  id: string
  empresa_id: string
  titulo: string
  status: 'aberto' | 'em_contagem' | 'fechado' | 'cancelado'
  iniciado_em: string
  fechado_em?: string
  motivo_fechamento?: string
  usuario_id?: string
  created_at: string
  updated_at: string
}

export interface InventarioItem {
  id: string
  empresa_id: string
  inventario_id: string
  item_tipo: 'produto' | 'insumo' | 'variacao'
  produto_id?: string
  insumo_id?: string
  variacao_id?: string
  nome: string
  saldo_sistema: number
  saldo_contado: number
  divergencia: number
  custo_medio: number
  valor_divergencia: number
  justificativa?: string
  ajustado: boolean
  created_at: string
  updated_at: string
}


// ---- VF Nexus Entregas ----
export type DeliveryDriverStatus = 'ativo' | 'inativo' | 'bloqueado'
export type DeliveryVehicleType = 'moto' | 'bicicleta' | 'carro' | 'a_pe' | 'outro'
export type DeliveryStatus = 'pending' | 'offered' | 'accepted' | 'picked_up' | 'on_route' | 'delivered' | 'canceled' | 'failed' | 'sync_pending'
export type DeliveryPriority = 'normal' | 'urgente'
export type DeliveryOrderType = 'comida' | 'bebida' | 'roupa' | 'eletronico' | 'outro'
export type DeliveryEarningStatus = 'pending' | 'approved' | 'paid' | 'canceled'
export type DeliveryReceiptStatus = 'generated' | 'signed' | 'paid' | 'canceled'

export interface DeliveryDriver {
  id: string
  empresa_id: string
  profile_id?: string | null
  name: string
  phone?: string | null
  email?: string | null
  document?: string | null
  pix_key?: string | null
  vehicle_type: DeliveryVehicleType | string
  vehicle_plate?: string | null
  base_delivery_fee: number
  status: DeliveryDriverStatus
  observations?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface Delivery {
  id: string
  empresa_id: string
  order_id?: string | null
  code: string
  customer_name: string
  customer_phone?: string | null
  order_type: DeliveryOrderType | string
  order_description?: string | null
  pickup_address?: string | null
  delivery_address: string
  delivery_neighborhood?: string | null
  delivery_city?: string | null
  delivery_state?: string | null
  delivery_complement?: string | null
  delivery_reference?: string | null
  delivery_lat?: number | null
  delivery_lng?: number | null
  delivery_fee: number
  priority: DeliveryPriority
  status: DeliveryStatus
  assigned_driver_id?: string | null
  created_by?: string | null
  accepted_at?: string | null
  picked_up_at?: string | null
  on_route_at?: string | null
  delivered_at_reported?: string | null
  synced_at?: string | null
  canceled_at?: string | null
  failed_at?: string | null
  failure_reason?: string | null
  created_at: string
  updated_at: string
  driver?: DeliveryDriver | null
}

export interface DeliveryStatusHistory {
  id: string
  empresa_id: string
  delivery_id: string
  driver_id?: string | null
  old_status?: string | null
  new_status: string
  changed_by?: string | null
  change_source: string
  notes?: string | null
  created_at: string
}

export interface DeliveryEarning {
  id: string
  empresa_id: string
  driver_id: string
  delivery_id: string
  amount: number
  earning_date: string
  status: DeliveryEarningStatus
  paid_at?: string | null
  created_at: string
  delivery?: Delivery | null
}

export interface DeliveryReceipt {
  id: string
  empresa_id: string
  driver_id: string
  period_type: string
  period_start: string
  period_end: string
  total_deliveries: number
  total_amount: number
  pdf_url?: string | null
  signed_at?: string | null
  signature_url?: string | null
  status: DeliveryReceiptStatus
  created_by?: string | null
  created_at: string
  driver?: DeliveryDriver | null
}
