import type { Produto } from '@/types'
import { db, getCurrentUserId, getEmpresaId, normalizeError, assertPermission, type AnyRecord } from './_base'
import { CodigoBarrasService } from './codigos-barras'
import { AuditoriaService } from './auditoria'

export type EtiquetaFormato = 'a4_3_colunas' | 'a4_2_colunas' | 'a4_pequena' | 'termica_58' | 'termica_80' | 'zebra_zpl' | 'personalizado'
export type EtiquetaLayout = 'simples' | 'promocao_relampago' | 'promocao_elegante' | 'institucional' | 'minimalista' | 'somente_logo' | 'qr_code' | 'termica_pb'
export type EtiquetaCores = { fundo: string; texto: string; destaque: string; borda: string }
export type EtiquetaSelecionada = { produto: Produto; quantidade: number; codigo_barras?: string; preco?: number; preco_original?: number; preco_promocional?: number; titulo?: string; subtitulo?: string; data_inicio?: string; data_fim?: string; layout?: EtiquetaLayout; cores?: EtiquetaCores; mostrar_logo?: boolean; mostrar_codigo?: boolean; mostrar_qr?: boolean }
export type EtiquetaLote = { id: string; empresa_id: string; nome: string; tipo_layout: string; formato_papel: string; total_etiquetas: number; created_at: string; configuracao?: AnyRecord }

export const ETIQUETA_FORMATOS: Record<EtiquetaFormato, { label: string; largura_mm: number; altura_mm: number; colunas: number; linhas: number }> = {
  a4_3_colunas: { label: 'A4 - 3 colunas', largura_mm: 63.5, altura_mm: 38.1, colunas: 3, linhas: 7 },
  a4_2_colunas: { label: 'A4 - 2 colunas', largura_mm: 99, altura_mm: 38.1, colunas: 2, linhas: 7 },
  a4_pequena: { label: 'A4 - etiqueta pequena', largura_mm: 48, altura_mm: 25, colunas: 4, linhas: 10 },
  termica_58: { label: 'Térmica 58mm', largura_mm: 58, altura_mm: 32, colunas: 1, linhas: 1 },
  termica_80: { label: 'Térmica 80mm', largura_mm: 80, altura_mm: 35, colunas: 1, linhas: 1 },
  zebra_zpl: { label: 'Zebra/Elgin ZPL', largura_mm: 80, altura_mm: 40, colunas: 1, linhas: 1 },
  personalizado: { label: 'Personalizado', largura_mm: 70, altura_mm: 35, colunas: 2, linhas: 8 },
}

export const ETIQUETA_MODELOS: Array<{ key: EtiquetaLayout; label: string; titulo: string; cores: EtiquetaCores; mostrar_logo: boolean; mostrar_codigo: boolean; mostrar_qr: boolean }> = [
  { key: 'simples', label: 'Padrão claro', titulo: '', cores: { fundo: '#FFFFFF', texto: '#111827', destaque: '#0A8DFF', borda: '#D7E5F2' }, mostrar_logo: false, mostrar_codigo: true, mostrar_qr: false },
  { key: 'promocao_relampago', label: 'Promoção relâmpago', titulo: 'PROMOÇÃO RELÂMPAGO', cores: { fundo: '#FFF2D8', texto: '#111827', destaque: '#E11D48', borda: '#FDBA74' }, mostrar_logo: true, mostrar_codigo: true, mostrar_qr: false },
  { key: 'promocao_elegante', label: 'Promoção elegante', titulo: 'OFERTA ESPECIAL', cores: { fundo: '#F8FAFC', texto: '#0F172A', destaque: '#B45309', borda: '#E2E8F0' }, mostrar_logo: true, mostrar_codigo: true, mostrar_qr: false },
  { key: 'institucional', label: 'Logo + QR Code', titulo: '', cores: { fundo: '#FFFFFF', texto: '#0F172A', destaque: '#0A8DFF', borda: '#D7E5F2' }, mostrar_logo: true, mostrar_codigo: false, mostrar_qr: true },
  { key: 'minimalista', label: 'Minimalista', titulo: '', cores: { fundo: '#FFFFFF', texto: '#111827', destaque: '#111827', borda: '#E5E7EB' }, mostrar_logo: false, mostrar_codigo: true, mostrar_qr: false },
  { key: 'somente_logo', label: 'Somente logo', titulo: '', cores: { fundo: '#FFFFFF', texto: '#111827', destaque: '#0A8DFF', borda: '#E5E7EB' }, mostrar_logo: true, mostrar_codigo: false, mostrar_qr: false },
  { key: 'qr_code', label: 'Etiqueta com QR Code', titulo: '', cores: { fundo: '#FFFFFF', texto: '#111827', destaque: '#0A8DFF', borda: '#E5E7EB' }, mostrar_logo: true, mostrar_codigo: false, mostrar_qr: true },
  { key: 'termica_pb', label: 'Térmica preto e branco', titulo: '', cores: { fundo: '#FFFFFF', texto: '#000000', destaque: '#000000', borda: '#000000' }, mostrar_logo: false, mostrar_codigo: true, mostrar_qr: false },
]

