'use server'
import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generatePin, hashPin } from '@/lib/pin'
import { audit } from '@/lib/audit'
import { getRequestMeta } from '@/lib/tenant'
import { DEFAULT_RESEAUX } from '@/lib/constants'
import type { ActionResult } from '@/types'

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') throw new Error('Accès refusé')
  return session.user
}

const TenantSchema = z.object({
  slug:           z.string().min(2).max(30).regex(/^[a-z0-9-]+$/),
  name:           z.string().min(2).max(100),
  colorPrimary:   z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#F97316'),
  colorSecondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#FFF7ED'),
  plan:           z.enum(['STARTER', 'STANDARD', 'PREMIUM']).default('STARTER'),
  respName:       z.string().min(2),
  respEmail:      z.string().email(),
})

export async function createTenant(formData: FormData): Promise<ActionResult<{ respPin: string }>> {
  try {
    const admin = await requireSuperAdmin()
    const parsed = TenantSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
    const d = parsed.data
    const { ip, ua } = await getRequestMeta()

    // Vérifier slug unique
    const exists = await prisma.tenant.findUnique({ where: { slug: d.slug } })
    if (exists) return { ok: false, error: `Le slug "${d.slug}" est déjà utilisé` }

    // Créer le tenant
    const tenant = await prisma.tenant.create({
      data: {
        slug: d.slug, name: d.name,
        colorPrimary: d.colorPrimary, colorSecondary: d.colorSecondary,
        plan: d.plan,
      },
    })

    // Créer les réseaux par défaut
    await prisma.tenantReseau.createMany({
      data: DEFAULT_RESEAUX.map((r, i) => ({ ...r, tenantId: tenant.id, ordre: i + 1 })),
    })

    // Récupérer les réseaux créés pour les seuils
    const reseaux = await prisma.tenantReseau.findMany({ where: { tenantId: tenant.id } })
    await prisma.threshold.createMany({
      data: reseaux.map((r : { id: string }) => ({ tenantId: tenant.id, reseauId: r.id, min: 200000, max: 5000000 })),
    })

    // Créer le responsable
    const pin     = generatePin()
    const pinHash = await hashPin(pin)
    const resp    = await prisma.user.create({
      data: {
        tenantId: tenant.id, email: d.respEmail, name: d.respName,
        pinHash, role: 'RESPONSABLE', mustChangePin: true,
      },
    })

    await audit(
      { tenantId: tenant.id, actorType: 'USER', actorId: admin.id, actorName: admin.name, ip, ua },
      'CREATE', 'Tenant', tenant.id, undefined, { slug: tenant.slug, name: tenant.name, plan: tenant.plan }
    )
    await audit(
      { tenantId: tenant.id, actorType: 'USER', actorId: admin.id, actorName: admin.name, ip, ua },
      'CREATE', 'User', resp.id, undefined, { email: resp.email, name: resp.name }
    )

    revalidatePath('/superadmin/tenants')
    return { ok: true, data: { respPin: pin } }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

export async function toggleTenant(tenantId: string): Promise<ActionResult> {
  try {
    const admin  = await requireSuperAdmin()
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) return { ok: false, error: 'Tenant introuvable' }
    const { ip, ua } = await getRequestMeta()

    const updated = await prisma.tenant.update({ where: { id: tenantId }, data: { isActive: !tenant.isActive } })

    await audit(
      { tenantId, actorType: 'USER', actorId: admin.id, actorName: admin.name, ip, ua },
      'UPDATE', 'Tenant', tenantId, { isActive: tenant.isActive }, { isActive: updated.isActive }
    )

    revalidatePath('/superadmin/tenants')
    return { ok: true, data: undefined }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

const ReseauSchema = z.object({
  tenantId:       z.string().min(1),
  nom:            z.string().min(2).max(50),
  code:           z.string().min(2).max(20).trim(),
  tauxCommission: z.coerce.number().min(0).max(1),
  tauxGateway:    z.coerce.number().min(0).max(1),
})

export async function addReseau(payload: unknown): Promise<ActionResult<{ reseauId: string }>> {
  try {
    const admin  = await requireSuperAdmin()
    const parsed = ReseauSchema.safeParse(payload)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
    const d = parsed.data
    const { ip, ua } = await getRequestMeta()

    const code = d.code.toUpperCase().replace(/\s+/g, '_')

    // Vérifier que le code n'existe pas déjà dans ce tenant
    const exists = await prisma.tenantReseau.findFirst({ where: { tenantId: d.tenantId, code } })
    if (exists) return { ok: false, error: `Le réseau "${code}" existe déjà pour cette structure` }

    const ordre  = await prisma.tenantReseau.count({ where: { tenantId: d.tenantId } })
    const reseau = await prisma.tenantReseau.create({
      data: { tenantId: d.tenantId, nom: d.nom, code, tauxCommission: d.tauxCommission, tauxGateway: d.tauxGateway, ordre: ordre + 1 },
    })
    await prisma.threshold.create({
      data: { tenantId: d.tenantId, reseauId: reseau.id, min: 200000, max: 5000000 },
    })

    await audit(
      { tenantId: d.tenantId, actorType: 'USER', actorId: admin.id, actorName: admin.name, ip, ua },
      'CREATE', 'TenantReseau', reseau.id, undefined, { nom: reseau.nom, code }
    )
    revalidatePath('/superadmin')
    return { ok: true, data: { reseauId: reseau.id } }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

export async function toggleReseau(reseauId: string): Promise<ActionResult> {
  try {
    const admin  = await requireSuperAdmin()
    const reseau = await prisma.tenantReseau.findUnique({ where: { id: reseauId } })
    if (!reseau) return { ok: false, error: 'Réseau introuvable' }
    const { ip, ua } = await getRequestMeta()

    const updated = await prisma.tenantReseau.update({ where: { id: reseauId }, data: { isActive: !reseau.isActive } })

    await audit(
      { tenantId: reseau.tenantId, actorType: 'USER', actorId: admin.id, actorName: admin.name, ip, ua },
      'UPDATE', 'TenantReseau', reseauId,
      { isActive: reseau.isActive }, { isActive: updated.isActive }
    )
    revalidatePath('/superadmin')
    return { ok: true, data: undefined }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

export async function updateTenantPlan(tenantId: string, plan: 'STARTER' | 'STANDARD' | 'PREMIUM'): Promise<ActionResult> {
  try {
    const admin = await requireSuperAdmin()
    const { ip, ua } = await getRequestMeta()

    const before = await prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!before) return { ok: false, error: 'Tenant introuvable' }

    await prisma.tenant.update({ where: { id: tenantId }, data: { plan } })

    await audit(
      { tenantId, actorType: 'USER', actorId: admin.id, actorName: admin.name, ip, ua },
      'UPDATE', 'Tenant', tenantId, { plan: before.plan }, { plan }
    )

    revalidatePath('/superadmin/tenants')
    return { ok: true, data: undefined }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}