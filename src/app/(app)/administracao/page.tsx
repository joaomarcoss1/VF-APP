'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, Field, Input, Select } from '@/components/ui'
import { MultiempresaService, labelPapel } from '@/services'
import toast from 'react-hot-toast'

export default function AdministracaoPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', cargo: 'funcionario', setor: '' })
  const { data: ctx } = useQuery({ queryKey: ['tenant-context'], queryFn: MultiempresaService.contexto, retry: false })
  const { data: empresa } = useQuery({ queryKey: ['empresa-atual-admin'], queryFn: MultiempresaService.empresaAtual, retry: false })
  const { data: equipe } = useQuery({ queryKey: ['equipe-admin'], queryFn: MultiempresaService.equipeDaEmpresa, retry: false })
  const criar = useMutation({
    mutationFn: () => MultiempresaService.criarUsuarioEmpresa(form as any),
    onSuccess: () => { toast.success('Usuário cadastrado na empresa.'); setForm({ nome: '', email: '', telefone: '', cargo: 'funcionario', setor: '' }); qc.invalidateQueries({ queryKey: ['equipe-admin'] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const perfis = equipe?.perfis ?? []
  const usuarios = equipe?.equipe ?? []
  const admins = perfis.filter((p: any) => ['dono','administrador','empresa_admin'].includes(String(p.cargo || '').toLowerCase()))
  const gerentes = [...perfis, ...usuarios].filter((p: any) => String(p.cargo || '').toLowerCase() === 'gerente')
  const funcionarios = [...perfis, ...usuarios].filter((p: any) => !['dono','administrador','empresa_admin','gerente','master_admin'].includes(String(p.cargo || '').toLowerCase()))

  return <div className="vf-fadein">
    <Header title="Administração" />
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-[var(--vf-text)]">Administração da empresa</h1><p className="text-sm text-[var(--vf-text2)] mt-1">Dados, papéis e usuários ficam isolados por empresa.</p></div>
        <Badge color="blue">{ctx?.papelLabel || 'Carregando perfil'}</Badge>
      </div>
      <Card className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div><span className="text-[10px] uppercase text-[var(--vf-text3)]">Empresa</span><b className="block text-[var(--vf-text)]">{empresa?.nome_fantasia || empresa?.nome || 'Empresa atual'}</b></div>
        <div><span className="text-[10px] uppercase text-[var(--vf-text3)]">Matrícula/Código</span><b className="block text-[var(--vf-primary)]">{empresa?.codigo_empresa || empresa?.matricula_empresa || 'Não informado'}</b></div>
        <div><span className="text-[10px] uppercase text-[var(--vf-text3)]">Plano</span><b className="block text-[var(--vf-text)]">{empresa?.plano || 'trial'}</b></div>
        <div><span className="text-[10px] uppercase text-[var(--vf-text3)]">Status</span><b className="block text-[var(--vf-success)]">{empresa?.status || 'ativa'}</b></div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr,420px] gap-4">
        <div className="space-y-4">
          <Card className="p-4"><h2 className="font-bold text-[var(--vf-text)] mb-3">Administração</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[...admins, ...gerentes].map((u: any) => <UserCard key={`${u.id}-${u.email}`} u={u} />)}{![...admins, ...gerentes].length && <Alert type="info">Nenhum administrador/gerente encontrado.</Alert>}</div></Card>
          <Card className="p-4"><h2 className="font-bold text-[var(--vf-text)] mb-3">Funcionários</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{funcionarios.map((u: any) => <UserCard key={`${u.id}-${u.email}`} u={u} />)}{!funcionarios.length && <Alert type="info">Nenhum funcionário cadastrado ainda.</Alert>}</div></Card>
        </div>
        <Card className="p-4 space-y-3 xl:sticky xl:top-20">
          <h2 className="font-bold text-[var(--vf-text)]">Adicionar usuário</h2>
          <Alert type="info">O usuário criado aqui fica vinculado apenas a esta empresa. Para criar login real, envie convite ou cadastre o usuário no Supabase Auth.</Alert>
          <Field label="Nome"><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" /></Field>
          <Field label="E-mail"><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@empresa.com" /></Field>
          <Field label="Telefone"><Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="(99) 99999-9999" /></Field>
          <Field label="Papel"><Select value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })}><option value="funcionario">Funcionário</option><option value="gerente">Gerente</option><option value="vendedor">Vendedor</option><option value="atendente">Atendente</option><option value="operacional">Estoque/Operacional</option><option value="financeiro">Financeiro</option></Select></Field>
          <Field label="Setor"><Input value={form.setor} onChange={e => setForm({ ...form, setor: e.target.value })} placeholder="PDV, estoque, financeiro..." /></Field>
          <Button loading={criar.isPending} disabled={!form.nome} onClick={() => criar.mutate()} fullWidth>Adicionar à empresa</Button>
        </Card>
      </div>
    </div>
  </div>
}

function UserCard({ u }: { u: any }) {
  return <div className="rounded-2xl border border-[var(--vf-border)] bg-[var(--vf-surface2)] p-3">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><b className="block text-sm text-[var(--vf-text)] truncate">{u.nome || u.email || 'Usuário'}</b><span className="block text-xs text-[var(--vf-text3)] truncate">{u.email || 'sem e-mail'}</span></div><Badge color={['dono','administrador','empresa_admin'].includes(String(u.cargo || '').toLowerCase()) ? 'gold' : String(u.cargo).toLowerCase() === 'gerente' ? 'blue' : 'gray'}>{labelPapel(u.cargo)}</Badge></div>
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><span className="rounded-xl bg-[var(--vf-card)] px-2 py-1 text-[var(--vf-text2)]">Setor: {u.setor || 'geral'}</span><span className="rounded-xl bg-[var(--vf-card)] px-2 py-1 text-[var(--vf-text2)]">Status: {u.status || (u.bloqueado ? 'bloqueado' : 'ativo')}</span></div>
  </div>
}
