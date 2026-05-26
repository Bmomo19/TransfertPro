import { Suspense } from 'react'
import { getTenantSlug, getTenantBySlug } from '@/lib/tenant'
import { prisma } from '@/lib/db'
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

  // Charger les tenants actifs depuis la BD pour l'écran de sélection
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
    select: { slug: true, name: true, colorPrimary: true },
    orderBy: { name: 'asc' },
  })

  return (
    <Suspense>
      <LoginClient tenant={tenant} tenants={tenants} />
    </Suspense>
  )
}
