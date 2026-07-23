// ============================================================
// VF Nexus — EXPORTAÇÃO PDF E EXCEL
// ============================================================

import type { Produto, Insumo, Venda, Evento, CardapioProdutoView, Cardapio, IdentidadeEmpresa, ComprovantePayload } from '@/types'
import { fmtBRL, fmtPct } from './precificacao'
import { resolveBranding } from './branding'
import { downloadWorkbookXlsx } from './xlsx'
import { buildQrImageUrl } from './commercial-v14'


function exportWorkbookExcel(sheets: Record<string, Array<Record<string, any>>>, filename: string): void {
  downloadWorkbookXlsx(sheets, filename.replace(/\.(csv|xls|xlsx)$/i, '.xlsx'), { title: 'VF Nexus — Relatório executivo' })
}

function exportRowsCSV(rows: Array<Record<string, any>>, filename: string): void {
  const groups = rows.reduce<Record<string, Array<Record<string, any>>>>((acc, row) => {
    const sheet = String(row.Aba || 'Dados')
    const { Aba, ...rest } = row
    acc[sheet] = acc[sheet] || []
    acc[sheet].push(rest)
    return acc
  }, {})
  exportWorkbookExcel(groups, filename)
}

function safeFileName(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '') || 'arquivo'
}

function hexToRgb(hex?: string): [number, number, number] {
  const fallback: [number, number, number] = [201, 168, 76]
  if (!hex) return fallback
  const clean = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return fallback
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)]
}

async function imageUrlToDataUrl(url?: string): Promise<string | null> {
  if (!url) return null
  if (url.startsWith('data:image/')) return url
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return await new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(String(reader.result))
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

async function addLogo(doc: any, branding?: Partial<IdentidadeEmpresa>, x = 14, y = 12) {
  const primary = hexToRgb(branding?.cor_primaria)
  const dataUrl = await imageUrlToDataUrl(branding?.logo_url)
  if (dataUrl) {
    try {
      const fmt = dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg') ? 'JPEG' : 'PNG'
      const props = doc.getImageProperties(dataUrl)
      const box = 14
      const ratio = Number(props.width || 1) / Number(props.height || 1)
      const width = ratio >= 1 ? box : box * ratio
      const height = ratio >= 1 ? box / ratio : box
      doc.addImage(dataUrl, fmt, x + (box - width) / 2, y + (box - height) / 2, width, height, undefined, 'FAST')
      return
    } catch {}
  }
  doc.setFillColor(primary[0], primary[1], primary[2])
  doc.roundedRect(x, y, 12, 12, 2, 2, 'F')
  doc.setTextColor(10, 10, 10)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text((branding?.nome || 'VF').slice(0, 2).toUpperCase(), x + 6, y + 8, { align: 'center' })
}

function addPremiumFooter(doc: any, texto = 'VF Nexus — Gestão empresarial', branding?: Partial<IdentidadeEmpresa>) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const b = resolveBranding(branding)
  const primary = hexToRgb(b.cor_primaria)
  doc.setDrawColor(primary[0], primary[1], primary[2])
  doc.setLineWidth(0.35)
  doc.line(14, H - 14, W - 14, H - 14)
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(texto, 14, H - 7)
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, W - 14, H - 7, { align: 'right' })
}

function addMetricCard(doc: any, x: number, y: number, w: number, label: string, value: string, color: [number, number, number]) {
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(x, y, w, 20, 3, 3, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(x, y, w, 20, 3, 3, 'S')
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(label, x + 4, y + 7)
  doc.setTextColor(color[0], color[1], color[2])
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(value, x + 4, y + 15)
}


function pdfTheme(branding?: Partial<IdentidadeEmpresa>) {
  const b = resolveBranding(branding)
  return {
    b,
    primary: hexToRgb(b.cor_primaria),
    secondary: hexToRgb(b.cor_secundaria),
    // Documentos usam fundo de impressão neutro. Branding altera somente acentos.
    bg: [248, 250, 252] as [number, number, number],
    surface: [255, 255, 255] as [number, number, number],
    surface2: [241, 245, 249] as [number, number, number],
    border: [220, 230, 240] as [number, number, number],
    text: [16, 32, 51] as [number, number, number],
    muted: [100, 116, 139] as [number, number, number],
    success: [21, 128, 61] as [number, number, number],
    warn: [180, 83, 9] as [number, number, number],
    error: [198, 40, 40] as [number, number, number],
    info: [3, 105, 161] as [number, number, number],
  }
}

function fillPage(doc: any, theme: ReturnType<typeof pdfTheme>) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  doc.setFillColor(...theme.bg)
  doc.rect(0, 0, W, H, 'F')
  doc.setFillColor(...theme.primary)
  doc.rect(0, 0, W, 2.8, 'F')
}

