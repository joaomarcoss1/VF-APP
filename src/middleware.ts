import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/icon-') ||
    pathname.startsWith('/icons/') ||
    /\.(png|jpg|jpeg|webp|svg|ico|css|js|map|txt|json)$/i.test(pathname)
  )
}

function isPublicRoute(pathname: string) {
  return (
    pathname === '/' ||
    pathname.startsWith('/selecionar-ramo') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/atendimento/login-funcionario') ||
    pathname.startsWith('/catalogo/') ||
    pathname.startsWith('/cardapio/') ||
    pathname === '/api/health' ||
    isPublicAsset(pathname)
  )
}

function hasSupabaseAuthCookie(req: NextRequest) {
  // Evita importar @supabase/auth-helpers no Edge Runtime, que deixava o build lento/travado.
  // A validação forte continua no Supabase/RLS e nos services. O middleware só faz o gate rápido de UX.
  return req.cookies.getAll().some((cookie) => {
    const name = cookie.name.toLowerCase()
    return (
      name === 'supabase-auth-token' ||
      name.includes('sb-') && (name.includes('auth-token') || name.includes('auth'))
    )
  })
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (isPublicRoute(pathname)) return NextResponse.next()

  if (!hasSupabaseEnv()) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('erro', 'supabase-env')
    return NextResponse.redirect(url)
  }

  if (!hasSupabaseAuthCookie(req)) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api/health|_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\..*).*)'],
}
