import type { Configuracoes } from '@/types'
import { db, getCurrentUserId, getEmpresaId, normalizeError, assertPermission, type AnyRecord } from './_base'
import { getEmpresaIdObrigatoria } from './_tenant'
import { ConfigService } from './config'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export const NotificacoesService = {
  async listarCentral(limit = 80) {
    const empresaId = await getEmpresaIdObrigatoria()
    const { data, error } = await db()
      .from('notificacoes_central')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw normalizeError(error, 'Erro ao listar notificações.')
    return data ?? []
  },

  async criarCentral(form: { tipo: string; titulo: string; mensagem: string; prioridade?: 'baixa'|'media'|'alta'|'critica'; entidade?: string; entidade_id?: string }) {
    await assertPermission('configuracoes', 'criar')
    const empresaId = await getEmpresaIdObrigatoria()
    const payload: AnyRecord = { empresa_id: empresaId, ...form, prioridade: form.prioridade || 'media' }
    const { data, error } = await db().from('notificacoes_central').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao criar notificação.')
    return data
  },

  async marcarLida(id: string) {
    const empresaId = await getEmpresaIdObrigatoria()
    const { error } = await db()
      .from('notificacoes_central')
      .update({ lida: true, lida_em: new Date().toISOString() })
      .eq('id', id)
      .eq('empresa_id', empresaId)
    if (error) throw normalizeError(error, 'Erro ao marcar notificação como lida.')
  },

  async marcarTodasLidas() {
    const empresaId = await getEmpresaIdObrigatoria()
    const { error } = await db()
      .from('notificacoes_central')
      .update({ lida: true, lida_em: new Date().toISOString() })
      .eq('empresa_id', empresaId)
      .eq('lida', false)
    if (error) throw normalizeError(error, 'Erro ao marcar notificações como lidas.')
  },

  async obterChavePublica(): Promise<string> {
    const res = await fetch('/api/notificacoes/public-key')
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.publicKey) throw new Error(data.error || 'Chave pública VAPID não configurada.')
    return data.publicKey as string
  },

  async ativarNesteDispositivo(): Promise<void> {
    if (typeof window === 'undefined') throw new Error('Notificações só podem ser ativadas no navegador.')
    if (!('Notification' in window)) throw new Error('Este navegador não suporta notificações push.')
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Este dispositivo/navegador ainda não suporta Push Notification para PWA.')
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') throw new Error('Permissão de notificação não concedida.')
    const registration = await navigator.serviceWorker.ready
    const publicKey = await this.obterChavePublica()
    const existingSubscription = await registration.pushManager.getSubscription()
    const subscription = existingSubscription ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) })
    const json = subscription.toJSON() as any
    const userId = await getCurrentUserId()
    const empresaId = await getEmpresaId().catch(() => null)
    if (!userId || !empresaId) throw new Error('Sessão inválida. Entre novamente para ativar notificações.')
    const { error } = await db().from('push_subscriptions').upsert({ empresa_id: empresaId, usuario_id: userId, endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth_key: json.keys?.auth, user_agent: window.navigator.userAgent }, { onConflict: 'endpoint' })
    if (error) throw normalizeError(error, 'Não foi possível salvar este dispositivo para notificações.')
  },

  async salvarPreferencias(config: Pick<Configuracoes, 'notificacao_agendamento_ativa' | 'notificacao_agendamento_antecedencia'>): Promise<void> {
    await ConfigService.salvar(config as Partial<Configuracoes>)
  },
}
