import { cache } from 'react'
import { headers } from 'next/headers'
import { prisma } from './db'

export const getTenantBySlug = cache(async (slug: string) => {
  return prisma.tenant.findUnique({
    where: { slug, isActive: true },
    include: {
      reseaux:    { where: { isActive: true }, orderBy: { ordre: 'asc' } },
      thresholds: { include: { reseau: true } },
    },
  })
})

export async function getTenantSlug(): Promise<string> {
  return (await headers()).get('x-tenant-slug') ?? ''
}

export async function getRequestMeta() {
  const hdrs = await headers()
  return {
    ip: hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
    ua: hdrs.get('user-agent') ?? 'unknown',
  }
}