import type { NotaFiscalBase, NotaFiscalForm } from '@/types'
import { db, getEmpresaId, normalizeEmptyValues, normalizeError, assertPermission } from './_base'
import { AuditoriaService } from './auditoria'
import { EstoqueService, ProdutosEstoqueService } from './estoque'

function exportRowsCSV(rows: Array<Record<string, any>>, filename: string): void {
  const headerSet = new Set<string>()
  rows.forEach(row => Object.keys(row).forEach(k => headerSet.add(k)))
  const headers = Array.from(headerSet)
  const escape = (value: any) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const csv = [headers.map(escape).join(';'), ...rows.map(row => headers.map(h => escape(row[h])).join(';'))].join('\n')
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const NotasFiscaisService = {
  async listar(limit = 50): Promise<NotaFiscalBase[]> {
    const { data, error } = await db().from('notas_fiscais').select('*, itens:nota_fiscal_itens(*)').order('created_at', { ascending: false }).limit(limit)
    if (error) throw normalizeError(error, 'Erro ao listar notas fiscais.')
    return (data ?? []) as NotaFiscalBase[]
  },
  async criar(form: NotaFiscalForm): Promise<NotaFiscalBase> {
    await assertPermission('notas-fiscais', 'criar')
    const empresaId = await getEmpresaId()
    const itens = form.itens ?? []
    const notaPayload = normalizeEmptyValues({
      empresa_id: empresaId,
      numero: form.numero,
      serie: form.serie,
      chave_acesso: form.chave_acesso,
      fornecedor_nome: form.fornecedor_nome,
      data_emissao: form.data_emissao || null,
      data_entrada: form.data_entrada || new Date().toISOString().split('T')[0],
      valor_produtos: Number(form.valor_produtos || 0),
      valor_frete: Number(form.valor_frete || 0),
      valor_impostos: Number(form.valor_impostos || 0),
      valor_desconto: Number(form.valor_desconto || 0),
      valor_total: Number(form.valor_total || 0),
      status: form.status || 'importada',
      observacoes: form.observacoes,
      arquivo_url: form.arquivo_url,
    })
    const { data: nota, error } = await db().from('notas_fiscais').insert(notaPayload).select().single()
    if (error) throw normalizeError(error, 'Erro ao salvar nota fiscal.')
    if (itens.length) {
      const payloadItens = itens.map(item => normalizeEmptyValues({ ...item, empresa_id: empresaId, nota_id: nota.id, quantidade: Number(item.quantidade || 0), valor_unitario: Number(item.valor_unitario || 0), valor_total: Number(item.valor_total || 0) }))
      const { error: itensError } = await db().from('nota_fiscal_itens').insert(payloadItens)
      if (itensError) throw normalizeError(itensError, 'Nota salva, mas houve erro ao salvar itens.')
    }
    await AuditoriaService.registrar('notas_fiscais.criar', 'notas_fiscais', nota.id, { numero: nota.numero, valor_total: nota.valor_total }).catch(() => null)
    return nota as NotaFiscalBase
  },
  async abastecerEstoque(form: NotaFiscalForm & { insumo_id?: string; produto_id?: string; quantidade?: number; custo_unitario?: number }): Promise<NotaFiscalBase> {
    const nota = await this.criar(form)
    const quantidade = Number(form.quantidade || 0)
    const custoUnitario = Number(form.custo_unitario || 0)
    if (form.insumo_id && quantidade > 0) {
      await EstoqueService.registrarMovimentacao({ insumo_id: form.insumo_id, tipo: 'entrada', quantidade, unidade: 'unidade', custo_unitario: custoUnitario, custo_total: custoUnitario * quantidade, motivo: 'Entrada por nota fiscal/importação de abastecimento', documento: `nf:${nota.id}` } as any)
    }
    if (form.produto_id && quantidade > 0) {
      await ProdutosEstoqueService.movimentar({ produto_id: form.produto_id, tipo: 'entrada', quantidade, custo_unitario: custoUnitario, motivo: 'Entrada de produto por nota fiscal/importação de abastecimento', documento: `nf:${nota.id}` })
    }
    return nota
  },
  async exportarModeloCSV(): Promise<void> {
    exportRowsCSV([{ numero: '0001', fornecedor_nome: 'Fornecedor exemplo', data_emissao: new Date().toISOString().split('T')[0], descricao: 'Item comprado', quantidade: 10, unidade: 'unidade', valor_unitario: 5, valor_total: 50 }], 'modelo-importacao-nota-estoque.csv')
  },
}
