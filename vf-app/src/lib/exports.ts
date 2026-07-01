// ============================================================
// VF Nexus — EXPORTAÇÃO PDF E EXCEL
// ============================================================

import type { Produto, Insumo, Venda, Evento, CardapioProdutoView, Cardapio, IdentidadeEmpresa, ComprovantePayload } from '@/types'
import { fmtBRL, fmtPct } from './precificacao'
import { resolveBranding } from './branding'


function exportRowsCSV(rows: Array<Record<string, any>>, filename: string): void {
  const headerSet = new Set<string>()
  rows.forEach(row => Object.keys(row).forEach(k => headerSet.add(k)))
  const headers = Array.from(headerSet)
  const escape = (value: any) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const csv = [headers.map(escape).join(';'), ...rows.map(row => headers.map(h => escape(row[h])).join(';'))].join('\n')
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.replace(/\.xlsx$/i, '.csv')
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
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
    try { const fmt = dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg') ? 'JPEG' : 'PNG'; doc.addImage(dataUrl, fmt, x, y, 14, 14, undefined, 'FAST'); return } catch {}
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


export async function gerarComprovantePDFBlob(
  comprovante: ComprovantePayload,
  branding?: Partial<IdentidadeEmpresa>
): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const primary = hexToRgb(branding?.cor_primaria || '#0A8DFF')
  const secondary = hexToRgb(branding?.cor_secundaria || '#F2B72E')

  doc.setFillColor(4, 7, 13)
  doc.rect(0, 0, W, 46, 'F')
  doc.setDrawColor(primary[0], primary[1], primary[2])
  doc.setLineWidth(0.8)
  doc.line(14, 43, W - 14, 43)
  await addLogo(doc, branding || { nome: comprovante.empresa_nome, logo_url: '/nexlabs-logo.png', cor_primaria: '#0A8DFF' }, 14, 12)

  doc.setTextColor(248, 250, 252)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(comprovante.empresa_nome || branding?.nome || 'VF Nexus', 34, 19)
  doc.setFontSize(9)
  doc.setTextColor(200, 208, 220)
  doc.text(comprovante.tipo === 'agendamento' ? 'Comprovante de agendamento' : 'Comprovante de venda', 34, 27)
  doc.text(`Emitido em ${comprovante.data_hora}`, 34, 34)

  let y = 56
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, y, W - 28, 30, 4, 4, 'F')
  doc.setTextColor(17, 24, 39)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Dados do cliente', 20, y + 9)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Cliente: ${comprovante.cliente_nome || 'Consumidor final'}`, 20, y + 18)
  doc.text(`WhatsApp: ${comprovante.cliente_whatsapp || 'Não informado'}`, 20, y + 25)

  y += 42
  doc.setTextColor(primary[0], primary[1], primary[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Itens', 14, y)
  y += 7

  doc.setFillColor(15, 23, 42)
  doc.roundedRect(14, y, W - 28, 10, 3, 3, 'F')
  doc.setTextColor(248, 250, 252)
  doc.setFontSize(8)
  doc.text('Descrição', 18, y + 6)
  doc.text('Qtd.', W - 72, y + 6)
  doc.text('Unit.', W - 52, y + 6)
  doc.text('Total', W - 28, y + 6, { align: 'right' })
  y += 12

  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'normal')
  comprovante.itens.forEach((item, index) => {
    if (y > 245) { doc.addPage(); y = 20 }
    if (index % 2 === 0) { doc.setFillColor(245, 247, 250); doc.roundedRect(14, y - 5, W - 28, 10, 2, 2, 'F') }
    doc.setFontSize(8.5)
    doc.text(String(item.nome).slice(0, 56), 18, y + 1)
    doc.text(String(item.quantidade), W - 68, y + 1)
    doc.text(`R$ ${fmtBRL(item.valor_unitario)}`, W - 42, y + 1)
    doc.text(`R$ ${fmtBRL(item.total)}`, W - 18, y + 1, { align: 'right' })
    y += 10
  })

  y += 6
  const totalsX = W - 86
  doc.setDrawColor(226, 232, 240)
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
    doc.setTextColor(71, 85, 105)
    doc.text(label, totalsX, y)
    doc.text(`R$ ${fmtBRL(value)}`, W - 14, y, { align: 'right' })
    y += 7
  }
  doc.setFillColor(secondary[0], secondary[1], secondary[2])
  doc.roundedRect(totalsX - 2, y - 5, W - totalsX - 12, 12, 3, 3, 'F')
  doc.setTextColor(4, 7, 13)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL', totalsX + 2, y + 2)
  doc.text(`R$ ${fmtBRL(comprovante.total)}`, W - 18, y + 2, { align: 'right' })

  y += 22
  doc.setTextColor(71, 85, 105)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  if (comprovante.forma_pagamento) doc.text(`Forma de pagamento: ${String(comprovante.forma_pagamento).replace('_', ' ')}`, 14, y)
  if (comprovante.observacoes) doc.text(doc.splitTextToSize(`Observações: ${comprovante.observacoes}`, W - 28), 14, y + 7)

  doc.setFillColor(4, 7, 13)
  doc.rect(0, 277, W, 20, 'F')
  doc.setTextColor(248, 250, 252)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Agradecemos a preferência, e volte sempre.', W / 2, 287, { align: 'center' })
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(7)
  doc.text('Gerado pelo VF Nexus — criado pela NexLabs', W / 2, 293, { align: 'center' })

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
export async function exportarFichaTecnicaPDF(produto: Produto): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()

  // Header preto e dourado
  doc.setFillColor(10, 10, 10)
  doc.rect(0, 0, W, 40, 'F')

  doc.setTextColor(201, 168, 76)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('VF Nexus', 14, 18)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Precificação Gastronômica Premium', 14, 26)
  doc.text(new Date().toLocaleDateString('pt-BR'), W - 14, 26, { align: 'right' })

  // Título da ficha
  doc.setTextColor(245, 240, 232)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(produto.nome, 14, 36)

  // Info do produto
  doc.setFillColor(26, 26, 26)
  doc.rect(0, 42, W, 28, 'F')

  const infos = [
    ['Categoria',        produto.categoria],
    ['Tempo de preparo', `${produto.tempo_preparo_min} min`],
    ['Rendimento',       `${produto.rendimento} ${produto.unidade_rendimento}`],
    ['Custo total',      `R$ ${fmtBRL(produto.custo_total)}`],
  ]

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  infos.forEach(([label, val], i) => {
    const x = 14 + (i % 4) * 47
    doc.setTextColor(154, 148, 136)
    doc.text(label, x, 52)
    doc.setTextColor(245, 240, 232)
    doc.setFont('helvetica', 'bold')
    doc.text(String(val), x, 60)
    doc.setFont('helvetica', 'normal')
  })

  // Ficha técnica
  doc.setTextColor(201, 168, 76)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Ficha Técnica — Ingredientes', 14, 80)

  const fichaRows = (produto.ficha_tecnica ?? []).map(f => [
    f.insumo?.nome ?? '—',
    `${f.quantidade} ${f.unidade}`,
    `R$ ${fmtBRL(f.custo_calculado ?? 0)}`
  ])

  autoTable(doc, {
    startY: 84,
    head: [['Ingrediente', 'Quantidade', 'Custo']],
    body: fichaRows,
    foot: [['Total', '', `R$ ${fmtBRL(produto.custo_total)}`]],
    theme: 'plain',
    headStyles: { fillColor: [201, 168, 76], textColor: [10, 10, 10], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fillColor: [26, 26, 26], textColor: [245, 240, 232], fontSize: 9 },
    footStyles: { fillColor: [17, 17, 17], textColor: [201, 168, 76], fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [34, 34, 34] },
    styles: { cellPadding: 3 }
  })

  const finalY = (doc as any).lastAutoTable.finalY + 10

  // Painel de precificação
  doc.setFillColor(26, 26, 26)
  doc.rect(0, finalY, W, 44, 'F')

  doc.setTextColor(201, 168, 76)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Indicadores de Precificação', 14, finalY + 10)

  const indicadores = [
    { label: 'Preço de Venda',   val: `R$ ${fmtBRL(produto.preco_venda ?? 0)}`,    color: [226, 192, 112] },
    { label: 'Margem Bruta',     val: fmtPct(produto.margem_bruta ?? 0),            color: [61, 170, 107]  },
    { label: 'CMV',              val: fmtPct(produto.cmv_percentual ?? 0),          color: [212, 80, 80]   },
    { label: 'Lucro Bruto',      val: `R$ ${fmtBRL(produto.lucro_bruto ?? 0)}`,     color: [61, 170, 107]  },
  ]

  indicadores.forEach(({ label, val, color }, i) => {
    const x = 14 + i * 47
    doc.setTextColor(154, 148, 136)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(label, x, finalY + 22)
    doc.setTextColor(...(color as [number, number, number]))
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(val, x, finalY + 32)
  })

  // Modo de preparo
  if (produto.modo_preparo) {
    const mY = finalY + 52
    doc.setTextColor(201, 168, 76)
    doc.setFontSize(11)
    doc.text('Modo de Preparo', 14, mY)
    doc.setTextColor(245, 240, 232)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(produto.modo_preparo, W - 28)
    doc.text(lines, 14, mY + 7)
  }

  // Footer
  const footY = doc.internal.pageSize.getHeight() - 12
  doc.setFillColor(10, 10, 10)
  doc.rect(0, footY - 4, W, 20, 'F')
  doc.setTextColor(90, 86, 79)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('VF Nexus — Precificação Gastronômica Premium', 14, footY + 2)
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, W - 14, footY + 2, { align: 'right' })

  doc.save(`ficha-${produto.nome.toLowerCase().replace(/\s+/g, '-')}.pdf`)
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

  autoTable(doc, {
    startY: 78,
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

  exportRowsCSV(dados, 'vf-app-insumos.csv')
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

  exportRowsCSV(dados, 'vf-app-produtos.csv')
}

export async function exportarRelatorioExcel(
  vendas: Venda[],
  produtos: Produto[],
  insumos: Insumo[]
): Promise<void> {
  const rows = [
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
  exportRowsCSV(rows, `vf-nexus-relatorio-${new Date().toISOString().split('T')[0]}.csv`)
}

// ---- EVENTOS ----
export async function exportarEventoPDF(evento: Evento): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()

  doc.setFillColor(10, 10, 10)
  doc.rect(0, 0, W, 42, 'F')
  doc.setTextColor(201, 168, 76)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('VF Nexus', 30, 17)
  doc.setTextColor(154, 148, 136)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Orçamento Profissional de Evento', 14, 25)
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, W - 14, 25, { align: 'right' })
  doc.setTextColor(245, 240, 232)
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text(evento.nome, 14, 36)

  doc.setFillColor(26, 26, 26)
  doc.rect(0, 47, W, 34, 'F')
  const topo = [
    ['Pessoas', String(evento.pessoas)],
    ['Tipo', evento.tipo_evento],
    ['Data', evento.data_evento ? new Date(`${evento.data_evento}T00:00:00`).toLocaleDateString('pt-BR') : '—'],
    ['Status', evento.status],
  ]
  topo.forEach(([label, value], i) => {
    const x = 14 + i * 47
    doc.setFontSize(8)
    doc.setTextColor(154, 148, 136)
    doc.text(label, x, 58)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(245, 240, 232)
    doc.text(value, x, 68)
    doc.setFont('helvetica', 'normal')
  })

  doc.setTextColor(201, 168, 76)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Produtos do evento', 14, 94)

  autoTable(doc, {
    startY: 99,
    head: [['Produto', 'Qtd.', 'Rendimento', 'Sobra', 'Custo Unit.', 'Custo Total']],
    body: (evento.itens ?? []).map(item => [
      item.produto_nome,
      String(item.quantidade_produtos),
      `${item.rendimento_total} ${item.unidade_rendimento}`,
      String(item.sobra_estimada),
      `R$ ${fmtBRL(item.custo_unitario)}`,
      `R$ ${fmtBRL(item.custo_total)}`,
    ]),
    theme: 'plain',
    headStyles: { fillColor: [201, 168, 76], textColor: [10, 10, 10], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fillColor: [26, 26, 26], textColor: [245, 240, 232], fontSize: 8 },
    alternateRowStyles: { fillColor: [34, 34, 34] },
    styles: { cellPadding: 2.5 },
  })

  const y = ((doc as any).lastAutoTable?.finalY ?? 110) + 10
  doc.setFillColor(17, 17, 17)
  doc.rect(0, y, W, 52, 'F')
  doc.setTextColor(201, 168, 76)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumo financeiro', 14, y + 10)

  const indicadores = [
    ['Custo produtos', `R$ ${fmtBRL(evento.custo_produtos)}`, [212, 80, 80]],
    ['Custo total', `R$ ${fmtBRL(evento.custo_total)}`, [212, 80, 80]],
    ['Valor sugerido', `R$ ${fmtBRL(evento.preco_sugerido)}`, [226, 192, 112]],
    ['Por pessoa', `R$ ${fmtBRL(evento.preco_por_pessoa)}`, [74, 143, 212]],
    ['Lucro estimado', `R$ ${fmtBRL(evento.lucro_estimado)}`, [61, 170, 107]],
    ['CMV', fmtPct(evento.cmv_percentual), [232, 184, 75]],
  ] as const

  indicadores.forEach(([label, value, color], i) => {
    const x = 14 + (i % 3) * 62
    const rowY = y + 22 + Math.floor(i / 3) * 18
    doc.setFontSize(8)
    doc.setTextColor(154, 148, 136)
    doc.setFont('helvetica', 'normal')
    doc.text(label, x, rowY)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(color[0], color[1], color[2])
    doc.text(value, x, rowY + 8)
  })

  if (evento.observacoes) {
    const obsY = y + 62
    doc.setTextColor(201, 168, 76)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Observações', 14, obsY)
    doc.setTextColor(245, 240, 232)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(doc.splitTextToSize(evento.observacoes, W - 28), 14, obsY + 7)
  }

  const footY = doc.internal.pageSize.getHeight() - 12
  doc.setFillColor(10, 10, 10)
  doc.rect(0, footY - 4, W, 18, 'F')
  doc.setTextColor(90, 86, 79)
  doc.setFontSize(7)
  doc.text('VF Nexus — Precificação Gastronômica Premium para Eventos', 14, footY + 2)
  doc.text('Proposta sujeita a validação operacional e disponibilidade de insumos.', W - 14, footY + 2, { align: 'right' })

  doc.save(`evento-${evento.nome.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.pdf`)
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

  exportRowsCSV([...resumo.map(r => ({ Aba: 'Resumo', ...r })), ...itens.map(i => ({ Aba: 'Produtos', ...i }))], `evento-${evento.nome.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.csv`)
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
  const itens = produtos.filter(p => p.exibir && Number(p.preco_exibido) > 0)
  const destaque = itens.filter(p => p.promocao_ativa || p.destaque).length

  doc.setFillColor(10, 10, 10)
  doc.rect(0, 0, W, H, 'F')
  const primary = hexToRgb(branding?.cor_primaria)
  doc.setFillColor(primary[0], primary[1], primary[2])
  doc.rect(0, 0, 5, H, 'F')
  await addLogo(doc, branding, 16, 14)

  doc.setTextColor(primary[0], primary[1], primary[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.text('CARDÁPIO', 32, 24)
  doc.setFontSize(11)
  doc.setTextColor(245, 240, 232)
  doc.text(branding?.nome || empresaNome, 32, 33)
  doc.setTextColor(154, 148, 136)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(cardapio.descricao || 'Produtos selecionados e precificados pelo VF Nexus', 32, 40)

  addMetricCard(doc, W - 75, 16, 26, 'Itens', String(itens.length), [226, 192, 112])
  addMetricCard(doc, W - 45, 16, 30, 'Promoções', String(destaque), [61, 170, 107])

  const porCategoria = new Map<string, CardapioProdutoView[]>()
  for (const item of itens) {
    const categoria = String(item.categoria || 'Outros').toUpperCase()
    porCategoria.set(categoria, [...(porCategoria.get(categoria) ?? []), item])
  }

  let y = 55
  for (const [categoria, lista] of porCategoria.entries()) {
    if (y > H - 45) {
      addPremiumFooter(doc, 'VF Nexus — Cardápio Premium', branding)
      doc.addPage()
      doc.setFillColor(10, 10, 10)
      doc.rect(0, 0, W, H, 'F')
      doc.setFillColor(201, 168, 76)
      doc.rect(0, 0, 5, H, 'F')
      y = 20
    }

    doc.setFillColor(26, 26, 26)
    doc.roundedRect(14, y - 6, W - 28, 10, 2, 2, 'F')
    doc.setTextColor(201, 168, 76)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(categoria, 18, y)
    y += 11

    for (const item of lista) {
      if (y > H - 35) {
        addPremiumFooter(doc, 'VF Nexus — Cardápio Premium', branding)
        doc.addPage()
        doc.setFillColor(10, 10, 10)
        doc.rect(0, 0, W, H, 'F')
        doc.setFillColor(201, 168, 76)
        doc.rect(0, 0, 5, H, 'F')
        y = 22
      }

      const isPromo = Boolean(item.promocao_ativa)
      doc.setFillColor(item.destaque || isPromo ? 22 : 17, 17, 17)
      doc.roundedRect(14, y - 5, W - 28, 24, 3, 3, 'F')
      doc.setDrawColor(isPromo ? 201 : 45, isPromo ? 168 : 45, isPromo ? 76 : 45)
      doc.roundedRect(14, y - 5, W - 28, 24, 3, 3, 'S')

      doc.setTextColor(245, 240, 232)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(item.produto.nome, 18, y + 1)

      if (item.descricao_cardapio) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(154, 148, 136)
        const lines = doc.splitTextToSize(item.descricao_cardapio, W - 78)
        doc.text(lines.slice(0, 2), 18, y + 7)
      }

      if (isPromo) {
        doc.setFillColor(61, 170, 107)
        doc.roundedRect(W - 60, y - 1, 19, 6, 1.5, 1.5, 'F')
        doc.setTextColor(10, 10, 10)
        doc.setFontSize(6.5)
        doc.setFont('helvetica', 'bold')
        doc.text('PROMO', W - 56.5, y + 3.5)
        doc.setTextColor(154, 148, 136)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.text(`De R$ ${fmtBRL(item.preco_original)}`, W - 18, y + 1, { align: 'right' })
        doc.setTextColor(61, 170, 107)
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.text(`R$ ${fmtBRL(item.preco_exibido)}`, W - 18, y + 11, { align: 'right' })
      } else {
        doc.setTextColor(201, 168, 76)
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.text(`R$ ${fmtBRL(item.preco_exibido)}`, W - 18, y + 8, { align: 'right' })
      }
      y += 29
    }
    y += 2
  }

  if (!itens.length) {
    doc.setTextColor(154, 148, 136)
    doc.setFontSize(12)
    doc.text('Nenhum produto selecionado para o cardápio.', W / 2, H / 2, { align: 'center' })
  }

  addPremiumFooter(doc, 'Gerado pelo VF Nexus — Cardápio Premium', branding)
  doc.save(`cardapio-${safeFileName(cardapio.nome)}.pdf`)
}
