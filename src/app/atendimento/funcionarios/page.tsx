'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Save, UserRound, UsersRound } from 'lucide-react'
import { OperationalShell } from '@/components/restaurante/OperationalShell'
import { RestauranteService, type RestaurantStaff, type StaffSector } from '@/services/restaurante'

const setores: Array<{ value: StaffSector; label: string }> = [
  { value: 'atendimento', label: 'Atendimento' },
  { value: 'cozinha', label: 'Cozinha' },
  { value: 'bar_drinks', label: 'Bar / Drinks' },
  { value: 'caixa', label: 'Caixa' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'admin', label: 'Admin' },
]

const emptyForm: Partial<RestaurantStaff> = { nome: '', cpf: '', setor: 'atendimento', cargo: '', ativo: true }

export default function FuncionariosAtendimentoPage() {
  const [staff, setStaff] = useState<RestaurantStaff[]>([])
  const [form, setForm] = useState<Partial<RestaurantStaff>>(emptyForm)
  const [loading, setLoading] = useState(false)

  async function load() { setStaff(await RestauranteService.listarFuncionarios()) }
  useEffect(() => { load() }, [])

  async function save() {
    try {
      setLoading(true)
      await RestauranteService.salvarFuncionario(form)
      toast.success('Funcionário salvo e vinculado ao setor.')
      setForm(emptyForm)
      await load()
    } catch (error: any) { toast.error(error.message ?? 'Erro ao salvar funcionário.') } finally { setLoading(false) }
  }

  return (
    <OperationalShell sector="admin" title="Funcionários do VF Nexus Atendimento" subtitle="Cadastro simples por nome, CPF e setor operacional">
      <section className="grid gap-5 lg:grid-cols-[420px,1fr]">
        <div className="rounded-[30px] border border-[var(--vf-border)] bg-[var(--vf-card)] p-5 shadow-sm">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-700"><UserRound size={25} /></div>
          <h2 className="mt-4 text-xl font-black text-[var(--vf-text)]">Cadastrar funcionário</h2>
          <p className="mt-1 text-sm font-semibold text-[var(--vf-text3)]">O funcionário poderá entrar pelo login operacional usando nome completo e CPF.</p>
          <div className="mt-5 space-y-3">
            <label><span className="text-xs font-black uppercase text-[var(--vf-text3)]">Nome completo</span><input value={form.nome ?? ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="vf-input mt-2" placeholder="Ex.: Maria Oliveira" /></label>
            <label><span className="text-xs font-black uppercase text-[var(--vf-text3)]">CPF</span><input value={form.cpf ?? ''} onChange={(e) => setForm({ ...form, cpf: e.target.value })} className="vf-input mt-2" placeholder="000.000.000-00" /></label>
            <label><span className="text-xs font-black uppercase text-[var(--vf-text3)]">Setor</span><select value={form.setor ?? 'atendimento'} onChange={(e) => setForm({ ...form, setor: e.target.value as StaffSector })} className="vf-input mt-2">{setores.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
            <label><span className="text-xs font-black uppercase text-[var(--vf-text3)]">Cargo opcional</span><input value={form.cargo ?? ''} onChange={(e) => setForm({ ...form, cargo: e.target.value })} className="vf-input mt-2" placeholder="Garçom, operador de caixa..." /></label>
            <label className="flex items-center gap-3 rounded-2xl border border-[var(--vf-border)] p-4 text-sm font-bold"><input type="checkbox" checked={form.ativo ?? true} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Funcionário ativo</label>
          </div>
          <button onClick={save} disabled={loading} className="vf-btn vf-btn-primary mt-5 w-full"><Save size={16} /> {loading ? 'Salvando...' : 'Salvar funcionário'}</button>
        </div>
        <div className="rounded-[30px] border border-[var(--vf-border)] bg-[var(--vf-card)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black text-[var(--vf-text)]">Equipe cadastrada</h2><p className="text-sm font-semibold text-[var(--vf-text3)]">Separação por setor, com isolamento por empresa.</p></div><button onClick={() => setForm(emptyForm)} className="vf-btn vf-btn-ghost"><Plus size={15} /> Novo</button></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {staff.map((item) => <button key={item.id} onClick={() => setForm(item)} className="rounded-2xl border border-[var(--vf-border)] bg-[var(--vf-surface2)] p-4 text-left transition hover:border-blue-200 hover:bg-blue-50"><div className="flex items-start justify-between gap-3"><div><strong className="block text-[var(--vf-text)]">{item.nome}</strong><span className="text-xs font-bold text-[var(--vf-text3)]">CPF: {item.cpf ?? item.cpf_normalizado}</span></div><span className={`rounded-full px-3 py-1 text-xs font-black ${item.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{item.ativo ? 'Ativo' : 'Inativo'}</span></div><div className="mt-3 inline-flex rounded-full bg-[var(--vf-card)] px-3 py-1 text-xs font-black uppercase text-blue-700">{item.setor}</div></button>)}
            {staff.length === 0 && <div className="vf-empty md:col-span-2"><UsersRound size={22} /><strong className="mt-2 block">Nenhum funcionário cadastrado.</strong><p className="text-sm text-[var(--vf-text3)]">Cadastre a equipe por setor para liberar o login operacional.</p></div>}
          </div>
        </div>
      </section>
    </OperationalShell>
  )
}
