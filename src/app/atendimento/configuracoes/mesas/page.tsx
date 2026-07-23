'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Grid3X3, Plus, Save } from 'lucide-react'
import { OperationalShell } from '@/components/restaurante/OperationalShell'
import { StatusBadge } from '@/components/restaurante/StatusBadge'
import { RestauranteService, type RestaurantTable, type TableStatus } from '@/services/restaurante'

const statusOptions: TableStatus[] = ['livre', 'ocupada', 'aguardando_fechamento', 'bloqueada']
const empty: Partial<RestaurantTable> = { numero: '', nome: '', capacidade: 4, status: 'livre', ativo: true }

export default function MesasConfigPage() {
  const [mesas, setMesas] = useState<RestaurantTable[]>([])
  const [form, setForm] = useState<Partial<RestaurantTable>>(empty)
  const [loading, setLoading] = useState(false)
  async function load() { setMesas(await RestauranteService.listarMesas()) }
  useEffect(() => { load() }, [])
  async function save() { try { setLoading(true); await RestauranteService.salvarMesa(form); toast.success('Mesa salva.'); setForm(empty); await load() } catch (error: any) { toast.error(error.message ?? 'Erro ao salvar mesa.') } finally { setLoading(false) } }
  async function seed() { try { setLoading(true); await RestauranteService.criarMesasPadrao(12); toast.success('Mesas padrão criadas.'); await load() } catch (error: any) { toast.error(error.message ?? 'Erro ao criar mesas.') } finally { setLoading(false) } }
  return (
    <OperationalShell sector="admin" title="Configuração de mesas" subtitle="Mesas enumeradas para evitar comandas indevidas como balcão">
      <section className="grid gap-5 lg:grid-cols-[390px,1fr]">
        <div className="rounded-[30px] border border-[var(--vf-border)] bg-[var(--vf-card)] p-5 shadow-sm"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-700"><Grid3X3 size={26} /></div><h2 className="mt-4 text-xl font-black text-[var(--vf-text)]">Cadastrar mesa</h2><div className="mt-5 space-y-3"><label><span className="text-xs font-black uppercase text-[var(--vf-text3)]">Número</span><input value={form.numero ?? ''} onChange={(e) => setForm({ ...form, numero: e.target.value })} className="vf-input mt-2" placeholder="01" /></label><label><span className="text-xs font-black uppercase text-[var(--vf-text3)]">Nome</span><input value={form.nome ?? ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="vf-input mt-2" placeholder="Mesa 01" /></label><label><span className="text-xs font-black uppercase text-[var(--vf-text3)]">Capacidade</span><input value={form.capacidade ?? 4} onChange={(e) => setForm({ ...form, capacidade: Number(e.target.value) })} className="vf-input mt-2" type="number" /></label><label><span className="text-xs font-black uppercase text-[var(--vf-text3)]">Status</span><select value={form.status ?? 'livre'} onChange={(e) => setForm({ ...form, status: e.target.value as TableStatus })} className="vf-input mt-2">{statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}</select></label><label className="flex items-center gap-3 rounded-2xl border border-[var(--vf-border)] p-4 text-sm font-bold"><input type="checkbox" checked={form.ativo ?? true} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Ativa</label></div><button onClick={save} disabled={loading} className="vf-btn vf-btn-primary mt-5 w-full"><Save size={16} /> Salvar mesa</button><button onClick={seed} disabled={loading} className="vf-btn vf-btn-ghost mt-2 w-full"><Plus size={16} /> Criar 12 mesas padrão</button></div>
        <div className="rounded-[30px] border border-[var(--vf-border)] bg-[var(--vf-card)] p-5 shadow-sm"><h2 className="text-xl font-black text-[var(--vf-text)]">Mesas cadastradas</h2><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{mesas.map((m) => <button key={m.id} onClick={() => setForm(m)} className="rounded-2xl border border-[var(--vf-border)] bg-[var(--vf-surface2)] p-4 text-left transition hover:bg-blue-50"><div className="flex items-start justify-between"><div><strong className="text-2xl font-black">{m.numero}</strong><p className="text-sm font-bold text-[var(--vf-text3)]">{m.nome}</p></div><StatusBadge status={m.status} /></div><p className="mt-3 text-xs font-bold text-[var(--vf-text3)]">Capacidade: {m.capacidade ?? 4} pessoas</p></button>)}{mesas.length === 0 && <div className="vf-empty md:col-span-2">Nenhuma mesa cadastrada.</div>}</div></div>
      </section>
    </OperationalShell>
  )
}