function cleanMoney(value: unknown): number {
  if (typeof value === 'number') return value
  return Number(String(value ?? '').replace(/R\$/gi, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')) || 0
}

export const EtiquetasService = {
  formatos() { return ETIQUETA_FORMATOS },
  modelos() { return ETIQUETA_MODELOS },
  modeloPadrao(key: EtiquetaLayout = 'simples') { return ETIQUETA_MODELOS.find(m => m.key === key) ?? ETIQUETA_MODELOS[0] },
  async gerarCodigoSeNecessario(produto: Produto): Promise<string> {
    if ((produto as any).codigo_barras || (produto as any).codigo_interno || produto.sku) return (produto as any).codigo_barras || (produto as any).codigo_interno || produto.sku || ''
    const empresaId = await getEmpresaId()
    const codigo = CodigoBarrasService.gerarCodigoInterno(empresaId, produto.id)
    await CodigoBarrasService.vincularCodigo(produto.id, codigo, 'gerado')
    return codigo
  },
  async criarLote(payload: { nome: string; formato: EtiquetaFormato; layout: EtiquetaLayout; itens: EtiquetaSelecionada[]; configuracao?: AnyRecord }): Promise<EtiquetaLote> {
    return this.salvarLote(payload.nome, payload.formato, payload.itens, payload.layout, payload.configuracao)
  },
  async salvarLote(nome: string, formato: EtiquetaFormato, itens: EtiquetaSelecionada[], layout: EtiquetaLayout = 'simples', configuracao: AnyRecord = {}): Promise<EtiquetaLote> {
    await assertPermission('produtos', 'editar')
    const empresaId = await getEmpresaId()
    const usuarioId = await getCurrentUserId()
    const cfg = ETIQUETA_FORMATOS[formato]
    const modelo = this.modeloPadrao(layout)
    const total = itens.reduce((acc, item) => acc + Number(item.quantidade || 0), 0)
    if (!total) throw new Error('Selecione ao menos uma etiqueta para gerar o lote.')
    const { data: lote, error } = await db().from('etiquetas_lotes').insert({ empresa_id: empresaId, usuario_id: usuarioId, nome, tipo_layout: layout, formato_papel: formato, largura_mm: cfg.largura_mm, altura_mm: cfg.altura_mm, colunas: cfg.colunas, linhas: cfg.linhas, total_etiquetas: total, configuracao: { ...modelo, ...configuracao }, status: 'gerado' }).select('*').single()
    if (error) throw normalizeError(error, 'Erro ao salvar lote de etiquetas.')
    const rows = []
    let ordem = 1
    for (const item of itens) {
      const codigo = item.codigo_barras || await this.gerarCodigoSeNecessario(item.produto)
      const precoBase = cleanMoney(item.preco ?? item.produto.preco_venda ?? 0)
      const precoPromocional = item.preco_promocional !== undefined ? cleanMoney(item.preco_promocional) : null
      rows.push({ lote_id: lote.id, empresa_id: empresaId, produto_id: item.produto.id, nome_produto: item.produto.nome, preco: precoPromocional ?? precoBase, preco_original: item.preco_original ?? item.produto.preco_venda ?? null, preco_promocional: precoPromocional, codigo_barras: codigo, quantidade: item.quantidade, titulo: item.titulo || modelo.titulo || null, subtitulo: item.subtitulo || null, data_inicio: item.data_inicio || null, data_fim: item.data_fim || null, cores: item.cores || modelo.cores, mostrar_logo: item.mostrar_logo ?? modelo.mostrar_logo, mostrar_codigo: item.mostrar_codigo ?? modelo.mostrar_codigo, mostrar_qr: item.mostrar_qr ?? modelo.mostrar_qr, ordem: ordem++ })
    }
    const { error: itensError } = await db().from('etiquetas_itens').insert(rows)
    if (itensError) throw normalizeError(itensError, 'Lote criado, mas houve erro ao salvar itens.')
    await AuditoriaService.registrar('etiquetas.gerar_lote', 'etiquetas_lotes', lote.id, { total, formato, layout }).catch(() => null)
    return lote as EtiquetaLote
  },
  async carregarLote(loteId: string): Promise<any | null> {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('etiquetas_lotes').select('*, itens:etiquetas_itens(*)').eq('empresa_id', empresaId).eq('id', loteId).maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao carregar lote de etiquetas.')
    return data
  },
  async listarLotes(): Promise<EtiquetaLote[]> {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('etiquetas_lotes').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(30)
    if (error) throw normalizeError(error, 'Erro ao listar lotes.')
    return (data ?? []) as EtiquetaLote[]
  },
  async duplicarLote(loteId: string): Promise<EtiquetaLote> {
    const lote = await this.carregarLote(loteId)
    if (!lote) throw new Error('Lote não encontrado.')
    const produtos = (lote.itens || []).map((item: any) => ({ produto: { id: item.produto_id, nome: item.nome_produto, preco_venda: item.preco, codigo_barras: item.codigo_barras, categoria: 'produto', ativo: true, destaque: false, disponivel: true, tempo_preparo_min: 0, rendimento: 1, unidade_rendimento: 'unidade', custo_total: 0, margem_aplicada: 0, empresa_id: lote.empresa_id, created_at: lote.created_at, updated_at: lote.created_at } as Produto, quantidade: item.quantidade, codigo_barras: item.codigo_barras, preco: item.preco, preco_original: item.preco_original, preco_promocional: item.preco_promocional, titulo: item.titulo, subtitulo: item.subtitulo, data_inicio: item.data_inicio, data_fim: item.data_fim, cores: item.cores, mostrar_logo: item.mostrar_logo, mostrar_codigo: item.mostrar_codigo, mostrar_qr: item.mostrar_qr }))
    return this.salvarLote(`${lote.nome} (cópia)`, lote.formato_papel, produtos, lote.tipo_layout, lote.configuracao)
  },
  async excluirLote(loteId: string): Promise<void> {
    await assertPermission('produtos', 'editar')
    const empresaId = await getEmpresaId()
    const { error } = await db().from('etiquetas_lotes').delete().eq('empresa_id', empresaId).eq('id', loteId)
    if (error) throw normalizeError(error, 'Erro ao excluir lote.')
  },
  normalizarImportacao(row: AnyRecord): EtiquetaSelecionada | null {
    if (!row.produto && !row.nome && !row.nome_produto) return null
    const modelo = this.modeloPadrao(String(row.tipo_etiqueta || row.layout || '').toLowerCase().includes('promo') ? 'promocao_relampago' : 'simples')
    const produto = { id: String(row.produto_id || row.codigo_barras || row.sku || row.produto || row.nome || crypto.randomUUID()), empresa_id: '', nome: String(row.produto || row.nome || row.nome_produto), categoria: 'produto' as any, sku: row.sku || undefined, codigo_barras: row.codigo_barras || row.codigo || undefined, tempo_preparo_min: 0, rendimento: 1, unidade_rendimento: 'unidade', custo_total: 0, margem_aplicada: 0, preco_venda: cleanMoney(row.valor || row.preco || row.preco_venda), ativo: true, destaque: false, disponivel: true, created_at: '', updated_at: '' } as Produto
    return { produto, quantidade: Number(row.quantidade_etiquetas || row.quantidade || row.qtd || 1), codigo_barras: String(row.codigo_barras || row.codigo || row.sku || ''), preco: cleanMoney(row.valor || row.preco || row.preco_venda), preco_promocional: row.valor_promocional || row.preco_promocional ? cleanMoney(row.valor_promocional || row.preco_promocional) : undefined, titulo: row.titulo_promocional || row.titulo || modelo.titulo, data_fim: row.data_final_promocao || row.data_fim || undefined, cores: { fundo: row.cor_fundo || modelo.cores.fundo, texto: row.cor_texto || modelo.cores.texto, destaque: row.cor_destaque || modelo.cores.destaque, borda: row.cor_borda || modelo.cores.borda }, mostrar_logo: String(row.usar_logo || '').toLowerCase().startsWith('s') || modelo.mostrar_logo, mostrar_codigo: modelo.mostrar_codigo, mostrar_qr: modelo.mostrar_qr }
  },
  gerarZpl(itens: EtiquetaSelecionada[]): string {
    const parts: string[] = []
    for (const item of itens) for (let i=0;i<item.quantidade;i++) parts.push(`^XA\n^CF0,28\n^FO30,30^FD${item.produto.nome.slice(0, 32)}^FS\n^CF0,34\n^FO30,68^FDR$ ${(Number(item.preco_promocional ?? item.preco ?? item.produto.preco_venda ?? 0)).toFixed(2)}^FS\n^BY2,2,70\n^FO30,112^BCN,70,Y,N,N^FD${item.codigo_barras || item.produto.codigo_barras || item.produto.sku || item.produto.id}^FS\n^XZ`)
    return parts.join('\n')
  },
}
