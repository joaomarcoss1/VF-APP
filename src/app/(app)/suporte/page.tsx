'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Alert, Button, Card, Field, Input, Select, Textarea } from '@/components/ui'
import { SuporteV14Service } from '@/services'
import toast from 'react-hot-toast'

export default function SuportePage() {
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [prioridade, setPrioridade] = useState<'baixa' | 'media' | 'alta'>('media')
  const abrir = useMutation({ mutationFn: () => SuporteV14Service.abrirChamado({ assunto, mensagem, prioridade }), onSuccess: () => { toast.success('Chamado aberto!'); setAssunto(''); setMensagem('') }, onError: (e: Error) => toast.error(e.message) })
  return <div className="vf-fadein"><Header title="Central de ajuda" /><div className="p-4 md:p-6 space-y-4"><div><h1 className="text-xl md:text-2xl font-semibold text-[var(--vf-text)]">Central de ajuda e suporte</h1><p className="text-sm text-[var(--vf-text2)] mt-1">Estrutura inicial para atendimento dos primeiros clientes.</p></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><Card className="p-4 space-y-3"><h2 className="font-semibold text-[var(--vf-text)]">Abrir chamado</h2><Field label="Assunto"><Input value={assunto} onChange={e => setAssunto(e.target.value)} placeholder="Ex: dificuldade para gerar relatório" /></Field><Field label="Prioridade"><Select value={prioridade} onChange={e => setPrioridade(e.target.value as any)}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></Select></Field><Field label="Mensagem"><Textarea value={mensagem} onChange={e => setMensagem(e.target.value)} placeholder="Descreva o problema ou dúvida." /></Field><Button loading={abrir.isPending} disabled={!assunto || !mensagem} onClick={() => abrir.mutate()}>Enviar chamado</Button></Card><Card className="p-4 space-y-3"><h2 className="font-semibold text-[var(--vf-text)]">Guias rápidos</h2>{['Como fazer a primeira venda','Como publicar o catálogo','Como trocar paleta e logo','Como gerar relatório','Como aplicar migrations no Supabase'].map(t => <Alert key={t} type="info">{t}</Alert>)}</Card></div></div></div>
}
