import type { IdentidadeEmpresa, Produto, CardapioProdutoView } from '@/types'
import { resolveBranding } from './branding'

export type RamoComercial = 'alimentacao' | 'varejo' | 'servicos' | 'eventos' | 'mercado' | 'beleza' | 'personalizado'

export const V14_RAMO_PRESETS: Record<RamoComercial, {
  titulo: string
  descricao: string
  modulosPrioritarios: string[]
  acoesRapidas: Array<{ label: string; href: string; icon: string }>
  categoriasSugeridas: string[]
}> = {
  alimentacao: {
    titulo: 'Alimentação',
    descricao: 'Cardápio, PDV rápido, ficha técnica, estoque de insumos, fechamento diário e catálogo com QR Code.',
    modulosPrioritarios: ['PDV', 'Cardápio', 'Estoque', 'Financeiro', 'Fechamento', 'Relatórios'],
    acoesRapidas: [
      { label: 'Abrir PDV', href: '/pdv', icon: '🧾' },
      { label: 'Cardápio', href: '/cardapio', icon: '📖' },
      { label: 'Estoque', href: '/estoque', icon: '📦' },
      { label: 'Fechar dia', href: '/fechamento', icon: '🔐' },
    ],
    categoriasSugeridas: ['Pratos', 'Lanches', 'Bebidas', 'Sobremesas', 'Combos'],
  },
  varejo: {
    titulo: 'Varejo',
    descricao: 'Venda rápida, SKU/código de barras, margem, estoque, fornecedores, catálogo e relatórios de giro.',
    modulosPrioritarios: ['PDV', 'Produtos', 'Estoque', 'Clientes', 'Financeiro', 'Relatórios'],
    acoesRapidas: [
      { label: 'Nova venda', href: '/pdv', icon: '🛒' },
      { label: 'Produtos', href: '/produtos', icon: '🛍️' },
      { label: 'Estoque', href: '/estoque', icon: '📦' },
      { label: 'Relatórios', href: '/relatorios', icon: '📊' },
    ],
    categoriasSugeridas: ['Produtos', 'Acessórios', 'Vestuário', 'Promoções', 'Mais vendidos'],
  },
  servicos: {
    titulo: 'Serviços',
    descricao: 'Agenda, clientes, serviços, ordens de serviço, recebimentos e comprovantes.',
    modulosPrioritarios: ['Agenda', 'Clientes', 'Serviços', 'Financeiro', 'Comprovantes', 'Relatórios'],
    acoesRapidas: [
      { label: 'Agendar', href: '/agendamentos', icon: '📅' },
      { label: 'Clientes', href: '/clientes', icon: '👥' },
      { label: 'Serviços', href: '/produtos', icon: '🧰' },
      { label: 'Financeiro', href: '/financeiro', icon: '💰' },
    ],
    categoriasSugeridas: ['Serviços', 'Pacotes', 'Combos', 'Atendimentos', 'Extras'],
  },
  eventos: {
    titulo: 'Eventos/Buffet',
    descricao: 'Orçamentos por pessoa, cardápios, eventos, custos, margem e proposta comercial.',
    modulosPrioritarios: ['Eventos', 'Cardápio', 'Produtos', 'Financeiro', 'Relatórios'],
    acoesRapidas: [
      { label: 'Orçamento', href: '/eventos', icon: '🎉' },
      { label: 'Cardápio', href: '/cardapio', icon: '📖' },
      { label: 'Clientes', href: '/clientes', icon: '👥' },
      { label: 'Relatórios', href: '/relatorios', icon: '📊' },
    ],
    categoriasSugeridas: ['Buffet', 'Bebidas', 'Doces', 'Salgados', 'Pacotes'],
  },
  mercado: {
    titulo: 'Mercado/Mercearia',
    descricao: 'PDV, estoque mínimo, fornecedores, entrada por nota, margem e giro de produtos.',
    modulosPrioritarios: ['PDV', 'Produtos', 'Estoque', 'Notas', 'Fornecedores', 'Relatórios'],
    acoesRapidas: [
      { label: 'PDV', href: '/pdv', icon: '🧾' },
      { label: 'Entrada', href: '/notas', icon: '📥' },
      { label: 'Estoque', href: '/estoque', icon: '📦' },
      { label: 'Fornecedores', href: '/fornecedores', icon: '🚚' },
    ],
    categoriasSugeridas: ['Mercearia', 'Bebidas', 'Limpeza', 'Higiene', 'Promoções'],
  },
  beleza: {
    titulo: 'Beleza/Estética',
    descricao: 'Agenda, clientes, pacotes, produtos, comissões simples e financeiro.',
    modulosPrioritarios: ['Agenda', 'Clientes', 'Serviços', 'Financeiro', 'Catálogo'],
    acoesRapidas: [
      { label: 'Agendar', href: '/agendamentos', icon: '📅' },
      { label: 'Cliente', href: '/clientes', icon: '👤' },
      { label: 'Serviços', href: '/produtos', icon: '✂️' },
      { label: 'Catálogo', href: '/cardapio', icon: '📖' },
    ],
    categoriasSugeridas: ['Cortes', 'Barba', 'Tratamentos', 'Pacotes', 'Produtos'],
  },
  personalizado: {
    titulo: 'Personalizado',
    descricao: 'Configuração flexível para negócios híbridos com produtos, serviços, vendas e financeiro.',
    modulosPrioritarios: ['Dashboard', 'Vendas', 'Produtos', 'Clientes', 'Financeiro'],
    acoesRapidas: [
      { label: 'Nova venda', href: '/pdv', icon: '🧾' },
      { label: 'Itens', href: '/produtos', icon: '🛍️' },
      { label: 'Clientes', href: '/clientes', icon: '👥' },
      { label: 'Relatórios', href: '/relatorios', icon: '📊' },
    ],
    categoriasSugeridas: ['Produtos', 'Serviços', 'Pacotes', 'Promoções'],
  },
}

