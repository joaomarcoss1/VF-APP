import { db, getCurrentUserId, getEmpresaId, normalizeError, type AnyRecord } from './_base'
import { getEmpresaIdObrigatoria, assertRole } from './_tenant'
import type { Delivery, DeliveryDriver, DeliveryEarning, DeliveryReceipt, DeliveryStatus } from '@/types'

export type DeliveryDriverForm = Partial<DeliveryDriver> & {
  name: string
  phone?: string
  email?: string
  document?: string
  pix_key?: string
  vehicle_type?: string
  vehicle_plate?: string
  base_delivery_fee?: number
  status?: string
  observations?: string
}

export type DeliveryForm = Partial<Delivery> & {
  customer_name: string
  customer_phone?: string
  order_type?: string
  order_description?: string
  pickup_address?: string
  delivery_address: string
  delivery_neighborhood?: string
  delivery_city?: string
  delivery_state?: string
  delivery_complement?: string
  delivery_reference?: string
  delivery_fee?: number
  priority?: string
  assigned_driver_id?: string | null
}

function clean<T extends AnyRecord>(payload: T): T {
  const out = { ...payload } as AnyRecord
  Object.keys(out).forEach(k => { if (out[k] === '') out[k] = null })
  return out as T
}

export function deliveryMapsUrl(delivery: Pick<Delivery, 'delivery_address' | 'delivery_city' | 'delivery_state' | 'delivery_lat' | 'delivery_lng'>): string {
  const hasLatLng = delivery.delivery_lat != null && delivery.delivery_lng != null
  const destination = hasLatLng
    ? `${delivery.delivery_lat},${delivery.delivery_lng}`
    : [delivery.delivery_address, delivery.delivery_city, delivery.delivery_state].filter(Boolean).join(', ')
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}

async function addHistory(delivery: Delivery, newStatus: string, oldStatus?: string | null, notes?: string, source = 'web') {
  try {
    await db().from('delivery_status_history').insert({
      empresa_id: delivery.empresa_id,
      delivery_id: delivery.id,
      driver_id: delivery.assigned_driver_id ?? null,
      old_status: oldStatus ?? delivery.status,
      new_status: newStatus,
      changed_by: await getCurrentUserId(),
      change_source: source,
      notes: notes ?? null,
    })
  } catch {}
}

export const DeliveryDriverService = {
  async listar(): Promise<DeliveryDriver[]> {
    const empresaId = await getEmpresaIdObrigatoria()
    const { data, error } = await db().from('delivery_drivers').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false })
    if (error) throw normalizeError(error, 'Erro ao listar entregadores.')
    return (data ?? []) as DeliveryDriver[]
  },

  async meuCadastro(): Promise<DeliveryDriver | null> {
    const userId = await getCurrentUserId()
    const empresaId = await getEmpresaId()
    if (!userId || !empresaId) return null
    const { data, error } = await db().from('delivery_drivers').select('*').eq('empresa_id', empresaId).or(`profile_id.eq.${userId}`).maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao carregar entregador.')
    return (data as DeliveryDriver) ?? null
  },

  async cadastrar(form: DeliveryDriverForm): Promise<DeliveryDriver> {
    await assertRole(['super_admin','empresa_admin','gerente'])
    const empresaId = await getEmpresaIdObrigatoria()
    const payload = clean({
      empresa_id: empresaId,
      name: form.name,
      phone: form.phone,
      email: form.email,
      document: form.document,
      pix_key: form.pix_key,
      vehicle_type: form.vehicle_type || 'moto',
      vehicle_plate: form.vehicle_plate,
      base_delivery_fee: Number(form.base_delivery_fee || 0),
      status: form.status || 'ativo',
      observations: form.observations,
      created_by: await getCurrentUserId(),
    })
    const { data, error } = await db().from('delivery_drivers').insert(payload).select('*').single()
    if (error) throw normalizeError(error, 'Erro ao cadastrar entregador.')
    return data as DeliveryDriver
  },

  async atualizar(id: string, form: Partial<DeliveryDriverForm>): Promise<DeliveryDriver> {
    await assertRole(['super_admin','empresa_admin','gerente'])
    const empresaId = await getEmpresaIdObrigatoria()
    const payload = clean({ ...form, updated_at: new Date().toISOString() })
    const { data, error } = await db().from('delivery_drivers').update(payload).eq('empresa_id', empresaId).eq('id', id).select('*').single()
    if (error) throw normalizeError(error, 'Erro ao atualizar entregador.')
    return data as DeliveryDriver
  },

  async alterarStatus(id: string, status: 'ativo' | 'inativo' | 'bloqueado') {
    return this.atualizar(id, { status })
  },
}

