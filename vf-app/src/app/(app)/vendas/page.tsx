'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, ConfirmActionButton, Empty, Field, Input, Modal, Select, Skeleton, Textarea } from '@/components/ui'
import { IdentidadeService, PermissoesService, ProdutosService, VendasService } from '@/services'
import { compartilharComprovanteWhatsappPDF } from '@/lib/exports'
import { fmtCurrency } from '@/lib/precificacao'
import type { CanalVenda, FormaPagamento, Produto, Venda, VendaItemForm, ComprovantePayload } from '@/types'
import toast from 'react-hot-toast'

const CANAIS: Array<{ value: CanalVenda; label: string }> = [
  { value: 'local', label: 'Presencial/local' },
  { value: 'loja', label: 'Loja física' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'site', label: 'Site' },
  { value: 'evento', label: 'Evento' },
  { value: 'servico', label: 'Serviço' },
]
const PAGAMENTOS: Array<{ value: FormaPagamento; label: string }> = [
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartão crédito' },
  { value: 'cartao_debito', label: 'Cartão débito' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'outro', label: 'Outro' },
]
const STATUS_ENTREGA = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_preparo', label: 'Em preparo' },
  { value: 'saiu_entrega', label: 'Saiu para entrega' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' },
] as const

const hoje = () => new Date().toISOString().split('T')[0]
const agora = () => new Date().toLocaleString('pt-BR')
const uid = () => Math.random().toString(36).slice(2, 10)

type ItemCarrinho = VendaItemForm & { local_id: string }
type PagamentoLocal = { local_id: string; forma_pagamento: FormaPagamento; valor: number; valor_recebido?: number }

const EMPTY_META = {
  cliente_nome: '',
  cliente_whatsapp: '',
  canal: 'local' as CanalVenda,
  data_venda: hoje(),
  desconto_geral: 0,
  taxa_entrega: 0,
  taxa_servico: 0,
  observacoes: '',
}
const EMPTY_ITEM: Omit<ItemCarrinho, 'local_id'> = { produto_id: '', produto_nome: '', quantidade: 1, preco_unitario: 0, custo_unitario: 0, desconto: 0 }
const novoPagamento = (valor = 0, forma: FormaPagamento = 'pix'): PagamentoLocal => ({ local_id: uid(), forma_pagamento: forma, valor, valor_recebido: forma === 'dinheiro' ? valor : undefined })

function calcularItem(item: VendaItemForm) {
  const subtotal = Number(item.quantidade || 0) * Number(item.preco_unitario || 0)
  const total = Math.max(0, subtotal - Number(item.desconto || 0))
  const lucro = total - Number(item.quantidade || 0) * Number(item.custo_unitario || 0)
  return { subtotal, total, lucro }
}

