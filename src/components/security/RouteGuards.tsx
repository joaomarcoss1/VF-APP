'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getTenantContext, type PapelUsuario } from '@/services/_tenant'
import { v15RoleLabel } from '@/lib/v15-security'

function GuardShell({ children, allowed, redirect }: { children: React.ReactNode; allowed: PapelUsuario[]; redirect: string }) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [message, setMessage] = useState('Validando acesso...')
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let alive = true
    getTenantContext()
      .then(ctx => {
        if (!alive) return
        setChecked(true)
        if (allowed.includes(ctx.papel)) {
          setAuthorized(true)
          return
        }
        setMessage(`Redirecionando ${v15RoleLabel(ctx.papel)} para área permitida...`)
        router.replace(redirect)
      })
      .catch(() => { setChecked(true); router.replace('/login') })
    return () => { alive = false }
  }, [allowed, redirect, router])

  if (!authorized) return <main className="min-h-dvh flex items-center justify-center bg-[var(--vf-bg)] p-6"><div className="vf-card p-6 text-sm text-[var(--vf-text2)]">{checked ? message : 'Validando acesso...'}</div></main>
  return <>{children}</>
}

export function MasterRouteGuard({ children }: { children: React.ReactNode }) {
  return <GuardShell allowed={['super_admin']} redirect="/dashboard">{children}</GuardShell>
}

export function CompanyAdminGuard({ children }: { children: React.ReactNode }) {
  return <GuardShell allowed={['empresa_admin', 'super_admin']} redirect="/dashboard">{children}</GuardShell>
}

export function EmployeePermissionGuard({ children }: { children: React.ReactNode }) {
  return <GuardShell allowed={['empresa_admin', 'gerente', 'funcionario', 'super_admin']} redirect="/login">{children}</GuardShell>
}

export function DriverPortalGuard({ children }: { children: React.ReactNode }) {
  return <GuardShell allowed={['driver']} redirect="/dashboard">{children}</GuardShell>
}

export function AuthRequiredGuard({ children }: { children: React.ReactNode }) {
  return <GuardShell allowed={['super_admin', 'empresa_admin', 'gerente', 'funcionario', 'driver']} redirect="/login">{children}</GuardShell>
}
