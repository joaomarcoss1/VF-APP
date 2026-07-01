'use client'
import { useEffect } from 'react'
import BrandLogo from '@/components/BrandLogo'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await getSupabase().auth.getSession()
      router.replace(session ? '/dashboard' : '/auth')
    }
    check()
  }, [router])

  return (
    <div className="flex items-center justify-center h-screen bg-[radial-gradient(circle_at_30%_20%,rgba(10,141,255,.16),transparent_34%),radial-gradient(circle_at_70%_70%,rgba(242,183,46,.16),transparent_32%),#F5F8FC]">
      <div className="flex flex-col items-center gap-5 vf-fadein">
        <div className="vf-logo-soft w-44 h-44 flex items-center justify-center p-6">
          <BrandLogo src="/nexlabs-logo-full.png" alt="VF Nexus" variant="full" width={150} height={150} className="w-full h-full object-contain drop-shadow-xl" />
        </div>
        <div className="text-center">
          <div className="vf-nex-text font-extrabold tracking-[0.20em] text-lg uppercase">VF Nexus</div>
          <div className="text-slate-500 text-xs mt-1 tracking-[0.28em] uppercase">Criado pela NexLabs</div>
        </div>
        <div className="w-10 h-10 border-2 border-[#0A8DFF] border-t-[#F2B72E] rounded-full animate-spin" />
      </div>
    </div>
  )
}