function lightPanel(doc: any, x: number, y: number, w: number, h: number, theme: ReturnType<typeof pdfTheme>, radius = 4) {
  doc.setFillColor(...theme.surface)
  doc.roundedRect(x, y, w, h, radius, radius, 'F')
  doc.setDrawColor(...theme.border)
  doc.roundedRect(x, y, w, h, radius, radius, 'S')
}

function addReportHeader(doc: any, title: string, subtitle: string, branding?: Partial<IdentidadeEmpresa>) {
  const theme = pdfTheme(branding)
  const { b } = theme
  const W = doc.internal.pageSize.getWidth()
  fillPage(doc, theme)
  doc.setFillColor(...theme.surface)
  doc.roundedRect(12, 10, W - 24, 28, 5, 5, 'F')
  doc.setDrawColor(...theme.border)
  doc.roundedRect(12, 10, W - 24, 28, 5, 5, 'S')
  addLogo(doc, b, 17, 16)
  doc.setTextColor(...theme.primary)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(title, 36, 21)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...theme.muted)
  doc.text(subtitle, 36, 28)
  doc.text(b.nome || 'VF Nexus', W - 16, 21, { align: 'right' })
  doc.setFontSize(7.5)
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, W - 16, 29, { align: 'right' })
  return { y: 46, theme }
}

function addLightFooter(doc: any, theme: ReturnType<typeof pdfTheme>, text = 'VF Nexus — criado pela NexLabs') {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  doc.setDrawColor(...theme.border)
  doc.line(12, H - 13, W - 12, H - 13)
  doc.setTextColor(...theme.muted)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(text, 12, H - 7)
  doc.text('Documento gerado automaticamente.', W - 12, H - 7, { align: 'right' })
}


