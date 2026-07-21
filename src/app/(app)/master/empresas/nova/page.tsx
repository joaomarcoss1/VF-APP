'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Alert, Button, Card, Field, Input, Select } from '@/components/ui'
import { MultiempresaService } from '@/services'
import toast from 'react-hot-toast'

export default function NovaEmpresaMasterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ nome_fantasia: '', razao_social: '', codigo_empresa: '', cnpj: '', telefone: '', email: '', responsavel: '', plano: 'trial', status: 'ativa' })
  const criar = useMutation({ mutationFn: () => MultiempresaService.criarEmpresaMaster(form), onSuccess: (e:any) => { toast.success('Empresa criada.'); router.push(`/master/empresas/${e.id}`) }, onError: (e: Error) => toast.error(e.message) })
  return <div className="vf-fadein"><Header title="Nova empresa" /><div className="p-4 md:p-6 max-w-3xl space-y-4"><div><h1 className="text-2xl font-bold text-[var(--vf-text)]">Cadastrar empresa</h1><p className="text-sm text-[var(--vf-text2)]">Cadastro feito pelo Admin Master NexLabs. Depois vincule o primeiro Admin da Empresa.</p></div><Alert type="info">A matrícula/código é única. Se ficar vazia, o sistema gera automaticamente.</Alert><Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3"><Field label="Nome fantasia"><Input value={form.nome_fantasia} onChange={e=>setForm({...form,nome_fantasia:e.target.value})} /></Field><Field label="Razão social"><Input value={form.razao_social} onChange={e=>setForm({...form,razao_social:e.target.value})} /></Field><Field label="Código/Matrícula"><Input value={form.codigo_empresa} onChange={e=>setForm({...form,codigo_empresa:e.target.value})} placeholder="VF-0001" /></Field><Field label="CNPJ"><Input value={form.cnpj} onChange={e=>setForm({...form,cnpj:e.target.value})} /></Field><Field label="Telefone"><Input value={form.telefone} onChange={e=>setForm({...form,telefone:e.target.value})} /></Field><Field label="E-mail"><Input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></Field><Field label="Responsável"><Input value={form.responsavel} onChange={e=>setForm({...form,responsavel:e.target.value})} /></Field><Field label="Plano"><Select value={form.plano} onChange={e=>setForm({...form,plano:e.target.value})}><option value="trial">Trial</option><option value="basico">Básico</option><option value="pro">Pro</option><option value="premium">Premium</option><option value="enterprise">Enterprise</option></Select></Field><div className="md:col-span-2"><Button loading={criar.isPending} disabled={!form.nome_fantasia} onClick={()=>criar.mutate()}>Criar empresa</Button></div></Card></div></div>
}
