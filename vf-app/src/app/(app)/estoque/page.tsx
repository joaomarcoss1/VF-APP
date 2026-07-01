'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, Empty, Field, Input, Modal, Select, Skeleton, Textarea } from '@/components/ui'
import { EstoqueService, InsumosService, NotasFiscaisService, ProdutosEstoqueService, ProdutosService } from '@/services'
import { fmtCurrency } from '@/lib/precificacao'
import { getSupabase } from '@/lib/supabase'
import type { TipoMovimentacao } from '@/types'
import toast from 'react-hot-toast'

const TIPOS: TipoMovimentacao[] = ['entrada', 'saida', 'ajuste', 'perda', 'transferencia']
type Aba = 'insumos' | 'produtos' | 'notas'
type Alvo = 'insumo' | 'produto'

const hoje = () => new Date().toISOString().split('T')[0]

export default function EstoquePage() {
  const qc = useQueryClient()
  const [aba, setAba] = useState<Aba>('insumos')
  const [movModal, setMovModal] = useState(false)
  const [notaModal, setNotaModal] = useState(false)
  const [alvo, setAlvo] = useState<Alvo>('insumo')
  const [selectedId, setSelectedId] = useState('')
  const [tipo, setTipo] = useState<TipoMovimentacao>('entrada')
  const [quantidade, setQuantidade] = useState('')
  const [custoUnit, setCustoUnit] = useState('')
  const [motivo, setMotivo] = useState('')
  const [notaForm, setNotaForm] = useState({ numero: '', fornecedor_nome: '', chave_acesso: '', valor_frete: '', valor_impostos: '', observacoes: '', quantidade: '', custo_unitario: '' })

  const { data: insumos, isLoading: loadingInsumos } = useQuery({ queryKey: ['insumos'], queryFn: () => InsumosService.listar() })
  const { data: produtos } = useQuery({ queryKey: ['produtos-estoque-base'], queryFn: () => ProdutosService.listar() })
  const { data: produtoEstoque, isLoading: loadingProdutosEstoque } = useQuery({ queryKey: ['produto-estoque'], queryFn: ProdutosEstoqueService.listar })
  const { data: alertas } = useQuery({ queryKey: ['alertas-estoque'], queryFn: InsumosService.alertasEstoque })
  const { data: notas } = useQuery({ queryKey: ['notas-fiscais'], queryFn: () => NotasFiscaisService.listar(30) })

  const mapaEstoqueProdutos = useMemo(() => new Map((produtoEstoque ?? []).map(e => [e.produto_id, e])), [produtoEstoque])
  const valorInsumos = (insumos ?? []).reduce((a, i) => {
    const custo = i.custo_por_kg ?? i.custo_por_litro ?? i.custo_por_unidade ?? 0
    return a + (Number(i.estoque_atual || 0) * Number(custo || 0))
  }, 0)
  const valorProdutos = (produtoEstoque ?? []).reduce((a, e) => a + Number(e.quantidade_atual || 0) * Number(e.custo_medio || e.produto?.custo_total || 0), 0)
  const criticos = (alertas ?? []).filter(a => a.tipo === 'critico' || a.tipo === 'vencido').length
  const produtosCriticos = (produtoEstoque ?? []).filter(e => Number(e.quantidade_atual || 0) <= Number(e.estoque_minimo || 0) && Number(e.estoque_minimo || 0) > 0).length

  const selectedNome = alvo === 'insumo'
    ? insumos?.find(i => i.id === selectedId)?.nome
    : produtos?.find(p => p.id === selectedId)?.nome

  const movimentar = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error('Selecione o item.')
      const qtd = Number(quantidade || 0)
      if (qtd <= 0) throw new Error('Informe uma quantidade válida.')
      if (alvo === 'produto') {
        return ProdutosEstoqueService.movimentar({ produto_id: selectedId, tipo, quantidade: qtd, custo_unitario: Number(custoUnit || 0), motivo: motivo || undefined })
      }
      const { data: user } = await getSupabase().auth.getUser()
      const { data: perfil } = await getSupabase().from('perfis').select('empresa_id').single()
      const ins = insumos?.find(i => i.id === selectedId)
      return EstoqueService.registrarMovimentacao({
        empresa_id: perfil?.empresa_id,
        usuario_id: user.user?.id,
        insumo_id: selectedId,
        tipo,
        quantidade: qtd,
        unidade: ins?.unidade_compra ?? 'unidade',
        custo_unitario: custoUnit ? Number(custoUnit) : null,
        custo_total: custoUnit ? Number(custoUnit) * qtd : null,
        motivo: motivo || null,
      } as any)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insumos'] })
      qc.invalidateQueries({ queryKey: ['produto-estoque'] })
      qc.invalidateQueries({ queryKey: ['alertas-estoque'] })
      toast.success('Estoque atualizado.')
      setMovModal(false); setQuantidade(''); setCustoUnit(''); setMotivo('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const importarNota = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error('Selecione o item abastecido pela nota.')
      const qtd = Number(notaForm.quantidade || 0)
      const unit = Number(notaForm.custo_unitario || 0)
      if (qtd <= 0 || unit <= 0) throw new Error('Informe quantidade e custo unitário válidos.')
      const descricao = selectedNome || 'Item de estoque'
      return NotasFiscaisService.abastecerEstoque({
        numero: notaForm.numero,
        fornecedor_nome: notaForm.fornecedor_nome,
        chave_acesso: notaForm.chave_acesso,
        data_entrada: hoje(),
        valor_produtos: qtd * unit,
        valor_frete: Number(notaForm.valor_frete || 0),
        valor_impostos: Number(notaForm.valor_impostos || 0),
        valor_desconto: 0,
        valor_total: qtd * unit + Number(notaForm.valor_frete || 0) + Number(notaForm.valor_impostos || 0),
        observacoes: notaForm.observacoes,
        status: 'importada',
        insumo_id: alvo === 'insumo' ? selectedId : undefined,
        produto_id: alvo === 'produto' ? selectedId : undefined,
        quantidade: qtd,
        custo_unitario: unit,
        itens: [{ insumo_id: alvo === 'insumo' ? selectedId : undefined, produto_id: alvo === 'produto' ? selectedId : undefined, descricao, quantidade: qtd, unidade: 'unidade', valor_unitario: unit, valor_total: qtd * unit }]
      } as any)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insumos'] })
      qc.invalidateQueries({ queryKey: ['produto-estoque'] })
      qc.invalidateQueries({ queryKey: ['notas-fiscais'] })
      toast.success('Nota registrada e estoque abastecido.')
      setNotaModal(false)
      setNotaForm({ numero: '', fornecedor_nome: '', chave_acesso: '', valor_frete: '', valor_impostos: '', observacoes: '', quantidade: '', custo_unitario: '' })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const abrirMovimentacao = (novoAlvo: Alvo, id?: string, novoTipo: TipoMovimentacao = 'entrada') => {
    setAlvo(novoAlvo); setSelectedId(id || ''); setTipo(novoTipo); setMovModal(true)
  }
  const abrirNota = (novoAlvo: Alvo, id?: string) => { setAlvo(novoAlvo); setSelectedId(id || ''); setNotaModal(true) }

  return (
    <div className="vf-fadein">
      <Header title="Estoque" />
      <div className="p-4 md:p-6 space-y-5">
        <Alert type="info">Controle insumos, produtos finais, notas de compra e abastecimento. A emissão fiscal oficial fica preparada para integração futura com provedor fiscal/SEFAZ.</Alert>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Valor em insumos</div><div className="text-2xl text-[var(--vf-primary)] font-semibold">{fmtCurrency(valorInsumos)}</div></Card>
          <Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Valor em produtos</div><div className="text-2xl text-[var(--vf-secondary)] font-semibold">{fmtCurrency(valorProdutos)}</div></Card>
          <Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Alertas insumos</div><div className={`text-2xl font-semibold ${criticos ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>{criticos}</div></Card>
          <Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Produtos críticos</div><div className={`text-2xl font-semibold ${produtosCriticos ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>{produtosCriticos}</div></Card>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {(['insumos','produtos','notas'] as Aba[]).map(a => <Button key={a} variant={aba === a ? 'primary' : 'secondary'} onClick={() => setAba(a)}>{a === 'insumos' ? 'Insumos' : a === 'produtos' ? 'Produtos finais' : 'Notas/abastecimento'}</Button>)}
          </div>
          <div className="flex gap-2 flex-wrap"><Button variant="secondary" onClick={() => NotasFiscaisService.exportarModeloCSV()}>↓ Modelo Excel</Button><Button variant="secondary" onClick={() => abrirNota('produto')}>🧾 Lançar nota</Button><Button onClick={() => abrirMovimentacao(aba === 'produtos' ? 'produto' : 'insumo')}>＋ Movimentação</Button></div>
        </div>

        {aba === 'insumos' && <Card className="overflow-hidden">
          {loadingInsumos ? <div className="p-4"><Skeleton className="h-40" /></div> : (insumos?.length ?? 0) === 0 ? <Empty icon="🧂" title="Nenhum insumo cadastrado" description="Cadastre insumos para controlar matéria-prima, ficha técnica e CMV." /> : <div className="overflow-x-auto"><table className="vf-table min-w-[900px]"><thead><tr><th>Insumo</th><th>Unidade</th><th>Atual</th><th>Mínimo</th><th>Ideal</th><th>Custo unit.</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead><tbody>{insumos!.map(ins => { const alerta = alertas?.find(a => a.insumo.id === ins.id); const custo = ins.custo_por_kg ?? ins.custo_por_litro ?? ins.custo_por_unidade ?? 0; return <tr key={ins.id}><td className="font-medium text-[var(--vf-text)]">{ins.nome}</td><td><Badge color="gray">{ins.unidade_compra}</Badge></td><td>{ins.estoque_atual}</td><td>{ins.estoque_minimo}</td><td>{ins.estoque_ideal}</td><td>{fmtCurrency(custo)}</td><td className="text-[var(--vf-primary)]">{fmtCurrency(Number(ins.estoque_atual || 0) * Number(custo || 0))}</td><td>{alerta ? <Badge color={alerta.tipo === 'critico' || alerta.tipo === 'vencido' ? 'red' : 'amber'}>{alerta.tipo}</Badge> : <Badge color="green">ok</Badge>}</td><td><div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => abrirMovimentacao('insumo', ins.id, 'entrada')}>Entrada</Button><Button size="sm" variant="ghost" onClick={() => abrirNota('insumo', ins.id)}>Nota</Button></div></td></tr> })}</tbody></table></div>}
        </Card>}

        {aba === 'produtos' && <Card className="overflow-hidden">
          {loadingProdutosEstoque ? <div className="p-4"><Skeleton className="h-40" /></div> : (produtos?.length ?? 0) === 0 ? <Empty icon="📦" title="Nenhum produto cadastrado" description="Cadastre produtos/serviços para controlar estoque de itens finais." /> : <div className="overflow-x-auto"><table className="vf-table min-w-[920px]"><thead><tr><th>Produto</th><th>SKU/Código</th><th>Categoria</th><th>Estoque</th><th>Mínimo</th><th>Custo médio</th><th>Valor em estoque</th><th>Status</th><th>Ações</th></tr></thead><tbody>{produtos!.map(p => { const e = mapaEstoqueProdutos.get(p.id); const atual = Number(e?.quantidade_atual || 0); const minimo = Number(e?.estoque_minimo || 0); const custo = Number(e?.custo_medio || p.custo_total || 0); const critico = minimo > 0 && atual <= minimo; return <tr key={p.id}><td className="font-medium text-[var(--vf-text)]">{p.nome}</td><td>{p.sku || p.codigo_barras || '—'}</td><td><Badge color="gray">{p.categoria}</Badge></td><td>{atual}</td><td>{minimo}</td><td>{fmtCurrency(custo)}</td><td className="text-[var(--vf-primary)]">{fmtCurrency(atual * custo)}</td><td><Badge color={critico ? 'red' : 'green'}>{critico ? 'baixo' : 'ok'}</Badge></td><td><div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => abrirMovimentacao('produto', p.id, 'entrada')}>Entrada</Button><Button size="sm" variant="ghost" onClick={() => abrirNota('produto', p.id)}>Nota</Button></div></td></tr> })}</tbody></table></div>}
        </Card>}

        {aba === 'notas' && <Card className="overflow-hidden">
          {(notas?.length ?? 0) === 0 ? <Empty icon="🧾" title="Nenhuma nota registrada" description="Registre notas de compra para abastecer insumos e produtos finais." action={<Button onClick={() => abrirNota('produto')}>Lançar nota</Button>} /> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 p-3">{notas!.map(n => <Card key={n.id} className="p-4 bg-[var(--vf-surface2)]"><div className="flex justify-between gap-2"><div><div className="font-semibold text-[var(--vf-text)]">NF {n.numero || 'sem número'}</div><div className="text-xs text-[var(--vf-text2)]">{n.fornecedor_nome || 'Fornecedor não informado'}</div></div><Badge color={n.status === 'cancelada' ? 'red' : 'blue'}>{n.status}</Badge></div><div className="text-xl font-semibold text-[var(--vf-primary)] mt-3">{fmtCurrency(Number(n.valor_total || 0))}</div><div className="text-xs text-[var(--vf-text3)] mt-1">Entrada: {n.data_entrada ? new Date(n.data_entrada).toLocaleDateString('pt-BR') : '—'}</div></Card>)}</div>}
        </Card>}
      </div>

      <Modal open={movModal} onClose={() => setMovModal(false)} title="Movimentar estoque" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Tipo de item"><Select value={alvo} onChange={e => { setAlvo(e.target.value as Alvo); setSelectedId('') }}><option value="insumo">Insumo/matéria-prima</option><option value="produto">Produto final/varejo</option></Select></Field>
            <Field label="Movimentação"><Select value={tipo} onChange={e => setTipo(e.target.value as TipoMovimentacao)}>{TIPOS.map(t => <option key={t} value={t}>{t}</option>)}</Select></Field>
          </div>
          <Field label="Item"><Select value={selectedId} onChange={e => setSelectedId(e.target.value)}><option value="">Selecione</option>{alvo === 'insumo' ? insumos?.map(i => <option key={i.id} value={i.id}>{i.nome}</option>) : produtos?.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</Select></Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Quantidade"><Input type="number" step="0.01" min="0" value={quantidade} onChange={e => setQuantidade(e.target.value)} /></Field><Field label="Custo unitário"><Input type="number" step="0.01" min="0" value={custoUnit} onChange={e => setCustoUnit(e.target.value)} /></Field></div>
          <Field label="Motivo"><Textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Compra, ajuste, perda, transferência, venda manual..." /></Field>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setMovModal(false)}>Cancelar</Button><Button loading={movimentar.isPending} onClick={() => movimentar.mutate()}>Salvar movimentação</Button></div>
        </div>
      </Modal>

      <Modal open={notaModal} onClose={() => setNotaModal(false)} title="Lançar nota e abastecer estoque" size="xl">
        <div className="space-y-4">
          <Alert type="warn">Esta tela registra compras e abastecimento. Para emissão fiscal oficial será necessário integrar provedor fiscal/SEFAZ e certificado digital.</Alert>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><Field label="Tipo de item"><Select value={alvo} onChange={e => { setAlvo(e.target.value as Alvo); setSelectedId('') }}><option value="insumo">Insumo</option><option value="produto">Produto final</option></Select></Field><Field label="Item abastecido"><Select value={selectedId} onChange={e => setSelectedId(e.target.value)}><option value="">Selecione</option>{alvo === 'insumo' ? insumos?.map(i => <option key={i.id} value={i.id}>{i.nome}</option>) : produtos?.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</Select></Field><Field label="Nº nota"><Input value={notaForm.numero} onChange={e => setNotaForm(p => ({ ...p, numero: e.target.value }))} /></Field><Field label="Fornecedor"><Input value={notaForm.fornecedor_nome} onChange={e => setNotaForm(p => ({ ...p, fornecedor_nome: e.target.value }))} /></Field></div>
          <Field label="Chave de acesso"><Input value={notaForm.chave_acesso} onChange={e => setNotaForm(p => ({ ...p, chave_acesso: e.target.value }))} placeholder="Opcional" /></Field>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><Field label="Quantidade"><Input type="number" step="0.01" value={notaForm.quantidade} onChange={e => setNotaForm(p => ({ ...p, quantidade: e.target.value }))} /></Field><Field label="Custo unitário"><Input type="number" step="0.01" value={notaForm.custo_unitario} onChange={e => setNotaForm(p => ({ ...p, custo_unitario: e.target.value }))} /></Field><Field label="Frete"><Input type="number" step="0.01" value={notaForm.valor_frete} onChange={e => setNotaForm(p => ({ ...p, valor_frete: e.target.value }))} /></Field><Field label="Impostos/taxas"><Input type="number" step="0.01" value={notaForm.valor_impostos} onChange={e => setNotaForm(p => ({ ...p, valor_impostos: e.target.value }))} /></Field></div>
          <Field label="Observações"><Textarea value={notaForm.observacoes} onChange={e => setNotaForm(p => ({ ...p, observacoes: e.target.value }))} /></Field>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setNotaModal(false)}>Cancelar</Button><Button loading={importarNota.isPending} onClick={() => importarNota.mutate()}>Salvar nota e abastecer</Button></div>
        </div>
      </Modal>
    </div>
  )
}
