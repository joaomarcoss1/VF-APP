'use client'

import { useQuery } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, Empty, Skeleton } from '@/components/ui'
import { ComprovantesService, gerarLinkWhatsappComprovante, IdentidadeService } from '@/services'
import { fmtCurrency } from '@/lib/precificacao'
import { exportarComprovantePDF } from '@/lib/exports'
import toast from 'react-hot-toast'

export default function ComprovantesPage() {
  const { data: comprovantes, isLoading, error } = useQuery({ queryKey: ['comprovantes'], queryFn: () => ComprovantesService.listar() })
  const { data: identidade } = useQuery({ queryKey: ['identidade-comprovantes'], queryFn: IdentidadeService.obter })
  const baixar = async (c: any) => {
    await exportarComprovantePDF({
      empresa_nome: identidade?.nome || 'VF Nexus',
      cliente_nome: c.cliente_nome,
      cliente_whatsapp: c.cliente_whatsapp,
      itens: [{ nome: c.descricao || 'Comprovante', quantidade: 1, valor_unitario: Number(c.total || 0), total: Number(c.total || 0) }],
      subtotal: Number(c.total || 0),
      desconto: 0,
      total: Number(c.total || 0),
      forma_pagamento: c.forma_pagamento,
      data_hora: new Date(c.created_at).toLocaleString('pt-BR'),
      observacoes: c.mensagem,
      tipo: c.tipo === 'agendamento' ? 'agendamento' : 'venda',
    }, identidade || undefined)
    toast.success('PDF gerado.')
  }
  const reenviar = (c: any) => {
    window.open(gerarLinkWhatsappComprovante(c.cliente_whatsapp, c.mensagem || `Comprovante ${c.descricao || ''} - ${fmtCurrency(c.total)}`), '_blank')
  }
  return <div className="vf-fadein">
    <Header title="Comprovantes" />
    <div className="p-4 md:p-6 space-y-5">
      <Alert type="info">Histórico profissional de comprovantes. Baixe novamente em PDF ou reenvie a mensagem pelo WhatsApp.</Alert>
      {error && <Alert type="error">{(error as Error).message}</Alert>}
      {isLoading ? <Skeleton className="h-52" /> : !(comprovantes ?? []).length ? <Empty icon="🧾" title="Nenhum comprovante salvo" description="Vendas e agendamentos passam a registrar comprovantes automaticamente." /> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {comprovantes!.map(c => <Card key={c.id} className="p-4 space-y-3 vf-motion">
          <div className="flex items-start justify-between gap-2"><div><div className="font-semibold text-[var(--vf-text)]">{c.cliente_nome || 'Cliente não informado'}</div><div className="text-xs text-[var(--vf-text2)]">{new Date(c.created_at).toLocaleString('pt-BR')}</div></div><Badge color={c.tipo === 'agendamento' ? 'blue' : 'gold'}>{c.tipo}</Badge></div>
          <div className="text-sm text-[var(--vf-text2)]">{c.descricao || 'Comprovante'}</div><div className="text-xl text-[var(--vf-secondary)] font-semibold">{fmtCurrency(c.total)}</div>
          <div className="flex justify-end gap-2"><Button size="sm" variant="secondary" onClick={() => baixar(c)}>PDF</Button><Button size="sm" onClick={() => reenviar(c)}>WhatsApp</Button></div>
        </Card>)}
      </div>}
    </div>
  </div>
}
