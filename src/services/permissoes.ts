export * from '@/lib/rbac'
import { can, type AcaoPermissao } from '@/lib/rbac'
import type { FeatureKey } from '@/lib/modules'
import { getPerfilAtual } from './_base'

export const PermissoesService = {
  async pode(modulo: FeatureKey, acao: AcaoPermissao = 'ver') {
    return can(await getPerfilAtual(), modulo, acao)
  },
}
