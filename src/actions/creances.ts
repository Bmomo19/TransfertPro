'use server'
import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit'
import { getRequestMeta } from '@/lib/tenant'
import type { ActionResult } from '@/types'

const CreanceSchema = z.object({
  clientNom:   z.string().min(2).max(100),
  clientPhone: z.string().max(30).optional().default(''),
  reseauId:    z.string().cuid().optional(),
  montant:     z.coerce.number().min(1),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  echeance:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note:        z.string().max(500).optional().default(''),
})

const RemboursementSchema = z.object({
  creanceId: z.string().cuid(),
  montant:   z.coerce.number().min(1),
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note:      z.string().max(300).optional().default(''),
})

export async function creerCreance(payload: unknown): Promise<ActionResult<{ creanceId: string }>> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { ok: false, error: 'Non authentifié' }

    const parsed = CreanceSchema.safeParse(payload)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const { tenantId, id: actorId, actorType, name } = session.user
    const isAgent = actorType === 'AGENT'
    const { ip, ua } = await getRequestMeta()
    const d = parsed.data

    const creance = await prisma.creance.create({
      data: {
        tenantId:    tenantId!,
        agentId:     isAgent ? actorId : undefined,
        userId:      !isAgent ? actorId : undefined,
        reseauId:    d.reseauId || undefined,
        clientNom:   d.clientNom,
        clientPhone: d.clientPhone || undefined,
        montant:     d.montant,
        date:        new Date(d.date + 'T00:00:00.000Z'),
        echeance:    d.echeance ? new Date(d.echeance + 'T00:00:00.000Z') : undefined,
        note:        d.note || undefined,
      },
    })

    await audit(
      { tenantId: tenantId!, actorType, actorId, actorName: name, ip, ua,
        ...(isAgent ? { agentId: actorId } : { userId: actorId }) },
      'CREATE', 'Creance', creance.id, undefined,
      { clientNom: d.clientNom, montant: d.montant },
    )

    revalidatePath('/creances')
    return { ok: true, data: { creanceId: creance.id } }
  } catch (err: any) {
    return { ok: false, error: err.message ?? 'Erreur lors de la création' }
  }
}

export async function ajouterRemboursement(payload: unknown): Promise<ActionResult<{ remboursementId: string }>> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { ok: false, error: 'Non authentifié' }

    const parsed = RemboursementSchema.safeParse(payload)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const { tenantId, id: actorId, actorType, name } = session.user
    const isAgent = actorType === 'AGENT'
    const { ip, ua } = await getRequestMeta()
    const d = parsed.data

    // Vérifier que la créance appartient au tenant et est EN_COURS
    const creance = await prisma.creance.findFirst({
      where: { id: d.creanceId, tenantId: tenantId!, statut: 'EN_COURS' },
      include: { remboursements: { where: { statut: 'VALIDE' }, select: { montant: true } } },
    })
    if (!creance) return { ok: false, error: 'Créance introuvable ou déjà soldée' }

    // Un agent ne peut rembourser que ses propres créances
    if (isAgent && creance.agentId !== actorId) {
      return { ok: false, error: 'Accès refusé' }
    }

    // Vérifier que le montant ne dépasse pas le solde restant
    const dejaPaye = creance.remboursements.reduce((s, r) => s + Number(r.montant), 0)
    const restant  = Number(creance.montant) - dejaPaye
    if (d.montant > restant + 0.01) {
      return { ok: false, error: `Le montant dépasse le solde restant (${restant} FCFA)` }
    }

    const remboursement = await prisma.remboursement.create({
      data: {
        creanceId: d.creanceId,
        montant:   d.montant,
        date:      new Date(d.date + 'T00:00:00.000Z'),
        note:      d.note || undefined,
      },
    })

    await audit(
      { tenantId: tenantId!, actorType, actorId, actorName: name, ip, ua,
        ...(isAgent ? { agentId: actorId } : { userId: actorId }) },
      'CREATE', 'Remboursement', remboursement.id, undefined,
      { creanceId: d.creanceId, montant: d.montant, clientNom: creance.clientNom },
    )

    revalidatePath('/creances')
    revalidatePath(`/creances/${d.creanceId}`)
    return { ok: true, data: { remboursementId: remboursement.id } }
  } catch (err: any) {
    return { ok: false, error: err.message ?? 'Erreur lors de l\'enregistrement' }
  }
}

