import { OfflineDB, type OfflineVenda } from '@/lib/offline-db'
import { VendasService, type RegistrarVendaForm } from './vendas'
import { getCurrentUserId, getEmpresaId } from './_base'

export const OfflineSyncService = {
  async registrarVendaOffline(payload: Record<string, unknown>): Promise<OfflineVenda> {
    const [empresaId, userId] = await Promise.all([getEmpresaId(), getCurrentUserId()])
    return OfflineDB.putVenda(payload, empresaId, userId)
  },

  async sincronizarVendasPendentes(): Promise<{ ok: number; erro: number; conflito: number }> {
    const empresaId = await getEmpresaId()
    const pendentes = await OfflineDB.listarVendasPendentes(empresaId)
    let ok = 0
    let erro = 0
    let conflito = 0

    for (const venda of pendentes) {
      if (venda.empresa_id !== empresaId) {
        await OfflineDB.atualizarVenda({ ...venda, status: 'conflito', erro: 'A operação pertence a outra empresa.' })
        conflito += 1
        continue
      }
      await OfflineDB.atualizarVenda({ ...venda, status: 'sincronizando', tentativas: venda.tentativas + 1, erro: undefined })
      try {
        await VendasService.registrar({ ...venda.payload, idempotency_key: venda.idempotency_key } as RegistrarVendaForm)
        await OfflineDB.atualizarVenda({ ...venda, status: 'sincronizado', tentativas: venda.tentativas + 1, synced_at: new Date().toISOString(), erro: undefined })
        ok += 1
      } catch (error) {
        await OfflineDB.atualizarVenda({ ...venda, status: 'falhou', tentativas: venda.tentativas + 1, erro: error instanceof Error ? error.message : String(error) })
        erro += 1
      }
    }
    return { ok, erro, conflito }
  },

  async pendentes() {
    const empresaId = await getEmpresaId()
    return OfflineDB.listarVendasPendentes(empresaId)
  },
}
