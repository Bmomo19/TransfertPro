import { NextResponse, type NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const tenant    = req.nextUrl.searchParams.get('tenant')
  const loginPath = tenant ? `/login?tenant=${tenant}` : '/login'

  const res = NextResponse.redirect(new URL(loginPath, req.url))

  // Supprimer tous les cookies présents dans la requête dont le nom contient "next-auth"
  for (const cookie of req.cookies.getAll()) {
    if (cookie.name.includes('next-auth') || cookie.name.includes('__Secure-next-auth') || cookie.name.includes('__Host-next-auth')) {
      res.cookies.set(cookie.name, '', {
        maxAge:   0,
        path:     '/',
        secure:   req.url.startsWith('https'),
        httpOnly: true,
        sameSite: 'lax',
      })
    }
  }

  return res
}
