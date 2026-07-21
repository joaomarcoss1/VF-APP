import type { DashboardData, Produto } from '@/types'
import { db, getEmpresaId, normalizeError } from './_base'
import { ProdutosService } from './produtos'

export const DashboardService = {
  async obter(): Promise<DashboardData | null> {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('vw_dashboard').select('*').eq('empresa_id', empresaId).maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao carregar dashboard.')
    return (data as DashboardData | null) ?? null
  },
  async produtosMaisLucrativos(limit = 5): Promise<Produto[]> { return (await ProdutosService.rankingRentabilidade()).slice(0, limit) as Produto[] },
  async cmvPorCategoria(): Promise<Array<{ categoria: string; cmv_medio: number; count: number }>> {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('produtos').select('categoria, cmv_percentual').eq('empresa_id', empresaId).eq('ativo', true)
    if (error) throw normalizeError(error, 'Erro ao carregar CMV por categoria.')
    const map = new Map<string, { sum: number; count: number }>()
    for (const p of data ?? []) {
      const categoria = String((p as any).categoria ?? 'outro')
      const acc = map.get(categoria) ?? { sum: 0, count: 0 }
      acc.sum += Number((p as any).cmv_percentual ?? 0); acc.count += 1; map.set(categoria, acc)
    }
    return Array.from(map.entries()).map(([categoria, { sum, count }]) => ({ categoria, cmv_medio: count > 0 ? Math.round((sum / count) * 10) / 10 : 0, count }))
  },
}
