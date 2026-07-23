'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthRedirectPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/login') }, [router])
  return <main className="min-h-dvh flex items-center justify-center text-sm text-[var(--vf-text3)]">Redirecionando para login seguro...</main>
}
