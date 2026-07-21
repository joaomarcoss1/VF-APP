'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { Badge, Button, Card, Empty, Skeleton } from '@/components/ui'
import { MultiempresaService } from '@/services'
import { setEmpresaSelecionadaMaster } from '@/services/_tenant'

export default function MasterEmpresasPage() {
  const router = useRouter()
  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ['master-empresas-operar-v9-1'],
    queryFn: MultiempresaService.listarEmpresasMaster,
    retry: false,
  })

  function operarComoEmpresa(empresa: any) {
    setEmpresaSelecionadaMaster({
      id: empresa.id,
      nome: empresa.nome_fantasia || empresa.nome || empresa.razao_social,
      codigo_empresa: empresa.codigo_empresa || null,
      matricula_empresa: empresa.matricula_empresa || null,
      ramo_atividade: empresa.ramo_atividade || empresa.tipo || null,
    })
    toast.success(`Operando como ${empresa.nome_fantasia || empresa.nome || 'empresa selecionada'}.`)
    router.push('/dashboard')
  }

  return (
    <div className="vf-fadein">
      <Header title="Empresas" />
      <div className="p-4 md:p-6 space-y-5">
        <Card className="p-5 space-y-2">
          <h1 className="text-xl font-black text-[var(--vf-text)]">Operar uma empresa</h1>
          <p className="text-sm font-semibold text-[var(--vf-text3)]">
            Como Admin Master, escolha uma empresa para acessar dashboard, estoque, financeiro, PDV, atendimento e reservas sem misturar dados globais.
          </p>
        </Card>

        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-3xl" />)}</div>
        ) : (empresas as any[]).length === 0 ? (
          <Empty title="Nenhuma empresa encontrada" description="Cadastre empresas no painel Master para operar o sistema por contexto." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(empresas as any[]).map((empresa) => (
              <Card key={empresa.id} className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block truncate text-[var(--vf-text)]">{empresa.nome_fantasia || empresa.nome || 'Empresa sem nome'}</strong>
                    <p className="mt-1 text-xs font-semibold text-[var(--vf-text3)] truncate">{empresa.codigo_empresa || empresa.matricula_empresa || empresa.id}</p>
                  </div>
                  <Badge color={empresa.status === 'bloqueada' ? 'red' : 'green'}>{empresa.status || 'ativa'}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-[var(--vf-text3)]">
                  <div className="rounded-2xl bg-[var(--vf-surface2)] p-3"><b className="block text-[var(--vf-text)]">Ramo</b>{empresa.ramo_atividade || empresa.tipo || 'Não definido'}</div>
                  <div className="rounded-2xl bg-[var(--vf-surface2)] p-3"><b className="block text-[var(--vf-text)]">Plano</b>{empresa.plano || 'trial'}</div>
                </div>
                <Button className="w-full" onClick={() => operarComoEmpresa(empresa)}>Operar esta empresa</Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
