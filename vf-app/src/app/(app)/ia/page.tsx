'use client'
import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Button, Card } from '@/components/ui'
import { ProdutosService, InsumosService, DashboardService } from '@/services'
import { createBrowserClient } from '@/lib/supabase'
import { fmtCurrency, fmtPct } from '@/lib/precificacao'

interface Message { role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS = [
  'Quais produtos devo remover do cardápio por baixa margem?',
  'Como posso reduzir meu CMV abaixo de 30%?',
  'Que promoções e combos posso criar para aumentar o ticket médio?',
  'Analise meus produtos mais e menos rentáveis.',
  'Como precificar um novo produto de forma competitiva?',
  'Quais ingredientes posso substituir para reduzir custos?',
]

export default function IAPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: dashboard } = useQuery({ queryKey: ['dashboard'], queryFn: DashboardService.obter })
  const { data: produtos   } = useQuery({ queryKey: ['produtos'],  queryFn: () => ProdutosService.listar() })
  const { data: alertas    } = useQuery({ queryKey: ['alertas-estoque'], queryFn: InsumosService.alertasEstoque })

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const buildContext = () => {
    const prods = (produtos ?? []).slice(0, 20).map(p =>
      `${p.nome} (${p.categoria}): custo R$${p.custo_total.toFixed(2)}, venda R$${(p.preco_venda ?? 0).toFixed(2)}, margem ${(p.margem_bruta ?? 0).toFixed(1)}%, CMV ${(p.cmv_percentual ?? 0).toFixed(1)}%`
    ).join('\n')

    const alerts = (alertas ?? []).map(a => `- ${a.mensagem}`).join('\n')

    return `Você é a VF Inteligência, assistente especializada em precificação gastronômica do VF Nexus.

DADOS DA EMPRESA:
- Faturamento do mês: ${fmtCurrency(dashboard?.faturamento_mes ?? 0)}
- Lucro do mês: ${fmtCurrency(dashboard?.lucro_mes ?? 0)}
- CMV médio: ${fmtPct(dashboard?.cmv_medio ?? 0)}
- Margem média: ${fmtPct(dashboard?.margem_media ?? 0)}
- Total de produtos: ${dashboard?.total_produtos ?? 0}

PRODUTOS CADASTRADOS:
${prods || 'Nenhum produto ainda.'}

ALERTAS DE ESTOQUE:
${alerts || 'Nenhum alerta.'}

Responda sempre em português, de forma direta, objetiva e profissional. 
Use números reais dos dados acima nas suas análises.
Dê recomendações concretas e acionáveis.`
  }

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')

    const newMessages: Message[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const { data: sessionData } = await createBrowserClient().auth.getSession()
      const token = sessionData.session?.access_token
      const res = await fetch('/api/ia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: newMessages, context: buildContext() }),
      })
      if (!res.ok) throw new Error('Erro na API')
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.content }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Erro ao conectar com a VF Inteligência. Verifique sua chave ANTHROPIC_API_KEY.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="vf-fadein flex flex-col h-[calc(100vh-0px)]">
      <Header title="VF Inteligência" />

      <div className="flex flex-1 min-h-0 gap-0">
        {/* Chat */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.25)] flex items-center justify-center text-2xl mb-4">✦</div>
                <div className="text-[16px] font-semibold text-[var(--vf-text)] mb-2">VF Inteligência</div>
                <div className="text-[13px] text-[var(--vf-text3)] max-w-sm mb-8">
                  Assistente especializada em precificação gastronômica. Analiso seus dados e ofereço recomendações reais.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
                  {QUICK_PROMPTS.map(p => (
                    <button key={p} onClick={() => sendMessage(p)}
                      className="text-left p-3 rounded-lg bg-[var(--vf-surface2)] border border-[var(--vf-border)] hover:border-[rgba(201,168,76,0.3)] text-[12px] text-[var(--vf-text2)] hover:text-[var(--vf-text)] transition-all">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-[#C9A84C] flex items-center justify-center text-[#0A0A0A] text-xs font-bold flex-shrink-0 mt-1">✦</div>
                )}
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.2)] text-[var(--vf-text)] rounded-br-sm'
                    : 'bg-[var(--vf-surface2)] border border-[rgba(255,255,255,0.06)] text-[var(--vf-text)] rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-[#222] border border-[rgba(201,168,76,0.2)] flex items-center justify-center text-[var(--vf-primary)] text-xs font-bold flex-shrink-0 mt-1">U</div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-full bg-[#C9A84C] flex items-center justify-center text-[#0A0A0A] text-xs font-bold flex-shrink-0">✦</div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-[var(--vf-surface2)] border border-[rgba(255,255,255,0.06)]">
                  <div className="flex items-center gap-1.5">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-bounce" style={{ animationDelay: `${i*150}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[var(--vf-border)] p-4">
            <div className="flex gap-3">
              <input
                className="vf-input flex-1"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Pergunte sobre custos, margens, estoque..."
                disabled={loading}
              />
              <Button onClick={() => sendMessage()} loading={loading} disabled={!input.trim()}>
                Enviar
              </Button>
            </div>
            <div className="mt-2 text-[10px] text-[var(--vf-text3)] text-center">
              VF Inteligência usa seus dados reais para análises personalizadas
            </div>
          </div>
        </div>

        {/* Sidebar contexto */}
        <div className="hidden lg:flex flex-col w-64 border-l border-[var(--vf-border)] p-4 space-y-4 overflow-y-auto">
          <div className="text-[10px] text-[var(--vf-text3)] uppercase tracking-widest">Contexto atual</div>

          <Card className="p-3 space-y-2">
            <div className="text-[10px] text-[var(--vf-text3)] uppercase">Este mês</div>
            <div className="text-[13px] text-[var(--vf-text2)]">Fat: <span className="text-[var(--vf-primary)] font-medium">{fmtCurrency(dashboard?.faturamento_mes ?? 0)}</span></div>
            <div className="text-[13px] text-[var(--vf-text2)]">Lucro: <span className="text-[#3DAA6B] font-medium">{fmtCurrency(dashboard?.lucro_mes ?? 0)}</span></div>
            <div className="text-[13px] text-[var(--vf-text2)]">CMV: <span className="font-medium" style={{ color: (dashboard?.cmv_medio ?? 0) > 35 ? '#D45050' : '#3DAA6B' }}>{fmtPct(dashboard?.cmv_medio ?? 0)}</span></div>
          </Card>

          {(alertas?.length ?? 0) > 0 && (
            <Card className="p-3">
              <div className="text-[10px] text-[var(--vf-text3)] uppercase mb-2">Alertas</div>
              <div className="space-y-1">
                {alertas!.slice(0, 5).map((a, i) => (
                  <div key={i} className="text-[11px] text-[var(--vf-text2)] leading-relaxed">{a.mensagem}</div>
                ))}
              </div>
            </Card>
          )}

          <div className="text-[10px] text-[var(--vf-text3)] uppercase mt-2">Atalhos</div>
          <div className="space-y-1">
            {QUICK_PROMPTS.slice(0, 4).map(p => (
              <button key={p} onClick={() => sendMessage(p)}
                className="w-full text-left text-[11px] text-[var(--vf-text3)] hover:text-[var(--vf-primary)] transition-colors py-1 border-b border-[rgba(255,255,255,0.03)] last:border-0">
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
