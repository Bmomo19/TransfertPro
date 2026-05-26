'use server'
import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit'
import { getRequestMeta } from '@/lib/tenant'
import type { ActionResult } from '@/types'

const RetraitSchema = z.object({
  reseauId: z.string().cuid(),
  date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  montant:  z.coerce.number().min(1),
  note:     z.string().max(300).optional().default(''),
})

export async function enregistrerRetrait(
  payload: unknown,
): Promise<ActionResult<{ retraitId: string }>> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { ok: false, error: 'Non authentifié' }
    if (!['RESPONSABLE', 'SUPER_ADMIN'].includes(session.user.role)) {
      return { ok: false, error: 'Accès refusé' }
    }

    const parsed = RetraitSchema.safeParse(payload)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const { tenantId, id, name } = session.user
    const { ip, ua } = await getRequestMeta()
    const d = parsed.data

    // Vérifier que le réseau appartient bien à ce tenant et est CUMULATIF
    const reseau = await prisma.tenantReseau.findFirst({
      where: { id: d.reseauId, tenantId: tenantId!, modeCommission: 'CUMULATIF' },
    })
    if (!reseau) return { ok: false, error: 'Réseau introuvable ou non cumulatif' }

    const retrait = await prisma.commissionRetrait.create({
      data: {
        tenantId:    tenantId!,
        reseauId:    d.reseauId,
        date:        new Date(d.date + 'T00:00:00.000Z'),
        montant:     d.montant,
        note:        d.note || undefined,
        createdById: id,
      },
    })

    await audit(
      { tenantId: tenantId!, actorType: 'USER', actorId: id, actorName: name, userId: id, ip, ua },
      'RETRAIT_COMMISSION', 'CommissionRetrait', retrait.id, undefined,
      { reseau: reseau.nom, montant: d.montant, date: d.date },
    )

    revalidatePath('/commissions')
    return { ok: true, data: { retraitId: retrait.id } }
  } catch (err: any) {
    return { ok: false, error: err.message ?? 'Erreur lors de l\'enregistrement' }
  }
}
