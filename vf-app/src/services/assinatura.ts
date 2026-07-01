import type { Assinatura } from '@/types'
import { db, getEmpresaId, normalizeError } from './_base'

export const AssinaturaService = {
  async minhaAssinatura(): Promise<Assinatura | null> {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('assinaturas').select('*').eq('empresa_id', empresaId).maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao carregar assinatura.')
    return (data as Assinatura | null) ?? null
  },
}
