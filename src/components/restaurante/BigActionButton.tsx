import type { LucideIcon } from 'lucide-react'

export function BigActionButton({ icon: Icon, title, description, tone = 'blue', onClick, href }: { icon: LucideIcon; title: string; description: string; tone?: 'blue' | 'gold' | 'green' | 'red' | 'dark'; onClick?: () => void; href?: string }) {
  const toneMap = {
    blue: 'from-blue-600 to-sky-500 text-white shadow-blue-600/25',
    gold: 'from-amber-400 to-yellow-300 text-[var(--vf-text)] shadow-amber-500/20',
    green: 'from-emerald-600 to-green-500 text-white shadow-emerald-600/20',
    red: 'from-red-600 to-rose-500 text-white shadow-red-600/20',
    dark: 'from-slate-950 to-slate-800 text-white shadow-slate-950/20',
  }
  const content = (
    <div className={`group flex min-h-[128px] w-full items-center gap-4 rounded-[26px] bg-gradient-to-br p-5 text-left shadow-xl transition duration-200 hover:-translate-y-1 hover:shadow-2xl active:scale-[.985] ${toneMap[tone]}`}>
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--vf-card)]/[.18] ring-1 ring-white/30 backdrop-blur"><Icon size={27} /></div>
      <div>
        <strong className="block text-lg font-black">{title}</strong>
        <span className="mt-1 block text-sm font-semibold opacity-[.82]">{description}</span>
      </div>
    </div>
  )
  if (href) return <a href={href}>{content}</a>
  return <button type="button" onClick={onClick} className="w-full">{content}</button>
}
