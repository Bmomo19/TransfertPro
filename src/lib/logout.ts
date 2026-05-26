export function getLogoutUrl(tenantSlug?: string | null): string {
  if (typeof window === 'undefined') return '/login'
  const { protocol, hostname, port } = window.location
  const p = port ? `:${port}` : ''

  // Sous-domaine localhost (dev)
  if (hostname.endsWith('.localhost') || (hostname.split('.').length === 2 && hostname.endsWith('localhost'))) {
    if (!tenantSlug) return `${protocol}//localhost${p}/login`
    return `${protocol}//${tenantSlug}.localhost${p}/login`
  }

  // Domaine custom en production (*.transfertpro.com)
  if (hostname.endsWith('.transfertpro.com') || hostname === 'transfertpro.com') {
    if (!tenantSlug) return `${protocol}//transfertpro.com/login`
    return `${protocol}//${tenantSlug}.transfertpro.com/login`
  }

  // Fallback : Vercel ou autre domaine sans sous-domaine → query param
  const base = `${protocol}//${hostname}${p}/login`
  return tenantSlug ? `${base}?tenant=${tenantSlug}` : base
}
