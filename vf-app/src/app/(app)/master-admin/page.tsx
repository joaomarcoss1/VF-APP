'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, Empty, Field, Input, Modal, Select, Skeleton, Textarea, KpiCard } from '@/components/ui'
import { getSupabase } from '@/lib/supabase'
import { fmtCurrency } from '@/lib/precificacao'
import type { MasterDashboard } from '@/types'
import toast from 'react-hot-toast'

async function masterFetch(path = '', init?: RequestInit) {
  const { data } = await getSupabase().auth.getSession()
  const token = data.session?.access_token
  const res = await fetch(`/api/master${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) } })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Erro no painel master')
  return json
}

const EMPTY_CLIENT = {
  email: '', password: '', nome: '', empresa_nome: '', tipo_empresa: 'restaurante', telefone: '', assinatura_tipo: 'mensal', valor: 0, proxima_cobranca: '', observacoes: ''
}

export default function MasterAdminPage() {
  const qc = useQueryClient()
  const [modalCliente, setModalCliente] = useState(false)
  const [modalSenha, setModalSenha] = useState<{ userId: string; email?: string } | null>(null)
  const [modalEmpresaModulos, setModalEmpresaModulos] = useState<{ id: string; nome: string } | null>(null)
  const [cliente, setCliente] = useState({ ...EMPTY_CLIENT })
  const [novaSenha, setNovaSenha] = useState('')
  const [setorSelecionado, setSetorSelecionado] = useState('restaurante')

  const { data, isLoading, error } = useQuery<MasterDashboard>({ queryKey: ['master-dashboard'], queryFn: () => masterFetch() })
  const { data: modules, isLoading: loadingModules, error: modulesError } = useQuery<any>({ queryKey: ['master-modules'], queryFn: () => masterFetch('?action=modules') })
  const { data: companyModules, isLoading: loadingCompanyModules } = useQuery<any>({
    queryKey: ['master-company-modules', modalEmpresaModulos?.id],
    queryFn: () => masterFetch(`?action=company-modules&empresa_id=${modalEmpresaModulos!.id}`),
    enabled: Boolean(modalEmpresaModulos?.id),
  })

  const createClient = useMutation({
    mutationFn: () => masterFetch('?action=create-client', { method: 'POST', body: JSON.stringify(cliente) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['master-dashboard'] }); toast.success('Cliente cadastrado!'); setModalCliente(false); setCliente({ ...EMPTY_CLIENT }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const block = useMutation({
    mutationFn: (payload: any) => masterFetch('?action=block', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['master-dashboard'] }); toast.success('Status atualizado!') },
    onError: (e: Error) => toast.error(e.message),
  })

  const reset = useMutation({
    mutationFn: () => masterFetch('?action=reset-password', { method: 'POST', body: JSON.stringify({ user_id: modalSenha?.userId, password: novaSenha }) }),
    onSuccess: () => { toast.success('Senha redefinida!'); setModalSenha(null); setNovaSenha('') },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateSub = useMutation({
    mutationFn: (payload: any) => masterFetch('?action=subscription', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['master-dashboard'] }); toast.success('Assinatura atualizada!') },
    onError: (e: Error) => toast.error(e.message),
  })


  const updateCompanyModule = useMutation({
    mutationFn: (payload: any) => masterFetch('?action=company-modules', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-company-modules'] })
      qc.invalidateQueries({ queryKey: ['setor-modulos'] })
      toast.success('Funcionalidade atualizada para esta empresa!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateModule = useMutation({
    mutationFn: (payload: any) => masterFetch('?action=modules', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-modules'] })
      qc.invalidateQueries({ queryKey: ['setor-modulos'] })
      toast.success('Funcionalidade atualizada para o setor!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const setorAtual = modules?.sectors?.find((s: any) => s.tipo === setorSelecionado)
  const configsSetor = modules?.configs?.filter((c: any) => c.tipo_empresa === setorSelecionado) ?? []
  const ativoModulo = (modulo: string) => Boolean(configsSetor.find((c: any) => c.modulo === modulo)?.ativo)
  const toggleModulo = (modulo: string, ordem: number) => {
    const atual = configsSetor.find((c: any) => c.modulo === modulo)
    updateModule.mutate({ configs: [{ tipo_empresa: setorSelecionado, modulo, ativo: !Boolean(atual?.ativo), ordem }] })
  }

  const toggleCompanyModulo = (modulo: string, ordem: number) => {
    const atual = companyModules?.configs?.find((c: any) => c.modulo === modulo)
    if (!modalEmpresaModulos) return
    updateCompanyModule.mutate({ empresa_id: modalEmpresaModulos.id, configs: [{ modulo, ativo: !Boolean(atual?.ativo), ordem }] })
  }

  const vencidas = useMemo(() => (data?.empresas ?? []).filter(e => e.assinatura?.status === 'vencida' || e.assinatura?.status === 'bloqueada'), [data])

  if (error) {
    return (
      <div className="vf-fadein">
        <Header title="Master Admin" />
        <div className="p-6 max-w-3xl"><Alert type="error">{(error as Error).message}. Configure MASTER_ADMIN_EMAILS na Vercel com seu email e confira a SUPABASE_SERVICE_ROLE_KEY.</Alert></div>
      </div>
    )
  }

  return (
    <div className="vf-fadein">
      <Header title="Master Admin" />
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-[var(--vf-text)]">Painel Master do VF Nexus</h1>
            <p className="text-sm text-[var(--vf-text2)] mt-1">Controle empresas, usuários, assinaturas, bloqueios, cobranças e receita do SaaS.</p>
          </div>
          <Button onClick={() => setModalCliente(true)}>＋ Cadastrar cliente</Button>
        </div>

        {isLoading ? <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div> : data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Empresas" value={data.total_empresas} color="gold" />
              <KpiCard label="Usuários" value={data.total_usuarios} color="blue" />
              <KpiCard label="Assinantes ativos" value={data.assinantes_ativos} color="green" />
              <KpiCard label="Vencidas/Bloqueadas" value={data.assinaturas_vencidas} color="red" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <KpiCard label="Receita mensal prevista" value={fmtCurrency(data.receita_mensal_prevista)} color="green" />
              <KpiCard label="Receita vitalícia acumulada" value={fmtCurrency(data.receita_total_vitalicia)} color="gold" />
              <KpiCard label="Cobranças próximas" value={data.proximas_cobrancas.length} color="blue" />
            </div>
          </>
        )}

        {!!data?.proximas_cobrancas.length && <Alert type="warn">Existem {data.proximas_cobrancas.length} assinatura(s) vencendo nos próximos 7 dias. Use esse alerta para cobrar os clientes por fora.</Alert>}
        {!!vencidas.length && <Alert type="error">Existem {vencidas.length} empresa(s) vencidas ou bloqueadas.</Alert>}

        <Card className="overflow-x-auto">
          {!data?.empresas?.length ? <Empty icon="👑" title="Nenhuma empresa cadastrada" description="Cadastre seus primeiros clientes pelo painel master." /> : (
            <table className="vf-table">
              <thead><tr><th>Empresa</th><th>Usuários</th><th>Assinatura</th><th>Valor</th><th>Próxima cobrança</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {data.empresas.map(row => {
                  const ass = row.assinatura
                  const vencida = ass?.proxima_cobranca && ass.tipo === 'mensal' && new Date(ass.proxima_cobranca) < new Date()
                  return <tr key={row.empresa.id}>
                    <td><div className="font-medium text-[var(--vf-text)]">{row.empresa.nome}</div><div className="text-[11px] text-[var(--vf-text3)]">{row.empresa.email || row.empresa.telefone || 'Sem contato'}</div></td>
                    <td>{row.usuarios.map(u => <div key={u.id} className="text-xs text-[var(--vf-text2)] flex gap-2 items-center"><span>{u.email || u.nome}</span><Button size="sm" variant="ghost" onClick={() => setModalSenha({ userId: u.id, email: u.email })}>Senha</Button></div>)}</td>
                    <td><Badge color="gold">{ass?.tipo ?? 'sem assinatura'}</Badge></td>
                    <td>{fmtCurrency(ass?.valor ?? 0)}</td>
                    <td><span className={vencida ? 'text-[#D45050]' : ''}>{ass?.tipo === 'vitalicia' ? 'Vitalícia' : ass?.proxima_cobranca ? new Date(ass.proxima_cobranca).toLocaleDateString('pt-BR') : '—'}</span></td>
                    <td><Badge color={ass?.status === 'ativa' ? 'green' : ass?.status === 'bloqueada' ? 'red' : 'amber'}>{ass?.status ?? 'pendente'}</Badge></td>
                    <td className="space-x-2 whitespace-nowrap">
                      <Button size="sm" variant="secondary" onClick={() => setModalEmpresaModulos({ id: row.empresa.id, nome: row.empresa.nome })}>Módulos</Button>
                      <Button size="sm" variant="secondary" onClick={() => updateSub.mutate({ empresa_id: row.empresa.id, tipo: ass?.tipo || 'mensal', status: 'ativa', valor: ass?.valor || 0, data_inicio: ass?.data_inicio, proxima_cobranca: ass?.tipo === 'mensal' ? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] : null })}>Renovar 30d</Button>
                      <Button size="sm" variant={ass?.status === 'bloqueada' ? 'secondary' : 'danger'} onClick={() => block.mutate({ empresa_id: row.empresa.id, bloquear: ass?.status !== 'bloqueada', motivo: ass?.status === 'bloqueada' ? null : 'Bloqueado pelo administrador master' })}>{ass?.status === 'bloqueada' ? 'Desbloquear' : 'Bloquear'}</Button>
                    </td>
                  </tr>
                })}
              </tbody>
            </table>
          )}
        </Card>


        <Card className="p-4 md:p-5 space-y-4" gold>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--vf-text)]">Controle de funcionalidades por ramo</h2>
              <p className="text-sm text-[var(--vf-text2)] mt-1">Defina quais telas aparecem para cada tipo de empresa. O menu, o mobile e o bloqueio de acesso são atualizados conforme essa configuração.</p>
            </div>
            <Field label="Setor/ramo" className="md:w-72">
              <Select value={setorSelecionado} onChange={e => setSetorSelecionado(e.target.value)}>
                {(modules?.sectors ?? []).map((s: any) => <option key={s.tipo} value={s.tipo}>{s.label}</option>)}
              </Select>
            </Field>
          </div>

          {modulesError && <Alert type="error">{(modulesError as Error).message}</Alert>}
          {loadingModules ? <Skeleton className="h-40" /> : (
            <div className="space-y-4">
              <div className="bg-[var(--vf-surface2)] rounded-xl p-4 border border-[var(--vf-border)]">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge color="gold">{setorAtual?.label ?? setorSelecionado}</Badge>
                  <Badge color="blue">Modo: {setorAtual?.productMode ?? 'híbrido'}</Badge>
                </div>
                <p className="text-sm text-[var(--vf-text2)]">{setorAtual?.description ?? 'Configure os módulos desse setor.'}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {(modules?.features ?? []).map((feature: any, index: number) => {
                  const enabled = ativoModulo(feature.key)
                  return (
                    <button
                      key={feature.key}
                      onClick={() => toggleModulo(feature.key, index)}
                      className={`text-left rounded-xl border p-4 transition-all ${enabled ? 'bg-[var(--vf-gold-bg)] border-[var(--vf-border)]' : 'bg-[var(--vf-surface)] border-[var(--vf-border)] opacity-70'}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 text-[var(--vf-text)] font-medium"><span>{feature.icon}</span><span>{feature.label}</span></div>
                        <Badge color={enabled ? 'green' : 'gray'}>{enabled ? 'Ativo' : 'Oculto'}</Badge>
                      </div>
                      <p className="text-xs text-[var(--vf-text2)] leading-relaxed">{feature.description}</p>
                    </button>
                  )
                })}
              </div>
              <Alert type="info">Exemplo: para barbearia, insumos, fichas e eventos já vêm desativados por padrão. Você pode reativar aqui a qualquer momento. Para lojas, produtos são cadastrados direto por custo/margem/preço; para restaurantes e bares, fichas técnicas e insumos ficam ativos.</Alert>
            </div>
          )}
        </Card>

      </div>

      <Modal open={modalCliente} onClose={() => setModalCliente(false)} title="Cadastrar cliente/empresa" size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Email do cliente" required><Input value={cliente.email} onChange={e => setCliente(p => ({ ...p, email: e.target.value }))} /></Field>
            <Field label="Senha inicial" required><Input value={cliente.password} onChange={e => setCliente(p => ({ ...p, password: e.target.value }))} placeholder="mínimo 6 caracteres" /></Field>
            <Field label="Nome do usuário"><Input value={cliente.nome} onChange={e => setCliente(p => ({ ...p, nome: e.target.value }))} /></Field>
            <Field label="Nome da empresa" required><Input value={cliente.empresa_nome} onChange={e => setCliente(p => ({ ...p, empresa_nome: e.target.value }))} /></Field>
            <Field label="Telefone"><Input value={cliente.telefone} onChange={e => setCliente(p => ({ ...p, telefone: e.target.value }))} /></Field>
            <Field label="Tipo de empresa"><Select value={cliente.tipo_empresa} onChange={e => setCliente(p => ({ ...p, tipo_empresa: e.target.value }))}>{(modules?.sectors ?? [{tipo:'restaurante',label:'Restaurante'}]).map((s: any) => <option key={s.tipo} value={s.tipo}>{s.label}</option>)}</Select></Field>
            <Field label="Tipo de assinatura"><Select value={cliente.assinatura_tipo} onChange={e => setCliente(p => ({ ...p, assinatura_tipo: e.target.value }))}><option value="mensal">Mensal</option><option value="vitalicia">Vitalícia</option></Select></Field>
            <Field label="Valor da assinatura"><Input type="number" step="0.01" value={cliente.valor || ''} onChange={e => setCliente(p => ({ ...p, valor: Number(e.target.value) }))} /></Field>
            {cliente.assinatura_tipo === 'mensal' && <Field label="Próxima cobrança"><Input type="date" value={cliente.proxima_cobranca} onChange={e => setCliente(p => ({ ...p, proxima_cobranca: e.target.value }))} /></Field>}
          </div>
          <Field label="Observações"><Textarea value={cliente.observacoes} onChange={e => setCliente(p => ({ ...p, observacoes: e.target.value }))} /></Field>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setModalCliente(false)}>Cancelar</Button><Button onClick={() => createClient.mutate()} loading={createClient.isPending}>Cadastrar e liberar acesso</Button></div>
        </div>
      </Modal>

      <Modal open={Boolean(modalSenha)} onClose={() => setModalSenha(null)} title={`Redefinir senha ${modalSenha?.email || ''}`}>
        <div className="space-y-4">
          <Field label="Nova senha"><Input value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="mínimo 6 caracteres" /></Field>
          <Alert type="warn">Essa ação redefine a senha do cliente imediatamente. Envie a nova senha para ele por um canal seguro.</Alert>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setModalSenha(null)}>Cancelar</Button><Button onClick={() => reset.mutate()} loading={reset.isPending}>Redefinir senha</Button></div>
        </div>
      </Modal>

      <Modal open={Boolean(modalEmpresaModulos)} onClose={() => setModalEmpresaModulos(null)} title={`Funcionalidades da empresa ${modalEmpresaModulos?.nome || ''}`} size="xl">
        <div className="space-y-4">
          <Alert type="info">Aqui você libera ou oculta funções específicas para esta empresa. O cliente só verá no menu as funções ativas aqui ou no padrão do ramo.</Alert>
          {loadingCompanyModules ? <Skeleton className="h-40" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(companyModules?.configs ?? []).map((cfg: any, index: number) => {
                const feature = (companyModules?.features ?? []).find((f: any) => f.key === cfg.modulo)
                return (
                  <button key={cfg.modulo} onClick={() => toggleCompanyModulo(cfg.modulo, index)} className={`text-left rounded-xl border p-4 transition-all ${cfg.ativo ? 'bg-[var(--vf-gold-bg)] border-[var(--vf-border)]' : 'bg-[var(--vf-surface)] border-[var(--vf-border)] opacity-70'}`}>
                    <div className="flex items-start justify-between gap-2 mb-2"><div className="font-medium text-[var(--vf-text)]"><span className="mr-2">{feature?.icon}</span>{feature?.label || cfg.modulo}</div><Badge color={cfg.ativo ? 'green' : 'gray'}>{cfg.ativo ? 'Liberado' : 'Oculto'}</Badge></div>
                    <p className="text-xs text-[var(--vf-text2)] leading-relaxed">{feature?.description || 'Funcionalidade do sistema.'}</p>
                  </button>
                )
              })}
            </div>
          )}
          <div className="flex justify-end"><Button variant="secondary" onClick={() => setModalEmpresaModulos(null)}>Concluir</Button></div>
        </div>
      </Modal>
    </div>
  )
}