export const DeliveryService = {
  async criar(form: DeliveryForm): Promise<Delivery> {
    const empresaId = await getEmpresaIdObrigatoria()
    const payload = clean({
      empresa_id: empresaId,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      order_type: form.order_type || 'outro',
      order_description: form.order_description,
      pickup_address: form.pickup_address,
      delivery_address: form.delivery_address,
      delivery_neighborhood: form.delivery_neighborhood,
      delivery_city: form.delivery_city,
      delivery_state: form.delivery_state,
      delivery_complement: form.delivery_complement,
      delivery_reference: form.delivery_reference,
      delivery_fee: Number(form.delivery_fee || 0),
      priority: form.priority || 'normal',
      assigned_driver_id: form.assigned_driver_id || null,
      status: form.assigned_driver_id ? 'offered' : 'offered',
      created_by: await getCurrentUserId(),
    })
    const { data, error } = await db().from('deliveries').insert(payload).select('*, driver:delivery_drivers(*)').single()
    if (error) throw normalizeError(error, 'Erro ao criar entrega.')
    const delivery = data as Delivery
    await addHistory(delivery, 'offered', null, 'Entrega criada pela empresa.')
    try {
      await db().from('delivery_offers').insert({ empresa_id: empresaId, delivery_id: delivery.id, driver_id: form.assigned_driver_id || null, status: 'sent' })
    } catch {}
    return delivery
  },

  async listarEmpresa(status?: string): Promise<Delivery[]> {
    const empresaId = await getEmpresaIdObrigatoria()
    let q = db().from('deliveries').select('*, driver:delivery_drivers(*)').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(300)
    if (status && status !== 'todos') q = q.eq('status', status)
    const { data, error } = await q
    if (error) throw normalizeError(error, 'Erro ao listar entregas.')
    return (data ?? []) as Delivery[]
  },

  async buscar(id: string): Promise<Delivery | null> {
    const empresaId = await getEmpresaId().catch(() => null)
    let q: any = db().from('deliveries').select('*, driver:delivery_drivers(*)').eq('id', id)
    if (empresaId) q = q.eq('empresa_id', empresaId)
    const { data, error } = await q.maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao buscar entrega.')
    return (data as Delivery) ?? null
  },

  async listarPortal(): Promise<Delivery[]> {
    const driver = await DeliveryDriverService.meuCadastro()
    if (!driver) return []
    const { data, error } = await db()
      .from('deliveries')
      .select('*, driver:delivery_drivers(*)')
      .eq('empresa_id', driver.empresa_id)
      .in('status', ['pending','offered','accepted','picked_up','on_route','sync_pending'])
      .or(`assigned_driver_id.eq.${driver.id},assigned_driver_id.is.null`)
      .order('created_at', { ascending: false })
    if (error) throw normalizeError(error, 'Erro ao carregar entregas do portal.')
    return (data ?? []) as Delivery[]
  },

  async listarHistoricoPortal(): Promise<Delivery[]> {
    const driver = await DeliveryDriverService.meuCadastro()
    if (!driver) return []
    const { data, error } = await db().from('deliveries').select('*').eq('empresa_id', driver.empresa_id).eq('assigned_driver_id', driver.id).in('status', ['delivered','canceled','failed']).order('created_at', { ascending: false }).limit(100)
    if (error) throw normalizeError(error, 'Erro ao carregar histórico.')
    return (data ?? []) as Delivery[]
  },

  async aceitar(id: string): Promise<Delivery> {
    const { error: rpcError } = await db().rpc('vf_delivery_accept', { p_delivery_id: id })
    if (rpcError) throw normalizeError(rpcError, 'Erro ao aceitar entrega.')
    const delivery = await this.buscar(id)
    if (!delivery) throw new Error('Entrega aceita, mas não foi possível recarregar os dados.')
    return delivery
  },

  async marcarRetirado(id: string): Promise<Delivery> {
    const delivery = await this.buscar(id)
    if (!delivery) throw new Error('Entrega não encontrada.')
    const { data, error } = await db().from('deliveries').update({ status: 'picked_up', picked_up_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id).select('*, driver:delivery_drivers(*)').single()
    if (error) throw normalizeError(error, 'Erro ao marcar retirada.')
    await addHistory(data as Delivery, 'picked_up', delivery.status, 'Pedido retirado pelo entregador.', 'portal_entregador')
    return data as Delivery
  },

  async finalizarOnline(id: string, reportedAt = new Date().toISOString(), notes?: string): Promise<Delivery> {
    const { error } = await db().rpc('vf_delivery_finish', { p_delivery_id: id, p_reported_at: reportedAt, p_source: 'portal_entregador', p_notes: notes ?? null })
    if (error) throw normalizeError(error, 'Erro ao finalizar entrega.')
    const delivery = await this.buscar(id)
    if (!delivery) throw new Error('Entrega finalizada, mas não foi possível recarregar os dados.')
    return delivery
  },

  async cancelar(id: string, reason?: string): Promise<Delivery> {
    const empresaId = await getEmpresaIdObrigatoria()
    const before = await this.buscar(id)
    const { data, error } = await db().from('deliveries').update({ status: 'canceled', canceled_at: new Date().toISOString(), failure_reason: reason || null, updated_at: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id).select('*, driver:delivery_drivers(*)').single()
    if (error) throw normalizeError(error, 'Erro ao cancelar entrega.')
    await addHistory(data as Delivery, 'canceled', before?.status, reason || 'Entrega cancelada pela empresa.')
    return data as Delivery
  },
}

export const DeliveryFinanceService = {
  async ganhosDoEntregador(driverId?: string, inicio?: string, fim?: string): Promise<DeliveryEarning[]> {
    const empresaId = await getEmpresaIdObrigatoria()
    let q = db().from('delivery_earnings').select('*, delivery:deliveries(*)').eq('empresa_id', empresaId).order('earning_date', { ascending: false })
    if (driverId) q = q.eq('driver_id', driverId)
    if (inicio) q = q.gte('earning_date', inicio)
    if (fim) q = q.lte('earning_date', fim)
    const { data, error } = await q
    if (error) throw normalizeError(error, 'Erro ao carregar ganhos.')
    return (data ?? []) as DeliveryEarning[]
  },

  async meusGanhos(): Promise<DeliveryEarning[]> {
    const driver = await DeliveryDriverService.meuCadastro()
    if (!driver) return []
    return this.ganhosDoEntregador(driver.id)
  },

  async gerarRecibo(driverId: string, periodStart: string, periodEnd: string, periodType = 'periodo'): Promise<DeliveryReceipt> {
    const empresaId = await getEmpresaIdObrigatoria()
    const ganhos = await this.ganhosDoEntregador(driverId, periodStart, periodEnd)
    const payload = {
      empresa_id: empresaId,
      driver_id: driverId,
      period_type: periodType,
      period_start: periodStart,
      period_end: periodEnd,
      total_deliveries: ganhos.length,
      total_amount: ganhos.reduce((a, g) => a + Number(g.amount || 0), 0),
      status: 'generated',
      created_by: await getCurrentUserId(),
    }
    const { data, error } = await db().from('delivery_receipts').insert(payload).select('*, driver:delivery_drivers(*)').single()
    if (error) throw normalizeError(error, 'Erro ao gerar recibo.')
    return data as DeliveryReceipt
  },

  async listarRecibos(driverId?: string): Promise<DeliveryReceipt[]> {
    const empresaId = await getEmpresaIdObrigatoria()
    let q = db().from('delivery_receipts').select('*, driver:delivery_drivers(*)').eq('empresa_id', empresaId).order('created_at', { ascending: false })
    if (driverId) q = q.eq('driver_id', driverId)
    const { data, error } = await q
    if (error) throw normalizeError(error, 'Erro ao listar recibos.')
    return (data ?? []) as DeliveryReceipt[]
  },

  async meusRecibos(): Promise<DeliveryReceipt[]> {
    const driver = await DeliveryDriverService.meuCadastro()
    if (!driver) return []
    return this.listarRecibos(driver.id)
  },
}
