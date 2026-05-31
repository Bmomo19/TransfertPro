import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const PUBLIC  = ['/login', '/api/auth', '/api/logout']
const STATIC  = ['/_next/', '/favicon', '/icons/', '/manifest', '/sw.js']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Ignorer les assets statiques
  if (STATIC.some(p => pathname.startsWith(p))) return NextResponse.next()

  // Extraire le tenant depuis l'hostname ou le query param ?tenant=
  const host       = req.headers.get('host') ?? ''
  const tenantSlug = extractSlug(host, req.headers.get('x-tenant'), req.nextUrl.searchParams.get('tenant'))

  const reqHeaders = new Headers(req.headers)
  if (tenantSlug) reqHeaders.set('x-tenant-slug', tenantSlug)

  // Routes publiques
  if (PUBLIC.some(p => pathname.startsWith(p))) {
    return NextResponse.next({ request: { headers: reqHeaders } })
  }

  // Vérifier la session
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    const url = new URL('/login', req.url)
    if (tenantSlug) url.searchParams.set('tenant', tenantSlug)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  // Forcer le changement de PIN
  if (token.mustChangePin && !pathname.startsWith('/change-pin')) {
    return NextResponse.redirect(new URL('/change-pin', req.url))
  }

  // RBAC : seul le superadmin accède à /superadmin/*
  if (pathname.startsWith('/superadmin') && token.role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Les agents n'accèdent qu'à /saisie, /creances et /change-pin
  if (token.actorType === 'AGENT') {
    const allowed = ['/saisie', '/creances', '/change-pin']
    if (!allowed.some(p => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL('/saisie', req.url))
    }
  }

  reqHeaders.set('x-user-id',    token.sub ?? '')
  reqHeaders.set('x-user-role',  token.role as string)
  reqHeaders.set('x-actor-type', token.actorType as string)
  if (token.tenantId)  reqHeaders.set('x-tenant-id',  token.tenantId as string)
  if (token.tenantSlug) reqHeaders.set('x-tenant-slug', token.tenantSlug as string)

  return NextResponse.next({ request: { headers: reqHeaders } })
}

function extractSlug(host: string, xTenant: string | null, queryTenant: string | null = null): string {
  if (xTenant) return xTenant      // header dev override
  if (queryTenant) return queryTenant  // ?tenant= (pas de sous-domaine custom)
  const hostname = host.split(':')[0]  // strip port
  const parts = hostname.split('.')
  // hudiphen.localhost (dev) → ['hudiphen', 'localhost']
  if (parts.length === 2 && parts[1] === 'localhost' && parts[0] !== 'www' && parts[0] !== 'app') {
    return parts[0]
  }
  // hudiphen.transfertpro.com (prod) → ['hudiphen', 'transfertpro', 'com']
  if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'app') return parts[0]
  return ''
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}