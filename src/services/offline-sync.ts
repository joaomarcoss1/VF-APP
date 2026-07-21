import { OfflineDB, type OfflineVenda } from '@/lib/offline-db'
import { VendasService } from './vendas'
import { getEmpresaId } from './_base'

export const OfflineSyncService = {
  async registrarVendaOffline(payload: any): Promise<OfflineVenda> {
    const empresaId = await getEmpresaId()
    return OfflineDB.putVenda(payload, empresaId)
  },
  async sincronizarVendasPendentes(): Promise<{ ok: number; erro: number }> {
    const empresaId = await getEmpresaId()
    const pendentes = await OfflineDB.listarVendasPendentes(empresaId)
    let ok = 0, erro = 0
    for (const venda of pendentes) {
      try {
        await VendasService.registrar(venda.payload)
        await OfflineDB.atualizarVenda({ ...venda, status: 'sincronizada', synced_at: new Date().toISOString(), erro: undefined })
        ok++
      } catch (e) {
        await OfflineDB.atualizarVenda({ ...venda, status: 'erro', erro: e instanceof Error ? e.message : String(e) })
        erro++
      }
    }
    return { ok, erro }
  },
  async pendentes() { const empresaId = await getEmpresaId(); return OfflineDB.listarVendasPendentes(empresaId) },
}