export async function validerRemboursement(remboursementId: string): Promise<ActionResult<void>> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { ok: false, error: 'Non authentifié' }
    if (!['RESPONSABLE', 'SUPER_ADMIN'].includes(session.user.role)) {
      return { ok: false, error: 'Accès refusé' }
    }

    const { tenantId, id, name } = session.user
    const { ip, ua } = await getRequestMeta()

    const remboursement = await prisma.remboursement.findFirst({
      where:   { id: remboursementId, statut: 'EN_ATTENTE', creance: { tenantId: tenantId! } },
      include: { creance: { include: { remboursements: { where: { statut: 'VALIDE' }, select: { montant: true } } } } },
    })
    if (!remboursement) return { ok: false, error: 'Remboursement introuvable ou déjà traité' }

    // Calculer si la créance est soldée après cette validation
    const dejaPaye  = remboursement.creance.remboursements.reduce((s, r) => s + Number(r.montant), 0)
    const apresVal  = dejaPaye + Number(remboursement.montant)
    const estSolde  = apresVal >= Number(remboursement.creance.montant) - 0.01

    await prisma.$transaction([
      prisma.remboursement.update({
        where: { id: remboursementId },
        data:  { statut: 'VALIDE', validatedById: id, validatedAt: new Date() },
      }),
      ...(estSolde ? [prisma.creance.update({
        where: { id: remboursement.creanceId },
        data:  { statut: 'REMBOURSE' },
      })] : []),
    ])

    await audit(
      { tenantId: tenantId!, actorType: 'USER', actorId: id, actorName: name, userId: id, ip, ua },
      'VALIDATE', 'Remboursement', remboursementId, undefined,
      { montant: Number(remboursement.montant), estSolde },
    )

    revalidatePath('/creances')
    revalidatePath(`/creances/${remboursement.creanceId}`)
    return { ok: true, data: undefined }
  } catch (err: any) {
    return { ok: false, error: err.message ?? 'Erreur lors de la validation' }
  }
}

export async function rejeterRemboursement(
  remboursementId: string,
  motif: string,
): Promise<ActionResult<void>> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { ok: false, error: 'Non authentifié' }
    if (!['RESPONSABLE', 'SUPER_ADMIN'].includes(session.user.role)) {
      return { ok: false, error: 'Accès refusé' }
    }

    const { tenantId, id, name } = session.user
    const { ip, ua } = await getRequestMeta()

    const remboursement = await prisma.remboursement.findFirst({
      where: { id: remboursementId, statut: 'EN_ATTENTE', creance: { tenantId: tenantId! } },
    })
    if (!remboursement) return { ok: false, error: 'Remboursement introuvable ou déjà traité' }

    await prisma.remboursement.update({
      where: { id: remboursementId },
      data:  { statut: 'REJETE', validatedById: id, validatedAt: new Date(), rejectedNote: motif || undefined },
    })

    await audit(
      { tenantId: tenantId!, actorType: 'USER', actorId: id, actorName: name, userId: id, ip, ua },
      'REJECT', 'Remboursement', remboursementId, undefined,
      { montant: Number(remboursement.montant), motif },
    )

    revalidatePath('/creances')
    revalidatePath(`/creances/${remboursement.creanceId}`)
    return { ok: true, data: undefined }
  } catch (err: any) {
    return { ok: false, error: err.message ?? 'Erreur lors du rejet' }
  }
}

export async function annulerCreance(creanceId: string): Promise<ActionResult<void>> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { ok: false, error: 'Non authentifié' }
    if (!['RESPONSABLE', 'SUPER_ADMIN'].includes(session.user.role)) {
      return { ok: false, error: 'Accès refusé' }
    }

    const { tenantId, id, name } = session.user
    const { ip, ua } = await getRequestMeta()

    const creance = await prisma.creance.findFirst({
      where: { id: creanceId, tenantId: tenantId!, statut: 'EN_COURS' },
    })
    if (!creance) return { ok: false, error: 'Créance introuvable ou non annulable' }

    await prisma.creance.update({
      where: { id: creanceId },
      data:  { statut: 'ANNULE' },
    })

    await audit(
      { tenantId: tenantId!, actorType: 'USER', actorId: id, actorName: name, userId: id, ip, ua },
      'DELETE', 'Creance', creanceId, undefined,
      { clientNom: creance.clientNom, montant: Number(creance.montant) },
    )

    revalidatePath('/creances')
    revalidatePath(`/creances/${creanceId}`)
    return { ok: true, data: undefined }
  } catch (err: any) {
    return { ok: false, error: err.message ?? 'Erreur lors de l\'annulation' }
  }
}
