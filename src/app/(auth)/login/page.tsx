import { Suspense } from 'react'
import { getTenantSlug, getTenantBySlug } from '@/lib/tenant'
import { LoginClient } from './LoginClient'

export default async function LoginPage() {
  const slug = await getTenantSlug()

  let tenant: { slug: string; name: string; color: string } | undefined

  if (slug && slug !== 'superadmin') {
    const t = await getTenantBySlug(slug)
    if (t) {
      tenant = { slug: t.slug, name: t.name, color: t.colorPrimary }
    }
  }

  return (
    <Suspense>
      <LoginClient tenant={tenant} />
    </Suspense>
  )
}