export function slugify(value: string): string {
  return String(value || 'catalogo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'catalogo'
}

export function resolveRamoComercial(tipo?: string | null): RamoComercial {
  const t = String(tipo || '').toLowerCase()
  if (['restaurante','bar','hamburgueria','delivery','buffet','cafeteria','lanchonete','confeitaria','alimenticio'].includes(t)) return 'alimentacao'
  if (['roupas','eletronicos','loja_variedades'].includes(t)) return 'varejo'
  if (['prestador_servico','fotografia'].includes(t)) return 'servicos'
  if (t.includes('barbearia')) return 'beleza'
  return 'personalizado'
}

export function getRamoPreset(tipo?: string | null) {
  return V14_RAMO_PRESETS[resolveRamoComercial(tipo)]
}

export function getPublicBaseUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
}

export function buildPublicCatalogUrl(slug?: string | null): string {
  const base = getPublicBaseUrl().replace(/\/$/, '')
  return `${base}/catalogo/${encodeURIComponent(String(slug || 'demo'))}`
}

export function buildQrImageUrl(url: string, size = 220): string {
  // QR real gerado por endpoint público. Evita dependência extra e mantém o projeto leve para Vercel.
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(url)}`
}

export function buildWhatsappUrl({ telefone, texto }: { telefone?: string | null; texto: string }): string {
  const digits = String(telefone || '').replace(/\D/g, '')
  const numero = digits ? (digits.startsWith('55') ? digits : `55${digits}`) : ''
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
}

export function catalogWhatsappText(nomeEmpresa: string, url: string) {
  return `Olá! Veja o catálogo digital da ${nomeEmpresa}: ${url}`
}

export function generateBusinessInsights(input: {
  faturamentoMes?: number
  lucroMes?: number
  despesasMes?: number
  ticketMedio?: number
  estoqueBaixo?: number
  produtos?: Produto[]
}) {
  const insights: Array<{ tipo: 'sucesso' | 'alerta' | 'acao' | 'info'; titulo: string; mensagem: string; href?: string }> = []
  const faturamento = Number(input.faturamentoMes || 0)
  const lucro = Number(input.lucroMes || 0)
  const despesas = Number(input.despesasMes || 0)
  const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0
  if (faturamento <= 0) insights.push({ tipo: 'acao', titulo: 'Faça a primeira venda', mensagem: 'Registre uma venda pelo PDV para liberar indicadores reais do negócio.', href: '/pdv' })
  if (margem > 0 && margem < 20) insights.push({ tipo: 'alerta', titulo: 'Margem apertada', mensagem: 'A margem estimada está abaixo de 20%. Revise custos, descontos e preço de venda.', href: '/relatorios' })
  if (despesas > faturamento * 0.45 && faturamento > 0) insights.push({ tipo: 'alerta', titulo: 'Despesas elevadas', mensagem: 'As despesas estão consumindo uma parte alta do faturamento. Analise categorias e recorrências.', href: '/financeiro' })
  if (Number(input.estoqueBaixo || 0) > 0) insights.push({ tipo: 'acao', titulo: 'Estoque baixo', mensagem: `${input.estoqueBaixo} item(ns) precisam de reposição ou inventário.`, href: '/estoque' })
  const semPreco = (input.produtos || []).filter(p => !Number(p.preco_venda || 0)).length
  if (semPreco) insights.push({ tipo: 'acao', titulo: 'Produtos sem preço', mensagem: `${semPreco} produto(s) estão sem preço de venda. Isso impede catálogo e relatórios corretos.`, href: '/produtos' })
  if (!insights.length) insights.push({ tipo: 'sucesso', titulo: 'Operação saudável', mensagem: 'Os principais indicadores estão consistentes. Continue acompanhando vendas, estoque e margem.' })
  return insights
}

export function normalizeCommercialBranding(input?: Partial<IdentidadeEmpresa> | null) {
  const b = resolveBranding(input)
  return {
    ...b,
    reportBackground: '#F8FAFC',
    reportCard: '#FFFFFF',
    reportBorder: b.cor_borda || '#DCE6F0',
  }
}

export function groupCatalogByCategory(produtos: CardapioProdutoView[]) {
  const map = new Map<string, CardapioProdutoView[]>()
  produtos.filter(p => p.exibir).forEach(item => {
    const key = String(item.categoria || 'Outros')
    map.set(key, [...(map.get(key) || []), item])
  })
  return Array.from(map.entries())
}
