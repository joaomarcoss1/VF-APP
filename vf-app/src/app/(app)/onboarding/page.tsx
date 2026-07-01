'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import BrandLogo from '@/components/BrandLogo'
import { Alert, Button, Card, Field, Input, Select } from '@/components/ui'
import { IdentidadeService } from '@/services'
import { getSectorProfile, SECTOR_PROFILES } from '@/lib/modules'
import type { TipoEmpresa } from '@/types'
import toast from 'react-hot-toast'

const opcoes = (Object.values(SECTOR_PROFILES) as any[]).map(s => ({ value: s.tipo, label: s.label, description: s.description, mode: s.productMode }))

const sugestoesPorModo = {
  alimentacao: { agendamento: true, estoque: true, insumos: true, extras: true },
  varejo: { agendamento: false, estoque: true, insumos: false, extras: false },
  servico: { agendamento: true, estoque: false, insumos: false, extras: false },
  hibrido: { agendamento: true, estoque: true, insumos: false, extras: true },
}

export default function OnboardingPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { data: identidade } = useQuery({ queryKey: ['identidade-global'], queryFn: IdentidadeService.obter, retry: false })
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoEmpresa>('restaurante')
  const [usaAgendamentos, setUsaAgendamentos] = useState(true)
  const [usaEstoque, setUsaEstoque] = useState(true)
  const [usaInsumos, setUsaInsumos] = useState(true)
  const [usaCatalogoEventos, setUsaCatalogoEventos] = useState(true)
  const [usaFinanceiro, setUsaFinanceiro] = useState(true)

  useEffect(() => {
    if (!identidade) return
    setNome(identidade.nome || '')
    const t = (identidade.tipo || 'restaurante') as TipoEmpresa
    setTipo(t)
    const profile = getSectorProfile(t)
    const sugestao = sugestoesPorModo[profile.productMode]
    setUsaAgendamentos(sugestao.agendamento)
    setUsaEstoque(sugestao.estoque)
    setUsaInsumos(sugestao.insumos)
    setUsaCatalogoEventos(sugestao.extras)
  }, [identidade])

  const profile = useMemo(() => getSectorProfile(tipo), [tipo])

  const atualizarTipo = (novo: TipoEmpresa) => {
    setTipo(novo)
    const p = getSectorProfile(novo)
    const sugestao = sugestoesPorModo[p.productMode]
    setUsaAgendamentos(sugestao.agendamento)
    setUsaEstoque(sugestao.estoque)
    setUsaInsumos(sugestao.insumos)
    setUsaCatalogoEventos(sugestao.extras)
  }

  const salvar = useMutation({
    mutationFn: () => IdentidadeService.concluirOnboarding({ nome, tipo, usaAgendamentos, usaEstoque, usaInsumos, usaCatalogoEventos, usaFinanceiro }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['identidade-global'] })
      await qc.invalidateQueries({ queryKey: ['setor-modulos'] })
      toast.success('VF Nexus configurado para o seu ramo!')
      router.replace('/dashboard')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(10,141,255,.12),transparent_30%),#04070D] p-4 md:p-8 flex items-center justify-center">
      <Card className="w-full max-w-4xl overflow-hidden" gold>
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-[rgba(10,141,255,.18)] bg-[var(--vf-surface)]">
            <BrandLogo src="/nexlabs-logo-full.png" alt="NexLabs" variant="full" width={82} height={82} className="rounded-2xl object-contain mb-5" />
            <div className="text-xs tracking-[.25em] text-[var(--vf-secondary)] uppercase">Onboarding VF Nexus</div>
            <h1 className="text-2xl md:text-3xl font-semibold text-[var(--vf-text)] mt-3 leading-tight">Configure o app para mostrar apenas o que faz sentido para o negócio.</h1>
            <p className="text-sm text-[var(--vf-text2)] mt-4 leading-relaxed">Essas 5 perguntas definem os módulos iniciais. Depois, o administrador master pode liberar ou remover funções extras por empresa.</p>
            <div className="mt-6 space-y-2 text-sm text-[var(--vf-text2)]">
              <div>✓ Menos telas desnecessárias</div>
              <div>✓ Produtos adaptados por ramo</div>
              <div>✓ Mobile e PWA organizados</div>
              <div>✓ Relatórios e comprovantes com identidade da empresa</div>
            </div>
          </div>
          <div className="p-5 md:p-8 space-y-5">
            <Alert type="info">Essa etapa é obrigatória no primeiro acesso ou quando a empresa ainda não concluiu a configuração inicial.</Alert>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="1. Nome da empresa/MEI" required><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Barbearia João" /></Field>
              <Field label="2. Ramo principal" required>
                <Select value={tipo} onChange={e => atualizarTipo(e.target.value as TipoEmpresa)}>{opcoes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
              </Field>
            </div>
            <Card className="p-4 bg-[var(--vf-surface2)]">
              <div className="text-sm font-semibold text-[var(--vf-text)]">{profile.label}</div>
              <div className="text-xs text-[var(--vf-text2)] mt-1">{profile.description}</div>
              <div className="text-xs text-[var(--vf-secondary)] mt-2">Modelo de cadastro: {profile.productMode === 'alimentacao' ? 'produto com ficha técnica/insumos' : profile.productMode === 'varejo' ? 'produto direto de compra e venda' : profile.productMode === 'servico' ? 'serviço/pacote com agenda' : 'modelo híbrido'}</div>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="3. Usa agenda/horários?"><Select value={String(usaAgendamentos)} onChange={e => setUsaAgendamentos(e.target.value === 'true')}><option value="true">Sim, mostrar Agendamentos</option><option value="false">Não, ocultar Agenda</option></Select></Field>
              <Field label="4. Precisa de estoque?"><Select value={String(usaEstoque)} onChange={e => setUsaEstoque(e.target.value === 'true')}><option value="true">Sim, mostrar Estoque e Fornecedores</option><option value="false">Não, ocultar Estoque inicial</option></Select></Field>
              <Field label="5. Usa insumos/ficha técnica?"><Select value={String(usaInsumos)} onChange={e => setUsaInsumos(e.target.value === 'true')}><option value="true">Sim, mostrar Insumos e Fichas</option><option value="false">Não, produto/serviço direto</option></Select></Field>
              <Field label="Catálogo, cardápio ou eventos?"><Select value={String(usaCatalogoEventos)} onChange={e => setUsaCatalogoEventos(e.target.value === 'true')}><option value="true">Sim, liberar catálogo/eventos</option><option value="false">Não agora</option></Select></Field>
            </div>
            <Field label="Gestão financeira completa"><Select value={String(usaFinanceiro)} onChange={e => setUsaFinanceiro(e.target.value === 'true')}><option value="true">Sim, mostrar financeiro, despesas e relatórios</option><option value="false">Somente módulos básicos</option></Select></Field>
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-2">
              <Button variant="secondary" onClick={() => router.push('/configuracoes')}>Editar depois</Button>
              <Button loading={salvar.isPending} onClick={() => salvar.mutate()} disabled={!nome.trim()}>Concluir configuração</Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
