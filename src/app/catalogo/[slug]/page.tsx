import { createClient } from '@supabase/supabase-js'
import BrandLogo from '@/components/BrandLogo'
import { resolveBranding } from '@/lib/branding'
import { buildWhatsappUrl, catalogWhatsappText, groupCatalogByCategory } from '@/lib/commercial-v14'
import { fmtCurrency } from '@/lib/precificacao'
import type { CardapioProdutoView, Produto } from '@/types'

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ slug: string }> }

function publicDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createClient(url, key)
}

async function carregar(slug: string) {
  const db = publicDb()
  const { data: catalogo } = await db.from('catalogos_publicos').select('*, empresa:empresas(*)').eq('slug', slug).eq('ativo', true).maybeSingle()
  if (!catalogo) return null
  const [itensResult, promocoesResult] = await Promise.all([
    db.from('cardapio_itens').select('*, produto:produtos(*)').eq('cardapio_id', catalogo.cardapio_id).eq('exibir', true).order('ordem'),
    db.from('promocoes').select('*').eq('empresa_id', catalogo.empresa_id).eq('status', 'ativa').eq('exibir_cardapio', true),
  ])
  const promoMap = new Map((promocoesResult.data ?? []).map((p: any) => [p.produto_id, p]))
  const produtos: CardapioProdutoView[] = (itensResult.data ?? []).map((item: any) => {
    const produto = item.produto as Produto
    const promocao = promoMap.get(produto?.id)
    const precoOriginal = Number(produto?.preco_venda || 0)
    const precoExibido = promocao ? Number((promocao as any).preco_promocional || precoOriginal) : precoOriginal
    return { produto, item, promocao_ativa: promocao as any || null, preco_exibido: precoExibido, preco_original: precoOriginal, economia: Math.max(0, precoOriginal - precoExibido), economia_percentual: precoOriginal > 0 ? ((precoOriginal - precoExibido) / precoOriginal) * 100 : 0, descricao_cardapio: item.descricao_cardapio || produto?.descricao, categoria: item.categoria || produto?.categoria || 'Outros', exibir: true, destaque: Boolean(item.destaque || produto?.destaque) }
  }).filter(p => p.produto && Number(p.preco_exibido || 0) > 0)
  return { catalogo, produtos }
}

export default async function CatalogoPublicoPage({ params }: PageProps) {
  const { slug } = await params
  const dados = await carregar(slug)
  if (!dados) return <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center"><div><h1 className="text-2xl font-bold text-slate-900">Catálogo indisponível</h1><p className="text-slate-500 mt-2">O link pode ter sido desativado pela empresa.</p></div></main>
  const empresa = (dados.catalogo as any).empresa || {}
  const branding = resolveBranding({ ...empresa, nome: empresa.nome || dados.catalogo.titulo, logo_url: empresa.logo_url || '/nexlabs-logo.png' } as any)
  const categorias = groupCatalogByCategory(dados.produtos)
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || ''}/catalogo/${slug}`
  const whatsapp = buildWhatsappUrl({ telefone: dados.catalogo.whatsapp || empresa.telefone, texto: catalogWhatsappText(branding.nome, url) })

  return (
    <main style={{ ['--vf-primary' as any]: branding.cor_primaria, ['--vf-secondary' as any]: branding.cor_secundaria, ['--vf-bg' as any]: branding.cor_fundo, ['--vf-text' as any]: branding.cor_texto, ['--vf-card' as any]: branding.cor_card, ['--vf-border' as any]: branding.cor_borda }} className="min-h-screen bg-[var(--vf-bg)] text-[var(--vf-text)]">
      <section className="sticky top-0 z-20 backdrop-blur-xl bg-[color-mix(in_srgb,var(--vf-bg)_88%,white)] border-b border-[var(--vf-border)]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-14 h-14 rounded-3xl bg-white border border-[var(--vf-border)] overflow-hidden flex items-center justify-center shadow-sm"><BrandLogo src={branding.logo_url} alt={branding.nome} className="w-full h-full object-contain p-1" /></div>
          <div className="min-w-0"><h1 className="font-bold text-lg leading-tight truncate">{dados.catalogo.titulo || branding.nome}</h1><p className="text-xs opacity-75 line-clamp-2">{dados.catalogo.descricao || 'Catálogo digital atualizado.'}</p></div>
          <a href={whatsapp} className="ml-auto hidden sm:inline-flex rounded-full px-4 py-2 bg-[var(--vf-primary)] text-white text-sm font-semibold">WhatsApp</a>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-5 space-y-6 pb-28">
        {categorias.length === 0 && <div className="rounded-3xl bg-white p-8 text-center border border-[var(--vf-border)]"><b>Nenhum produto publicado ainda.</b></div>}
        {categorias.map(([categoria, itens]) => <div key={categoria} className="space-y-3">
          <div className="flex items-center gap-3"><div className="h-px flex-1 bg-[var(--vf-border)]" /><span className="rounded-full bg-[color-mix(in_srgb,var(--vf-primary)_10%,white)] border border-[var(--vf-border)] px-3 py-1 text-xs font-bold text-[var(--vf-primary)] uppercase tracking-widest">{categoria}</span><div className="h-px flex-1 bg-[var(--vf-border)]" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {itens.map(item => <article key={item.produto.id} className="rounded-3xl bg-[var(--vf-card)] border border-[var(--vf-border)] p-4 shadow-sm">
              <div className="flex justify-between gap-3"><div className="min-w-0"><h2 className="font-bold line-clamp-2">{item.produto.nome}</h2>{item.descricao_cardapio && <p className="text-sm opacity-70 mt-1 line-clamp-3">{item.descricao_cardapio}</p>}</div>{item.destaque && <span className="text-xs h-fit rounded-full bg-[var(--vf-secondary)] text-white px-2 py-1">Destaque</span>}</div>
              <div className="mt-4 flex items-end justify-between"><span className="text-xs opacity-60">{item.promocao_ativa ? 'Preço promocional' : 'Preço'}</span><strong className="text-xl text-[var(--vf-primary)]">{fmtCurrency(item.preco_exibido)}</strong></div>
            </article>)}
          </div>
        </div>)}
      </section>
      <div className="fixed left-0 right-0 bottom-0 p-4 bg-[linear-gradient(180deg,transparent,var(--vf-bg)_30%)]"><div className="max-w-4xl mx-auto"><a href={whatsapp} className="flex items-center justify-center rounded-3xl bg-[var(--vf-primary)] text-white min-h-[54px] font-bold shadow-xl">Pedir pelo WhatsApp</a></div></div>
    </main>
  )
}
