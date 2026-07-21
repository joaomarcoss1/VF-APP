import type { OrdemServico, OrcamentoServico } from '@/types'
import { calcularOrdemServico, validarMotivoObrigatorio } from '@/lib/business-rules'
import { getEmpresaIdObrigatoria } from './_tenant'
import { db, hojeISO, normalizeError, withEmpresa, assertPermission, type AnyRecord } from './_base'
import { AuditoriaService } from './auditoria'

export const OrdensServicoService = {
  async listar(limit = 100): Promise<OrdemServico[]> {
    const empresaId = await getEmpresaIdObrigatoria()
    const { data, error } = await db().from('ordens_servico').select('*, cliente:clientes(*)').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(limit)
    if (error) throw normalizeError(error, 'Erro ao listar ordens de serviço.')
    return (data ?? []) as OrdemServico[]
  },

  async buscarCompleta(id: string) {
    await assertPermission('ordens-servico', 'ver')
    const [{ data: os, error }, checklist, materiais, fotos, assinaturas] = await Promise.all([
      db().from('ordens_servico').select('*, cliente:clientes(*)').eq('empresa_id', await getEmpresaIdObrigatoria()).eq('id', id).maybeSingle(),
      db().from('ordens_servico_checklist').select('*').eq('empresa_id', await getEmpresaIdObrigatoria()).eq('ordem_servico_id', id).order('ordem'),
      db().from('ordens_servico_materiais').select('*').eq('empresa_id', await getEmpresaIdObrigatoria()).eq('ordem_servico_id', id).order('created_at'),
      db().from('ordens_servico_fotos').select('*').eq('empresa_id', await getEmpresaIdObrigatoria()).eq('ordem_servico_id', id).order('created_at', { ascending: false }),
      db().from('ordens_servico_assinaturas').select('*').eq('empresa_id', await getEmpresaIdObrigatoria()).eq('ordem_servico_id', id).order('assinado_em', { ascending: false }),
    ])
    if (error) throw normalizeError(error, 'Erro ao buscar OS.')
    return { os, checklist: checklist.data ?? [], materiais: materiais.data ?? [], fotos: fotos.data ?? [], assinaturas: assinaturas.data ?? [] }
  },

  async criar(form: Partial<OrdemServico> & { titulo: string }): Promise<OrdemServico> {
    await assertPermission('ordens-servico', 'criar')
    const calculo = calcularOrdemServico({ valor_servico: Number(form.valor_orcado || form.valor_final || 0), valor_materiais: Array.isArray((form as AnyRecord).materiais) ? (form as AnyRecord).materiais.reduce((a: number, m: AnyRecord) => a + Number(m.custo || m.custo_total || 0), 0) : 0, checklist: (form as AnyRecord).checklist || [] })
    const payload = await withEmpresa({ ...form, valor_final: form.valor_final ?? calculo.total, status: form.status || 'orcamento', data_abertura: form.data_abertura || hojeISO(), checklist: (form as AnyRecord).checklist || [], materiais: (form as AnyRecord).materiais || [], fotos: (form as AnyRecord).fotos || [], assinaturas: (form as AnyRecord).assinaturas || [] } as AnyRecord)
    const { data, error } = await db().from('ordens_servico').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao criar ordem de serviço.')
    await AuditoriaService.registrar('ordem_servico.criar', 'ordens_servico', data.id, { titulo: data.titulo, status: data.status, valor_final: data.valor_final }).catch(() => null)
    return data as OrdemServico
  },

  async atualizar(id: string, form: Partial<OrdemServico>): Promise<OrdemServico> {
    await assertPermission('ordens-servico', 'editar')
    const { data, error } = await db().from('ordens_servico').update({ ...form, updated_at: new Date().toISOString() }).eq('empresa_id', await getEmpresaIdObrigatoria()).eq('id', id).select().single()
    if (error) throw normalizeError(error, 'Erro ao atualizar OS.')
    await AuditoriaService.registrar('ordem_servico.editar', 'ordens_servico', id, { campos: Object.keys(form) }).catch(() => null)
    return data as OrdemServico
  },

  async atualizarStatus(id: string, status: OrdemServico['status'], motivo?: string): Promise<void> {
    await assertPermission('ordens-servico', ['cancelada','cancelado'].includes(String(status)) ? 'cancelar' : 'editar')
    const patch: AnyRecord = { status, updated_at: new Date().toISOString() }
    if (['finalizada','concluido','concluído','entregue'].includes(String(status))) patch.data_finalizacao = hojeISO()
    if (['cancelada','cancelado'].includes(String(status))) patch.observacoes = validarMotivoObrigatorio(motivo, 'cancelar OS')
    const { error } = await db().from('ordens_servico').update(patch).eq('empresa_id', await getEmpresaIdObrigatoria()).eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao atualizar ordem de serviço.')
    await AuditoriaService.registrar('ordem_servico.status', 'ordens_servico', id, { status, motivo }).catch(() => null)
  },

  async aprovarOrcamento(id: string): Promise<void> {
    await assertPermission('ordens-servico', 'aprovar')
    await this.atualizarStatus(id, 'aprovada' as OrdemServico['status'])
  },

  async criarOrcamento(form: Partial<OrcamentoServico> & { titulo: string }): Promise<OrcamentoServico> {
    await assertPermission('ordens-servico', 'criar')
    const calculo = calcularOrdemServico({ valor_servico: form.valor_servico, valor_materiais: form.valor_materiais, desconto: form.desconto, taxa_deslocamento: form.taxa_deslocamento })
    const payload = await withEmpresa({ ...form, valor_servico: calculo.valor_servico, valor_materiais: calculo.valor_materiais, taxa_deslocamento: calculo.taxa_deslocamento, desconto: calculo.desconto, valor_total: calculo.total, status: form.status || 'rascunho' } as AnyRecord)
    const { data, error } = await db().from('orcamentos_servico').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao criar orçamento de serviço.')
    await AuditoriaService.registrar('ordem_servico.orcamento.criar', 'orcamentos_servico', data.id, { valor_total: data.valor_total }).catch(() => null)
    return data as OrcamentoServico
  },

  async salvarChecklist(ordemServicoId: string, itens: Array<{ titulo: string; concluido?: boolean; ordem?: number }>) {
    await assertPermission('ordens-servico', 'editar')
    const empresaPayloads = await Promise.all(itens.map((item, index) => withEmpresa({ ordem_servico_id: ordemServicoId, titulo: item.titulo, concluido: Boolean(item.concluido), concluido_em: item.concluido ? new Date().toISOString() : null, ordem: item.ordem ?? index } as AnyRecord)))
    await db().from('ordens_servico_checklist').delete().eq('empresa_id', await getEmpresaIdObrigatoria()).eq('ordem_servico_id', ordemServicoId)
    const { error } = empresaPayloads.length ? await db().from('ordens_servico_checklist').insert(empresaPayloads) : { error: null }
    if (error) throw normalizeError(error, 'Erro ao salvar checklist da OS.')
    await AuditoriaService.registrar('ordem_servico.checklist.salvar', 'ordens_servico', ordemServicoId, { itens: itens.length }).catch(() => null)
  },

  async adicionarMaterial(ordemServicoId: string, material: { nome: string; quantidade: number; custo_unitario?: number; produto_id?: string; insumo_id?: string; baixar_estoque?: boolean }) {
    await assertPermission('ordens-servico', 'editar')
    const payload = await withEmpresa({ ...material, ordem_servico_id: ordemServicoId, custo_total: Number(material.quantidade || 0) * Number(material.custo_unitario || 0), baixar_estoque: material.baixar_estoque ?? true } as AnyRecord)
    const { data, error } = await db().from('ordens_servico_materiais').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao adicionar material à OS.')
    await AuditoriaService.registrar('ordem_servico.material.adicionar', 'ordens_servico_materiais', data.id, { ordem_servico_id: ordemServicoId, nome: material.nome }).catch(() => null)
    return data
  },

  async anexarFoto(ordemServicoId: string, foto: { storage_path: string; descricao?: string; tipo?: string }) {
    await assertPermission('ordens-servico', 'editar')
    const payload = await withEmpresa({ ...foto, ordem_servico_id: ordemServicoId } as AnyRecord)
    const { data, error } = await db().from('ordens_servico_fotos').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao anexar foto à OS.')
    await AuditoriaService.registrar('ordem_servico.foto.anexar', 'ordens_servico_fotos', data.id, { ordem_servico_id: ordemServicoId }).catch(() => null)
    return data
  },

  async registrarAssinatura(ordemServicoId: string, assinatura: { nome: string; papel?: string; assinatura_url?: string }) {
    await assertPermission('ordens-servico', 'editar')
    const payload = await withEmpresa({ ...assinatura, ordem_servico_id: ordemServicoId } as AnyRecord)
    const { data, error } = await db().from('ordens_servico_assinaturas').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao registrar assinatura da OS.')
    await AuditoriaService.registrar('ordem_servico.assinatura.registrar', 'ordens_servico_assinaturas', data.id, { ordem_servico_id: ordemServicoId, nome: assinatura.nome }).catch(() => null)
    return data
  },

  async finalizar(id: string, motivo?: string): Promise<string | null> {
    await assertPermission('ordens-servico', 'editar')
    const { data, error } = await db().rpc('vf_finalizar_ordem_servico', { p_os_id: id, p_motivo: motivo ?? null })
    if (error) throw normalizeError(error, 'Erro ao finalizar OS.')
    await AuditoriaService.registrar('ordem_servico.finalizar.service', 'ordens_servico', id, { conta_receber_id: data }).catch(() => null)
    return data ? String(data) : null
  },
}
