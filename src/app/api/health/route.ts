import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: 'VF Nexus',
    version: 'V15.1 Billing e Operação Comercial',
    timestamp: new Date().toISOString(),
    supabase: {
      configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    stripe: {
      configured: Boolean(process.env.STRIPE_SECRET_KEY),
      webhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      prices: {
        starter: Boolean(process.env.STRIPE_PRICE_STARTER),
        profissional: Boolean(process.env.STRIPE_PRICE_PROFISSIONAL),
        premium: Boolean(process.env.STRIPE_PRICE_PREMIUM),
      },
    },
    checks: ['billing', 'tenant', 'permissions', 'cash-register', 'audit', 'onboarding'],
  })
}