export async function gerarComprovantePDFBlob(
  comprovante: ComprovantePayload,
  branding?: Partial<IdentidadeEmpresa>
): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const theme = pdfTheme({ ...(branding ?? {}), nome: branding?.nome || comprovante.empresa_nome || 'VF Nexus' } as Partial<IdentidadeEmpresa>)

  fillPage(doc, theme)
  doc.setFillColor(...theme.surface)
  doc.roundedRect(14, 12, W - 28, 34, 5, 5, 'F')
  doc.setDrawColor(...theme.border)
  doc.roundedRect(14, 12, W - 28, 34, 5, 5, 'S')
  await addLogo(doc, theme.b, 20, 20)
  doc.setTextColor(...theme.primary)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(comprovante.empresa_nome || theme.b.nome || 'VF Nexus', 39, 24)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...theme.muted)
  doc.text(comprovante.tipo === 'agendamento' ? 'Comprovante de agendamento' : 'Comprovante de venda', 39, 32)
  doc.text(`Emitido em ${comprovante.data_hora}`, 39, 39)

  let y = 56
  lightPanel(doc, 14, y, W - 28, 30, theme)
  doc.setTextColor(...theme.primary)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Dados do cliente', 20, y + 9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...theme.text)
  doc.setFontSize(9)
  doc.text(`Cliente: ${comprovante.cliente_nome || 'Consumidor final'}`, 20, y + 18)
  doc.text(`WhatsApp: ${comprovante.cliente_whatsapp || 'Não informado'}`, 20, y + 25)

  y += 42
  doc.setTextColor(...theme.primary)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Itens', 14, y)
  y += 7

  doc.setFillColor(...theme.primary)
  doc.roundedRect(14, y, W - 28, 10, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.text('Descrição', 18, y + 6)
  doc.text('Qtd.', W - 72, y + 6)
  doc.text('Unit.', W - 52, y + 6)
  doc.text('Total', W - 28, y + 6, { align: 'right' })
  y += 12

  doc.setFont('helvetica', 'normal')
  comprovante.itens.forEach((item, index) => {
    const nameLines = doc.splitTextToSize(String(item.nome || 'Item'), W - 112)
    const rowHeight = Math.max(10, nameLines.length * 4.5 + 5)
    if (y + rowHeight > 246) { addLightFooter(doc, theme); doc.addPage(); fillPage(doc, theme); y = 24 }
    if (index % 2 === 0) { doc.setFillColor(...theme.surface2); doc.roundedRect(14, y - 5, W - 28, rowHeight, 2, 2, 'F') }
    doc.setTextColor(...theme.text)
    doc.setFontSize(8.5)
    doc.text(nameLines, 18, y + 1)
    doc.text(String(item.quantidade), W - 68, y + 1)
    doc.text(`R$ ${fmtBRL(item.valor_unitario)}`, W - 42, y + 1)
    doc.text(`R$ ${fmtBRL(item.total)}`, W - 18, y + 1, { align: 'right' })
    y += rowHeight
  })

  y += 6
  const totalsX = W - 86
  doc.setDrawColor(...theme.border)
  doc.line(totalsX, y, W - 14, y)
  y += 8
  const totalLines = ([
    ['Subtotal', Number(comprovante.subtotal || 0)],
    ['Desconto', -Math.abs(Number(comprovante.desconto || 0))],
    ['Taxa de entrega', Number(comprovante.taxa_entrega || 0)],
    ['Taxa de serviço', Number(comprovante.taxa_servico || 0)],
  ] as Array<[string, number]>).filter(([, v]) => Math.abs(Number(v)) > 0 || v === Number(comprovante.subtotal || 0))
  doc.setFontSize(9)
  for (const [label, value] of totalLines) {
    doc.setTextColor(...theme.muted)
    doc.text(label, totalsX, y)
    doc.text(`R$ ${fmtBRL(value)}`, W - 14, y, { align: 'right' })
    y += 7
  }
  doc.setFillColor(...theme.secondary)
  doc.roundedRect(totalsX - 2, y - 5, W - totalsX - 12, 12, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL', totalsX + 2, y + 2)
  doc.text(`R$ ${fmtBRL(comprovante.total)}`, W - 18, y + 2, { align: 'right' })

  y += 22
  doc.setTextColor(...theme.muted)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  if (comprovante.forma_pagamento) doc.text(`Forma de pagamento: ${String(comprovante.forma_pagamento).replace('_', ' ')}`, 14, y)
  if (comprovante.observacoes) doc.text(doc.splitTextToSize(`Observações: ${comprovante.observacoes}`, W - 28), 14, y + 7)

  doc.setFillColor(...theme.surface)
  doc.roundedRect(14, H - 31, W - 28, 18, 4, 4, 'F')
  doc.setTextColor(...theme.primary)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Agradecemos a preferência, e volte sempre.', W / 2, H - 22, { align: 'center' })
  addLightFooter(doc, theme, 'Gerado pelo VF Nexus — criado pela NexLabs')

  return doc.output('blob')
}

export async function exportarComprovantePDF(
  comprovante: ComprovantePayload,
  branding?: Partial<IdentidadeEmpresa>
): Promise<void> {
  const blob = await gerarComprovantePDFBlob(comprovante, branding)
  const filename = `comprovante-${safeFileName(comprovante.cliente_nome || comprovante.empresa_nome || 'vf-nexus')}.pdf`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export async function compartilharComprovanteWhatsappPDF(
  comprovante: ComprovantePayload,
  telefone?: string | null,
  branding?: Partial<IdentidadeEmpresa>
): Promise<void> {
  const blob = await gerarComprovantePDFBlob(comprovante, branding)
  const filename = `comprovante-${safeFileName(comprovante.cliente_nome || comprovante.empresa_nome || 'vf-nexus')}.pdf`
  const file = new File([blob], filename, { type: 'application/pdf' })
  const shareText = `Olá${comprovante.cliente_nome ? `, ${comprovante.cliente_nome}` : ''}! Segue seu comprovante em PDF. Agradecemos a preferência, e volte sempre.`
  const nav: any = typeof navigator !== 'undefined' ? navigator : null
  if (nav?.canShare?.({ files: [file] }) && nav?.share) {
    await nav.share({ title: 'Comprovante VF Nexus', text: shareText, files: [file] })
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
  const numero = String(telefone || '').replace(/\D/g, '')
  const link = numero ? `https://wa.me/55${numero.replace(/^55/, '')}?text=${encodeURIComponent(shareText + ' O PDF foi baixado neste dispositivo para você anexar no WhatsApp.')}` : `https://wa.me/?text=${encodeURIComponent(shareText)}`
  window.open(link, '_blank')
}


// ---- PDF (jsPDF + autotable) ----
export async function exportarFichaTecnicaPDF(produto: Produto, branding?: Partial<IdentidadeEmpresa>): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const { y: startY, theme } = addReportHeader(doc, 'Ficha técnica', `${produto.nome} • custo, margem e composição`, branding)

  lightPanel(doc, 14, startY, W - 28, 26, theme)
  const infos = [
    ['Categoria', produto.categoria],
    ['Preparo', `${produto.tempo_preparo_min} min`],
    ['Rendimento', `${produto.rendimento} ${produto.unidade_rendimento}`],
    ['Custo total', `R$ ${fmtBRL(produto.custo_total)}`],
  ]
  infos.forEach(([label, val], i) => {
    const x = 20 + (i % 4) * 44
    doc.setTextColor(...theme.muted)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(label, x, startY + 9)
    doc.setTextColor(...(i === 3 ? theme.primary : theme.text))
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(String(val), x, startY + 18)
  })

  doc.setTextColor(...theme.primary)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Ingredientes e custo calculado', 14, startY + 39)

  const fichaRows = (produto.ficha_tecnica ?? []).map(f => [
    f.insumo?.nome ?? '—',
    `${f.quantidade} ${f.unidade}`,
    `R$ ${fmtBRL(f.custo_calculado ?? 0)}`
  ])

  autoTable(doc, {
    startY: startY + 43,
    head: [['Ingrediente', 'Quantidade', 'Custo']],
    body: fichaRows.length ? fichaRows : [['Nenhum ingrediente informado', '—', '—']],
    foot: [['Total', '', `R$ ${fmtBRL(produto.custo_total)}`]],
    theme: 'plain',
    headStyles: { fillColor: theme.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fillColor: theme.surface, textColor: theme.text, fontSize: 9, lineColor: theme.border },
    footStyles: { fillColor: theme.surface2, textColor: theme.primary, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: theme.surface2 },
    styles: { cellPadding: 3, lineColor: theme.border, lineWidth: 0.1 }
  })

  let y = ((doc as any).lastAutoTable?.finalY ?? 110) + 8
  lightPanel(doc, 14, y, W - 28, 38, theme)
  doc.setTextColor(...theme.primary)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Indicadores de precificação', 20, y + 9)

  const indicadores = [
    { label: 'Preço de venda', val: `R$ ${fmtBRL(produto.preco_venda ?? 0)}`, color: theme.primary },
    { label: 'Margem bruta', val: fmtPct(produto.margem_bruta ?? 0), color: theme.success },
    { label: 'CMV', val: fmtPct(produto.cmv_percentual ?? 0), color: theme.warn },
    { label: 'Lucro bruto', val: `R$ ${fmtBRL(produto.lucro_bruto ?? 0)}`, color: theme.success },
  ]
  indicadores.forEach(({ label, val, color }, i) => {
    const x = 20 + i * 43
    doc.setTextColor(...theme.muted)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(label, x, y + 21)
    doc.setTextColor(...(color as [number, number, number]))
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(val, x, y + 30)
  })

  if (produto.modo_preparo) {
    y += 48
    lightPanel(doc, 14, y, W - 28, 34, theme)
    doc.setTextColor(...theme.primary)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Modo de preparo / observações', 20, y + 9)
    doc.setTextColor(...theme.text)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(produto.modo_preparo, W - 40)
    doc.text(lines.slice(0, 4), 20, y + 17)
  }

  addLightFooter(doc, theme, `${theme.b.nome} — Ficha técnica gerada pelo VF Nexus`)
  doc.save(`ficha-${safeFileName(produto.nome)}.pdf`)
}

function gerarInsightsFinanceiros(vendas: Venda[]) {
  const total = vendas.reduce((a, v) => a + Number(v.total ?? 0), 0)
  const lucro = vendas.reduce((a, v) => a + Number(v.lucro ?? 0), 0)
  const custo = total - lucro
  const cmv = total > 0 ? (custo / total) * 100 : 0
  const ticket = vendas.length ? total / vendas.length : 0
  const porCanal = new Map<string, number>()
  const porProduto = new Map<string, { total: number; lucro: number; qtd: number }>()
  vendas.forEach(v => {
    porCanal.set(v.canal || 'não informado', (porCanal.get(v.canal || 'não informado') ?? 0) + Number(v.total ?? 0))
    const atual = porProduto.get(v.produto_nome || 'Produto') ?? { total: 0, lucro: 0, qtd: 0 }
    porProduto.set(v.produto_nome || 'Produto', { total: atual.total + Number(v.total ?? 0), lucro: atual.lucro + Number(v.lucro ?? 0), qtd: atual.qtd + Number(v.quantidade ?? 0) })
  })
  const melhorCanal = [...porCanal.entries()].sort((a, b) => b[1] - a[1])[0]
  const melhorProduto = [...porProduto.entries()].sort((a, b) => b[1].lucro - a[1].lucro)[0]
  const alertas = [
    cmv > 38 ? `CMV de ${fmtPct(cmv)} está acima do ideal. Reavalie custo, ficha técnica e perdas.` : `CMV de ${fmtPct(cmv)} está controlado para operação inicial.`,
    ticket > 0 ? `Ticket médio de R$ ${fmtBRL(ticket)}. Crie combos ou adicionais para elevar o valor por venda.` : 'Sem vendas suficientes para calcular ticket médio.',
    melhorCanal ? `Canal mais forte: ${melhorCanal[0]} com R$ ${fmtBRL(melhorCanal[1])}.` : 'Cadastre canais de venda para análise comercial.',
    melhorProduto ? `Produto mais lucrativo: ${melhorProduto[0]} com R$ ${fmtBRL(melhorProduto[1].lucro)} de lucro bruto.` : 'Cadastre produtos para montar ranking de margem.',
  ]
  return { total, lucro, custo, cmv, ticket, melhorCanal, melhorProduto, alertas }
}

export async function exportarRelatorioFinanceiroPDF(
  vendas: Venda[],
  periodo: string,
  branding?: Partial<IdentidadeEmpresa>
): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()

  const totalFaturamento = vendas.reduce((a, v) => a + Number(v.total ?? 0), 0)
  const totalLucro       = vendas.reduce((a, v) => a + Number(v.lucro ?? 0), 0)
  const totalCusto       = totalFaturamento - totalLucro
  const cmvGeral         = totalFaturamento > 0 ? (totalCusto / totalFaturamento) * 100 : 0
  const ticketMedio      = vendas.length ? totalFaturamento / vendas.length : 0

  const b = resolveBranding(branding)
  const primary = hexToRgb(b.cor_primaria)
  const secondary = hexToRgb(b.cor_secundaria)
  doc.setFillColor(248, 250, 252)
  doc.rect(0, 0, W, 42, 'F')
  doc.setFillColor(primary[0], primary[1], primary[2])
  doc.rect(0, 0, 5, 42, 'F')
  await addLogo(doc, b, 14, 8)
  doc.setTextColor(primary[0], primary[1], primary[2])
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(b.nome, 30, 17)
  doc.setFontSize(10)
  doc.setTextColor(154, 148, 136)
  doc.setFont('helvetica', 'normal')
  doc.text(`Relatório financeiro — ${b.nome}`, 30, 25)
  doc.text(periodo, W - 14, 25, { align: 'right' })
  doc.setTextColor(71, 85, 105)
  doc.setFontSize(8)
  doc.text('Faturamento, custos, lucro, CMV e análise operacional do período.', 30, 33)

  const yCards = 50
  addMetricCard(doc, 14, yCards, 47, 'Faturamento', `R$ ${fmtBRL(totalFaturamento)}`, primary)
  addMetricCard(doc, 66, yCards, 43, 'Lucro', `R$ ${fmtBRL(totalLucro)}`, [61, 170, 107])
  addMetricCard(doc, 114, yCards, 43, 'Custo', `R$ ${fmtBRL(totalCusto)}`, [212, 80, 80])
  addMetricCard(doc, 162, yCards, 34, 'CMV', fmtPct(cmvGeral), [232, 184, 75])
  addMetricCard(doc, 201, yCards, 40, 'Ticket Médio', `R$ ${fmtBRL(ticketMedio)}`, [74, 143, 212])
  addMetricCard(doc, 246, yCards, 36, 'Vendas', String(vendas.length), secondary)

  const insights = gerarInsightsFinanceiros(vendas)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(14, 74, W - 28, 24, 4, 4, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(14, 74, W - 28, 24, 4, 4, 'S')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(primary[0], primary[1], primary[2])
  doc.text('Diagnóstico e próximos passos', 18, 82)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.2)
  doc.setTextColor(71, 85, 105)
  const insightText = insights.alertas.join(' • ')
  doc.text(doc.splitTextToSize(insightText, W - 38).slice(0, 2), 18, 90)

  autoTable(doc, {
    startY: 106,
    head: [['Data', 'Produto', 'Qtd', 'Preço Unit.', 'Custo Unit.', 'Total', 'Lucro', 'Margem', 'Canal']],
    body: vendas.map(v => {
      const margem = Number(v.total ?? 0) > 0 ? (Number(v.lucro ?? 0) / Number(v.total ?? 0)) * 100 : 0
      return [
        new Date(v.data_venda).toLocaleDateString('pt-BR'),
        v.produto_nome,
        String(v.quantidade),
        `R$ ${fmtBRL(v.preco_unitario)}`,
        `R$ ${fmtBRL(v.custo_unitario)}`,
        `R$ ${fmtBRL(v.total)}`,
        `R$ ${fmtBRL(v.lucro)}`,
        fmtPct(margem),
        v.canal,
      ]
    }),
    foot: [['TOTAL', '', String(vendas.reduce((a,v)=>a+Number(v.quantidade ?? 0),0)), '', '', `R$ ${fmtBRL(totalFaturamento)}`, `R$ ${fmtBRL(totalLucro)}`, fmtPct(totalFaturamento > 0 ? (totalLucro/totalFaturamento)*100 : 0), '']],
    theme: 'plain',
    headStyles: { fillColor: primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fillColor: [255, 255, 255], textColor: [30, 41, 59], fontSize: 7.5 },
    footStyles: { fillColor: [241, 245, 249], textColor: primary, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.05 },
  })

  addPremiumFooter(doc, `${b.nome} — Relatório financeiro gerado pelo VF Nexus`, b)
  doc.save(`relatorio-financeiro-${safeFileName(periodo)}.pdf`)
}

// ---- EXCEL ----
export async function exportarInsumosExcel(insumos: Insumo[]): Promise<void> {
  const dados = insumos.map(i => ({
    'Nome':             i.nome,
    'Categoria':        i.categoria?.nome ?? '',
    'Fornecedor':       i.fornecedor?.nome ?? '',
    'Unidade Compra':   i.unidade_compra,
    'Qtd Comprada':     i.quantidade_compra,
    'Valor Pago (R$)':  i.valor_compra,
    'Custo/kg (R$)':    i.custo_por_kg    ?? '',
    'Custo/g (R$)':     i.custo_por_grama ?? '',
    'Custo/L (R$)':     i.custo_por_litro ?? '',
    'Custo/ml (R$)':    i.custo_por_ml    ?? '',
    'Custo/un (R$)':    i.custo_por_unidade ?? '',
    'Estoque Atual':    i.estoque_atual,
    'Estoque Mínimo':   i.estoque_minimo,
    'Vencimento':       i.data_vencimento ?? '',
  }))

  exportRowsCSV(dados, 'vf-nexus-insumos.xlsx')
}

export async function exportarProdutosExcel(produtos: Produto[]): Promise<void> {
  const dados = produtos.map(p => ({
    'Nome':           p.nome,
    'Categoria':      p.categoria,
    'Custo Total':    p.custo_total,
    'Preço de Venda': p.preco_venda ?? '',
    'Margem Aplic. %': p.margem_aplicada,
    'CMV %':          p.cmv_percentual ?? '',
    'Margem Bruta %': p.margem_bruta ?? '',
    'Lucro Bruto':    p.lucro_bruto ?? '',
    'Tempo Preparo':  `${p.tempo_preparo_min}min`,
    'Destaque':       p.destaque ? 'Sim' : 'Não',
  }))

  exportRowsCSV(dados, 'vf-nexus-produtos.xlsx')
}

export async function exportarRelatorioExcel(
  vendas: Venda[],
  produtos: Produto[],
  insumos: Insumo[]
): Promise<void> {
  const insights = gerarInsightsFinanceiros(vendas)
  const rows = [
    { Aba: 'Resumo Executivo', Indicador: 'Faturamento', Valor: insights.total },
    { Aba: 'Resumo Executivo', Indicador: 'Lucro bruto', Valor: insights.lucro },
    { Aba: 'Resumo Executivo', Indicador: 'CMV %', Valor: insights.cmv },
    { Aba: 'Resumo Executivo', Indicador: 'Ticket médio', Valor: insights.ticket },
    ...insights.alertas.map((texto, i) => ({ Aba: 'Insights', Indicador: `Insight ${i + 1}`, Valor: texto })),
    ...vendas.map(v => ({ 'Aba': 'Vendas',
    'Data':        v.data_venda,
    'Produto':     v.produto_nome,
    'Qtd':         v.quantidade,
    'Preço Unit.': v.preco_unitario,
    'Custo Unit.': v.custo_unitario,
    'Desconto':    v.desconto,
    'Total':       v.total,
    'Lucro':       v.lucro,
    'Canal':       v.canal,
  })),
    ...produtos.map(p => ({ 'Aba': 'Produtos', 'Produto': p.nome, 'Custo': p.custo_total, 'Venda': p.preco_venda, 'Margem%': p.margem_bruta, 'CMV%': p.cmv_percentual })),
    ...insumos.map(i => ({ 'Aba': 'Estoque', 'Insumo': i.nome, 'Estoque': i.estoque_atual, 'Mínimo': i.estoque_minimo, 'Vencimento': i.data_vencimento })),
  ]
  exportRowsCSV(rows, `vf-nexus-relatorio-${new Date().toISOString().split('T')[0]}.xlsx`)
}

// ---- EVENTOS ----
export async function exportarEventoPDF(evento: Evento, branding?: Partial<IdentidadeEmpresa>): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const { y: startY, theme } = addReportHeader(doc, 'Orçamento de evento', evento.nome, branding)

  lightPanel(doc, 14, startY, W - 28, 30, theme)
  const topo = [
    ['Pessoas', String(evento.pessoas)],
    ['Tipo', evento.tipo_evento],
    ['Data', evento.data_evento ? new Date(`${evento.data_evento}T00:00:00`).toLocaleDateString('pt-BR') : '—'],
    ['Status', evento.status],
  ]
  topo.forEach(([label, value], i) => {
    const x = 20 + i * 43
    doc.setFontSize(7)
    doc.setTextColor(...theme.muted)
    doc.text(label, x, startY + 10)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...theme.text)
    doc.text(value, x, startY + 20)
    doc.setFont('helvetica', 'normal')
  })

  doc.setTextColor(...theme.primary)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Produtos do evento', 14, startY + 43)
  autoTable(doc, {
    startY: startY + 48,
    head: [['Produto', 'Qtd.', 'Rendimento', 'Sobra', 'Custo Unit.', 'Custo Total']],
    body: (evento.itens ?? []).length ? (evento.itens ?? []).map(item => [
      item.produto_nome,
      String(item.quantidade_produtos),
      `${item.rendimento_total} ${item.unidade_rendimento}`,
      String(item.sobra_estimada),
      `R$ ${fmtBRL(item.custo_unitario)}`,
      `R$ ${fmtBRL(item.custo_total)}`,
    ]) : [['Nenhum produto informado', '—', '—', '—', '—', '—']],
    theme: 'plain',
    headStyles: { fillColor: theme.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fillColor: theme.surface, textColor: theme.text, fontSize: 8, lineColor: theme.border },
    alternateRowStyles: { fillColor: theme.surface2 },
    styles: { cellPadding: 2.5, lineColor: theme.border, lineWidth: 0.1 },
  })

  let y = ((doc as any).lastAutoTable?.finalY ?? 110) + 10
  lightPanel(doc, 14, y, W - 28, 50, theme)
  doc.setTextColor(...theme.primary)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumo financeiro', 20, y + 10)

  const indicadores = [
    ['Custo produtos', `R$ ${fmtBRL(evento.custo_produtos)}`, theme.error],
    ['Custo total', `R$ ${fmtBRL(evento.custo_total)}`, theme.error],
    ['Valor sugerido', `R$ ${fmtBRL(evento.preco_sugerido)}`, theme.primary],
    ['Por pessoa', `R$ ${fmtBRL(evento.preco_por_pessoa)}`, theme.info],
    ['Lucro estimado', `R$ ${fmtBRL(evento.lucro_estimado)}`, theme.success],
    ['CMV', fmtPct(evento.cmv_percentual), theme.warn],
  ] as const
  indicadores.forEach(([label, value, color], i) => {
    const x = 20 + (i % 3) * 58
    const rowY = y + 22 + Math.floor(i / 3) * 17
    doc.setFontSize(7)
    doc.setTextColor(...theme.muted)
    doc.setFont('helvetica', 'normal')
    doc.text(label, x, rowY)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...(color as [number, number, number]))
    doc.text(value, x, rowY + 8)
  })

  if (evento.observacoes) {
    y += 60
    lightPanel(doc, 14, y, W - 28, 30, theme)
    doc.setTextColor(...theme.primary)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Observações', 20, y + 9)
    doc.setTextColor(...theme.text)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(doc.splitTextToSize(evento.observacoes, W - 40).slice(0, 4), 20, y + 17)
  }

  addLightFooter(doc, theme, `${theme.b.nome} — Orçamento gerado pelo VF Nexus`)
  doc.save(`evento-${safeFileName(evento.nome)}.pdf`)
}

