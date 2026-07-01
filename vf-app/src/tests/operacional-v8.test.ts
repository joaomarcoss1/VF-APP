import { describe, expect, it } from 'vitest'
import { calcularDivergenciaInventario, calcularFichaTecnicaFood, calcularOrdemServico, classificarSaudeOperacional, sugerirPrecoPorMargem } from '@/lib/business-rules'

describe('regras operacionais v8', () => {
  it('calcula ficha técnica food com perdas, rendimento, CMV e preço sugerido', () => {
    const ficha = calcularFichaTecnicaFood([
      { nome: 'Carne', quantidade: 1, custo_unitario: 30, perda_percentual: 10 },
      { nome: 'Tempero', quantidade: 0.1, custo_unitario: 20 },
    ], { rendimento: 5, margem_desejada: 60 })
    expect(ficha.custo_total).toBe(35)
    expect(ficha.custo_por_porcao).toBe(7)
    expect(ficha.preco_sugerido).toBe(17.5)
    expect(ficha.cmv_percentual).toBe(40)
  })

  it('sugere preço por margem comercial', () => {
    const preco = sugerirPrecoPorMargem(40, 50)
    expect(preco.preco_sugerido).toBe(80)
    expect(preco.lucro_bruto).toBe(40)
    expect(preco.cmv_percentual).toBe(50)
  })

  it('calcula divergência de inventário e valor financeiro', () => {
    const inv = calcularDivergenciaInventario([
      { item_id: 'p1', nome: 'Produto A', saldo_sistema: 10, saldo_contado: 7, custo_medio: 8 },
      { item_id: 'p2', nome: 'Produto B', saldo_sistema: 3, saldo_contado: 3, custo_medio: 5 },
    ])
    expect(inv.itens_com_divergencia).toBe(1)
    expect(inv.valor_divergencia_total).toBe(-24)
  })

  it('calcula OS com materiais, desconto e progresso de checklist', () => {
    const os = calcularOrdemServico({ valor_servico: 300, valor_materiais: 80, taxa_deslocamento: 20, desconto: 50, checklist: [{ titulo: 'Diagnóstico', concluido: true }, { titulo: 'Entrega', concluido: false }] })
    expect(os.total).toBe(350)
    expect(os.lucro_estimado).toBe(270)
    expect(os.progresso_percentual).toBe(50)
  })

  it('classifica saúde operacional com alertas práticos', () => {
    const saude = classificarSaudeOperacional({ caixa: -100, margem_liquida: 5, estoque_ruptura: 2, inadimplencia: 300 })
    expect(saude.status).toBe('critico')
    expect(saude.alertas.length).toBeGreaterThanOrEqual(4)
  })
})
