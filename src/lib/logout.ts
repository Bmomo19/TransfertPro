export function getLogoutUrl(tenantSlug?: string | null): string {
  if (typeof window === 'undefined') return '/login'
  const { protocol, port } = window.location
  const p = port ? `:${port}` : ''
  const local = window.location.hostname.includes('localhost')
  if (!tenantSlug) {
    return local ? `${protocol}//localhost${p}` : `${protocol}//transfertpro.com`
  }
  return local
    ? `${protocol}//${tenantSlug}.localhost${p}/login`
    : `${protocol}//${tenantSlug}.transfertpro.com/login`
}
