export type OfflineSyncStatus = 'pendente' | 'sincronizando' | 'sincronizado' | 'falhou' | 'conflito'
export type OfflineVenda = {
  id: string
  empresa_id: string
  user_id?: string | null
  payload: Record<string, unknown>
  status: OfflineSyncStatus
  tentativas: number
  idempotency_key: string
  erro?: string
  created_at: string
  updated_at: string
  synced_at?: string
}
export type OfflineProdutoCache = { id: string; empresa_id?: string | null; data: unknown; updated_at: string }

const DB_NAME = 'vf_nexus_offline'
const DB_VERSION = 3
const STORES = ['vendas_pendentes', 'produtos_cache', 'clientes_cache', 'sync_logs', 'etiquetas_cache'] as const
type StoreName = typeof STORES[number]

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB indisponível neste navegador.'))
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const database = req.result
      for (const name of STORES) if (!database.objectStoreNames.contains(name)) database.createObjectStore(name, { keyPath: 'id' })
    }
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
  })
}

async function tx<T>(store: StoreName, mode: IDBTransactionMode, run: (os: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const database = await openDb()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(store, mode)
    const objectStore = transaction.objectStore(store)
    const request = run(objectStore)
    let result: T | undefined
    if (request) {
      request.onsuccess = () => { result = request.result }
      request.onerror = () => reject(request.error)
    }
    transaction.oncomplete = () => { database.close(); resolve(result) }
    transaction.onerror = () => { database.close(); reject(transaction.error) }
    transaction.onabort = () => { database.close(); reject(transaction.error || new Error('Transação offline cancelada.')) }
  })
}

const all = <T>(store: StoreName) => tx<T[]>(store, 'readonly', os => os.getAll()).then(rows => rows || [])

export const OfflineDB = {
  async putVenda(payload: Record<string, unknown>, empresaId: string, userId?: string | null): Promise<OfflineVenda> {
    if (!empresaId) throw new Error('Empresa obrigatória para registrar operação offline.')
    const now = new Date().toISOString()
    const idempotencyKey = String(payload.idempotency_key || `offline-venda:${empresaId}:${crypto.randomUUID()}`)
    const existing = (await all<OfflineVenda>('vendas_pendentes')).find(row => row.empresa_id === empresaId && row.idempotency_key === idempotencyKey)
    if (existing) return existing
    const venda: OfflineVenda = {
      id: crypto.randomUUID(), empresa_id: empresaId, user_id: userId || null,
      payload: { ...payload, empresa_id: empresaId, idempotency_key: idempotencyKey },
      status: 'pendente', tentativas: 0, idempotency_key: idempotencyKey,
      created_at: now, updated_at: now,
    }
    await tx('vendas_pendentes', 'readwrite', os => os.put(venda))
    return venda
  },

  async listarVendasPendentes(empresaId: string): Promise<OfflineVenda[]> {
    if (!empresaId) return []
    const rows = await all<OfflineVenda>('vendas_pendentes')
    return rows
      .filter(row => row.empresa_id === empresaId && row.status !== 'sincronizado')
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
  },

  async atualizarVenda(venda: OfflineVenda) {
    await tx('vendas_pendentes', 'readwrite', os => os.put({ ...venda, updated_at: new Date().toISOString() }))
  },

  async removerVenda(id: string) {
    await tx('vendas_pendentes', 'readwrite', os => os.delete(id))
  },

  async cacheProdutos<T extends { id: string | number }>(produtos: readonly T[], empresaId: string | null | undefined) {
    if (!empresaId) return
    for (const produto of produtos) await tx('produtos_cache', 'readwrite', os => os.put({ id: `${empresaId}:${produto.id}`, empresa_id: empresaId, data: produto, updated_at: new Date().toISOString() }))
  },

  async listarProdutosCache(empresaId: string): Promise<Record<string, unknown>[]> {
    const rows = await all<{ empresa_id: string; data: Record<string, unknown> }>('produtos_cache')
    return rows.filter(row => row.empresa_id === empresaId).map(row => row.data)
  },

  async buscarProdutoCache(codigo: string, empresaId: string | null | undefined): Promise<Record<string, unknown> | null> {
    if (!empresaId) return null
    const clean = codigo.trim()
    const products = await this.listarProdutosCache(empresaId)
    return products.find(product => product.codigo_barras === clean || product.sku === clean || product.codigo_interno === clean) || null
  },

  async log(evento: string, payload?: Record<string, unknown>) {
    await tx('sync_logs', 'readwrite', os => os.put({ id: crypto.randomUUID(), evento, payload: payload || {}, created_at: new Date().toISOString() }))
  },
}
