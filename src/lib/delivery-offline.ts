import type { Delivery } from '@/types'
import { DeliveryService } from '@/services/entregas'

export type DeliveryOfflineAction = {
  id: string
  empresa_id?: string | null
  driver_id?: string | null
  delivery_id: string
  action_type: 'finish_delivery'
  payload: {
    reported_at: string
    lat?: number | null
    lng?: number | null
    notes?: string | null
  }
  sync_status: 'pending' | 'synced' | 'failed'
  error_message?: string | null
  local_created_at: string
  synced_at?: string | null
}

const DB_NAME = 'vf_nexus_delivery_offline'
const STORE = 'delivery_actions'
const VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB indisponível neste navegador.'))
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode)
    const store = transaction.objectStore(STORE)
    const req = run(store)
    if (req) {
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    } else {
      transaction.oncomplete = () => resolve()
    }
    transaction.onerror = () => reject(transaction.error)
  })
}

export const DeliveryOfflineDB = {
  async saveFinish(delivery: Delivery, payload: DeliveryOfflineAction['payload']) {
    const action: DeliveryOfflineAction = {
      id: `delivery-${delivery.id}-${Date.now()}`,
      empresa_id: delivery.empresa_id,
      driver_id: delivery.assigned_driver_id ?? null,
      delivery_id: delivery.id,
      action_type: 'finish_delivery',
      payload,
      sync_status: 'pending',
      local_created_at: new Date().toISOString(),
    }
    await tx('readwrite', store => { store.put(action) })
    return action
  },

  async pending(): Promise<DeliveryOfflineAction[]> {
    const rows = await tx<DeliveryOfflineAction[]>('readonly', store => store.getAll())
    return (rows ?? []).filter(row => row.sync_status === 'pending' || row.sync_status === 'failed')
  },

  async markSynced(id: string) {
    const rows = await tx<DeliveryOfflineAction[]>('readonly', store => store.getAll())
    const action = (rows ?? []).find(r => r.id === id)
    if (!action) return
    action.sync_status = 'synced'
    action.synced_at = new Date().toISOString()
    await tx('readwrite', store => { store.put(action) })
  },

  async markFailed(id: string, error: string) {
    const rows = await tx<DeliveryOfflineAction[]>('readonly', store => store.getAll())
    const action = (rows ?? []).find(r => r.id === id)
    if (!action) return
    action.sync_status = 'failed'
    action.error_message = error
    await tx('readwrite', store => { store.put(action) })
  },

  async syncPending(): Promise<{ synced: number; failed: number }> {
    const pending = await this.pending()
    let synced = 0
    let failed = 0
    for (const action of pending) {
      try {
        await DeliveryService.finalizarOnline(action.delivery_id, action.payload.reported_at, 'Sincronização offline do portal do entregador')
        await this.markSynced(action.id)
        synced++
      } catch (error) {
        await this.markFailed(action.id, error instanceof Error ? error.message : String(error))
        failed++
      }
    }
    return { synced, failed }
  },
}
