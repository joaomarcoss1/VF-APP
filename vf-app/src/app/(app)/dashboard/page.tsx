'use client'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import Header from '@/components/layout/Header'
import { KpiCard, Card, Badge, Skeleton } from '@/components/ui'
import { DashboardService, ProdutosService, VendasService, InsumosService } from '@/services'
import { fmtCurrency, fmtPct, avaliarCMV } from '@/lib/precificacao'

const COLORS = ['#C9A84C','#3DAA6B','#4A8FD4','#E8B84B','#D45050','#9A9488']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--vf-surface2)] border border-[rgba(201,168,76,0.25)] rounded-lg p-3 text-xs shadow-xl">
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

        {/* Alertas de estoque */}
        {(alertas?.length ?? 0) > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[#E8B84B]">⚠️</span>
              <span className="text-[13px] font-semibold text-[var(--vf-text)]">Alertas de estoque</span>
              <Badge color="amber">{alertas!.length}</Badge>
            </div>
            <div className="space-y-2">
              {alertas!.slice(0, 4).map((a, i) => (
                <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg text-[12px] ${
                  a.tipo === 'critico' || a.tipo === 'vencido' ? 'bg-[rgba(212,80,80,0.08)] border border-[rgba(212,80,80,0.2)]' :
                  a.tipo === 'vencendo' ? 'bg-[rgba(232,184,75,0.08)] border border-[rgba(232,184,75,0.2)]' :
                  'bg-[rgba(74,143,212,0.08)] border border-[rgba(74,143,212,0.2)]'
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
                      <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#C9A84C" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gradLuc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3DAA6B" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3DAA6B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="mes" tick={{ fill: '#5A564F', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#5A564F', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="faturamento" name="Faturamento" stroke="#C9A84C" fill="url(#gradFat)" strokeWidth={2} />
                  <Area type="monotone" dataKey="lucro"       name="Lucro"       stroke="#3DAA6B" fill="url(#gradLuc)" strokeWidth={2} />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#5A564F', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${v}%`} domain={[0, 50]} />
                  <YAxis dataKey="categoria" type="category" tick={{ fill: '#9A9488', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="cmv_medio" name="CMV %" radius={[0, 4, 4, 0]}>
                    {cmvCat.map((entry, i) => (
                      <Cell key={i} fill={entry.cmv_medio <= 32 ? '#3DAA6B' : entry.cmv_medio <= 38 ? '#E8B84B' : '#D45050'} />
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
                          <span className="w-6 h-6 rounded-md bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.2)] text-[var(--vf-primary)] text-[10px] font-semibold flex items-center justify-center">
                            {i+1}
                          </span>
                        </td>
                        <td className="font-medium text-[var(--vf-text)]">{p.nome}</td>
                        <td><Badge color="gray">{p.categoria}</Badge></td>
                        <td>{fmtCurrency(p.custo_total)}</td>
                        <td className="text-[var(--vf-primary)] font-medium">{fmtCurrency(p.preco_venda ?? 0)}</td>
                        <td className="text-[#3DAA6B] font-semibold">{fmtPct(p.margem_bruta ?? 0)}</td>
                        <td style={{ color: cmv.cor }} className="font-medium">{fmtPct(p.cmv_percentual ?? 0)}</td>
                        <td className="text-[#3DAA6B]">{fmtCurrency(p.lucro_bruto ?? 0)}</td>
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
    </div>
  )
}
