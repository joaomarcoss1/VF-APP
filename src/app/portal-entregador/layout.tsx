import type { ReactNode } from 'react'

export default function PortalEntregadorLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-[#070A0F] text-white">{children}</div>
}
