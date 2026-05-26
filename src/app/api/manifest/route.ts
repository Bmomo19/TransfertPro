import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getTenantBySlug, getTenantSlug } from '@/lib/tenant'

export async function GET() {
  const slug   = await getTenantSlug()
  const tenant = slug ? await getTenantBySlug(slug) : null

  const manifest = {
    name:             tenant ? `${tenant.name} — TransfertPro` : 'TransfertPro',
    short_name:       tenant?.name ?? 'TransfertPro',
    description:      "Gestion journalière de trésorerie",
    start_url:        '/',
    display:          'standalone',
    orientation:      'portrait',
    background_color: tenant?.colorPrimary ?? '#0B2D8F',
    theme_color:      tenant?.colorPrimary ?? '#0B2D8F',
    lang:             'fr',
    icons: [
      { src:'/icons/icon-192.svg', sizes:'192x192', type:'image/svg+xml', purpose:'any maskable' },
      { src:'/icons/icon-512.svg', sizes:'512x512', type:'image/svg+xml', purpose:'any maskable' },
    ],
  }
  return NextResponse.json(manifest, {
    headers: { 'Content-Type':'application/manifest+json', 'Cache-Control':'no-cache' }
  })
}