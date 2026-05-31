/**
 * Cloudflare Worker — Multi-tenant proxy pour TransfertPro
 *
 * Route : *.transfertpro.com/*
 *
 * Ce Worker :
 *  1. Extrait le slug tenant depuis le sous-domaine
 *  2. Forwardc la requête vers Vercel avec le header x-tenant
 *  3. Réécrit les headers Location (redirects NextAuth) pour
 *     garder l'utilisateur sur le bon sous-domaine
 */

const VERCEL_HOST = 'transferpro-taupe.vercel.app'

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const originalHost = url.hostname          // hudiphen.transfertpro.com
    const parts = originalHost.split('.')

    // Extraire le tenant : hudiphen.transfertpro.com → "hudiphen"
    const tenant = parts.length >= 3 && parts[0] !== 'www' ? parts[0] : ''

    // Réécrire l'URL vers Vercel
    url.hostname = VERCEL_HOST

    // Construire les headers
    const headers = new Headers(request.headers)
    if (tenant) headers.set('x-tenant', tenant)
    headers.set('x-forwarded-host', originalHost)
    headers.set('x-forwarded-proto', 'https')

    // Fetch vers Vercel sans suivre les redirects
    const response = await fetch(url.toString(), {
      method:   request.method,
      headers,
      body:     request.body,
      redirect: 'manual',
    })

    // Réécrire le header Location si présent (redirects NextAuth post-login)
    const location = response.headers.get('location')
    if (!location) return response

    const newHeaders = new Headers(response.headers)
    try {
      const locUrl = new URL(location)
      if (locUrl.hostname === VERCEL_HOST) {
        locUrl.hostname = originalHost
        newHeaders.set('location', locUrl.toString())
      }
    } catch {
      // Location relative, pas besoin de réécrire
    }

    return new Response(response.body, {
      status:     response.status,
      statusText: response.statusText,
      headers:    newHeaders,
    })
  },
}
