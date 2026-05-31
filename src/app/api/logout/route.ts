import { NextResponse, type NextRequest } from 'next/server'

// Déconnexion instantanée : supprime les cookies NextAuth côté serveur et redirige.
// Évite le double aller-retour de signOut({ redirect: false }) + window.location.href.
export async function GET(req: NextRequest) {
  const tenant      = req.nextUrl.searchParams.get('tenant')
  const loginPath   = tenant ? `/login?tenant=${tenant}` : '/login'
  const redirectUrl = new URL(loginPath, req.url)

  const res = NextResponse.redirect(redirectUrl)

  // Supprimer tous les cookies NextAuth (HTTP dev + HTTPS prod)
  const cookiesToClear = [
    'next-auth.session-token',
    'next-auth.csrf-token',
    'next-auth.callback-url',
    '__Secure-next-auth.session-token',
    '__Secure-next-auth.csrf-token',
    '__Secure-next-auth.callback-url',
    '__Host-next-auth.csrf-token',
  ]
  for (const name of cookiesToClear) {
    res.cookies.set(name, '', { maxAge: 0, path: '/' })
  }

  return res
}
