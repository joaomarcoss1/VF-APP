'use client'
import { useParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import { Alert, Button, Card, Field, Input } from '@/components/ui'
import { MultiempresaService } from '@/services'
import toast from 'react-hot-toast'

export default function EmpresaMasterDetalhePage() {
  const params = useParams<{ id: string }>()
  const [admin, setAdmin] = useState({ nome: '', email: '', telefone: '', cargo: 'empresa_admin' })
  const vincular = useMutation({ mutationFn: () => MultiempresaService.vincularAdminEmpresa(params.id, admin as any), onSuccess: () => toast.success('Admin vinculado à empresa.'), onError: (e: Error) => toast.error(e.message) })
  return <div className="vf-fadein"><Header title="Empresa" /><div className="p-4 md:p-6 max-w-3xl space-y-4"><div><h1 className="text-2xl font-bold text-[var(--vf-text)]">Empresa {params.id}</h1><p className="text-sm text-[var(--vf-text2)]">Vincule o primeiro Admin da Empresa e registre auditoria.</p></div><Alert type="info">Para criar autenticação real, cadastre o usuário no Supabase Auth e depois use o ID para vincular em perfis. Esta tela prepara o vínculo empresarial.</Alert><Card className="p-4 space-y-3"><h2 className="font-bold text-[var(--vf-text)]">Vincular Admin da Empresa</h2><Field label="Nome"><Input value={admin.nome} onChange={e=>setAdmin({...admin,nome:e.target.value})} /></Field><Field label="E-mail"><Input value={admin.email} onChange={e=>setAdmin({...admin,email:e.target.value})} /></Field><Field label="Telefone"><Input value={admin.telefone} onChange={e=>setAdmin({...admin,telefone:e.target.value})} /></Field><Button loading={vincular.isPending} disabled={!admin.nome} onClick={()=>vincular.mutate()}>Vincular admin</Button></Card></div></div>
}
