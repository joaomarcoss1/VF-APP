import { gerarStoragePath } from '@/lib/integration-rules'
import { assertPermission, db, getEmpresaId, normalizeError, type AnyRecord } from './_base'
import { AuditoriaService } from './auditoria'

export type StorageBucketVF = 'vf-comprovantes' | 'vf-os-anexos' | 'vf-assinaturas' | 'vf-branding' | 'vf-relatorios'

const bucketModule: Record<StorageBucketVF, { modulo: any; acao: any }> = {
  'vf-comprovantes': { modulo: 'comprovantes', acao: 'criar' },
  'vf-os-anexos': { modulo: 'ordens-servico', acao: 'editar' },
  'vf-assinaturas': { modulo: 'ordens-servico', acao: 'editar' },
  'vf-branding': { modulo: 'configuracoes', acao: 'editar' },
  'vf-relatorios': { modulo: 'relatorios', acao: 'exportar' },
}

export const StorageService = {
  async path(bucket: StorageBucketVF, nomeArquivo: string, modulo?: string) {
    const empresaId = await getEmpresaId()
    return gerarStoragePath(empresaId, modulo || bucket.replace('vf-', ''), nomeArquivo)
  },

  async upload(bucket: StorageBucketVF, file: File | Blob, nomeArquivo: string, opcoes?: { modulo?: string; contentType?: string; upsert?: boolean }) {
    const regra = bucketModule[bucket]
    await assertPermission(regra.modulo, regra.acao)
    const path = await this.path(bucket, nomeArquivo, opcoes?.modulo)
    const { data, error } = await db().storage.from(bucket).upload(path, file, { upsert: opcoes?.upsert ?? false, contentType: opcoes?.contentType })
    if (error) throw normalizeError(error, 'Erro ao enviar arquivo para o Supabase Storage.')
    await AuditoriaService.registrar('storage.upload', 'storage.objects', path, { bucket, path }).catch(() => null)
    return { bucket, path: data.path }
  },

  async signedUrl(bucket: StorageBucketVF, path: string, expiresIn = 3600) {
    const regra = bucketModule[bucket]
    await assertPermission(regra.modulo, 'ver')
    const { data, error } = await db().storage.from(bucket).createSignedUrl(path, expiresIn)
    if (error) throw normalizeError(error, 'Erro ao gerar URL assinada.')
    return data.signedUrl
  },

  async list(bucket: StorageBucketVF, prefix?: string) {
    const regra = bucketModule[bucket]
    await assertPermission(regra.modulo, 'ver')
    const empresaId = await getEmpresaId()
    const { data, error } = await db().storage.from(bucket).list(prefix || empresaId, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
    if (error) throw normalizeError(error, 'Erro ao listar arquivos.')
    return data ?? []
  },

  async registrarExportacao(args: { tipo: string; formato: 'pdf' | 'csv' | 'json'; periodo_inicio?: string | null; periodo_fim?: string | null; bucket?: string | null; path?: string | null; total_linhas?: number; parametros?: AnyRecord }) {
    await assertPermission('relatorios', 'exportar')
    const { data, error } = await db().rpc('vf_registrar_exportacao_relatorio', {
      p_tipo: args.tipo,
      p_formato: args.formato,
      p_periodo_inicio: args.periodo_inicio ?? null,
      p_periodo_fim: args.periodo_fim ?? null,
      p_storage_bucket: args.bucket ?? null,
      p_storage_path: args.path ?? null,
      p_total_linhas: args.total_linhas ?? 0,
      p_parametros: args.parametros ?? {},
    })
    if (error) throw normalizeError(error, 'Erro ao registrar exportação.')
    return String(data)
  },
}
