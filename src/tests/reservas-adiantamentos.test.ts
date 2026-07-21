import { describe, expect, it } from 'vitest'
import { calcularValorRestante, getReservationLabelByBranch, montarTextoRecibo } from '@/services/reservas-adiantamentos'

describe('Reservas e adiantamentos', () => {
  it('adapta o nome por ramo', () => {
    expect(getReservationLabelByBranch('barbearia').menu).toBe('Agendamento com sinal')
    expect(getReservationLabelByBranch('confeitaria').menu).toBe('Encomenda com entrada')
    expect(getReservationLabelByBranch('roupas').menu).toBe('Reserva de produto')
  })

  it('calcula valor restante e bloqueia entrada maior que total', () => {
    expect(calcularValorRestante(100, 35)).toBe(65)
    expect(() => calcularValorRestante(50, 60)).toThrow('entrada')
  })

  it('gera recibo com valores e mensagem do ramo', () => {
    const texto = montarTextoRecibo({ cliente_nome: 'João', titulo: 'Corte + barba', valor_total: 80, valor_entrada: 30, valor_restante: 50, status_pagamento: 'pago', ramo_atividade: 'barbearia' }, 'Barbearia Teste', 'barbearia')
    expect(texto).toContain('Barbearia Teste')
    expect(texto).toContain('João')
    expect(texto).toContain('Seu horário foi reservado mediante sinal')
  })
})
