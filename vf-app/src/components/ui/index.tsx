'use client'
import { ReactNode, useEffect, useState } from 'react'

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type BtnSize = 'sm' | 'md' | 'lg'

export function Button({ children, onClick, type = 'button', variant = 'primary', size = 'md', disabled, loading, className = '', fullWidth }: { children: ReactNode; onClick?: () => void; type?: 'button'|'submit'|'reset'; variant?: BtnVariant; size?: BtnSize; disabled?: boolean; loading?: boolean; className?: string; fullWidth?: boolean }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all select-none vf-motion'
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' }
  const variants = {
    primary: 'bg-[linear-gradient(135deg,var(--vf-primary),var(--vf-secondary))] hover:brightness-105 text-white shadow-lg shadow-blue-950/10 disabled:opacity-50',
    secondary: 'bg-[color-mix(in_srgb,var(--vf-primary)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--vf-primary)_15%,transparent)] border border-[var(--vf-border)] text-[var(--vf-primary)]',
    ghost: 'text-[var(--vf-text3)] hover:text-[var(--vf-text)] hover:bg-[var(--vf-surface2)]',
    danger: 'bg-[rgba(220,38,38,0.08)] hover:bg-[rgba(220,38,38,0.14)] border border-[rgba(220,38,38,0.25)] text-[#DC2626]',
  }
  return <button type={type} onClick={onClick} disabled={disabled || loading} className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}>{loading && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}{children}</button>
}

export function Modal({ open, onClose, title, children, size = 'md' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'sm'|'md'|'lg'|'xl' }) {
  useEffect(() => { if (!open) return; const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; document.addEventListener('keydown', handler); document.body.style.overflow = 'hidden'; return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = '' } }, [open, onClose])
  if (!open) return null
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"><div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} /><div className={`relative w-full ${widths[size]} bg-[var(--vf-surface)] border border-[var(--vf-border)] rounded-t-3xl md:rounded-2xl shadow-2xl vf-fadein max-h-[92vh] flex flex-col`}><div className="flex items-center justify-between px-5 py-4 border-b border-[var(--vf-border)]"><h2 className="text-[15px] font-semibold text-[var(--vf-text)]">{title}</h2><button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--vf-surface2)] text-[var(--vf-text3)] hover:text-[var(--vf-text)] transition-colors text-lg">✕</button></div><div className="overflow-y-auto flex-1 p-5">{children}</div></div></div>
}

type BadgeColor = 'gold' | 'green' | 'red' | 'blue' | 'amber' | 'gray'
export function Badge({ children, color = 'gold' }: { children: ReactNode; color?: BadgeColor }) {
  const colors = { gold: 'bg-[color-mix(in_srgb,var(--vf-secondary)_18%,transparent)] text-[var(--vf-secondary)] border-[color-mix(in_srgb,var(--vf-secondary)_32%,transparent)]', green: 'bg-[rgba(22,163,74,0.12)] text-[#16A34A] border-[rgba(22,163,74,0.25)]', red: 'bg-[rgba(220,38,38,0.10)] text-[#DC2626] border-[rgba(220,38,38,0.25)]', blue: 'bg-[color-mix(in_srgb,var(--vf-primary)_14%,transparent)] text-[var(--vf-primary)] border-[color-mix(in_srgb,var(--vf-primary)_28%,transparent)]', amber: 'bg-[rgba(217,150,0,0.12)] text-[#D99600] border-[rgba(217,150,0,0.25)]', gray: 'bg-[rgba(100,116,139,0.10)] text-[var(--vf-text3)] border-[rgba(100,116,139,0.18)]' }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${colors[color]}`}>{children}</span>
}

export function Card({ children, className = '', gold, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: ReactNode; gold?: boolean }) {
  return <div {...props} className={`vf-card ${gold ? 'border-[color-mix(in_srgb,var(--vf-secondary)_38%,transparent)]' : ''} ${className}`}>{children}</div>
}

export function KpiCard({ label, value, delta, deltaUp, prefix = '', suffix = '', color = 'gold' }: { label: string; value: string | number; delta?: string; deltaUp?: boolean; prefix?: string; suffix?: string; color?: 'gold'|'green'|'red'|'blue' }) {
  const colors = { gold: 'var(--vf-secondary)', green: '#16A34A', red: '#DC2626', blue: 'var(--vf-primary)' }
  return <div className="vf-card p-4 relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: colors[color], opacity: .7 }} /><div className="text-[10px] text-[var(--vf-text3)] uppercase tracking-wider mb-1.5">{label}</div><div className="text-2xl font-semibold mb-1" style={{ color: colors[color] }}>{prefix}{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}{suffix}</div>{delta && <div className={`text-[11px] flex items-center gap-1 ${deltaUp ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}><span>{deltaUp ? '↑' : '↓'}</span><span>{delta}</span></div>}</div>
}

