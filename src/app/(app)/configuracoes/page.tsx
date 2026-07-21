'use client'
import BrandLogo from '@/components/BrandLogo'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Alert, Button, Card, Field, Input, Select, Textarea } from '@/components/ui'
import { ConfigService, IdentidadeService, NotificacoesService, FiscalService } from '@/services'
import { getSupabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { applyBrandingVars, cacheBranding } from '@/lib/branding'

const TIPOS = [
  { value: 'alimenticio', label: 'Alimentício geral' },
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'bar', label: 'Bar / Drinks' },
  { value: 'confeitaria', label: 'Confeitaria' },
  { value: 'roupas', label: 'Loja de roupas' },
  { value: 'eletronicos', label: 'Eletrônicos' },
  { value: 'loja_variedades', label: 'Vendas variadas' },
  { value: 'prestador_servico', label: 'Prestador de serviço / MEI' },
  { value: 'barbearia', label: 'Barbearia' },
  { value: 'fotografia', label: 'Fotografia' },
  { value: 'outro', label: 'Outro ramo' },
]

export default function ConfiguracoesPage() {
  const qc = useQueryClient()
  const { data: config } = useQuery({ queryKey: ['config'], queryFn: ConfigService.obter })
  const { data: identidade } = useQuery({ queryKey: ['identidade'], queryFn: IdentidadeService.obter })
  const { data: fiscalConfig } = useQuery({ queryKey: ['fiscal-config'], queryFn: FiscalService.obterConfig })

  const [precificacao, setPrecificacao] = useState({
    margem_minima: 200, margem_ideal: 300, margem_premium: 400, cmv_meta: 30,
    dias_alerta_vencimento: 3, custo_fixo_mensal: 0, percentual_impostos: 0, taxa_cartao_percentual: 0, taxa_delivery_percentual: 0, taxa_servico_percentual: 0, taxa_entrega_padrao: 0,
    notificacao_agendamento_ativa: true, notificacao_agendamento_antecedencia: '1_dia' as '1_dia' | 'no_dia' | '30_min' | '10_min',
  })
  const [empresa, setEmpresa] = useState({
    nome: '', tipo: 'restaurante', cnpj: '', telefone: '', email: '', endereco: '', logo_url: '',
    cor_primaria: '#0A8DFF', cor_secundaria: '#F2B72E', cor_fundo: '#F5F8FC', cor_texto: '#102033', cor_superficie: '#FFFFFF', cor_superficie2: '#EEF4FB', cor_borda: '#DCE6F0', cor_menu: '#FFFFFF', cor_card: '#FFFFFF', cor_muted: '#667085', cor_sucesso: '#16A34A', cor_alerta: '#F59E0B', cor_erro: '#DC2626', cor_info: '#0A8DFF', modo_tema: 'light' as 'light' | 'dark' | 'custom',
  })
  const [fiscal, setFiscal] = useState({
    provedor: 'outro', ambiente: 'homologacao', certificado_configurado: false,
    cnpj: '', inscricao_estadual: '', inscricao_municipal: '', regime_tributario: '', cnae: '',
    serie_nfe: '1', serie_nfce: '1', serie_nfse: '1', token_homologacao: '', token_producao: '',
    status: 'nao_configurada', observacoes: '',
  })
  const [senhaForm, setSenhaForm] = useState({ nova: '', confirma: '' })
  const [ativandoPush, setAtivandoPush] = useState(false)
  const [enviandoLogo, setEnviandoLogo] = useState(false)

  useEffect(() => {
    if (config) setPrecificacao({
      margem_minima: Number(config.margem_minima ?? 200),
      margem_ideal: Number(config.margem_ideal ?? 300),
      margem_premium: Number(config.margem_premium ?? 400),
      cmv_meta: Number(config.cmv_meta ?? 30),
      dias_alerta_vencimento: Number(config.dias_alerta_vencimento ?? 3),
      custo_fixo_mensal: Number(config.custo_fixo_mensal ?? 0),
      percentual_impostos: Number(config.percentual_impostos ?? 0),
      taxa_cartao_percentual: Number(config.taxa_cartao_percentual ?? 0),
      taxa_delivery_percentual: Number(config.taxa_delivery_percentual ?? 0),
      taxa_servico_percentual: Number(config.taxa_servico_percentual ?? 0),
      taxa_entrega_padrao: Number(config.taxa_entrega_padrao ?? 0),
      notificacao_agendamento_ativa: Boolean(config.notificacao_agendamento_ativa ?? true),
      notificacao_agendamento_antecedencia: (config.notificacao_agendamento_antecedencia ?? '1_dia') as '1_dia' | 'no_dia' | '30_min' | '10_min',
    })
  }, [config])

  useEffect(() => {
    if (identidade) setEmpresa({
      nome: identidade.nome ?? '', tipo: identidade.tipo ?? 'restaurante', cnpj: identidade.cnpj ?? '', telefone: identidade.telefone ?? '', email: identidade.email ?? '', endereco: identidade.endereco ?? '', logo_url: identidade.logo_url ?? '',
      cor_primaria: identidade.cor_primaria ?? '#0A8DFF', cor_secundaria: identidade.cor_secundaria ?? '#F2B72E', cor_fundo: identidade.cor_fundo ?? '#F5F8FC', cor_texto: identidade.cor_texto ?? '#102033', cor_superficie: (identidade as any).cor_superficie ?? '#FFFFFF', cor_superficie2: (identidade as any).cor_superficie2 ?? '#EEF4FB', cor_borda: (identidade as any).cor_borda ?? '#DCE6F0', cor_menu: (identidade as any).cor_menu ?? '#FFFFFF', cor_card: (identidade as any).cor_card ?? '#FFFFFF', cor_muted: (identidade as any).cor_muted ?? '#667085', cor_sucesso: (identidade as any).cor_sucesso ?? '#16A34A', cor_alerta: (identidade as any).cor_alerta ?? '#F59E0B', cor_erro: (identidade as any).cor_erro ?? '#DC2626', cor_info: (identidade as any).cor_info ?? '#0A8DFF', modo_tema: (identidade as any).modo_tema ?? 'light',
    })
  }, [identidade])


  useEffect(() => {
    if (!fiscalConfig) return
    setFiscal({
      provedor: fiscalConfig.provedor ?? 'outro',
      ambiente: fiscalConfig.ambiente ?? 'homologacao',
      certificado_configurado: Boolean(fiscalConfig.certificado_configurado),
      cnpj: fiscalConfig.cnpj ?? '',
      inscricao_estadual: fiscalConfig.inscricao_estadual ?? '',
      inscricao_municipal: fiscalConfig.inscricao_municipal ?? '',
      regime_tributario: fiscalConfig.regime_tributario ?? '',
      cnae: fiscalConfig.cnae ?? '',
      serie_nfe: fiscalConfig.serie_nfe ?? '1',
      serie_nfce: fiscalConfig.serie_nfce ?? '1',
      serie_nfse: fiscalConfig.serie_nfse ?? '1',
      token_homologacao: fiscalConfig.token_homologacao ?? '',
      token_producao: fiscalConfig.token_producao ?? '',
      status: fiscalConfig.status ?? 'nao_configurada',
      observacoes: fiscalConfig.observacoes ?? '',
    })
  }, [fiscalConfig])

  useEffect(() => {
    applyBrandingVars(empresa as any, { persist: true })
    cacheBranding(empresa as any)
  }, [empresa.cor_primaria, empresa.cor_secundaria, empresa.cor_fundo, empresa.cor_texto, empresa.cor_superficie, empresa.cor_superficie2, empresa.cor_borda, empresa.cor_menu, empresa.cor_card, empresa.cor_muted, empresa.cor_sucesso, empresa.cor_alerta, empresa.cor_erro, empresa.cor_info, empresa.modo_tema])

  const saveConfig = useMutation({
    mutationFn: () => ConfigService.salvar(precificacao as any),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['config'] }); toast.success('Configurações de preço salvas!') },
    onError: (e: Error) => toast.error(e.message),
  })

  const saveEmpresa = useMutation({
    mutationFn: () => IdentidadeService.salvar(empresa as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['identidade'] })
      qc.invalidateQueries({ queryKey: ['identidade-global'] })
      cacheBranding(empresa as any)
      applyBrandingVars(empresa as any, { persist: true })
      toast.success('Identidade visual salva! Cardápios e relatórios já usarão essas informações.')
    },
    onError: (e: Error) => toast.error(e.message),
  })



  const saveFiscal = useMutation({
    mutationFn: () => FiscalService.salvarConfig(fiscal as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fiscal-config'] })
      toast.success('Configuração fiscal salva em modo seguro. Emissão oficial depende do provedor/certificado.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const savePassword = async () => {
    if (senhaForm.nova !== senhaForm.confirma) return toast.error('Senhas não coincidem')
    if (senhaForm.nova.length < 6) return toast.error('Senha mínima: 6 caracteres')
    const { error } = await getSupabase().auth.updateUser({ password: senhaForm.nova })
    if (error) toast.error(error.message)
    else { toast.success('Senha alterada!'); setSenhaForm({ nova: '', confirma: '' }) }
  }

  const setPaleta = (a: string, b: string, fundo: string, texto: string, superficie?: string, superficie2?: string, borda?: string, menu?: string, card?: string, muted?: string) => {
    setEmpresa(p => {
      const next = { ...p, cor_primaria: a, cor_secundaria: b, cor_fundo: fundo, cor_texto: texto, cor_superficie: superficie || p.cor_superficie, cor_superficie2: superficie2 || p.cor_superficie2, cor_borda: borda || p.cor_borda, cor_menu: menu || superficie || p.cor_menu, cor_card: card || superficie || p.cor_card, cor_muted: muted || p.cor_muted }
      applyBrandingVars(next as any, { persist: true })
      cacheBranding(next as any)
      return next
    })
  }


  const handleLogoUpload = async (file?: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Envie um arquivo de imagem válido.')
    if (file.size > 3 * 1024 * 1024) return toast.error('A logo deve ter até 3 MB.')
    try {
      setEnviandoLogo(true)
      const url = await IdentidadeService.uploadLogo(file)
      setEmpresa(p => ({ ...p, logo_url: url }))
      qc.invalidateQueries({ queryKey: ['identidade'] })
      qc.invalidateQueries({ queryKey: ['identidade-global'] })
      toast.success('Logo enviada e aplicada ao app, relatórios e comprovantes!')
    } catch (error: any) {
      toast.error(error?.message ?? 'Não foi possível enviar a logo.')
    } finally {
      setEnviandoLogo(false)
    }
  }

  const ativarNotificacoesMobile = async () => {
    try {
      setAtivandoPush(true)
      await NotificacoesService.ativarNesteDispositivo()
      toast.success('Notificações ativadas neste dispositivo!')
    } catch (error: any) {
      toast.error(error?.message ?? 'Não foi possível ativar notificações.')
    } finally {
      setAtivandoPush(false)
    }
  }

  return (
    <div className="vf-fadein">
      <Header title="Configurações" />
      <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto w-full">
        <Alert type="info">Tudo que for salvo aqui é aplicado à empresa logada: nome, logo, paleta de cores, cardápio em PDF, relatórios, recibos, comprovantes e indicadores.</Alert>

        <Card className="p-4 bg-[color-mix(in_srgb,var(--vf-secondary)_8%,transparent)]">
          <div className="text-sm text-[var(--vf-text)] font-semibold mb-2">🧩 SaaS multiempresa e multirramo</div>
          <p className="text-sm text-[var(--vf-text3)]">Escolha o ramo do cliente. O app adapta produtos, vendas, estoque, agenda, eventos, cardápio, comprovantes e relatórios. Alimentação continua com ficha técnica completa; lojas e serviços usam custo de compra, margem, vendas, agenda e recibos.</p>
        </Card>

        <Card className="p-5 space-y-4">
          <div>
            <div className="text-[12px] text-[var(--vf-text3)] uppercase tracking-wide mb-1">🏪 Identidade da empresa</div>
            <p className="text-sm text-[var(--vf-text3)]">Esses dados aparecem nos cardápios, relatórios e documentos exportados.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome da empresa"><Input value={empresa.nome} onChange={e => setEmpresa(p => ({...p, nome: e.target.value}))} /></Field>
            <Field label="Tipo"><Select value={empresa.tipo} onChange={e => setEmpresa(p => ({...p, tipo: e.target.value}))}>{TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
            <Field label="CNPJ/CPF"><Input value={empresa.cnpj} onChange={e => setEmpresa(p => ({...p, cnpj: e.target.value}))} /></Field>
            <Field label="Telefone/WhatsApp"><Input value={empresa.telefone} onChange={e => setEmpresa(p => ({...p, telefone: e.target.value}))} /></Field>
            <Field label="Email"><Input value={empresa.email} onChange={e => setEmpresa(p => ({...p, email: e.target.value}))} /></Field>
            <Field label="Logo por URL"><Input value={empresa.logo_url} onChange={e => setEmpresa(p => ({...p, logo_url: e.target.value}))} placeholder="https://.../logo.png" /></Field>
            <Field label="Enviar logo do cliente">
              <Input type="file" accept="image/*" onChange={e => handleLogoUpload(e.target.files?.[0])} />
            </Field>
            <Field label="Endereço" className="md:col-span-2"><Input value={empresa.endereco} onChange={e => setEmpresa(p => ({...p, endereco: e.target.value}))} /></Field>
          </div>
          <div className="bg-[color-mix(in_srgb,var(--vf-surface)_82%,transparent)] rounded-2xl p-3 flex items-center gap-3 border border-[var(--vf-border)]">
            <div className="w-20 h-20 vf-logo-soft flex items-center justify-center p-2 overflow-hidden">
              <BrandLogo src={empresa.logo_url} alt="Logo" width={80} height={80} className="w-full h-full object-contain" />
            </div>
            <div className="text-sm text-[var(--vf-text3)]">
              <b className="text-[var(--vf-text)] block">Prévia da identidade</b>
              A logo salva aparece no menu, abertura, relatórios, cardápios, comprovantes e PDFs. Quando o cliente não envia logo, o padrão NexLabs é usado.
            </div>
          </div>
          <Button onClick={() => saveEmpresa.mutate()} loading={saveEmpresa.isPending || enviandoLogo}>Salvar identidade</Button>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="text-[12px] text-[var(--vf-text3)] uppercase tracking-wide mb-1">🎨 Paleta de cores da empresa</div>
          <Alert type="info">Agora a paleta controla fundo, menus, cards, bordas, textos, botões, navegação mobile e relatórios. A prévia é aplicada na hora e fica gravada no navegador até o banco confirmar.</Alert>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Field label="Cor principal"><Input type="color" value={empresa.cor_primaria} onChange={e => setEmpresa(p => ({...p, cor_primaria: e.target.value}))} /></Field>
            <Field label="Cor secundária"><Input type="color" value={empresa.cor_secundaria} onChange={e => setEmpresa(p => ({...p, cor_secundaria: e.target.value}))} /></Field>
            <Field label="Fundo geral"><Input type="color" value={empresa.cor_fundo} onChange={e => setEmpresa(p => ({...p, cor_fundo: e.target.value}))} /></Field>
            <Field label="Texto"><Input type="color" value={empresa.cor_texto} onChange={e => setEmpresa(p => ({...p, cor_texto: e.target.value}))} /></Field>
            <Field label="Texto auxiliar"><Input type="color" value={empresa.cor_muted} onChange={e => setEmpresa(p => ({...p, cor_muted: e.target.value}))} /></Field>
            <Field label="Cards"><Input type="color" value={empresa.cor_card} onChange={e => setEmpresa(p => ({...p, cor_card: e.target.value}))} /></Field>
            <Field label="Superfície"><Input type="color" value={empresa.cor_superficie} onChange={e => setEmpresa(p => ({...p, cor_superficie: e.target.value}))} /></Field>
            <Field label="Superfície 2"><Input type="color" value={empresa.cor_superficie2} onChange={e => setEmpresa(p => ({...p, cor_superficie2: e.target.value}))} /></Field>
            <Field label="Menu"><Input type="color" value={empresa.cor_menu} onChange={e => setEmpresa(p => ({...p, cor_menu: e.target.value}))} /></Field>
            <Field label="Bordas"><Input type="color" value={empresa.cor_borda} onChange={e => setEmpresa(p => ({...p, cor_borda: e.target.value}))} /></Field>
            <Field label="Sucesso"><Input type="color" value={empresa.cor_sucesso} onChange={e => setEmpresa(p => ({...p, cor_sucesso: e.target.value}))} /></Field>
            <Field label="Alerta"><Input type="color" value={empresa.cor_alerta} onChange={e => setEmpresa(p => ({...p, cor_alerta: e.target.value}))} /></Field>
            <Field label="Erro"><Input type="color" value={empresa.cor_erro} onChange={e => setEmpresa(p => ({...p, cor_erro: e.target.value}))} /></Field>
            <Field label="Informação"><Input type="color" value={empresa.cor_info} onChange={e => setEmpresa(p => ({...p, cor_info: e.target.value}))} /></Field>
            <Field label="Modo do tema"><Select value={empresa.modo_tema} onChange={e => setEmpresa(p => ({...p, modo_tema: e.target.value as any}))}><option value="light">Claro</option><option value="dark">Escuro</option><option value="custom">Personalizado</option></Select></Field>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" size="sm" onClick={() => setPaleta('#0A8DFF','#F2B72E','#F5F8FC','#102033','#FFFFFF','#EEF4FB','#DCE6F0','#FFFFFF','#FFFFFF','#667085')}>NexLabs Claro</Button>
            <Button variant="secondary" size="sm" onClick={() => setPaleta('#0A8DFF','#F2B72E','#04070D','#F8FAFC','#0B111A','#111827','#263244','#0B111A','#0B111A','#CBD5E1')}>NexLabs Dark</Button>
            <Button variant="secondary" size="sm" onClick={() => setPaleta('#E85D04','#FFBA08','#111827','#F9FAFB','#1F2937','#273449','#374151','#1F2937','#1F2937','#E5E7EB')}>Gastro Laranja</Button>
            <Button variant="secondary" size="sm" onClick={() => setPaleta('#16A34A','#86EFAC','#06130A','#F0FDF4','#0B1F12','#102A1A','#1F4D2C','#0B1F12','#0B1F12','#BBF7D0')}>Natural Verde</Button>
            <Button variant="secondary" size="sm" onClick={() => setPaleta('#7C3AED','#C4B5FD','#111827','#F5F3FF','#1F2937','#2D2348','#4C3A76','#1F2937','#1F2937','#DDD6FE')}>Premium Roxo</Button>
          </div>
          <div className="vf-hero-panel p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="vf-card p-3"><b className="text-[var(--vf-text)]">Card</b><p className="text-xs text-[var(--vf-text3)]">Prévia dos cards.</p></div>
            <div className="rounded-2xl p-3 bg-[var(--vf-menu)] border border-[var(--vf-border)]"><b className="text-[var(--vf-text)]">Menu</b><p className="text-xs text-[var(--vf-text3)]">Prévia do menu.</p></div>
            <button className="vf-btn vf-btn-primary" type="button" aria-disabled="true">Prévia do botão</button>
          </div>
          <Button onClick={() => saveEmpresa.mutate()} loading={saveEmpresa.isPending}>Salvar paleta permanente</Button>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="text-[12px] text-[var(--vf-text3)] uppercase tracking-wide mb-1">📐 Precificação e despesas padrão</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Margem mínima %"><Input type="number" value={precificacao.margem_minima} onChange={e => setPrecificacao(p => ({...p, margem_minima: Number(e.target.value)}))} /></Field>
            <Field label="Margem ideal %"><Input type="number" value={precificacao.margem_ideal} onChange={e => setPrecificacao(p => ({...p, margem_ideal: Number(e.target.value)}))} /></Field>
            <Field label="Margem premium %"><Input type="number" value={precificacao.margem_premium} onChange={e => setPrecificacao(p => ({...p, margem_premium: Number(e.target.value)}))} /></Field>
            <Field label="Meta CMV %"><Input type="number" value={precificacao.cmv_meta} onChange={e => setPrecificacao(p => ({...p, cmv_meta: Number(e.target.value)}))} /></Field>
            <Field label="Custo fixo mensal"><Input type="number" value={precificacao.custo_fixo_mensal} onChange={e => setPrecificacao(p => ({...p, custo_fixo_mensal: Number(e.target.value)}))} /></Field>
            <Field label="Impostos %"><Input type="number" value={precificacao.percentual_impostos} onChange={e => setPrecificacao(p => ({...p, percentual_impostos: Number(e.target.value)}))} /></Field>
            <Field label="Taxa cartão %"><Input type="number" value={precificacao.taxa_cartao_percentual} onChange={e => setPrecificacao(p => ({...p, taxa_cartao_percentual: Number(e.target.value)}))} /></Field>
            <Field label="Taxa delivery %"><Input type="number" value={precificacao.taxa_delivery_percentual} onChange={e => setPrecificacao(p => ({...p, taxa_delivery_percentual: Number(e.target.value)}))} /></Field>
            <Field label="Taxa serviço % padrão"><Input type="number" value={(precificacao as any).taxa_servico_percentual} onChange={e => setPrecificacao(p => ({...p, taxa_servico_percentual: Number(e.target.value)} as any))} /></Field>
            <Field label="Taxa entrega padrão R$"><Input type="number" value={(precificacao as any).taxa_entrega_padrao} onChange={e => setPrecificacao(p => ({...p, taxa_entrega_padrao: Number(e.target.value)} as any))} /></Field>
            <Field label="Alerta vencimento dias"><Input type="number" value={precificacao.dias_alerta_vencimento} onChange={e => setPrecificacao(p => ({...p, dias_alerta_vencimento: Number(e.target.value)}))} /></Field>
          </div>
          <Button onClick={() => saveConfig.mutate()} loading={saveConfig.isPending}>Salvar regras de preço</Button>
        </Card>

        <Card className="p-5 space-y-4">
          <div>
            <div className="text-[12px] text-[var(--vf-text3)] uppercase tracking-wide mb-1">🔔 Notificações de agendamento</div>
            <p className="text-sm text-[var(--vf-text3)]">Configure os lembretes automáticos de agenda para desktop e celular. No mobile, instale o VF Nexus como PWA e toque em “Ativar notificações neste dispositivo”.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Notificações ativas">
              <Select value={precificacao.notificacao_agendamento_ativa ? 'true' : 'false'} onChange={e => setPrecificacao(p => ({...p, notificacao_agendamento_ativa: e.target.value === 'true'}))}>
                <option value="true">Ativadas</option>
                <option value="false">Desativadas</option>
              </Select>
            </Field>
            <Field label="Antecedência">
              <Select value={precificacao.notificacao_agendamento_antecedencia} onChange={e => setPrecificacao(p => ({...p, notificacao_agendamento_antecedencia: e.target.value as any}))}>
                <option value="1_dia">1 dia antes</option>
                <option value="no_dia">No dia, pela manhã</option>
                <option value="30_min">30 minutos antes</option>
                <option value="10_min">10 minutos antes</option>
              </Select>
            </Field>
            <Field label="Este celular/computador">
              <Button className="w-full" variant="secondary" onClick={ativarNotificacoesMobile} loading={ativandoPush}>Ativar neste dispositivo</Button>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Alert type="success">Funciona no app instalado no celular quando o navegador permite Push Notification. Ideal para barbearias, fotógrafos, confeitarias e prestadores de serviço.</Alert>
            <Alert type="info">O envio automático depende do Cron da Vercel chamar <code>/api/notificacoes/processar</code> periodicamente com o <code>CRON_SECRET</code>.</Alert>
          </div>
          <Button onClick={() => saveConfig.mutate()} loading={saveConfig.isPending}>Salvar notificações</Button>
        </Card>

        <Card className="p-5 space-y-4">
          <div>
            <div className="text-[12px] text-[var(--vf-text3)] uppercase tracking-wide mb-1">🧾 Integração fiscal futura</div>
            <p className="text-sm text-[var(--vf-text3)]">Esta área prepara o VF Nexus para NF-e, NFC-e ou NFS-e oficial sem confundir com o controle interno de notas/abastecimento.</p>
          </div>
          <Alert type="warn">A emissão fiscal oficial exige provedor fiscal, certificado digital A1, credenciais, homologação e validação tributária. Hoje o módulo de notas controla compras/abastecimento e deixa a estrutura pronta para integração real.</Alert>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Provedor fiscal"><Select value={fiscal.provedor} onChange={e => setFiscal(p => ({...p, provedor: e.target.value}))}><option value="outro">Outro / a definir</option><option value="focus_nfe">Focus NFe</option><option value="plugnotas">PlugNotas</option><option value="tecnospeed">TecnoSpeed</option><option value="asaas">Asaas</option></Select></Field>
            <Field label="Ambiente"><Select value={fiscal.ambiente} onChange={e => setFiscal(p => ({...p, ambiente: e.target.value}))}><option value="homologacao">Homologação</option><option value="producao">Produção</option></Select></Field>
            <Field label="Status"><Select value={fiscal.status} onChange={e => setFiscal(p => ({...p, status: e.target.value}))}><option value="nao_configurada">Não configurada</option><option value="homologacao">Em homologação</option><option value="ativa">Ativa</option><option value="erro">Com erro</option></Select></Field>
            <Field label="CNPJ fiscal"><Input value={fiscal.cnpj} onChange={e => setFiscal(p => ({...p, cnpj: e.target.value}))} /></Field>
            <Field label="Inscrição estadual"><Input value={fiscal.inscricao_estadual} onChange={e => setFiscal(p => ({...p, inscricao_estadual: e.target.value}))} /></Field>
            <Field label="Inscrição municipal"><Input value={fiscal.inscricao_municipal} onChange={e => setFiscal(p => ({...p, inscricao_municipal: e.target.value}))} /></Field>
            <Field label="Regime tributário"><Input value={fiscal.regime_tributario} onChange={e => setFiscal(p => ({...p, regime_tributario: e.target.value}))} placeholder="Simples Nacional, MEI..." /></Field>
            <Field label="CNAE"><Input value={fiscal.cnae} onChange={e => setFiscal(p => ({...p, cnae: e.target.value}))} /></Field>
            <Field label="Certificado A1"><Select value={String(fiscal.certificado_configurado)} onChange={e => setFiscal(p => ({...p, certificado_configurado: e.target.value === 'true'}))}><option value="false">Não configurado</option><option value="true">Configurado</option></Select></Field>
            <Field label="Série NF-e"><Input value={fiscal.serie_nfe} onChange={e => setFiscal(p => ({...p, serie_nfe: e.target.value}))} /></Field>
            <Field label="Série NFC-e"><Input value={fiscal.serie_nfce} onChange={e => setFiscal(p => ({...p, serie_nfce: e.target.value}))} /></Field>
            <Field label="Série NFS-e"><Input value={fiscal.serie_nfse} onChange={e => setFiscal(p => ({...p, serie_nfse: e.target.value}))} /></Field>
            <Field label="Token homologação"><Input value={fiscal.token_homologacao} onChange={e => setFiscal(p => ({...p, token_homologacao: e.target.value}))} placeholder="Opcional" /></Field>
            <Field label="Token produção"><Input value={fiscal.token_producao} onChange={e => setFiscal(p => ({...p, token_producao: e.target.value}))} placeholder="Opcional" /></Field>
            <Field label="Observações" className="md:col-span-3"><Textarea value={fiscal.observacoes} onChange={e => setFiscal(p => ({...p, observacoes: e.target.value}))} placeholder="Ex: usar homologação antes de produção; certificado pendente..." /></Field>
          </div>
          <Button onClick={() => saveFiscal.mutate()} loading={saveFiscal.isPending}>Salvar estrutura fiscal</Button>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="text-[12px] text-[var(--vf-text3)] uppercase tracking-wide mb-1">📱 Instalar no celular</div>
          <p className="text-sm text-[var(--vf-text3)]">O VF Nexus está preparado como PWA. No celular, abra o site pelo navegador, toque no menu do navegador e escolha “Adicionar à tela inicial” ou “Instalar app”.</p>
          <Alert type="success">A versão mobile recebeu ajustes de espaçamento, menus roláveis, tabelas com rolagem horizontal e formulários em tela cheia para facilitar o uso no celular.</Alert>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="text-[12px] text-[var(--vf-text3)] uppercase tracking-wide mb-1">🔒 Alterar senha</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nova senha"><Input type="password" value={senhaForm.nova} onChange={e => setSenhaForm(p => ({...p, nova: e.target.value}))} /></Field>
            <Field label="Confirmar nova senha"><Input type="password" value={senhaForm.confirma} onChange={e => setSenhaForm(p => ({...p, confirma: e.target.value}))} /></Field>
          </div>
          <Button onClick={savePassword} variant="secondary">Alterar senha</Button>
        </Card>
      </div>
    </div>
  )
}
