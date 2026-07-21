'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { RestauranteService, type RestaurantNotification, type RestaurantSector } from '@/services/restaurante'

function useAudioNotification() {
  const enabled = useRef(false)
  useEffect(() => {
    const enable = () => { enabled.current = true }
    window.addEventListener('pointerdown', enable, { once: true })
    window.addEventListener('keydown', enable, { once: true })
    return () => {
      window.removeEventListener('pointerdown', enable)
      window.removeEventListener('keydown', enable)
    }
  }, [])

  return useCallback(() => {
    if (!enabled.current) return
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.24)
    } catch {}
  }, [])
}

export function useRestaurantNotifications(setor?: RestaurantSector) {
  const [notifications, setNotifications] = useState<RestaurantNotification[]>([])
  const lastSeenIds = useRef<Set<string>>(new Set())
  const play = useAudioNotification()

  const refresh = useCallback(async () => {
    const list = await RestauranteService.listarNotificacoes(setor).catch(() => [])
    const previous = lastSeenIds.current
    const newOnes = list.filter((item) => !previous.has(item.id))
    if (newOnes.length && previous.size > 0) {
      play()
      const first = newOnes[0]
      toast(first.message, { icon: first.type === 'success' ? '✅' : first.type === 'danger' ? '🚨' : '🔔' })
    }
    lastSeenIds.current = new Set(list.map((item) => item.id))
    setNotifications(list)
  }, [play, setor])

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id))
    await RestauranteService.marcarNotificacaoLida(id).catch(() => null)
    await refresh()
  }, [refresh])

  const markAllAsRead = useCallback(async () => {
    setNotifications([])
    await RestauranteService.marcarNotificacoesLidas(setor).catch(() => null)
    await refresh()
  }, [refresh, setor])

  useEffect(() => {
    refresh()
    const timer = window.setInterval(refresh, 5000)
    return () => window.clearInterval(timer)
  }, [refresh])

  return { notifications, refresh, unreadCount: notifications.length, markAsRead, markAllAsRead }
}
