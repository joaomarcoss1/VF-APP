'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, Empty, KpiCard, Skeleton } from '@/components/ui'
import { AgendamentosService, ClientesService, DespesasService, FinanceiroService, InsumosService, ProdutosEstoqueService, ProdutosService, VendasService } from '@/services'
import { calcularCurvaABC, gerarDiagnosticoEmpresarial, type DiagnosticoInsight } from '@/lib/commercial-engine'
import { fmtCurrency } from '@/lib/precificacao'

const hoje = () => new Date().toISOString().split('T')[0]
const inicioMes = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

type Periodo = 'mes' | '7d' | '30d'

function getPeriodo(periodo: Periodo) {
  const end = hoje()
  const now = new Date()
  if (periodo === '7d') now.setDate(now.getDate() - 7)
  else if (periodo === '30d') now.setDate(now.getDate() - 30)
  else return { start: inicioMes(), end }
  return { start: now.toISOString().split('T')[0], end }
}

function insightColor(nivel: DiagnosticoInsight['nivel']): 'green' | 'blue' | 'amber' | 'red' {
  return nivel === 'positivo' ? 'green' : nivel === 'critico' ? 'red' : nivel === 'alerta' ? 'amber' : 'blue'
}

export default function DiagnosticoPage() {
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const { start, end } = getPeriodo(periodo)
  const vendasQ = useQuery({ queryKey: ['diagnostico-vendas', start, end], queryFn: () => VendasService.listarPorPeriodo(start, end) })
  const produtosQ = useQuery({ queryKey: ['diagnostico-produtos'], queryFn: () => ProdutosService.listar() })
  const estoqueQ = useQuery({ queryKey: ['diagnostico-produtos-estoque'], queryFn: () => ProdutosEstoqueService.listar() })
  const insumosQ = useQuery({ queryKey: ['diagnostico-insumos'], queryFn: () => InsumosService.listar() })
  const clientesQ = useQuery({ queryKey: ['diagnostico-clientes'], queryFn: () => ClientesService.listar() })
  const agendamentosQ = useQuery({ queryKey: ['diagnostico-agendamentos', start, end], queryFn: () => AgendamentosService.listar(start, end) })
  const lancQ = useQuery({ queryKey: ['diagnostico-financeiro', start, end], queryFn: () => FinanceiroService.listar(start, end) })
  const despesasQ = useQuery({ queryKey: ['diagnostico-despesas'], queryFn: () => DespesasService.listar() })

  const loading = vendasQ.isLoading || produtosQ.isLoading || estoqueQ.isLoading || insumosQ.isLoading || clientesQ.isLoading || agendamentosQ.isLoading || lancQ.isLoading || despesasQ.isLoading

  const diagnostico = useMemo(() => gerarDiagnosticoEmpresarial({
    vendas: vendasQ.data ?? [],
    produtos: produtosQ.data ?? [],
    estoqueProdutos: estoqueQ.data ?? [],
    insumos: insumosQ.data ?? [],
    clientes: clientesQ.data ?? [],
    agendamentos: agendamentosQ.data ?? [],
    lancamentos: lancQ.data ?? [],
    despesas: despesasQ.data ?? [],
  }), [vendasQ.data, produtosQ.data, estoqueQ.data, insumosQ.data, clientesQ.data, agendamentosQ.data, lancQ.data, despesasQ.data])

  const curvaProdutos = useMemo(() => calcularCurvaABC((produtosQ.data ?? []).map(p => ({ id: p.id, nome: p.nome, valor: Number(p.preco_venda || 0) * Number(p.rendimento || 1) })), i => i.valor).slice(0, 8), [produtosQ.data])

  return <div className="vf-fadein">
    <Header title="Diagnóstico Inteligente" />
    <div className="p-4 md:p-6 space-y-5">
      <Alert type="info">Diagnóstico baseado em regras comerciais: vendas, estoque, financeiro, clientes, margem e operação. Esta área funciona mesmo sem chave de IA externa.</Alert>

      <Card className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--vf-text)]">Painel de saúde do negócio</h2>
          <p className="text-sm text-[var(--vf-text2)]">Período analisado: {new Date(start).toLocaleDateString('pt-BR')} até {new Date(end).toLocaleDateString('pt-BR')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant={periodo === 'mes' ? 'primary' : 'secondary'} onClick={() => setPeriodo('mes')}>Este mês</Button>
          <Button variant={periodo === '7d' ? 'primary' : 'secondary'} onClick={() => setPeriodo('7d')}>7 dias</Button>
          <Button variant={periodo === '30d' ? 'primary' : 'secondary'} onClick={() => setPeriodo('30d')}>30 dias</Button>
        </div>
      </Card>

      {loading ? <Skeleton className="h-72" /> : <>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard label="Score comercial" value={diagnostico.score} suffix="/100" color={diagnostico.score >= 75 ? 'green' : diagnostico.score >= 50 ? 'gold' : 'red'} />
          <KpiCard label="Receita líquida" value={fmtCurrency(diagnostico.resumo.dre.receitaLiquida)} color="blue" />
          <KpiCard label="Lucro líquido" value={fmtCurrency(diagnostico.resumo.lucroLiquido)} color={diagnostico.resumo.lucroLiquido >= 0 ? 'green' : 'red'} />
          <KpiCard label="Margem líquida" value={diagnostico.resumo.margemLiquidaPct.toFixed(1)} suffix="%" color={diagnostico.resumo.margemLiquidaPct >= 15 ? 'green' : 'gold'} />
          <KpiCard label="Vendas" value={(vendasQ.data ?? []).length} color="blue" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_.9fr] gap-5">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--vf-text)]">Insights acionáveis</h2>
                <p className="text-sm text-[var(--vf-text2)]">O sistema mostra o problema, o impacto e a ação sugerida.</p>
              </div>
              <Badge color="blue">{diagnostico.insights.length} insights</Badge>
            </div>
            {diagnostico.insights.length ? <div className="grid md:grid-cols-2 gap-3">
              {diagnostico.insights.map((insight, index) => <Card key={`${insight.titulo}-${index}`} className="p-4 bg-[var(--vf-surface2)]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-[var(--vf-text3)]">{insight.area} • impacto {insight.impacto}</div>
                    <h3 className="font-semibold text-[var(--vf-text)] mt-1">{insight.titulo}</h3>
                  </div>
                  <Badge color={insightColor(insight.nivel)}>{insight.nivel}</Badge>
                </div>
                <p className="text-sm text-[var(--vf-text2)] mt-3">{insight.descricao}</p>
                <p className="text-xs text-[var(--vf-primary)] font-semibold mt-3">Ação sugerida: {insight.acao}</p>
              </Card>)}
            </div> : <Empty icon="🧠" title="Sem alertas críticos" description="Com os dados atuais, o negócio não possui alertas automáticos relevantes." />}
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-semibold text-[var(--vf-text)] mb-4">DRE simplificada</h2>
            <div className="space-y-3 text-sm">
              <Linha label="Receita bruta" value={diagnostico.resumo.dre.receitaBruta} />
              <Linha label="Descontos" value={-Math.abs(diagnostico.resumo.dre.descontos)} />
              <Linha label="Receita líquida" value={diagnostico.resumo.dre.receitaLiquida} destaque />
              <Linha label="Custos dos produtos/serviços" value={-Math.abs(diagnostico.resumo.dre.custoProdutosServicos)} />
              <Linha label="Lucro bruto" value={diagnostico.resumo.dre.lucroBruto} destaque />
              <Linha label="Despesas operacionais" value={-Math.abs(diagnostico.resumo.dre.despesasOperacionais)} />
              <Linha label="Lucro operacional" value={diagnostico.resumo.dre.lucroOperacional} destaque final />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-[var(--vf-text)] mb-1">Curva ABC de vendas</h2>
            <p className="text-sm text-[var(--vf-text2)] mb-4">Ajuda a identificar itens que mais impactam faturamento.</p>
            <div className="space-y-2">
              {diagnostico.abcVendas.slice(0, 8).map(item => <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--vf-surface2)]">
                <div className="min-w-0"><div className="font-medium text-[var(--vf-text)] truncate">{item.nome}</div><div className="text-xs text-[var(--vf-text3)]">{item.percentual.toFixed(1)}% do faturamento • acumulado {item.acumulado.toFixed(1)}%</div></div>
                <div className="flex items-center gap-2"><Badge color={item.classe === 'A' ? 'green' : item.classe === 'B' ? 'blue' : 'gray'}>Classe {item.classe}</Badge><span className="text-sm font-semibold text-[var(--vf-primary)]">{fmtCurrency(item.valor)}</span></div>
              </div>)}
              {!diagnostico.abcVendas.length && <Empty icon="📊" title="Sem vendas suficientes" description="Registre vendas para gerar a curva ABC." />}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-semibold text-[var(--vf-text)] mb-1">Potencial de catálogo</h2>
            <p className="text-sm text-[var(--vf-text2)] mb-4">Produtos com maior valor potencial em estoque/preço.</p>
            <div className="space-y-2">
              {curvaProdutos.map(item => <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--vf-surface2)]">
                <div className="min-w-0"><div className="font-medium text-[var(--vf-text)] truncate">{item.nome}</div><div className="text-xs text-[var(--vf-text3)]">Classe {item.classe} • {item.percentual.toFixed(1)}%</div></div>
                <span className="text-sm font-semibold text-[var(--vf-primary)]">{fmtCurrency(item.valor)}</span>
              </div>)}
              {!curvaProdutos.length && <Empty icon="🛍️" title="Sem produtos suficientes" description="Cadastre produtos/serviços para analisar potencial comercial." />}
            </div>
          </Card>
        </div>
      </>}
    </div>
  </div>
}

function Linha({ label, value, destaque, final }: { label: string; value: number; destaque?: boolean; final?: boolean }) {
  const positive = value >= 0
  return <div className={`flex items-center justify-between gap-3 ${destaque ? 'font-semibold' : ''} ${final ? 'pt-3 border-t border-[var(--vf-border)]' : ''}`}>
    <span className="text-[var(--vf-text2)]">{label}</span>
    <span className={positive ? 'text-[#16A34A]' : 'text-[#DC2626]'}>{fmtCurrency(value)}</span>
  </div>
}
