import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const DAILY_LIMIT = Number(process.env.IA_DAILY_LIMIT ?? 50)
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'

const fallbackMessage = `VF Inteligência ainda não está conectada a uma chave Anthropic.

Para ativar a IA real, adicione ANTHROPIC_API_KEY no arquivo .env.local e reinicie o servidor.

Enquanto isso, você já pode usar o app para cadastrar insumos, produtos, fichas técnicas, calcular custos, CMV, margem, lucro e exportar relatórios.`

function adminClient() {
  if (!url || !serviceKey) throw new Error('Supabase Admin não configurado para validar sessão da IA.')
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function requireSession(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) throw new Error('Sessão ausente. Entre no app para usar a VF Inteligência.')
  const supabase = adminClient()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) throw new Error('Sessão inválida. Entre novamente no app.')

  const { data: perfil, error: perfilError } = await supabase
    .from('perfis')
    .select('empresa_id,bloqueado')
    .eq('id', data.user.id)
    .maybeSingle()

  if (perfilError) throw perfilError
  if (!perfil?.empresa_id) throw new Error('Perfil sem empresa vinculada.')
  if (perfil.bloqueado) throw new Error('Usuário bloqueado. Fale com o suporte do VF Nexus.')
  return { supabase, user: data.user, empresaId: perfil.empresa_id as string }
}

async function enforceDailyLimit(supabase: ReturnType<typeof adminClient>, empresaId: string, userId: string) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from('ia_usage_log')
    .select('id', { count: 'exact', head: true })
    .eq('empresa_id', empresaId)
    .gte('created_at', start.toISOString())

  if (error) throw error
  if ((count ?? 0) >= DAILY_LIMIT) {
    throw new Error(`Limite diário de ${DAILY_LIMIT} mensagens de IA atingido para esta empresa. Tente novamente amanhã.`)
  }

  const { error: insertError } = await supabase.from('ia_usage_log').insert({ empresa_id: empresaId, usuario_id: userId })
  if (insertError) throw insertError
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    const { supabase, user, empresaId } = await requireSession(req)
    const { messages = [], context = '' } = (await req.json()) as { messages?: ChatMessage[]; context?: string }

    if (!apiKey) {
      return NextResponse.json({ content: fallbackMessage, configured: false })
    }

    await enforceDailyLimit(supabase, empresaId, user.id)

    const anthropic = new Anthropic({ apiKey })
    const safeMessages = messages
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: m.content }))

    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1200,
      system:
        context ||
        'Você é a VF Inteligência, assistente especialista em gestão, precificação, vendas, estoque, agenda, CMV, fichas técnicas e margem de lucro. Responda em português do Brasil.',
      messages: safeMessages,
    })

    const content = response.content.find((block) => block.type === 'text')
    return NextResponse.json({ content: content?.text ?? 'Não consegui gerar uma resposta agora.', configured: true })
  } catch (error: any) {
    const message = error?.message ?? 'Erro desconhecido'
    const authError = /sessão|perfil|bloqueado|limite diário/i.test(message)
    return NextResponse.json(
      {
        content: authError
          ? message
          : 'Não consegui consultar a VF Inteligência agora. O app continua funcionando normalmente; confira a chave ANTHROPIC_API_KEY e tente novamente.',
        error: message,
      },
      { status: authError ? 401 : 200 },
    )
  }
}
