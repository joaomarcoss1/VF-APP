'use client'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import Header from '@/components/layout/Header'
import { KpiCard, Card, Badge, Skeleton } from '@/components/ui'
import { MobileQuickActions, MobileFabButton } from '@/components/mobile/V14Mobile'
import { generateBusinessInsights, getRamoPreset } from '@/lib/commercial-v14'
import { DashboardService, ProdutosService, VendasService, InsumosService } from '@/services'
import { fmtCurrency, fmtPct, avaliarCMV } from '@/lib/precificacao'
import { RamoDashboardBanner } from '@/components/ramos/RamoDashboardBanner'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--vf-surface2)] border border-[color-mix(in_srgb,var(--vf-secondary)_30%,transparent)] rounded-lg p-3 text-xs shadow-xl">
      <div className="text-[var(--vf-text2)] mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[var(--vf-text)]">{p.name}: {typeof p.value === 'number' ? fmtCurrency(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [theme, setTheme] = useState({ primary: '#0A8DFF', secondary: '#F2B72E', success: '#16A34A', warning: '#F59E0B', error: '#DC2626', muted: '#667085' })

  useEffect(() => {
    const read = () => {
      const css = getComputedStyle(document.documentElement)
      setTheme({
        primary: css.getPropertyValue('--vf-primary').trim() || '#0A8DFF',
        secondary: css.getPropertyValue('--vf-secondary').trim() || '#F2B72E',
        success: css.getPropertyValue('--vf-success').trim() || '#16A34A',
        warning: css.getPropertyValue('--vf-warning').trim() || '#F59E0B',
        error: css.getPropertyValue('--vf-error').trim() || '#DC2626',
        muted: css.getPropertyValue('--vf-text3').trim() || '#667085',
      })
    }
    read()
    window.addEventListener('vf-branding-updated', read)
    return () => window.removeEventListener('vf-branding-updated', read)
  }, [])
  const { data: dashboard, isLoading: loadingDash } = useQuery({
    queryKey: ['dashboard'],
    queryFn: DashboardService.obter,
    refetchInterval: 60_000,
  })

  const { data: ranking, isLoading: loadingRank } = useQuery({
    queryKey: ['ranking'],
    queryFn: () => ProdutosService.rankingRentabilidade(),
  })

  const { data: evolucao, isLoading: loadingEvol } = useQuery({
    queryKey: ['evolucao-mensal'],
    queryFn: VendasService.resumoMensal,
  })

  const { data: cmvCat } = useQuery({
    queryKey: ['cmv-categoria'],
    queryFn: DashboardService.cmvPorCategoria,
  })

  const { data: alertas } = useQuery({
    queryKey: ['alertas-estoque'],
    queryFn: InsumosService.alertasEstoque,
  })

  const cmvStatus = dashboard ? avaliarCMV(dashboard.cmv_medio) : null

  return (
    <div className="vf-fadein">
      <Header title="Dashboard Executivo" />

      <div className="p-4 md:p-6 space-y-5">
        <RamoDashboardBanner />
        <div className="md:hidden space-y-3">
          <MobileQuickActions actions={(getRamoPreset('personalizado').acoesRapidas).map(a => ({ ...a, description: 'Ação rápida' }))} />
        </div>
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {loadingDash ? (
            Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-24 rounded-lg" />)
          ) : (
            <>
              <KpiCard label="Faturamento do Mês" value={fmtCurrency(dashboard?.faturamento_mes ?? 0)} color="gold" />
              <KpiCard label="Lucro do Mês"       value={fmtCurrency(dashboard?.lucro_mes       ?? 0)} color="green" />
              <KpiCard label="CMV Médio"           value={fmtPct(dashboard?.cmv_medio            ?? 0)}
                delta={cmvStatus?.label} deltaUp={cmvStatus?.status === 'bom' || cmvStatus?.status === 'excelente'}
                color={cmvStatus?.status === 'critico' ? 'red' : cmvStatus?.status === 'atencao' ? 'blue' : 'green'}
              />
              <KpiCard label="Margem Média"        value={fmtPct(dashboard?.margem_media         ?? 0)} color="blue" />
            </>
          )}
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3"><div className="text-[12px] text-[var(--vf-text2)] uppercase tracking-wide">Recomendações inteligentes</div><Badge color="blue">V14 Comercial</Badge></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {generateBusinessInsights({ faturamentoMes: dashboard?.faturamento_mes, lucroMes: dashboard?.lucro_mes, estoqueBaixo: dashboard?.alertas_estoque_critico }).slice(0,3).map((insight, i) => (
              <div key={i} className="rounded-2xl border border-[var(--vf-border)] bg-[var(--vf-surface2)] p-3">
                <div className="text-[13px] font-semibold text-[var(--vf-text)]">{insight.titulo}</div>
                <p className="text-[11px] text-[var(--vf-text3)] mt-1 leading-relaxed">{insight.mensagem}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Alertas de estoque */}
        {(alertas?.length ?? 0) > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[var(--vf-warning)]">⚠️</span>
              <span className="text-[13px] font-semibold text-[var(--vf-text)]">Alertas de estoque</span>
              <Badge color="amber">{alertas!.length}</Badge>
            </div>
            <div className="space-y-2">
              {alertas!.slice(0, 4).map((a, i) => (
                <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg text-[12px] ${
                  a.tipo === 'critico' || a.tipo === 'vencido' ? 'bg-[color-mix(in_srgb,var(--vf-error)_8%,transparent)] border border-[color-mix(in_srgb,var(--vf-error)_20%,transparent)]' :
                  a.tipo === 'vencendo' ? 'bg-[color-mix(in_srgb,var(--vf-warning)_8%,transparent)] border border-[color-mix(in_srgb,var(--vf-warning)_20%,transparent)]' :
                  'bg-[color-mix(in_srgb,var(--vf-info)_8%,transparent)] border border-[color-mix(in_srgb,var(--vf-info)_20%,transparent)]'
                }`}>
                  <span>{a.tipo === 'critico' || a.tipo === 'vencido' ? '🔴' : a.tipo === 'vencendo' ? '🟡' : '🔵'}</span>
                  <span className="text-[var(--vf-text)]">{a.mensagem}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Charts row */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Evolução financeira */}
          <Card className="p-4">
            <div className="text-[12px] text-[var(--vf-text2)] uppercase tracking-wide mb-4">Evolução financeira — 6 meses</div>
            {loadingEvol ? <Skeleton className="h-52" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={evolucao ?? []}>
                  <defs>
                    <linearGradient id="gradFat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.secondary} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={theme.secondary} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gradLuc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.success} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={theme.success} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--vf-border)" />
                  <XAxis dataKey="mes" tick={{ fill: theme.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: theme.muted, fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="faturamento" name="Faturamento" stroke={theme.secondary} fill="url(#gradFat)" strokeWidth={2} />
                  <Area type="monotone" dataKey="lucro"       name="Lucro"       stroke={theme.success} fill="url(#gradLuc)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* CMV por categoria */}
          <Card className="p-4">
            <div className="text-[12px] text-[var(--vf-text2)] uppercase tracking-wide mb-4">CMV por categoria</div>
            {!cmvCat ? <Skeleton className="h-52" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={cmvCat} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--vf-border)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: theme.muted, fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${v}%`} domain={[0, 50]} />
                  <YAxis dataKey="categoria" type="category" tick={{ fill: theme.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="cmv_medio" name="CMV %" radius={[0, 4, 4, 0]}>
                    {cmvCat.map((entry, i) => (
                      <Cell key={i} fill={entry.cmv_medio <= 32 ? theme.success : entry.cmv_medio <= 38 ? theme.warning : theme.error} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Ranking produtos */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[12px] text-[var(--vf-text2)] uppercase tracking-wide">🏆 Ranking de Rentabilidade</div>
          </div>
          {loadingRank ? <Skeleton className="h-40" /> : (
            <div className="overflow-x-auto">
              <table className="vf-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Produto</th>
                    <th>Categoria</th>
                    <th>Custo</th>
                    <th>Preço Venda</th>
                    <th>Margem</th>
                    <th>CMV</th>
                    <th>Lucro Bruto</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(ranking ?? []).slice(0,10).map((p, i) => {
                    const cmv = avaliarCMV(p.cmv_percentual ?? 0)
                    return (
                      <tr key={p.id}>
                        <td>
                          <span className="w-6 h-6 rounded-md bg-[color-mix(in_srgb,var(--vf-secondary)_12%,transparent)] border border-[color-mix(in_srgb,var(--vf-secondary)_25%,transparent)] text-[var(--vf-primary)] text-[10px] font-semibold flex items-center justify-center">
                            {i+1}
                          </span>
                        </td>
                        <td className="font-medium text-[var(--vf-text)]">{p.nome}</td>
                        <td><Badge color="gray">{p.categoria}</Badge></td>
                        <td>{fmtCurrency(p.custo_total)}</td>
                        <td className="text-[var(--vf-primary)] font-medium">{fmtCurrency(p.preco_venda ?? 0)}</td>
                        <td className="text-[var(--vf-success)] font-semibold">{fmtPct(p.margem_bruta ?? 0)}</td>
                        <td style={{ color: cmv.cor }} className="font-medium">{fmtPct(p.cmv_percentual ?? 0)}</td>
                        <td className="text-[var(--vf-success)]">{fmtCurrency(p.lucro_bruto ?? 0)}</td>
                        <td><Badge color={cmv.status === 'excelente'||cmv.status==='bom' ? 'green' : cmv.status==='atencao' ? 'amber' : 'red'}>{cmv.label}</Badge></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {(ranking?.length ?? 0) === 0 && (
                <div className="text-center py-8 text-[var(--vf-text3)] text-sm">
                  Nenhum produto cadastrado ainda. <a href="/produtos" className="text-[var(--vf-primary)]">Cadastrar produto →</a>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    <MobileFabButton />
    </div>
  )
}
