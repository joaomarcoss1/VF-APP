'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Card, Field, Input, Select, Button, Alert } from '@/components/ui'
import { ProdutosService, ConfigService } from '@/services'
import { simularCenario, calcularPrecificacao, fmtCurrency, fmtPct } from '@/lib/precificacao'

export default function SimuladorPage() {
  const { data: produtos } = useQuery({ queryKey:['produtos'], queryFn: () => ProdutosService.listar() })
  const { data: config } = useQuery({ queryKey:['configuracoes'], queryFn: ConfigService.obter })
  const [produtoId, setProdutoId] = useState('')
  const [varCusto,  setVarCusto]  = useState('')
  const [varPreco,  setVarPreco]  = useState('')
  const [margemCustom, setMargemCustom] = useState('300')

  const produto = produtos?.find(p => p.id === produtoId)

  const original = produto ? calcularPrecificacao(produto.custo_total, produto.margem_aplicada, config?.margem_minima ?? 200, config?.margem_premium ?? 400, 0, config?.margem_ideal ?? 300) : null

  const simulado = produto ? simularCenario({
    custoAtual: produto.custo_total,
    precoAtual: produto.preco_venda ?? 0,
    variacaoCusto: varCusto ? Number(varCusto) : 0,
    variacaoPreco: varPreco ? Number(varPreco) : 0,
  }) : null

  const comNovaMargemPreco = produto ? calcularPrecificacao(
    produto.custo_total * (1 + (varCusto ? Number(varCusto) : 0) / 100),
    Number(margemCustom),
    config?.margem_minima ?? 200,
    config?.margem_premium ?? 400,
    0,
    config?.margem_ideal ?? 300
  ) : null

  const DiffBadge = ({ original, novo, money }: { original: number; novo: number; money?: boolean }) => {
    const diff = novo - original
    const pct  = original !== 0 ? (diff / Math.abs(original)) * 100 : 0
    if (Math.abs(diff) < 0.01) return <span className="text-[var(--vf-text3)] text-[11px]">=</span>
    return (
      <span className={`text-[11px] font-medium ${diff > 0 ? 'text-[var(--vf-success)]' : 'text-[var(--vf-error)]'}`}>
        {diff > 0 ? '↑' : '↓'} {money ? fmtCurrency(Math.abs(diff)) : fmtPct(Math.abs(pct))}
      </span>
    )
  }

  return (
    <div className="vf-fadein">
      <Header title="Simulador de Preços" />
      <div className="p-4 md:p-6 space-y-5">

        <Card className="p-4">
          <div className="text-[13px] text-[var(--vf-text2)] mb-4">
            🔮 Simule cenários: “E se o fornecedor subir o preço? E se eu trocar a margem?”
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Produto base">
              <Select value={produtoId} onChange={e => setProdutoId(e.target.value)}>
                <option value="">— Selecione um produto —</option>
                {produtos?.map(p => <option key={p.id} value={p.id}>{p.nome} (custo: {fmtCurrency(p.custo_total)})</option>)}
              </Select>
            </Field>
          </div>
        </Card>

        {produto && (
          <>
            {/* Controles */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="text-[12px] text-[var(--vf-text2)] uppercase tracking-wide mb-3">📦 Variação de Custo</div>
                <Field label="Custo sobe/desce (%)" hint="Ex: 10 = +10%. -15 = -15%">
                  <Input type="number" value={varCusto} onChange={e => setVarCusto(e.target.value)} placeholder="0" />
                </Field>
              </Card>
              <Card className="p-4">
                <div className="text-[12px] text-[var(--vf-text2)] uppercase tracking-wide mb-3">💰 Variação de Preço</div>
                <Field label="Preço sobe/desce (%)" hint="Ex: 5 = +5% no preço atual">
                  <Input type="number" value={varPreco} onChange={e => setVarPreco(e.target.value)} placeholder="0" />
                </Field>
              </Card>
              <Card className="p-4">
                <div className="text-[12px] text-[var(--vf-text2)] uppercase tracking-wide mb-3">📐 Nova Margem</div>
                <Field label="Margem desejada (%)">
                  <Input type="number" min="50" max="2000" value={margemCustom} onChange={e => setMargemCustom(e.target.value)} />
                  <div className="flex gap-1 mt-1">
                    {[200,300,400,500].map(m => (
                      <button key={m} onClick={() => setMargemCustom(String(m))}
                        className={`text-[10px] px-2 py-0.5 rounded ${margemCustom===String(m)?'bg-[color-mix(in_srgb,var(--vf-secondary)_20%,transparent)] text-[var(--vf-primary)]':'text-[var(--vf-text3)] hover:text-[var(--vf-text2)]'}`}>
                        {m}%
                      </button>
                    ))}
                  </div>
                </Field>
              </Card>
            </div>

            {/* Comparativo */}
            <Card>
              <div className="p-4 border-b border-[var(--vf-border)]">
                <div className="text-[12px] text-[var(--vf-text2)] uppercase tracking-wide">Comparativo de Cenários</div>
              </div>
              <div className="overflow-x-auto">
                <table className="vf-table">
                  <thead>
                    <tr>
                      <th>Indicador</th>
                      <th>Atual</th>
                      <th>Após variação</th>
                      <th>Com nova margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Custo total',    v1: original?.custo_total, v2: simulado?.custo, v3: comNovaMargemPreco?.custo_total, money: true },
                      { label: 'Preço de venda', v1: original?.preco_customizado, v2: simulado?.preco, v3: comNovaMargemPreco?.preco_customizado, money: true },
                      { label: 'Lucro bruto',    v1: original?.lucro_bruto, v2: simulado?.lucro, v3: comNovaMargemPreco?.lucro_bruto, money: true },
                      { label: 'CMV %',          v1: original?.cmv_percentual, v2: simulado?.cmv, v3: comNovaMargemPreco?.cmv_percentual, money: false },
                      { label: 'Margem bruta %', v1: original?.margem_bruta, v2: simulado?.margem, v3: comNovaMargemPreco?.margem_bruta, money: false },
                    ].map(row => (
                      <tr key={row.label}>
                        <td className="font-medium text-[var(--vf-text)]">{row.label}</td>
                        <td className="text-[var(--vf-text2)]">{row.v1 != null ? (row.money ? fmtCurrency(row.v1) : fmtPct(row.v1)) : '—'}</td>
                        <td>
                          {row.v2 != null ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[var(--vf-primary)]">{row.money ? fmtCurrency(row.v2) : fmtPct(row.v2)}</span>
                              {row.v1 != null && <DiffBadge original={row.v1} novo={row.v2} money={row.money} />}
                            </div>
                          ) : '—'}
                        </td>
                        <td>
                          {row.v3 != null ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[var(--vf-primary)]">{row.money ? fmtCurrency(row.v3) : fmtPct(row.v3)}</span>
                              {row.v1 != null && <DiffBadge original={row.v1} novo={row.v3} money={row.money} />}
                            </div>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {simulado && simulado.margem < 30 && (
              <Alert type="warn">
                ⚠️ Com essa variação de custo, a margem cairia para <strong>{fmtPct(simulado.margem)}</strong>.
                Considere ajustar o preço de venda ou substituir algum ingrediente.
              </Alert>
            )}
          </>
        )}
      </div>
    </div>
  )
}
