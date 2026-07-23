'use client'

import Link, { type LinkProps } from 'next/link'
import {
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react'

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type BtnSize = 'sm' | 'md' | 'lg'
const buttonClasses = (variant: BtnVariant, size: BtnSize, fullWidth: boolean, className: string) =>
  `vf-button vf-button-${variant} vf-button-${size} ${fullWidth ? 'w-full' : ''} ${className}`.trim()

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant
  size?: BtnSize
  loading?: boolean
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, variant = 'primary', size = 'md', loading = false, fullWidth = false, className = '', disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant as BtnVariant, size as BtnSize, fullWidth, className)}
      {...props}
    >
      {loading ? <Loader2 className="vf-spinner" size={16} aria-hidden="true" /> : null}
      <span className="vf-button-label">{children}</span>
    </button>
  )
})

export function ButtonLink({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}: LinkProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'size'> & { children: ReactNode; variant?: BtnVariant; size?: BtnSize; fullWidth?: boolean }) {
  return <Link className={buttonClasses(variant, size, fullWidth, className)} {...props}><span className="vf-button-label">{children}</span></Link>
}

export function IconButton({ label, children, className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <button type={type} aria-label={label} title={label} className={`vf-icon-button ${className}`} {...props}>{children}</button>
}

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function Modal({ open, onClose, title, children, size = 'md' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const titleId = useId()
  const modalRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const modal = modalRef.current
    const focusables = (): HTMLElement[] => Array.from(modal?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    queueMicrotask(() => (focusables()[0] || modal)?.focus())
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
      if (event.key !== 'Tab') return
      const items = focusables()
      if (!items.length) { event.preventDefault(); modal?.focus(); return }
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handler)
      previousFocus?.focus?.()
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="vf-modal-root">
      <div className="vf-modal-overlay" aria-hidden="true" onMouseDown={onClose} />
      <section ref={modalRef} tabIndex={-1} className={`vf-modal vf-modal-${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="vf-modal-header">
          <NameDisplay value={title} as="h2" className="vf-modal-title" />
          <span id={titleId} className="sr-only">{title}</span>
          <IconButton label="Fechar" onClick={onClose}><X size={18} /></IconButton>
        </header>
        <div className="vf-modal-body">{children}</div>
      </section>
    </div>
  )
}

export function Badge({ children, color = 'gold' }: { children: ReactNode; color?: 'gold' | 'green' | 'red' | 'blue' | 'amber' | 'gray' }) {
  return <span className={`vf-badge vf-badge-${color}`}>{children}</span>
}
export function Card({ children, className = '', gold, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode; gold?: boolean }) {
  return <div {...props} className={`vf-card ${gold ? 'vf-card-accent' : ''} ${className}`}>{children}</div>
}
export function Panel(props: HTMLAttributes<HTMLDivElement>) { return <div {...props} className={`vf-panel ${props.className ?? ''}`} /> }
export function KpiCard({ label, value, delta, deltaUp, prefix = '', suffix = '', color = 'gold' }: { label: string; value: string | number; delta?: string; deltaUp?: boolean; prefix?: string; suffix?: string; color?: 'gold' | 'green' | 'red' | 'blue' }) {
  return <Card className={`vf-kpi vf-kpi-${color}`}><NameDisplay value={label} className="vf-kpi-label" /><div className="vf-kpi-value">{prefix}{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}{suffix}</div>{delta ? <div className={`vf-kpi-delta ${deltaUp ? 'is-up' : 'is-down'}`}>{deltaUp ? '↑' : '↓'} {delta}</div> : null}</Card>
}
export function Skeleton({ className = '' }: { className?: string }) { return <div className={`vf-skeleton ${className}`} aria-hidden="true" /> }
export function Empty({ icon = '📭', title, description, action }: { icon?: string; title: string; description?: string; action?: ReactNode }) { return <div className="vf-empty-state"><div className="vf-empty-icon" aria-hidden="true">{icon}</div><NameDisplay value={title} as="h3" />{description ? <p>{description}</p> : null}{action}</div> }
export const EmptyState = Empty
export function ErrorState({ title = 'Não foi possível carregar', description, onRetry }: { title?: string; description?: string; onRetry?: () => void }) { return <div className="vf-error-state"><AlertCircle size={28} /><NameDisplay value={title} as="h3" /><p>{description || 'Tente novamente em instantes.'}</p>{onRetry ? <Button onClick={onRetry}>Tentar novamente</Button> : null}</div> }

export function Field({ label, required, children, hint, error, className = '', id: providedId }: { label: string; required?: boolean; children: ReactNode; hint?: string; error?: string; className?: string; id?: string }) {
  const generatedId = useId()
  const id = providedId || `vf-field-${generatedId.replace(/:/g, '')}`
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = error ? errorId : hint ? hintId : undefined
  const child = isValidElement(children)
    ? cloneElement(children as ReactElement<any>, {
      id: (children.props as any).id || id,
      'aria-invalid': error ? true : (children.props as any)['aria-invalid'],
      'aria-describedby': describedBy || (children.props as any)['aria-describedby'],
      required: required || (children.props as any).required,
    })
    : children
  return <div className={`vf-field ${className}`}><label htmlFor={id}>{label}{required ? <span aria-hidden="true"> *</span> : null}</label>{child}{error ? <span id={errorId} className="vf-field-error" role="alert">{error}</span> : hint ? <span id={hintId} className="vf-field-hint">{hint}</span> : null}</div>
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(props, ref) { return <input ref={ref} {...props} className={`vf-input ${props.className ?? ''}`} /> })
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ children, ...props }, ref) { return <select ref={ref} {...props} className={`vf-select ${props.className ?? ''}`}>{children}</select> })
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(props, ref) { return <textarea ref={ref} {...props} className={`vf-textarea ${props.className ?? ''}`} /> })
export function Divider({ label }: { label?: string }) { return label ? <div className="vf-divider"><span />{label}<span /></div> : <div className="vf-divider-line" /> }
export function Alert({ type, children }: { type: 'info' | 'warn' | 'error' | 'success'; children: ReactNode }) { return <div className={`vf-alert vf-alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>{children}</div> }
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) { return <div className="vf-page-header"><div className="vf-page-header-copy"><NameDisplay value={title} as="h1" />{description ? <p>{description}</p> : null}</div>{actions ? <div className="vf-page-actions">{actions}</div> : null}</div> }
export function TruncatedText({ value, className = '', title }: { value: ReactNode; className?: string; title?: string }) { const text = typeof value === 'string' ? value : title; return <span className={`vf-truncated ${className}`} title={text}>{value}</span> }
export function ResponsiveText({ value, className = '', lines = 2 }: { value: ReactNode; className?: string; lines?: number }) { return <span className={`vf-responsive-text ${className}`} style={{ WebkitLineClamp: lines }} title={typeof value === 'string' ? value : undefined}>{value}</span> }
export function NameDisplay({ value, as = 'span', className = '' }: { value: ReactNode; as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3'; className?: string }) { const Tag = as; const text = typeof value === 'string' ? value : undefined; return <Tag className={`vf-name ${className}`} title={text}>{value}</Tag> }
export function CurrencyDisplay({ value, className = '' }: { value: number | string | null | undefined; className?: string }) { return <span className={`vf-currency ${className}`}>{Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> }
export function PhoneDisplay({ value, className = '' }: { value?: string | null; className?: string }) { const digits = String(value || '').replace(/\D/g, '').replace(/^55/, ''); const formatted = digits.length === 11 ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}` : digits.length === 10 ? `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}` : value || '—'; return <span className={className}>{formatted}</span> }
export function DocumentNumberDisplay({ value, className = '' }: { value?: string | null; className?: string }) { return <TruncatedText value={value || '—'} className={`font-mono ${className}`} /> }
export function SearchInput({ value, onChange, placeholder = 'Buscar...', onClear, className = '' }: { value: string; onChange: (value: string) => void; placeholder?: string; onClear?: () => void; className?: string }) { return <div className={`vf-search ${className}`}><Search size={17} aria-hidden="true" /><input aria-label={placeholder} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />{value ? <IconButton label="Limpar busca" onClick={() => { onChange(''); onClear?.() }}><X size={16} /></IconButton> : null}</div> }
export function Pagination({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (page: number) => void }) { const pages = Math.max(1, Math.ceil(total / pageSize)); if (total <= pageSize) return null; return <nav className="vf-pagination" aria-label="Paginação"><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={16} />Anterior</Button><span aria-live="polite">Página {page} de {pages}</span><Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Próxima<ChevronRight size={16} /></Button></nav> }

export function ConfirmActionButton({ children, title, description, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', requireReason = false, reasonLabel = 'Motivo obrigatório', reasonPlaceholder = 'Descreva o motivo desta ação', onConfirm, variant = 'danger', size = 'sm', disabled, loading, className = '' }: { children: ReactNode; title: string; description?: ReactNode; confirmLabel?: string; cancelLabel?: string; requireReason?: boolean; reasonLabel?: string; reasonPlaceholder?: string; onConfirm: (reason?: string) => void | Promise<void>; variant?: BtnVariant; size?: BtnSize; disabled?: boolean; loading?: boolean; className?: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submit = async () => {
    if (requireReason && !reason.trim()) return
    setSubmitting(true)
    try { await onConfirm(reason.trim() || undefined); setOpen(false); setReason('') } finally { setSubmitting(false) }
  }
  return <><Button variant={variant} size={size} disabled={disabled} loading={loading} className={className} onClick={() => setOpen(true)}>{children}</Button><Modal open={open} onClose={() => !submitting && setOpen(false)} title={title} size="sm"><div className="vf-confirm">{description ? <div>{description}</div> : null}{requireReason ? <Field label={reasonLabel} required><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder={reasonPlaceholder} /></Field> : null}<div className="vf-confirm-actions"><Button variant="secondary" disabled={submitting} onClick={() => setOpen(false)}>{cancelLabel}</Button><Button variant={variant} loading={submitting} disabled={requireReason && !reason.trim()} onClick={submit}>{confirmLabel}</Button></div></div></Modal></>
}
