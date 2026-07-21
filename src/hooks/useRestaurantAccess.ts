'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RestaurantSector, StaffSector } from '@/services/restaurante'

type AccessState = {
  staffId: string | null
  staffName: string | null
  staffSector: StaffSector | null
  isOperationalLogin: boolean
  isManager: boolean
  isAdmin: boolean
}

function normalizeSector(value: string | null): StaffSector | null {
  if (value === 'atendimento' || value === 'cozinha' || value === 'bar_drinks' || value === 'caixa' || value === 'gerente' || value === 'admin') return value
  if (value === 'bar' || value === 'drinks') return 'bar_drinks'
  return null
}

export function sectorHome(sector: StaffSector | RestaurantSector | null) {
  if (sector === 'cozinha') return '/cozinha'
  if (sector === 'bar_drinks') return '/bar-drinks'
  if (sector === 'caixa') return '/atendimento/caixa'
  if (sector === 'gerente' || sector === 'admin') return '/setor'
  return '/atendimento'
}

export function canAccessSector(staffSector: StaffSector | null, requested: RestaurantSector) {
  if (!staffSector) return true
  if (staffSector === 'gerente' || staffSector === 'admin') return true
  if (requested === 'gerente' || requested === 'admin') return false
  return staffSector === requested
}

export function useRestaurantAccess(requiredSector?: RestaurantSector) {
  const router = useRouter()
  const [state, setState] = useState<AccessState>({ staffId: null, staffName: null, staffSector: null, isOperationalLogin: false, isManager: false, isAdmin: false })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const staffId = window.localStorage.getItem('vf_nexus_staff_id')
    const staffName = window.localStorage.getItem('vf_nexus_staff_nome')
    const staffSector = normalizeSector(window.localStorage.getItem('vf_nexus_staff_setor'))
    const next = { staffId, staffName, staffSector, isOperationalLogin: Boolean(staffId), isManager: staffSector === 'gerente', isAdmin: staffSector === 'admin' }
    setState(next)
    setReady(true)
    if (requiredSector && staffId && !canAccessSector(staffSector, requiredSector)) router.replace(sectorHome(staffSector))
  }, [requiredSector, router])

  return useMemo(() => ({ ...state, ready, canAccess: (sector: RestaurantSector) => canAccessSector(state.staffSector, sector) }), [ready, state])
}

export function clearOperationalLogin() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem('vf_nexus_staff_id')
  window.localStorage.removeItem('vf_nexus_staff_nome')
  window.localStorage.removeItem('vf_nexus_staff_setor')
  window.localStorage.removeItem('vf_nexus_staff_session_id')
}