export async function exportarEventoExcel(evento: Evento): Promise<void> {
  const resumo = [{
    'Evento': evento.nome,
    'Tipo': evento.tipo_evento,
    'Data': evento.data_evento ?? '',
    'Status': evento.status,
    'Pessoas': evento.pessoas,
    'Margem %': evento.margem_lucro,
    'Custo Produtos': evento.custo_produtos,
    'Custo Total': evento.custo_total,
    'Valor Sugerido': evento.preco_sugerido,
    'Preço por Pessoa': evento.preco_por_pessoa,
    'Lucro Estimado': evento.lucro_estimado,
    'CMV %': evento.cmv_percentual,
    'Observações': evento.observacoes ?? '',
  }]

  const itens = (evento.itens ?? []).map(item => ({
    'Produto': item.produto_nome,
    'Categoria': item.categoria ?? '',
    'Consumo por Pessoa': item.consumo_por_pessoa,
    'Qtd Produtos': item.quantidade_produtos,
    'Rendimento Unitário': item.rendimento_unitario,
    'Unidade Rendimento': item.unidade_rendimento,
    'Rendimento Total': item.rendimento_total,
    'Sobra Estimada': item.sobra_estimada,
    'Custo Unitário': item.custo_unitario,
    'Custo Total': item.custo_total,
    'Preço Base Unitário': item.preco_unitario_base,
    'Receita Base': item.receita_sugerida,
  }))

  exportRowsCSV([...resumo.map(r => ({ Aba: 'Resumo', ...r })), ...itens.map(i => ({ Aba: 'Produtos', ...i }))], `evento-${evento.nome.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.xlsx`)
}


