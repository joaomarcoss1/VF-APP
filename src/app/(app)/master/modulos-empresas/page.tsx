'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { RAMOS_ATIVIDADE, getDefaultModulesForRamo, getRamoDefinition } from '@/config/ramos'
import { FEATURE_DEFINITIONS } from '@/lib/modules'
import { ModulosEmpresaService, getModuloCodigoFromRecord } from '@/services/modulos-empresa'
import { MultiempresaService } from '@/services'
import Header from '@/components/layout/Header'
import { Badge, Button, Card, Skeleton } from '@/components/ui'

const QUERY_KEY_MODULOS_VISIVEIS = ['empresa-modulos-visiveis-v9-1']

export default function MasterModulosEmpresasPage() {
  const qc = useQueryClient()
  const { data: empresas = [] } = useQuery({ queryKey: ['master-empresas-modulos'], queryFn: MultiempresaService.listarEmpresasMaster, retry: false })
  const [empresaId, setEmpresaId] = useState('')
  const empresa = useMemo(() => (empresas as any[]).find((item) => item.id === empresaId), [empresas, empresaId])
  const [ramo, setRamo] = useState('bar_restaurante')
  const [selected, setSelected] = useState<Set<string>>(new Set(getDefaultModulesForRamo('bar_restaurante')))

  const { data: modulosReais = [], isFetching: carregandoModulos } = useQuery({
    queryKey: ['master-empresa-modulos-reais-v9-1', empresaId],
    queryFn: () => ModulosEmpresaService.listarModulosEmpresa(empresaId),
    enabled: Boolean(empresaId),
    retry: false,
  })

  useEffect(() => {
    if (!empresaId || !empresa) return
    const ramoAtual = getRamoDefinition(empresa.ramo_atividade || empresa.tipo).id
    setRamo(ramoAtual)
    if (modulosReais.length) {
      setSelected(new Set(modulosReais.filter((row) => row.ativo).map((row) => getModuloCodigoFromRecord(row))))
    } else {
      setSelected(new Set(getDefaultModulesForRamo(ramoAtual)))
    }
  }, [empresaId, empresa, modulosReais])

  function loadEmpresa(id: string) {
    setEmpresaId(id)
    const next = (empresas as any[]).find((item) => item.id === id)
    const ramoAtual = getRamoDefinition(next?.ramo_atividade || next?.tipo).id
    setRamo(ramoAtual)
    setSelected(new Set(getDefaultModulesForRamo(ramoAtual)))
  }

  function changeRamo(value: string) {
    setRamo(value)
    const padrao = getDefaultModulesForRamo(value)
    setSelected((current) => new Set([...Array.from(current), ...padrao]))
  }

  function toggle(module: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(module)) next.delete(module)
      else next.add(module)
      return next
    })
  }

  async function save() {
    if (!empresaId) return toast.error('Selecione uma empresa.')
    const confirmed = window.confirm('Salvar módulos exatamente como estão marcados? Módulos desmarcados ficarão ocultos para esta empresa.')
    if (!confirmed) return
    const modules = FEATURE_DEFINITIONS.filter((f) => !f.masterOnly).map((feature) => ({ modulo_codigo: feature.key, ativo: selected.has(feature.key) || selected.has(feature.href.replace(/^\//, '')) }))
    try {
      await ModulosEmpresaService.atualizarModulosEmpresa(empresaId, ramo, modules)
      toast.success('Módulos da empresa atualizados. Funções não liberadas não aparecerão no menu.')
      await qc.invalidateQueries({ queryKey: QUERY_KEY_MODULOS_VISIVEIS })
      await qc.invalidateQueries({ queryKey: ['master-empresa-modulos-reais-v9-1', empresaId] })
    } catch (error: any) {
      toast.error(error.message ?? 'Erro ao salvar módulos.')
    }
  }

  const padraoRamo = useMemo(() => new Set(getDefaultModulesForRamo(ramo)), [ramo])
  const rowsSalvos = useMemo(() => new Map(modulosReais.map((row) => [getModuloCodigoFromRecord(row), row])), [modulosReais])

  return (
    <div className="vf-fadein">
      <Header title="Módulos por empresa" />
      <div className="p-4 md:p-6 space-y-5">
        <Card className="p-5 space-y-4">
          <div>
            <h1 className="text-xl font-black text-[var(--vf-text)]">Controle definitivo de funções por ramo</h1>
            <p className="text-sm text-[var(--vf-text3)] mt-1">A tela carrega primeiro os módulos reais salvos no banco. O padrão do ramo é usado apenas quando a empresa ainda não tem configuração.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr,280px]">
            <label><span className="text-xs font-black uppercase text-[var(--vf-text3)]">Empresa</span><select value={empresaId} onChange={(e) => loadEmpresa(e.target.value)} className="vf-input mt-2"><option value="">Selecione</option>{(empresas as any[]).map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia || e.nome} · {e.codigo_empresa || e.matricula_empresa}</option>)}</select></label>
            <label><span className="text-xs font-black uppercase text-[var(--vf-text3)]">Ramo</span><select value={ramo} onChange={(e) => changeRamo(e.target.value)} className="vf-input mt-2">{RAMOS_ATIVIDADE.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}</select></label>
          </div>
          {empresa && <div className="rounded-2xl bg-[var(--vf-surface2)] p-4 text-sm text-[var(--vf-text2)]">Empresa selecionada: <b>{empresa.nome_fantasia || empresa.nome}</b>. {modulosReais.length ? 'Configuração real carregada do banco.' : 'Sem configuração salva; usando padrão do ramo até salvar.'}</div>}
        </Card>

        <Card className="p-5">
          {carregandoModulos ? <Skeleton className="h-52 rounded-3xl" /> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {FEATURE_DEFINITIONS.filter((f) => !f.masterOnly).map((feature) => {
              const active = selected.has(feature.key) || selected.has(feature.href.replace(/^\//, ''))
              const salvo = rowsSalvos.get(feature.key)
              const defaultModule = padraoRamo.has(feature.key as any)
              return <button key={feature.key} onClick={() => toggle(feature.key)} className={`rounded-2xl border p-4 text-left transition ${active ? 'border-blue-300 bg-[color-mix(in_srgb,var(--vf-primary)_12%,var(--vf-card))] text-[var(--vf-text)]' : 'border-[var(--vf-border)] bg-[var(--vf-surface2)] text-[var(--vf-text3)]'}`}><div className="flex items-start justify-between gap-3"><span className="text-xs font-black uppercase tracking-wider text-[var(--vf-primary)]">{feature.mobileLabel || feature.label}</span><span className={`rounded-full px-3 py-1 text-xs font-black ${active ? 'bg-blue-600 text-white' : 'bg-[var(--vf-card)] text-[var(--vf-text3)] border border-[var(--vf-border)]'}`}>{active ? 'Visível' : 'Oculto'}</span></div><strong className="mt-3 block text-sm">{feature.label}</strong><p className="mt-1 text-xs font-semibold leading-5">{feature.description}</p><div className="mt-3 flex flex-wrap gap-1"><Badge color={defaultModule ? 'blue' : 'gray'}>{defaultModule ? 'Padrão do ramo' : 'Extra'}</Badge>{salvo && <Badge color={salvo.liberado_por_master ? 'green' : 'gray'}>{salvo.liberado_por_master ? 'Salvo pelo Master' : 'Salvo'}</Badge>}</div></button>
            })}
          </div>}
          <Button className="mt-5" onClick={save} disabled={!empresaId || carregandoModulos}>Salvar módulos desta empresa</Button>
        </Card>
      </div>
    </div>
  )
}