export function Skeleton({ className = '' }: { className?: string }) { return <div className={`vf-skeleton ${className}`} /> }
export function Empty({ icon = '📭', title, description, action }: { icon?: string; title: string; description?: string; action?: ReactNode }) { return <div className="flex flex-col items-center justify-center py-16 px-4 text-center"><div className="text-5xl mb-4 opacity-35">{icon}</div><div className="text-[15px] font-semibold text-[var(--vf-text)] mb-2">{title}</div>{description && <div className="text-[13px] text-[var(--vf-text3)] mb-5 max-w-xs">{description}</div>}{action}</div> }
export function Field({ label, required, children, hint, className = '' }: { label: string; required?: boolean; children: ReactNode; hint?: string; className?: string }) { return <div className={`flex flex-col gap-1.5 ${className}`}><label className="text-[11px] font-semibold text-[var(--vf-text3)] uppercase tracking-wide">{label}{required && <span className="text-[#DC2626] ml-0.5">*</span>}</label>{children}{hint && <span className="text-[11px] text-[var(--vf-text3)]">{hint}</span>}</div> }
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={`vf-input ${props.className ?? ''}`} /> }
export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) { return <select {...props} className={`vf-input appearance-none cursor-pointer ${props.className ?? ''}`} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23667085'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>{children}</select> }
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...props} className={`vf-input resize-y min-h-[80px] ${props.className ?? ''}`} /> }
export function Divider({ label }: { label?: string }) { if (!label) return <div className="h-px bg-[var(--vf-border)] my-4" />; return <div className="flex items-center gap-3 my-4"><div className="flex-1 h-px bg-[var(--vf-border)]" /><span className="text-[10px] text-[var(--vf-text3)] uppercase tracking-widest">{label}</span><div className="flex-1 h-px bg-[var(--vf-border)]" /></div> }
export function Alert({ type, children }: { type: 'info'|'warn'|'error'|'success'; children: ReactNode }) { const styles = { info: { bg: 'rgba(10,141,255,0.08)', border: 'rgba(10,141,255,0.25)', icon: 'ℹ️' }, warn: { bg: 'rgba(242,183,46,0.10)', border: 'rgba(242,183,46,0.30)', icon: '⚠️' }, error: { bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.25)', icon: '✕' }, success: { bg: 'rgba(22,163,74,0.10)', border: 'rgba(22,163,74,0.25)', icon: '✓' } }; const s = styles[type]; return <div className="flex items-start gap-2.5 p-3 rounded-2xl text-[13px] text-[var(--vf-text)]" style={{ background: s.bg, border: `1px solid ${s.border}` }}><span className="flex-shrink-0">{s.icon}</span><div>{children}</div></div> }


export function ConfirmActionButton({
  children,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  requireReason = false,
  reasonLabel = 'Motivo obrigatório',
  reasonPlaceholder = 'Descreva o motivo desta ação',
  onConfirm,
  variant = 'danger',
  size = 'sm',
  disabled,
  loading,
  className = '',
}: {
  children: ReactNode
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  requireReason?: boolean
  reasonLabel?: string
  reasonPlaceholder?: string
  onConfirm: (reason?: string) => void | Promise<void>
  variant?: BtnVariant
  size?: BtnSize
  disabled?: boolean
  loading?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const canSubmit = !requireReason || reason.trim().length >= 5

  async function handleConfirm() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await onConfirm(reason.trim() || undefined)
      setOpen(false)
      setReason('')
    } finally {
      setSubmitting(false)
    }
  }

  return <>
    <Button size={size} variant={variant} disabled={disabled || loading} loading={loading} className={className} onClick={() => setOpen(true)}>{children}</Button>
    <Modal open={open} onClose={() => !submitting && setOpen(false)} title={title} size="md">
      <div className="space-y-4">
        {description && <Alert type="warn">{description}</Alert>}
        {requireReason && <Field label={reasonLabel} required hint="Mínimo de 5 caracteres para auditoria."><Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder={reasonPlaceholder} /></Field>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>{cancelLabel}</Button>
          <Button variant={variant} onClick={handleConfirm} disabled={!canSubmit} loading={submitting}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  </>
}