// ---- CARDÁPIO ----
export async function exportarCardapioPDF(
  cardapio: Cardapio | { nome: string; descricao?: string },
  produtos: CardapioProdutoView[],
  empresaNome = 'VF Nexus',
  branding?: Partial<IdentidadeEmpresa>
): Promise<void> {
  const { default: jsPDF } = await import('jspdf')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const theme = pdfTheme({ ...(branding ?? {}), nome: branding?.nome || empresaNome } as Partial<IdentidadeEmpresa>)
  const itens = produtos.filter(p => p.exibir && Number(p.preco_exibido) > 0)
  const destaque = itens.filter(p => p.promocao_ativa || p.destaque).length

  const drawPageBase = (title = 'Catálogo / Cardápio') => {
    fillPage(doc, theme)
    doc.setFillColor(...theme.surface)
    doc.roundedRect(12, 10, W - 24, 36, 6, 6, 'F')
    doc.setDrawColor(...theme.border)
    doc.roundedRect(12, 10, W - 24, 36, 6, 6, 'S')
    addLogo(doc, theme.b, 17, 17)
    doc.setTextColor(...theme.primary)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(19)
    doc.text(title, 36, 24)
    doc.setTextColor(...theme.text)
    doc.setFontSize(9.5)
    doc.text(theme.b.nome || empresaNome, 36, 32)
    doc.setTextColor(...theme.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(doc.splitTextToSize(cardapio.descricao || 'Produtos selecionados, promoções e preços atualizados.', W - 98).slice(0, 2), 36, 39)
    doc.setFillColor(...theme.primary)
    doc.roundedRect(W - 63, 18, 22, 12, 3, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(String(itens.length), W - 52, 26, { align: 'center' })
    doc.setTextColor(...theme.muted)
    doc.setFontSize(6.5)
    doc.text('ITENS', W - 52, 34, { align: 'center' })
    doc.setFillColor(...theme.success)
    doc.roundedRect(W - 36, 18, 22, 12, 3, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.text(String(destaque), W - 25, 26, { align: 'center' })
    doc.setTextColor(...theme.muted)
    doc.setFontSize(6.5)
    doc.text('DESTAQ.', W - 25, 34, { align: 'center' })
  }

  drawPageBase(String(cardapio.nome || 'Catálogo / Cardápio'))

  const porCategoria = new Map<string, CardapioProdutoView[]>()
  for (const item of itens) {
    const categoria = String(item.categoria || 'Outros').toUpperCase()
    porCategoria.set(categoria, [...(porCategoria.get(categoria) ?? []), item])
  }

  let y = 56
  for (const [categoria, lista] of porCategoria.entries()) {
    if (y > H - 42) {
      addLightFooter(doc, theme, `${theme.b.nome} — Catálogo gerado pelo VF Nexus`)
      doc.addPage()
      drawPageBase(String(cardapio.nome || 'Catálogo / Cardápio'))
      y = 56
    }

    doc.setFillColor(...theme.surface2)
    doc.roundedRect(14, y - 6, W - 28, 9, 2.5, 2.5, 'F')
    doc.setTextColor(...theme.primary)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(categoria, 18, y)
    y += 10

    for (const item of lista) {
      if (y > H - 38) {
        addLightFooter(doc, theme, `${theme.b.nome} — Catálogo gerado pelo VF Nexus`)
        doc.addPage()
        drawPageBase(String(cardapio.nome || 'Catálogo / Cardápio'))
        y = 56
      }

      const isPromo = Boolean(item.promocao_ativa)
      lightPanel(doc, 14, y - 5, W - 28, 24, theme, 4)
      if (item.destaque || isPromo) {
        doc.setFillColor(...(isPromo ? theme.success : theme.secondary))
        doc.roundedRect(14, y - 5, 2.8, 24, 2, 2, 'F')
      }

      doc.setTextColor(...theme.text)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(String(item.produto.nome).slice(0, 44), 20, y + 1)

      if (item.descricao_cardapio) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(...theme.muted)
        const lines = doc.splitTextToSize(item.descricao_cardapio, W - 84)
        doc.text(lines.slice(0, 2), 20, y + 7)
      }

      if (isPromo) {
        doc.setFillColor(...theme.success)
        doc.roundedRect(W - 62, y - 1, 18, 6, 1.5, 1.5, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(6.2)
        doc.setFont('helvetica', 'bold')
        doc.text('PROMO', W - 53, y + 3.4, { align: 'center' })
        doc.setTextColor(...theme.muted)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.text(`De R$ ${fmtBRL(item.preco_original)}`, W - 18, y + 1, { align: 'right' })
        doc.setTextColor(...theme.success)
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.text(`R$ ${fmtBRL(item.preco_exibido)}`, W - 18, y + 11, { align: 'right' })
      } else {
        doc.setTextColor(...theme.primary)
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.text(`R$ ${fmtBRL(item.preco_exibido)}`, W - 18, y + 8, { align: 'right' })
      }
      y += 29
    }
    y += 2
  }

  if (!itens.length) {
    lightPanel(doc, 14, 72, W - 28, 32, theme)
    doc.setTextColor(...theme.muted)
    doc.setFontSize(11)
    doc.text('Nenhum produto selecionado para o cardápio.', W / 2, 90, { align: 'center' })
  }

  const publicUrl = (cardapio as any).public_url || (cardapio as any).url_publica
  if (publicUrl) {
    if (y > H - 62) { addLightFooter(doc, theme, `${theme.b.nome} — Catálogo gerado pelo VF Nexus`); doc.addPage(); drawPageBase(String(cardapio.nome || 'Catálogo / Cardápio')); y = 58 }
    lightPanel(doc, 14, y, W - 28, 44, theme, 5)
    doc.setTextColor(...theme.primary)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Acesse pelo QR Code', 20, y + 10)
    doc.setTextColor(...theme.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(doc.splitTextToSize(String(publicUrl), W - 72), 20, y + 19)
    const qrData = await imageUrlToDataUrl(buildQrImageUrl(String(publicUrl), 220))
    if (qrData) { try { doc.addImage(qrData, 'PNG', W - 52, y + 7, 30, 30, undefined, 'FAST') } catch {} }
  }

  addLightFooter(doc, theme, `${theme.b.nome} — Catálogo/Cardápio gerado pelo VF Nexus`)
  doc.save(`cardapio-${safeFileName(cardapio.nome)}.pdf`)
}
