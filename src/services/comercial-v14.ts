import { db, getEmpresaId, normalizeError, withEmpresa, type AnyRecord } from './_base'
import { slugify } from '@/lib/commercial-v14'
import type { Cardapio, CardapioProdutoView } from '@/types'
import { CardapioService } from './cardapio'
import { AuditoriaService } from './auditoria'

export type CatalogoPublico = {
  id: string
  empresa_id: string
  cardapio_id: string
  slug: string
  titulo: string
  descricao?: string | null
  whatsapp?: string | null
  ativo: boolean
  visitas?: number
  created_at: string
  updated_at: string
  cardapio?: Cardapio
}

export const CatalogoPublicoService = {
  async publicar(cardapio: Cardapio, extras?: { whatsapp?: string; titulo?: string; descricao?: string }): Promise<CatalogoPublico> {
    const empresaId = await getEmpresaId()
    const baseSlug = slugify(`${extras?.titulo || cardapio.nome || 'catalogo'}-${empresaId.slice(0, 6)}`)
    const slug = `${baseSlug}-${cardapio.id.slice(0, 6)}`
    const payload = {
      empresa_id: empresaId,
      cardapio_id: cardapio.id,
      slug,
      titulo: extras?.titulo || cardapio.nome || 'Catálogo digital',
      descricao: extras?.descricao || cardapio.descricao || null,
      whatsapp: extras?.whatsapp || null,
      ativo: true,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await db().from('catalogos_publicos').upsert(payload, { onConflict: 'empresa_id,cardapio_id' }).select('*').single()
    if (error) throw normalizeError(error, 'Erro ao publicar catálogo público. Verifique se a migration V14.1 foi aplicada e se as policies RLS permitem insert/update para sua empresa.')
    await AuditoriaService.registrar('catalogo.publicar', 'catalogos_publicos', data.id, { slug: data.slug }).catch(() => null)
    return data as CatalogoPublico
  },

  async obterAtual(cardapioId?: string): Promise<CatalogoPublico | null> {
    const empresaId = await getEmpresaId()
    let q = db().from('catalogos_publicos').select('*').eq('empresa_id', empresaId).eq('ativo', true).order('updated_at', { ascending: false }).limit(1)
    if (cardapioId) q = q.eq('cardapio_id', cardapioId)
    const { data, error } = await q.maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao carregar publicação do catálogo.')
    return data as CatalogoPublico | null
  },

  async montarPreviewPublico(slug: string): Promise<{ catalogo: CatalogoPublico; produtos: CardapioProdutoView[] }> {
    const { data, error } = await db().from('catalogos_publicos').select('*, cardapio:cardapios(*)').eq('slug', slug).eq('ativo', true).maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao carregar catálogo público.')
    if (!data) throw new Error('Catálogo não encontrado ou indisponível.')
    // Em ambiente com RLS pública, a RPC/tabela libera somente itens do catálogo ativo.
    const produtos = await CardapioService.montarProdutos((data as any).cardapio_id).catch(() => [])
    return { catalogo: data as CatalogoPublico, produtos }
  },
}

export const ImportacaoV14Service = {
  modelos() {
    return [
      { tipo: 'produtos', arquivo: 'produtos_modelo.xlsx', colunas: ['nome','descricao','categoria','custo_total','preco_venda','sku','codigo_barras','estoque_minimo'] },
      { tipo: 'clientes', arquivo: 'clientes_modelo.xlsx', colunas: ['nome','whatsapp','email','documento','endereco','observacoes'] },
      { tipo: 'fornecedores', arquivo: 'fornecedores_modelo.xlsx', colunas: ['nome','whatsapp','email','cnpj','endereco','observacoes'] },
      { tipo: 'estoque', arquivo: 'estoque_modelo.xlsx', colunas: ['produto_sku','produto_nome','quantidade_atual','estoque_minimo','custo_medio','localizacao'] },
    ]
  },
  validarLinhas(tipo: string, rows: AnyRecord[]) {
    const erros: Array<{ linha: number; campo: string; erro: string }> = []
    const validas = rows.map((row, idx) => {
      const linha = idx + 2
      const out: AnyRecord = {}
      for (const [k,v] of Object.entries(row)) out[String(k).trim().toLowerCase()] = typeof v === 'string' ? v.trim() : v
      if (tipo === 'produtos') {
        if (!out.nome) erros.push({ linha, campo: 'nome', erro: 'Nome é obrigatório.' })
        if (out.preco_venda !== undefined && out.preco_venda !== '' && Number.isNaN(Number(out.preco_venda))) erros.push({ linha, campo: 'preco_venda', erro: 'Preço precisa ser numérico.' })
        if (out.custo_total !== undefined && out.custo_total !== '' && Number.isNaN(Number(out.custo_total))) erros.push({ linha, campo: 'custo_total', erro: 'Custo precisa ser numérico.' })
      }
      if (tipo === 'clientes' || tipo === 'fornecedores') {
        if (!out.nome) erros.push({ linha, campo: 'nome', erro: 'Nome é obrigatório.' })
        if (out.email && !String(out.email).includes('@')) erros.push({ linha, campo: 'email', erro: 'E-mail inválido.' })
      }
      if (tipo === 'estoque') {
        if (!out.produto_sku && !out.produto_nome && !out.codigo_barras) erros.push({ linha, campo: 'produto', erro: 'Informe SKU, código de barras ou nome do produto.' })
        if (out.quantidade_atual === undefined || Number.isNaN(Number(out.quantidade_atual))) erros.push({ linha, campo: 'quantidade_atual', erro: 'Quantidade precisa ser numérica.' })
      }
      return out
    })
    const linhasComErro = new Set(erros.map(e => e.linha))
    return { linhas: validas, erros, linhasValidas: validas.length - linhasComErro.size, linhasComErro: linhasComErro.size }
  },
  async registrarImportacao(tipo: string, totalLinhas: number, status: 'validada' | 'processada' | 'erro', erros?: AnyRecord[], resumo?: AnyRecord) {
    const payload = await withEmpresa({ tipo, total_linhas: totalLinhas, linhas_validas: Math.max(0, totalLinhas - (erros?.length || 0)), linhas_com_erro: erros?.length || 0, status, erros: erros || [], resumo: resumo || {}, created_at: new Date().toISOString() } as AnyRecord)
    const { data, error } = await db().from('importacoes_dados').insert(payload).select('*').single()
    if (error) throw normalizeError(error, 'Erro ao registrar importação.')
    return data
  },
  async importarProdutos(rows: AnyRecord[]) {
    const empresaId = await getEmpresaId()
    const payload = rows.map(r => ({ empresa_id: empresaId, nome: r.nome, descricao: r.descricao || null, categoria: r.categoria || 'produto', custo_total: Number(r.custo_total || 0), preco_venda: Number(r.preco_venda || 0), sku: r.sku || null, codigo_barras: r.codigo_barras || null, estoque_minimo: Number(r.estoque_minimo || 0), ativo: true, destaque: false, disponivel: true, tempo_preparo_min: 0, rendimento: 1, unidade_rendimento: 'unidade', margem_aplicada: 0 }))
    const { data, error } = await db().from('produtos').insert(payload).select('id,nome,sku,codigo_barras')
    if (error) throw normalizeError(error, 'Erro ao importar produtos.')
    return data ?? []
  },
  async importarClientes(rows: AnyRecord[]) {
    const empresaId = await getEmpresaId()
    const payload = rows.map(r => ({ empresa_id: empresaId, nome: r.nome, whatsapp: String(r.whatsapp || '').replace(/\D/g, '') || null, email: r.email || null, documento: r.documento || null, endereco: r.endereco || null, observacoes: r.observacoes || null, tipo: 'cliente', ativo: true }))
    const { data, error } = await db().from('clientes').insert(payload).select('id,nome')
    if (error) throw normalizeError(error, 'Erro ao importar clientes.')
    return data ?? []
  },
  async importarFornecedores(rows: AnyRecord[]) {
    const empresaId = await getEmpresaId()
    const payload = rows.map(r => ({ empresa_id: empresaId, nome: r.nome, whatsapp: String(r.whatsapp || '').replace(/\D/g, '') || null, email: r.email || null, cnpj: r.cnpj || null, endereco: r.endereco || null, observacoes: r.observacoes || null, ativo: true }))
    const { data, error } = await db().from('fornecedores').insert(payload).select('id,nome')
    if (error) throw normalizeError(error, 'Erro ao importar fornecedores.')
    return data ?? []
  },
  async importarEstoque(rows: AnyRecord[]) {
    const empresaId = await getEmpresaId()
    const dbx = db()
    const resultados: AnyRecord[] = []
    for (const row of rows) {
      let q = dbx.from('produtos').select('id,nome').eq('empresa_id', empresaId).limit(1)
      if (row.codigo_barras) q = q.eq('codigo_barras', row.codigo_barras)
      else if (row.produto_sku) q = q.eq('sku', row.produto_sku)
      else q = q.ilike('nome', row.produto_nome)
      const { data: produto } = await q.maybeSingle()
      if (!produto) continue
      const { data, error } = await dbx.from('produto_estoque').upsert({ empresa_id: empresaId, produto_id: produto.id, quantidade_atual: Number(row.quantidade_atual || 0), estoque_minimo: Number(row.estoque_minimo || 0), custo_medio: Number(row.custo_medio || 0), localizacao: row.localizacao || null, updated_at: new Date().toISOString() }, { onConflict: 'empresa_id,produto_id' }).select('*').single()
      if (error) throw normalizeError(error, 'Erro ao importar estoque inicial.')
      resultados.push(data)
    }
    return resultados
  },
}

export const SuporteV14Service = {
  async abrirChamado(form: { assunto: string; mensagem: string; prioridade?: 'baixa' | 'media' | 'alta' }) {
    const payload = await withEmpresa({ ...form, status: 'aberto', prioridade: form.prioridade || 'media' } as AnyRecord)
    const { data, error } = await db().from('suporte_chamados').insert(payload).select('*').single()
    if (error) throw normalizeError(error, 'Erro ao abrir chamado de suporte.')
    await AuditoriaService.registrar('suporte.abrir', 'suporte_chamados', data.id, { assunto: form.assunto }).catch(() => null)
    return data
  },
}

export const PlanosV14Service = {
  async listarPlanos() {
    const { data, error } = await db().from('planos_saas').select('*').eq('ativo', true).order('preco_mensal')
    if (error) throw normalizeError(error, 'Erro ao carregar planos.')
    return data ?? []
  },
  async assinaturaAtual() {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('assinaturas_saas').select('*, plano:planos_saas(*)').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao carregar assinatura.')
    return data
  },
}

export const ObservabilidadeV14Service = {
  async registrarErro(erro: unknown, contexto?: AnyRecord) {
    let empresaId: string | null = null
    try {
      empresaId = await getEmpresaId()
    } catch {
      empresaId = null
    }
    try {
      const { error } = await db().from('logs_erro').insert({
        empresa_id: empresaId,
        mensagem: erro instanceof Error ? erro.message : String(erro),
        contexto: contexto || {},
        created_at: new Date().toISOString(),
      })
      if (error) return null
    } catch {
      return null
    }
    return null
  },
}
