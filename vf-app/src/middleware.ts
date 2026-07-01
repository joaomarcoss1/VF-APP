import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const res = NextResponse.next()

  const isPublicRoute =
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/') ||
    pathname === '/manifest.json' ||
    pathname.startsWith('/icons/')

  if (isPublicRoute) return res

  if (!hasSupabaseEnv()) {
    const url = req.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('erro', 'supabase-env')
    return NextResponse.redirect(url)
  }

  const supabase = createMiddlewareClient({ req, res })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)'],
}
