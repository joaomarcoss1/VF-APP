import { describe, expect, it } from 'vitest'
import { calcularMetricasSaas, gerarStoragePath, normalizarStatusBilling } from '@/lib/integration-rules'
import { gerarAssinaturaHmac, validarAssinaturaHmac } from '@/lib/webhook-signature'

describe('integrações e SaaS v9', () => {
  it('valida assinatura HMAC de webhook real', () => {
    const payload = JSON.stringify({ event: 'payment.received', assinatura_id: '00000000-0000-0000-0000-000000000001' })
    const secret = 'segredo-real'
    const signature = gerarAssinaturaHmac(payload, secret)
    expect(validarAssinaturaHmac(payload, signature, secret)).toBe(true)
    expect(validarAssinaturaHmac(payload, 'assinatura-invalida', secret)).toBe(false)
  })

  it('normaliza status de provedores diferentes', () => {
    expect(normalizarStatusBilling('paid')).toBe('ativa')
    expect(normalizarStatusBilling('past_due')).toBe('vencida')
    expect(normalizarStatusBilling('suspended')).toBe('bloqueada')
    expect(normalizarStatusBilling('cancelled')).toBe('cancelada')
    expect(normalizarStatusBilling('desconhecido')).toBe('pendente')
  })

  it('calcula métricas SaaS sem depender de gateway externo', () => {
    const metricas = calcularMetricasSaas([
      { status: 'ativa', tipo: 'mensal', valor: 99 },
      { status: 'paid', tipo: 'mensal', valor: 149 },
      { status: 'vencida', tipo: 'mensal', valor: 99 },
      { status: 'cancelada', tipo: 'mensal', valor: 49 },
    ])
    expect(metricas.ativas).toBe(2)
    expect(metricas.mrr).toBe(248)
    expect(metricas.risco_receita).toBe(99)
    expect(metricas.churn_percentual).toBe(25)
  })

  it('gera path de storage por empresa, módulo e arquivo seguro', () => {
    const path = gerarStoragePath('11111111-1111-1111-1111-111111111111', 'Ordens Serviço', 'foto cliente.png')
    expect(path.startsWith('11111111-1111-1111-1111-111111111111/ordens-servi-o/')).toBe(true)
    expect(path.endsWith('foto_cliente.png')).toBe(true)
  })
})
