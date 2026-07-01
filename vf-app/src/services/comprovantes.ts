import type { ComprovanteHistorico, ComprovantePayload } from '@/types'
import { db, normalizeError, withEmpresa, type AnyRecord } from './_base'
import { AuditoriaService } from './auditoria'

function normalizarTelefoneComprovanteBR(valor?: string | null): string {
  const digits = String(valor ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.startsWith('55') ? digits : `55${digits}`
}

export function gerarTextoComprovante(c: ComprovantePayload): string {
  const moeda = (n: number) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const linhas = [
    `*${c.empresa_nome || 'Minha Empresa'}*`,
    c.tipo === 'agendamento' ? 'Comprovante de agendamento' : 'Comprovante de compra',
    `Data/Hora: ${c.data_hora}`,
    c.cliente_nome ? `Cliente: ${c.cliente_nome}` : '',
    '',
    '*Itens*',
    ...c.itens.map(i => `• ${i.quantidade}x ${i.nome} — ${moeda(i.total)}`),
    '',
    `Subtotal: ${moeda(c.subtotal)}`,
    c.desconto ? `Desconto: -${moeda(c.desconto)}` : '',
    c.taxa_entrega ? `Taxa de entrega: ${moeda(c.taxa_entrega)}` : '',
    c.taxa_servico ? `Taxa de serviço: ${moeda(c.taxa_servico)}` : '',
    `*Total: ${moeda(c.total)}*`,
    c.forma_pagamento ? `Pagamento: ${String(c.forma_pagamento).replace('_', ' ')}` : '',
    c.observacoes ? `Observações: ${c.observacoes}` : '',
    '',
    'Agradecemos a preferência, e volte sempre.'
  ].filter(Boolean)
  return linhas.join('\n')
}

export function gerarLinkWhatsappComprovante(telefone: string | undefined | null, texto: string): string {
  const numero = normalizarTelefoneComprovanteBR(telefone)
  const encoded = encodeURIComponent(texto)
  return numero ? `https://wa.me/${numero}?text=${encoded}` : `https://wa.me/?text=${encoded}`
}

export const ComprovantesService = {
  async listar(limit = 100): Promise<ComprovanteHistorico[]> {
    const { data, error } = await db().from('comprovantes_historico').select('*').order('created_at', { ascending: false }).limit(limit)
    if (error) throw normalizeError(error, 'Erro ao listar comprovantes.')
    return (data ?? []) as ComprovanteHistorico[]
  },
  async registrar(form: Partial<ComprovanteHistorico> & { tipo: string; total: number }): Promise<ComprovanteHistorico> {
    const payload = await withEmpresa({ ...form, total: Number(form.total || 0), enviado_whatsapp: Boolean((form as AnyRecord).enviado_whatsapp) } as AnyRecord)
    const { data, error } = await db().from('comprovantes_historico').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao registrar comprovante.')
    await AuditoriaService.registrar('comprovantes.criar', 'comprovantes_historico', data.id, { tipo: data.tipo, total: data.total }).catch(() => null)
    return data as ComprovanteHistorico
  },
}
