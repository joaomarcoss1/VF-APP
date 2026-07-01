import { classificarSaudeOperacional } from '@/lib/business-rules'
import { RelatoriosService } from './relatorios'

export const DiagnosticoService = {
  async gerar(inicio: string, fim: string) {
    const dados = await RelatoriosService.diagnostico(inicio, fim)
    const estoqueBaixo = Array.isArray(dados.estoque_baixo) ? dados.estoque_baixo : []
    const inadimplencia = Array.isArray(dados.inadimplencia) ? dados.inadimplencia : []
    const valorInadimplente = inadimplencia.reduce((acc: number, row: any) => acc + Number(row.valor || 0), 0)
    const dre = dados.dre as any
    const saude = classificarSaudeOperacional({
      caixa: Number(dre.resultado_operacional || 0),
      margem_liquida: Number(dre.margem_liquida || 0),
      estoque_ruptura: estoqueBaixo.length,
      inadimplencia: valorInadimplente,
    })
    const alertas: string[] = [...saude.alertas]
    if (!alertas.length) alertas.push('Negócio sem alerta crítico no período. Continue acompanhando caixa, margem, giro de estoque e inadimplência.')
    return { ...dados, saude, alertas, recomendacoes: saude.recomendacoes }
  },
}
