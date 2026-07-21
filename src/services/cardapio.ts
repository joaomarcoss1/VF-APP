import type { Cardapio, CardapioItem, CardapioItemForm, CardapioProdutoView, Produto } from '@/types'
import { db, getEmpresaId, normalizeEmptyValues, normalizeError, withEmpresa, assertPermission, type AnyRecord } from './_base'
import { AuditoriaService } from './auditoria'
import { PromocoesService } from './promocoes'

export const CardapioService = {
  async obterOuCriarPadrao(): Promise<Cardapio> {
    const empresaId = await getEmpresaId()
    const { data: existente, error: readError } = await db().from('cardapios').select('*, itens:cardapio_itens(*)').eq('empresa_id', empresaId).eq('ativo', true).order('created_at').limit(1).maybeSingle()
    if (readError) throw normalizeError(readError, 'Erro ao carregar cardápio.')
    if (existente) return existente as Cardapio
    await assertPermission('cardapio', 'criar')
    const payload = await withEmpresa({ nome: 'Cardápio principal', descricao: 'Cardápio público de produtos e promoções.', ativo: true } as AnyRecord)
    const { data, error } = await db().from('cardapios').insert(payload).select('*, itens:cardapio_itens(*)').single()
    if (error) throw normalizeError(error, 'Erro ao criar cardápio padrão.')
    await AuditoriaService.registrar('cardapio.criar', 'cardapios', data.id, { padrao: true }).catch(() => null)
    return data as Cardapio
  },
  async atualizar(id: string, form: Partial<Cardapio>): Promise<Cardapio> {
    await assertPermission('cardapio', 'editar')
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('cardapios').update({ ...normalizeEmptyValues(form as AnyRecord), updated_at: new Date().toISOString() }).eq('id', id).eq('empresa_id', empresaId).select('*, itens:cardapio_itens(*)').single()
    if (error) throw normalizeError(error, 'Erro ao atualizar cardápio.')
    await AuditoriaService.registrar('cardapio.editar', 'cardapios', id, { campos: Object.keys(form) }).catch(() => null)
    return data as Cardapio
  },
  async salvarItem(form: CardapioItemForm): Promise<CardapioItem> {
    await assertPermission('cardapio', 'editar')
    const empresaId = await getEmpresaId()
    const payload = normalizeEmptyValues({ ...form, empresa_id: empresaId, ordem: form.ordem ?? 0, exibir: form.exibir ?? true, destaque: Boolean(form.destaque) } as AnyRecord)
    const { data, error } = await db().from('cardapio_itens').upsert(payload, { onConflict: 'cardapio_id,produto_id' }).select('*, produto:produtos(*)').single()
    if (error) throw normalizeError(error, 'Erro ao salvar item do cardápio.')
    await AuditoriaService.registrar('cardapio.item.salvar', 'cardapio_itens', data.id, { produto_id: data.produto_id }).catch(() => null)
    return data as CardapioItem
  },
  async removerItem(id: string): Promise<void> {
    await assertPermission('cardapio', 'editar')
    const empresaId = await getEmpresaId()
    const { error } = await db().from('cardapio_itens').delete().eq('id', id).eq('empresa_id', empresaId)
    if (error) throw normalizeError(error, 'Erro ao remover item do cardápio.')
    await AuditoriaService.registrar('cardapio.item.remover', 'cardapio_itens', id).catch(() => null)
  },
  async montarProdutos(cardapioId?: string): Promise<CardapioProdutoView[]> {
    const empresaId = await getEmpresaId()
    const [{ data: produtos, error: produtosError }, { data: itens, error: itensError }, promocoes] = await Promise.all([
      db().from('produtos').select('*').eq('empresa_id', empresaId).eq('ativo', true).eq('disponivel', true).order('nome'),
      cardapioId ? db().from('cardapio_itens').select('*').eq('empresa_id', empresaId).eq('cardapio_id', cardapioId) : Promise.resolve({ data: [], error: null }) as any,
      PromocoesService.listarAtivas().catch(() => []),
    ])
    if (produtosError) throw normalizeError(produtosError, 'Erro ao carregar produtos do cardápio.')
    if (itensError) throw normalizeError(itensError, 'Erro ao carregar itens do cardápio.')
    const itensMap = new Map((itens ?? []).map((i: any) => [i.produto_id, i]))
    const promoMap = new Map((promocoes ?? []).filter((p: any) => p.exibir_cardapio).map((p: any) => [p.produto_id, p]))
    return ((produtos ?? []) as Produto[]).map((produto) => {
      const item = itensMap.get(produto.id) as CardapioItem | undefined
      const promocao = promoMap.get(produto.id) as any
      const precoOriginal = Number(produto.preco_venda || 0)
      const precoExibido = promocao ? Number(promocao.preco_promocional || precoOriginal) : precoOriginal
      const economia = Math.max(0, precoOriginal - precoExibido)
      return { produto, item, promocao_ativa: promocao || null, preco_exibido: precoExibido, preco_original: precoOriginal, economia, economia_percentual: precoOriginal > 0 ? (economia / precoOriginal) * 100 : 0, descricao_cardapio: item?.descricao_cardapio || produto.descricao, categoria: item?.categoria || produto.categoria, exibir: item?.exibir ?? true, destaque: item?.destaque ?? produto.destaque }
    })
  },
}
