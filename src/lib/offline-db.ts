export type OfflineVenda = { id: string; empresa_id?: string | null; payload: any; status: 'pendente_sync' | 'sincronizada' | 'erro'; erro?: string; created_at: string; synced_at?: string }
export type OfflineProdutoCache = { id: string; empresa_id?: string | null; data: any; updated_at: string }

const DB_NAME = 'vf_nexus_offline'
const DB_VERSION = 2
const STORES = ['vendas_pendentes','produtos_cache','clientes_cache','sync_logs','etiquetas_cache'] as const

type StoreName = typeof STORES[number]

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB indisponível neste navegador.'))
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const name of STORES) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' })
    }
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
  })
}

async function tx<T>(store: StoreName, mode: IDBTransactionMode, run: (os: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tr = db.transaction(store, mode)
    const os = tr.objectStore(store)
    const req = run(os)
    let result: T | undefined
    if (req) {
      req.onsuccess = () => { result = req.result }
      req.onerror = () => reject(req.error)
    }
    tr.oncomplete = () => resolve(result)
    tr.onerror = () => reject(tr.error)
  })
}

export const OfflineDB = {
  async putVenda(payload: any, empresaId?: string | null): Promise<OfflineVenda> {
    const venda: OfflineVenda = { id: crypto.randomUUID(), empresa_id: empresaId ?? payload?.empresa_id ?? null, payload: { ...payload, empresa_id: empresaId ?? payload?.empresa_id }, status: 'pendente_sync', created_at: new Date().toISOString() }
    await tx('vendas_pendentes', 'readwrite', os => os.put(venda))
    return venda
  },
  async listarVendasPendentes(empresaId?: string | null): Promise<OfflineVenda[]> {
    const rows = await tx<any[]>('vendas_pendentes', 'readonly', os => os.getAll())
    return (rows || []).filter(v => v.status !== 'sincronizada' && (!empresaId || v.empresa_id === empresaId))
  },
  async atualizarVenda(venda: OfflineVenda) { await tx('vendas_pendentes', 'readwrite', os => os.put(venda)) },
  async cacheProdutos(produtos: any[], empresaId?: string | null) { for (const p of produtos || []) await tx('produtos_cache', 'readwrite', os => os.put({ id: `${empresaId || p.empresa_id || 'sem-empresa'}:${p.id}`, empresa_id: empresaId || p.empresa_id || null, data: p, updated_at: new Date().toISOString() })) },
  async listarProdutosCache(empresaId?: string | null): Promise<any[]> { const rows = await tx<any[]>('produtos_cache', 'readonly', os => os.getAll()); return (rows || []).filter(r => !empresaId || r.empresa_id === empresaId).map(r => r.data) },
  async buscarProdutoCache(codigo: string, empresaId?: string | null): Promise<any | null> { const lista = await this.listarProdutosCache(empresaId); const clean = codigo.trim(); return lista.find(p => p.codigo_barras === clean || p.sku === clean || p.codigo_interno === clean) || null },
  async log(evento: string, payload?: any) { await tx('sync_logs', 'readwrite', os => os.put({ id: crypto.randomUUID(), evento, payload: payload || {}, created_at: new Date().toISOString() })) },
}
