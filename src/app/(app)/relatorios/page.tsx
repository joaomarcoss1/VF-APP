'use client'
import BrandLogo from '@/components/BrandLogo'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, Empty, Field, Input, KpiCard, Skeleton } from '@/components/ui'
import { ProdutosService, InsumosService, VendasService, EventosService, PromocoesService, IdentidadeService, DespesasService } from '@/services'
import { fmtCurrency, fmtPct } from '@/lib/precificacao'
import toast from 'react-hot-toast'

export default function RelatoriosPage() {
  const hoje = new Date()
  const [inicio, setInicio] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0])
  const [fim, setFim] = useState(hoje.toISOString().split('T')[0])

  const periodoAnterior = useMemo(() => {
    const start = new Date(`${inicio}T00:00:00`)
    const end = new Date(`${fim}T00:00:00`)
    const dias = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
    const prevEnd = new Date(start)
    prevEnd.setDate(prevEnd.getDate() - 1)
    const prevStart = new Date(prevEnd)
    prevStart.setDate(prevStart.getDate() - dias + 1)
    return { inicio: prevStart.toISOString().split('T')[0], fim: prevEnd.toISOString().split('T')[0] }
  }, [inicio, fim])

  const comparar = (atual: number, anterior: number) => {
    if (!anterior && !atual) return { delta: '0%', up: true }
    if (!anterior) return { delta: '+100%', up: true }
    const pct = ((atual - anterior) / Math.abs(anterior)) * 100
    return { delta: `${pct >= 0 ? '+' : ''}${pct.toFixed(1).replace('.', ',')}%`, up: pct >= 0 }
  }

  const produtosQ = useQuery({ queryKey: ['produtos'], queryFn: () => ProdutosService.listar() })
  const insumosQ = useQuery({ queryKey: ['insumos'], queryFn: () => InsumosService.listar() })
  const vendasQ = useQuery({ queryKey: ['vendas', inicio, fim], queryFn: () => VendasService.listarPorPeriodo(inicio, fim) })
  const vendasAnteriorQ = useQuery({ queryKey: ['vendas-anterior', periodoAnterior.inicio, periodoAnterior.fim], queryFn: () => VendasService.listarPorPeriodo(periodoAnterior.inicio, periodoAnterior.fim) })
  const eventosQ = useQuery({ queryKey: ['eventos-resumo'], queryFn: () => EventosService.resumo() })
  const promocoesQ = useQuery({ queryKey: ['promocoes-ativas'], queryFn: () => PromocoesService.listarAtivas() })
  const identidadeQ = useQuery({ queryKey: ['identidade'], queryFn: IdentidadeService.obter })
  const despesasQ = useQuery({ queryKey: ['despesas-resumo'], queryFn: () => DespesasService.resumoMensal() })

  const vendas = vendasQ.data ?? []
  const vendasAnterior = vendasAnteriorQ.data ?? []
  const produtos = produtosQ.data ?? []
  const insumos = insumosQ.data ?? []

  const totalFat = vendas.reduce((a, v) => a + Number(v.total ?? 0), 0)
  const totalLucro = vendas.reduce((a, v) => a + Number(v.lucro ?? 0), 0)
  const totalCusto = totalFat - totalLucro
  const despesasMes = despesasQ.data?.total_geral ?? 0
  const lucroAposDespesas = totalLucro - despesasMes
  const cmvGeral = totalFat > 0 ? (totalCusto / totalFat) * 100 : 0
  const ticketMedio = vendas.length ? totalFat / vendas.length : 0
  const fatAnterior = vendasAnterior.reduce((a, v) => a + Number(v.total ?? 0), 0)
  const lucroAnterior = vendasAnterior.reduce((a, v) => a + Number(v.lucro ?? 0), 0)
  const custoAnterior = fatAnterior - lucroAnterior
  const cmvAnterior = fatAnterior > 0 ? (custoAnterior / fatAnterior) * 100 : 0
  const ticketAnterior = vendasAnterior.length ? fatAnterior / vendasAnterior.length : 0
  const cmpFat = comparar(totalFat, fatAnterior)
  const cmpLucro = comparar(totalLucro, lucroAnterior)
  const cmpCmv = comparar(cmvGeral, cmvAnterior)
  const cmpTicket = comparar(ticketMedio, ticketAnterior)

  const ranking = useMemo(() => [...produtos].sort((a, b) => Number(b.lucro_bruto ?? 0) - Number(a.lucro_bruto ?? 0)).slice(0, 5), [produtos])
  const baixaMargem = useMemo(() => [...produtos].filter(p => Number(p.preco_venda ?? 0) > 0).sort((a, b) => Number(a.margem_bruta ?? 0) - Number(b.margem_bruta ?? 0)).slice(0, 5), [produtos])
  const estoqueCritico = useMemo(() => insumos.filter(i => Number(i.estoque_minimo ?? 0) > 0 && Number(i.estoque_atual ?? 0) <= Number(i.estoque_minimo ?? 0)).slice(0, 8), [insumos])
  const canais = useMemo(() => {
    const map = new Map<string, number>()
    vendas.forEach(v => map.set(v.canal, (map.get(v.canal) ?? 0) + Number(v.total ?? 0)))
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [vendas])

  const loading = produtosQ.isLoading || insumosQ.isLoading || vendasQ.isLoading || vendasAnteriorQ.isLoading
  const erro = produtosQ.error || insumosQ.error || vendasQ.error || eventosQ.error || promocoesQ.error || despesasQ.error

  const setPeriodo = (tipo: 'mes' | 'anterior' | 'ano') => {
    const d = new Date()
    if (tipo === 'mes') {
      setInicio(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0])
      setFim(d.toISOString().split('T')[0])
    } else if (tipo === 'anterior') {
      setInicio(new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0])
      setFim(new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0])
    } else {
      setInicio(new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0])
      setFim(d.toISOString().split('T')[0])
    }
  }

  const exportPDF = async (tipo: 'fichas' | 'financeiro') => {
    const { exportarRelatorioFinanceiroPDF, exportarFichaTecnicaPDF } = await import('@/lib/exports')
    if (tipo === 'financeiro') {
      if (!vendas.length) return toast.error('Nenhuma venda no período')
      await exportarRelatorioFinanceiroPDF(vendas, `${inicio} a ${fim}`, identidadeQ.data ?? undefined)
      toast.success('PDF financeiro premium gerado!')
    } else {
      if (!produtos.length) return toast.error('Nenhum produto cadastrado')
      for (const p of produtos) await exportarFichaTecnicaPDF(p, identidadeQ.data ?? undefined)
      toast.success('PDFs das fichas técnicas gerados!')
    }
  }

  const exportExcel = async () => {
    const { exportarRelatorioExcel } = await import('@/lib/exports')
    await exportarRelatorioExcel(vendas, produtos, insumos)
    toast.success('Excel gerado!')
  }

  return (
    <div className="vf-fadein">
      <Header title="Relatórios" />
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 vf-logo-soft p-2 flex items-center justify-center overflow-hidden hidden sm:flex">
              <BrandLogo src={identidadeQ.data?.logo_url} alt={identidadeQ.data?.nome || 'VF Nexus'} width={64} height={64} className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--vf-text3)]">{identidadeQ.data?.nome || 'VF Nexus'}</div>
              <h1 className="text-xl md:text-2xl font-semibold text-[var(--vf-text)]">Relatórios personalizados</h1>
              <p className="text-sm text-[var(--vf-text3)] mt-1">Nome, logo e paleta da empresa são aplicados em relatórios, PDFs e exportações.</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={() => exportPDF('financeiro')}>📄 PDF Financeiro</Button>
            <Button variant="secondary" onClick={exportExcel}>📊 Excel Completo</Button>
            <Button onClick={() => exportPDF('fichas')}>📋 Fichas PDF</Button>
          </div>
        </div>

        {erro && <Alert type="error">{(erro as Error).message}</Alert>}

        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Data início"><Input type="date" value={inicio} onChange={e => setInicio(e.target.value)} /></Field>
            <Field label="Data fim"><Input type="date" value={fim} onChange={e => setFim(e.target.value)} /></Field>
            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" size="sm" onClick={() => setPeriodo('mes')}>Este mês</Button>
              <Button variant="secondary" size="sm" onClick={() => setPeriodo('anterior')}>Mês anterior</Button>
              <Button variant="secondary" size="sm" onClick={() => setPeriodo('ano')}>Este ano</Button>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Faturamento" value={fmtCurrency(totalFat)} color="gold" delta={cmpFat.delta} deltaUp={cmpFat.up} />
              <KpiCard label="Lucro Bruto" value={fmtCurrency(totalLucro)} color="green" delta={cmpLucro.delta} deltaUp={cmpLucro.up} />
              <KpiCard label="Despesas Mensais" value={fmtCurrency(despesasMes)} color="red" />
              <KpiCard label="Lucro Líquido Est." value={fmtCurrency(lucroAposDespesas)} color={lucroAposDespesas >= 0 ? 'green' : 'red'} />
              <KpiCard label="Custo Total" value={fmtCurrency(totalCusto)} color="red" />
              <KpiCard label="CMV Período" value={fmtPct(cmvGeral)} color={cmvGeral > 38 ? 'red' : cmvGeral > 32 ? 'blue' : 'green'} delta={cmpCmv.delta} deltaUp={!cmpCmv.up} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Ticket Médio" value={fmtCurrency(ticketMedio)} color="blue" delta={cmpTicket.delta} deltaUp={cmpTicket.up} />
              <KpiCard label="Produtos" value={produtos.length} color="gold" />
              <KpiCard label="Promoções Ativas" value={promocoesQ.data?.length ?? 0} color="green" />
              <KpiCard label="Eventos previstos" value={eventosQ.data?.total ?? 0} color="blue" />
            </div>
          </>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-[12px] text-[var(--vf-text3)] uppercase tracking-wide mb-3">Produtos mais lucrativos</div>
            {ranking.length ? ranking.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-[var(--vf-border)] last:border-0">
                <div><span className="text-[var(--vf-text3)] mr-2">#{i + 1}</span><span className="text-[var(--vf-text)] text-[13px]">{p.nome}</span></div>
                <div className="text-[var(--vf-success)] text-[13px] font-semibold">{fmtCurrency(p.lucro_bruto ?? 0)}</div>
              </div>
            )) : <Empty icon="🍽️" title="Sem produtos" description="Cadastre produtos para gerar ranking." />}
          </Card>

          <Card className="p-4">
            <div className="text-[12px] text-[var(--vf-text3)] uppercase tracking-wide mb-3">Produtos com menor margem</div>
            {baixaMargem.length ? baixaMargem.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-[var(--vf-border)] last:border-0">
                <div className="text-[var(--vf-text)] text-[13px]">{p.nome}</div>
                <Badge color={Number(p.margem_bruta ?? 0) < 35 ? 'red' : 'amber'}>{fmtPct(p.margem_bruta ?? 0)}</Badge>
              </div>
            )) : <Empty icon="📉" title="Sem análise" description="Crie fichas técnicas para calcular margens." />}
          </Card>

          <Card className="p-4">
            <div className="text-[12px] text-[var(--vf-text3)] uppercase tracking-wide mb-3">Estoque crítico</div>
            {estoqueCritico.length ? estoqueCritico.map(i => (
              <div key={i.id} className="flex items-center justify-between py-2 border-b border-[var(--vf-border)] last:border-0">
                <div className="text-[var(--vf-text)] text-[13px]">{i.nome}</div>
                <Badge color="red">{i.estoque_atual} / mín. {i.estoque_minimo}</Badge>
              </div>
            )) : <Empty icon="✅" title="Estoque saudável" description="Nenhum insumo abaixo do mínimo." />}
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <div className="p-4 border-b border-[var(--vf-border)] flex items-center justify-between">
              <div className="text-[12px] text-[var(--vf-text3)] uppercase tracking-wide">Vendas do período ({vendas.length})</div>
              <Badge color="gold">{fmtCurrency(totalFat)}</Badge>
            </div>
            {vendas.length ? (
              <div className="overflow-x-auto">
                <table className="vf-table">
                  <thead><tr><th>Data</th><th>Produto</th><th>Qtd</th><th>Total</th><th>Lucro</th><th>Canal</th></tr></thead>
                  <tbody>
                    {vendas.map(v => (
                      <tr key={v.id}>
                        <td>{new Date(v.data_venda).toLocaleDateString('pt-BR')}</td>
                        <td className="font-medium text-[var(--vf-text)]">{v.produto_nome}</td>
                        <td>{v.quantidade}</td>
                        <td>{fmtCurrency(v.total)}</td>
                        <td className="text-[var(--vf-success)] font-medium">{fmtCurrency(v.lucro)}</td>
                        <td><Badge color="gray">{v.canal}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Empty icon="📊" title="Nenhuma venda no período" description="Altere o filtro ou registre novas vendas." />}
          </Card>

          <Card className="p-4">
            <div className="text-[12px] text-[var(--vf-text3)] uppercase tracking-wide mb-3">Faturamento por canal</div>
            {canais.length ? canais.map(([canal, valor]) => (
              <div key={canal} className="mb-3">
                <div className="flex justify-between text-[13px] mb-1"><span className="text-[var(--vf-text)]">{canal}</span><span className="text-[var(--vf-primary)]">{fmtCurrency(valor)}</span></div>
                <div className="h-2 bg-[var(--vf-surface2)] rounded-full overflow-hidden"><div className="h-full bg-[var(--vf-primary)]" style={{ width: `${totalFat > 0 ? Math.min(100, (valor / totalFat) * 100) : 0}%` }} /></div>
              </div>
            )) : <Empty icon="🛒" title="Sem canais" description="As vendas aparecerão aqui agrupadas por canal." />}
          </Card>
        </div>
      </div>
    </div>
  )
}
