'use server'
import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { ActionResult } from '@/types'

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') throw new Error('Accès refusé')
  return session.user
}

const AbonnementSchema = z.object({
  tenantId:        z.string().min(1),
  montant:         z.coerce.number().min(1),
  jourPrelevement: z.coerce.number().min(1).max(28).default(1),
})

export async function setAbonnement(payload: unknown): Promise<ActionResult<void>> {
  try {
    const admin  = await requireSuperAdmin()
    const parsed = AbonnementSchema.safeParse(payload)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
    const { tenantId, montant, jourPrelevement } = parsed.data

    await prisma.abonnement.upsert({
      where:  { tenantId },
      update: { montant, jourPrelevement, actif: true },
      create: { tenantId, montant, jourPrelevement },
    })

    revalidatePath('/superadmin')
    return { ok: true, data: undefined }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

export async function genererPaiement(tenantId: string, mois: string): Promise<ActionResult<void>> {
  try {
    const admin = await requireSuperAdmin()

    const abonnement = await prisma.abonnement.findUnique({ where: { tenantId } })
    if (!abonnement) return { ok: false, error: 'Aucun abonnement configuré' }

    const [year, month] = mois.split('-').map(Number)
    const dateLimite    = new Date(year, month - 1, abonnement.jourPrelevement)

    await prisma.paiement.upsert({
      where:  { abonnementId_mois: { abonnementId: abonnement.id, mois } },
      update: {},
      create: {
        abonnementId: abonnement.id,
        mois,
        montant:     abonnement.montant,
        dateLimite,
        createdById: admin.id,
      },
    })

    revalidatePath('/superadmin')
    return { ok: true, data: undefined }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

export async function marquerPaye(paiementId: string, note?: string): Promise<ActionResult<void>> {
  try {
    await requireSuperAdmin()
    await prisma.paiement.update({
      where: { id: paiementId },
      data:  { statut: 'PAYE', datePaiement: new Date(), note: note || undefined },
    })
    revalidatePath('/superadmin')
    return { ok: true, data: undefined }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

export async function marquerEnRetard(paiementId: string): Promise<ActionResult<void>> {
  try {
    await requireSuperAdmin()
    await prisma.paiement.update({
      where: { id: paiementId },
      data:  { statut: 'EN_RETARD' },
    })
    revalidatePath('/superadmin')
    return { ok: true, data: undefined }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}