export default function VendasPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [meta, setMeta] = useState({ ...EMPTY_META })
  const [itemForm, setItemForm] = useState<Omit<ItemCarrinho, 'local_id'>>({ ...EMPTY_ITEM })
  const [itens, setItens] = useState<ItemCarrinho[]>([])
  const [pagamentos, setPagamentos] = useState<PagamentoLocal[]>([novoPagamento(0, 'pix')])
  const [lastVenda, setLastVenda] = useState<Venda | null>(null)

  const { data: produtos, isLoading: loadingProdutos } = useQuery({ queryKey: ['produtos-venda'], queryFn: () => ProdutosService.listar() })
  const { data: identidade } = useQuery({ queryKey: ['identidade-vendas'], queryFn: IdentidadeService.obter })
  const { data: vendas, isLoading } = useQuery({ queryKey: ['vendas-recentes'], queryFn: () => VendasService.listarPorPeriodo(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], hoje()) })
  const { data: podeCancelar } = useQuery({ queryKey: ['perm-vendas-cancelar'], queryFn: () => PermissoesService.pode('vendas', 'cancelar'), retry: false })
  const { data: podeEstornar } = useQuery({ queryKey: ['perm-vendas-estornar'], queryFn: () => PermissoesService.pode('vendas', 'estornar'), retry: false })

  const totalItens = useMemo(() => itens.reduce((a, item) => a + calcularItem(item).total, 0), [itens])
  const subtotal = useMemo(() => itens.reduce((a, item) => a + calcularItem(item).subtotal, 0), [itens])
  const custo = useMemo(() => itens.reduce((a, item) => a + Number(item.custo_unitario || 0) * Number(item.quantidade || 0), 0), [itens])
  const total = Math.max(0, totalItens + Number(meta.taxa_entrega || 0) + Number(meta.taxa_servico || 0) - Number(meta.desconto_geral || 0))
  const lucro = total - custo

  const pagamentosNormalizados = useMemo(() => {
    const validos = pagamentos.filter(p => Number(p.valor || 0) > 0)
    const base = validos.length ? validos : [novoPagamento(total, 'pix')]
    return base.map(p => ({
      forma_pagamento: p.forma_pagamento,
      valor: Number(p.valor || 0),
      valor_recebido: p.forma_pagamento === 'dinheiro' ? Number(p.valor_recebido || p.valor || 0) : Number(p.valor || 0),
      troco: p.forma_pagamento === 'dinheiro' ? Math.max(0, Number(p.valor_recebido || p.valor || 0) - Number(p.valor || 0)) : 0,
    }))
  }, [pagamentos, total])
  const totalPagamentos = pagamentosNormalizados.reduce((a, p) => a + Number(p.valor || 0), 0)
  const trocoTotal = pagamentosNormalizados.reduce((a, p) => a + Number(p.troco || 0), 0)
  const faltaReceber = Math.max(0, total - totalPagamentos)

  const resumo = useMemo(() => {
    const list = (vendas ?? []).filter(v => v.status !== 'cancelada' && v.status !== 'estornada')
    return {
      faturamento: list.reduce((a, v) => a + Number(v.total ?? 0), 0),
      lucro: list.reduce((a, v) => a + Number(v.lucro ?? 0), 0),
      qtd: list.length,
      ticket: list.length ? list.reduce((a, v) => a + Number(v.total ?? 0), 0) / list.length : 0,
    }
  }, [vendas])

  const selecionarProduto = (id: string) => {
    const p = (produtos ?? []).find(x => x.id === id) as Produto | undefined
    setItemForm(prev => ({ ...prev, produto_id: id, produto_nome: p?.nome ?? '', preco_unitario: Number(p?.preco_venda ?? 0), custo_unitario: Number(p?.custo_total ?? 0) }))
  }

  const adicionarItem = () => {
    if (!itemForm.produto_nome.trim()) return toast.error('Informe o nome do item.')
    if (Number(itemForm.quantidade || 0) <= 0) return toast.error('Quantidade inválida.')
    if (Number(itemForm.preco_unitario || 0) < 0) return toast.error('Preço inválido.')
    setItens(prev => [...prev, { ...itemForm, local_id: uid(), produto_id: itemForm.produto_id || undefined }])
    setItemForm({ ...EMPTY_ITEM })
  }

  const preencherPagamento = () => setPagamentos([novoPagamento(total, 'pix')])
  const removerItem = (localId: string) => setItens(prev => prev.filter(item => item.local_id !== localId))
  const atualizarPagamento = (localId: string, patch: Partial<PagamentoLocal>) => setPagamentos(prev => prev.map(p => p.local_id === localId ? { ...p, ...patch } : p))

  const estornar = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => VendasService.estornar(id, motivo),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendas-recentes'] }); qc.invalidateQueries({ queryKey: ['financeiro-vendas'] }); qc.invalidateQueries({ queryKey: ['produto-estoque'] }); toast.success('Venda estornada e estoque/financeiro revertidos.') },
    onError: (e: Error) => toast.error(e.message),
  })
  const cancelar = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => VendasService.cancelar(id, motivo),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendas-recentes'] }); qc.invalidateQueries({ queryKey: ['financeiro-vendas'] }); qc.invalidateQueries({ queryKey: ['produto-estoque'] }); toast.success('Venda cancelada com auditoria.') },
    onError: (e: Error) => toast.error(e.message),
  })
  const atualizarEntrega = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) => VendasService.atualizarStatusEntrega(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendas-recentes'] }); toast.success('Status de entrega atualizado.') },
    onError: (e: Error) => toast.error(e.message),
  })

  const registrar = useMutation({
    mutationFn: () => {
      if (!itens.length) throw new Error('Adicione pelo menos um item à venda.')
      if (Math.abs(totalPagamentos - total) > 0.01) throw new Error('A soma dos pagamentos precisa fechar exatamente com o total da venda.')
      return VendasService.registrar({
        produto_nome: itens.length === 1 ? itens[0].produto_nome : `${itens.length} itens vendidos`,
        quantidade: itens.reduce((a, i) => a + Number(i.quantidade || 0), 0),
        preco_unitario: itens.length === 1 ? Number(itens[0].preco_unitario || 0) : total,
        custo_unitario: itens.length === 1 ? Number(itens[0].custo_unitario || 0) : 0,
        desconto: Number(meta.desconto_geral || 0),
        total,
        lucro,
        canal: meta.canal,
        forma_pagamento: pagamentosNormalizados[0]?.forma_pagamento || 'pix',
        cliente_nome: meta.cliente_nome,
        cliente_whatsapp: meta.cliente_whatsapp,
        data_venda: meta.data_venda,
        taxa_entrega: Number(meta.taxa_entrega || 0),
        taxa_servico: Number(meta.taxa_servico || 0),
        observacoes: meta.observacoes,
        itens,
        desconto_geral: Number(meta.desconto_geral || 0),
        pagamentos: pagamentosNormalizados,
        valor_recebido: pagamentosNormalizados.reduce((a, p) => a + Number(p.valor_recebido || p.valor || 0), 0),
      } as any)
    },
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ['vendas-recentes'] }); qc.invalidateQueries({ queryKey: ['financeiro-vendas'] }); qc.invalidateQueries({ queryKey: ['produto-estoque'] })
      setLastVenda(v); toast.success('Venda multi-itens registrada com pagamentos reais!'); setModal(false); setMeta({ ...EMPTY_META }); setItens([]); setPagamentos([novoPagamento(0, 'pix')]); setItemForm({ ...EMPTY_ITEM })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const itensComprovante = (v?: Venda | null) => {
    if (v?.itens?.length) return v.itens.map(i => ({ nome: i.produto_nome, quantidade: Number(i.quantidade), valor_unitario: Number(i.preco_unitario), total: Number(i.total) }))
    if (v) return [{ nome: v.produto_nome, quantidade: Number(v.quantidade), valor_unitario: Number(v.preco_unitario), total: Number(v.total) }]
    return itens.map(i => ({ nome: i.produto_nome, quantidade: Number(i.quantidade), valor_unitario: Number(i.preco_unitario), total: calcularItem(i).total }))
  }

  const payloadComprovante = (v?: Venda | null): ComprovantePayload => ({
    empresa_nome: identidade?.nome || 'Minha Empresa',
    cliente_nome: (v?.cliente_nome || meta.cliente_nome) || undefined,
    cliente_whatsapp: (v?.cliente_whatsapp || meta.cliente_whatsapp) || undefined,
    itens: itensComprovante(v),
    subtotal: Number(v?.subtotal ?? subtotal),
    desconto: Number(v?.desconto ?? (Number(meta.desconto_geral || 0) + itens.reduce((a, i) => a + Number(i.desconto || 0), 0))),
    taxa_entrega: Number(v?.taxa_entrega ?? meta.taxa_entrega),
    taxa_servico: Number(v?.taxa_servico ?? meta.taxa_servico),
    total: Number(v?.total ?? total),
    forma_pagamento: v?.forma_pagamento || pagamentosNormalizados.map(p => p.forma_pagamento).join(' + '),
    data_hora: v ? `${v.data_venda} ${v.hora_venda || ''}`.trim() : agora(),
    observacoes: v?.observacoes || meta.observacoes,
    tipo: 'venda',
  })

  const abrirWhatsapp = async (v?: Venda | null) => {
    try { await compartilharComprovanteWhatsappPDF(payloadComprovante(v), v?.cliente_whatsapp || meta.cliente_whatsapp, identidade || undefined); toast.success('Comprovante em PDF preparado para o WhatsApp.') }
    catch (e: any) { toast.error(e.message || 'Erro ao gerar comprovante em PDF.') }
  }

  const acoesVenda = (v: Venda) => v.status !== 'estornada' && v.status !== 'cancelada' ? <div className="flex flex-wrap justify-end gap-2">
    <Button size="sm" variant="ghost" onClick={() => abrirWhatsapp(v)}>PDF/WhatsApp</Button>
    {podeCancelar && <ConfirmActionButton title="Cancelar venda" description="O cancelamento exige motivo, registra auditoria e marca financeiro/pagamentos como cancelados." confirmLabel="Cancelar venda" requireReason onConfirm={(motivo) => cancelar.mutate({ id: v.id, motivo: motivo || '' })}>Cancelar</ConfirmActionButton>}
    {podeEstornar && <ConfirmActionButton title="Estornar venda" description="O estorno exige motivo e reverte estoque/financeiro conforme função segura do banco." confirmLabel="Estornar venda" requireReason onConfirm={(motivo) => estornar.mutate({ id: v.id, motivo: motivo || '' })}>Estornar</ConfirmActionButton>}
  </div> : <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => abrirWhatsapp(v)}>PDF/WhatsApp</Button><Badge color="red">{v.status}</Badge></div>

  return (
    <div className="vf-fadein">
      <Header title="Vendas" />
      <div className="p-4 md:p-6 space-y-5">
        <Alert type="info">Venda profissional com carrinho multi-itens, múltiplas formas de pagamento, troco, status de entrega, cancelamento/estorno auditado e comprovante PDF.</Alert>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Faturamento do mês</div><div className="text-2xl text-[var(--vf-primary)] font-semibold">{fmtCurrency(resumo.faturamento)}</div></Card>
          <Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Lucro estimado</div><div className="text-2xl text-[#16A34A] font-semibold">{fmtCurrency(resumo.lucro)}</div></Card>
          <Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Vendas válidas</div><div className="text-2xl text-[var(--vf-text)] font-semibold">{resumo.qtd}</div></Card>
          <Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Ticket médio</div><div className="text-2xl text-[var(--vf-secondary)] font-semibold">{fmtCurrency(resumo.ticket)}</div></Card>
        </div>

        <div className="flex justify-end"><Button onClick={() => { setPagamentos([novoPagamento(0, 'pix')]); setModal(true) }}>Nova venda</Button></div>

        {lastVenda && <Card className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between" gold>
          <div><b className="text-[var(--vf-text)]">Última venda:</b> <span className="text-[var(--vf-primary)]">{fmtCurrency(lastVenda.total)}</span><p className="text-sm text-[var(--vf-text2)]">Comprovante pronto com identidade da empresa.</p></div>
          <Button variant="secondary" onClick={() => abrirWhatsapp(lastVenda)}>Enviar comprovante</Button>
        </Card>}

        <Card className="overflow-hidden">
          {isLoading ? <div className="p-4"><Skeleton className="h-32" /></div> : (vendas?.length ?? 0) === 0 ? (
            <Empty icon="🧾" title="Nenhuma venda registrada" description="Registre a primeira venda para alimentar estoque, relatórios e financeiro." action={<Button onClick={() => setModal(true)}>Registrar venda</Button>} />
          ) : <>
            <div className="md:hidden p-3 space-y-3">{vendas!.map(v => <Card key={v.id} className="p-3 bg-[var(--vf-surface2)]">
              <div className="flex items-start justify-between gap-2"><div><div className="font-semibold text-[var(--vf-text)]">{v.produto_nome}</div><div className="text-xs text-[var(--vf-text2)]">{v.cliente_nome || 'Cliente não informado'} · {v.data_venda}</div></div><Badge color="gray">{v.canal}</Badge></div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-sm"><div><span className="text-[var(--vf-text3)] block text-xs">Itens</span><b>{v.itens?.length ?? 1}</b></div><div><span className="text-[var(--vf-text3)] block text-xs">Total</span><b className="text-[var(--vf-secondary)]">{fmtCurrency(v.total)}</b></div><div><span className="text-[var(--vf-text3)] block text-xs">Lucro</span><b className="text-[#16A34A]">{fmtCurrency(v.lucro)}</b></div></div>
              <div className="mt-2"><Select value={v.status_entrega || 'pendente'} onChange={e => atualizarEntrega.mutate({ id: v.id, status: e.target.value })}>{STATUS_ENTREGA.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></div>
              <div className="mt-3">{acoesVenda(v)}</div>
            </Card>)}</div>
            <div className="hidden md:block overflow-x-auto"><table className="vf-table min-w-[1040px]"><thead><tr><th>Data</th><th>Cliente</th><th>Venda</th><th>Itens</th><th>Canal</th><th>Status entrega</th><th>Total</th><th>Lucro</th><th>Ações</th></tr></thead><tbody>{vendas!.map(v => <tr key={v.id}>
              <td>{v.data_venda}</td><td>{v.cliente_nome || '—'}</td><td>{v.produto_nome}</td><td>{v.itens?.length ?? 1}</td><td><Badge color="gray">{v.canal}</Badge></td><td><Select value={v.status_entrega || 'pendente'} onChange={e => atualizarEntrega.mutate({ id: v.id, status: e.target.value })}>{STATUS_ENTREGA.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></td><td className="text-[var(--vf-primary)]">{fmtCurrency(v.total)}</td><td className="text-[#16A34A]">{fmtCurrency(v.lucro)}</td><td>{acoesVenda(v)}</td>
            </tr>)}</tbody></table></div>
          </>}
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nova venda profissional" size="xl">
        <div className="space-y-5">
          <Alert type="info">Monte o carrinho, divida o pagamento e confira o fechamento antes de salvar. O service grava itens/pagamentos e as triggers geram financeiro/estoque.</Alert>
          <Card className="p-4 bg-[var(--vf-surface2)]"><div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Field label="Cliente"><Input value={meta.cliente_nome} onChange={e => setMeta(p => ({ ...p, cliente_nome: e.target.value }))} placeholder="Nome do cliente" /></Field>
            <Field label="WhatsApp"><Input value={meta.cliente_whatsapp} onChange={e => setMeta(p => ({ ...p, cliente_whatsapp: e.target.value }))} placeholder="(99) 99999-9999" /></Field>
            <Field label="Canal"><Select value={meta.canal} onChange={e => setMeta(p => ({ ...p, canal: e.target.value as CanalVenda }))}>{CANAIS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</Select></Field>
            <Field label="Data"><Input type="date" value={meta.data_venda} onChange={e => setMeta(p => ({ ...p, data_venda: e.target.value }))} /></Field>
          </div></Card>

          <Card className="p-4"><div className="text-sm font-semibold text-[var(--vf-text)] mb-3">Adicionar item</div><div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <Field label="Produto/serviço" className="md:col-span-2"><Select value={itemForm.produto_id || ''} onChange={e => selecionarProduto(e.target.value)} disabled={loadingProdutos}><option value="">Item avulso</option>{(produtos ?? []).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</Select></Field>
            <Field label="Nome" className="md:col-span-2"><Input value={itemForm.produto_nome} onChange={e => setItemForm(p => ({ ...p, produto_nome: e.target.value }))} placeholder="Produto, serviço ou pacote" /></Field>
            <Field label="Qtd."><Input type="number" min="0.01" step="0.01" value={itemForm.quantidade} onChange={e => setItemForm(p => ({ ...p, quantidade: Number(e.target.value) }))} /></Field>
            <Field label="Preço"><Input type="number" step="0.01" value={itemForm.preco_unitario} onChange={e => setItemForm(p => ({ ...p, preco_unitario: Number(e.target.value) }))} /></Field>
            <Field label="Custo"><Input type="number" step="0.01" value={itemForm.custo_unitario} onChange={e => setItemForm(p => ({ ...p, custo_unitario: Number(e.target.value) }))} /></Field>
            <Field label="Desc. item"><Input type="number" step="0.01" value={itemForm.desconto} onChange={e => setItemForm(p => ({ ...p, desconto: Number(e.target.value) }))} /></Field>
            <div className="md:col-span-2"><Button fullWidth variant="secondary" onClick={adicionarItem}>Adicionar ao carrinho</Button></div>
          </div></Card>

          <Card className="overflow-hidden">{itens.length === 0 ? <Empty icon="🛒" title="Carrinho vazio" description="Adicione pelo menos um item para registrar a venda." /> : <div className="overflow-x-auto"><table className="vf-table min-w-[720px]"><thead><tr><th>Item</th><th>Qtd.</th><th>Preço</th><th>Desconto</th><th>Total</th><th>Lucro</th><th></th></tr></thead><tbody>{itens.map(item => { const calc = calcularItem(item); return <tr key={item.local_id}><td className="font-medium text-[var(--vf-text)]">{item.produto_nome}</td><td>{item.quantidade}</td><td>{fmtCurrency(item.preco_unitario)}</td><td>{fmtCurrency(item.desconto || 0)}</td><td className="text-[var(--vf-primary)]">{fmtCurrency(calc.total)}</td><td className="text-[#16A34A]">{fmtCurrency(calc.lucro)}</td><td><Button size="sm" variant="danger" onClick={() => removerItem(item.local_id)}>Remover</Button></td></tr> })}</tbody></table></div>}</Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Field label="Desconto geral"><Input type="number" step="0.01" value={meta.desconto_geral} onChange={e => setMeta(p => ({ ...p, desconto_geral: Number(e.target.value) }))} /></Field>
            <Field label="Taxa de entrega"><Input type="number" step="0.01" value={meta.taxa_entrega} onChange={e => setMeta(p => ({ ...p, taxa_entrega: Number(e.target.value) }))} /></Field>
            <Field label="Taxa de serviço"><Input type="number" step="0.01" value={meta.taxa_servico} onChange={e => setMeta(p => ({ ...p, taxa_servico: Number(e.target.value) }))} /></Field>
            <div className="flex items-end"><Button fullWidth variant="ghost" onClick={preencherPagamento}>Preencher pagamento</Button></div>
          </div>

          <Card className="p-4 space-y-3"><div className="flex items-center justify-between"><div><b className="text-[var(--vf-text)]">Pagamentos</b><p className="text-xs text-[var(--vf-text3)]">Permite pagamento dividido e troco em dinheiro.</p></div><Button size="sm" variant="secondary" onClick={() => setPagamentos(p => [...p, novoPagamento(faltaReceber || 0, 'pix')])}>Adicionar forma</Button></div>
            {pagamentos.map((p, idx) => <div key={p.local_id} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end border border-[var(--vf-border)] rounded-2xl p-3">
              <Field label={`Forma ${idx + 1}`}><Select value={p.forma_pagamento} onChange={e => atualizarPagamento(p.local_id, { forma_pagamento: e.target.value as FormaPagamento, valor_recebido: e.target.value === 'dinheiro' ? p.valor : undefined })}>{PAGAMENTOS.map(pg => <option key={pg.value} value={pg.value}>{pg.label}</option>)}</Select></Field>
              <Field label="Valor"><Input type="number" step="0.01" value={p.valor} onChange={e => atualizarPagamento(p.local_id, { valor: Number(e.target.value) })} /></Field>
              <Field label="Valor recebido"><Input type="number" step="0.01" disabled={p.forma_pagamento !== 'dinheiro'} value={p.valor_recebido ?? p.valor} onChange={e => atualizarPagamento(p.local_id, { valor_recebido: Number(e.target.value) })} /></Field>
              <div><span className="text-xs text-[var(--vf-text3)]">Troco</span><b className="block text-[var(--vf-secondary)]">{fmtCurrency(p.forma_pagamento === 'dinheiro' ? Math.max(0, Number(p.valor_recebido || p.valor || 0) - Number(p.valor || 0)) : 0)}</b></div>
              <Button size="sm" variant="danger" disabled={pagamentos.length <= 1} onClick={() => setPagamentos(list => list.filter(x => x.local_id !== p.local_id))}>Remover</Button>
            </div>)}
          </Card>

          <Field label="Observações"><Textarea value={meta.observacoes} onChange={e => setMeta(p => ({ ...p, observacoes: e.target.value }))} /></Field>
          <Card className="p-4 grid grid-cols-2 md:grid-cols-6 gap-3 bg-[var(--vf-surface2)]">
            <div><span className="text-xs text-[var(--vf-text3)]">Subtotal</span><b className="block">{fmtCurrency(subtotal)}</b></div>
            <div><span className="text-xs text-[var(--vf-text3)]">Descontos</span><b className="block">{fmtCurrency(Number(meta.desconto_geral || 0) + itens.reduce((a, i) => a + Number(i.desconto || 0), 0))}</b></div>
            <div><span className="text-xs text-[var(--vf-text3)]">Taxas</span><b className="block">{fmtCurrency(Number(meta.taxa_entrega) + Number(meta.taxa_servico))}</b></div>
            <div><span className="text-xs text-[var(--vf-text3)]">Pagamentos</span><b className={Math.abs(totalPagamentos - total) <= 0.01 ? 'block text-[#16A34A]' : 'block text-[#DC2626]'}>{fmtCurrency(totalPagamentos)}</b></div>
            <div><span className="text-xs text-[var(--vf-text3)]">Troco</span><b className="block text-[var(--vf-secondary)]">{fmtCurrency(trocoTotal)}</b></div>
            <div><span className="text-xs text-[var(--vf-text3)]">Total</span><b className="block text-[var(--vf-primary)] text-lg">{fmtCurrency(total)}</b></div>
          </Card>
          {Math.abs(totalPagamentos - total) > 0.01 && <Alert type="warn">A soma dos pagamentos precisa fechar com o total. Diferença: {fmtCurrency(totalPagamentos - total)}.</Alert>}
          <div className="flex flex-col sm:flex-row justify-end gap-2"><Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button><Button variant="secondary" disabled={!itens.length} onClick={() => abrirWhatsapp(null)}>Prévia PDF/WhatsApp</Button><Button loading={registrar.isPending} disabled={!itens.length || Math.abs(totalPagamentos - total) > 0.01} onClick={() => registrar.mutate()}>Salvar venda</Button></div>
        </div>
      </Modal>
    </div>
  )
}
