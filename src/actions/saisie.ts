'use server'
import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit'
import { getRequestMeta } from '@/lib/tenant'
import { SEUIL_RAPPROCHEMENT } from '@/lib/constants'
import type { ActionResult } from '@/types'

const SaisieSchema = z.object({
  date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  caisse:        z.coerce.number().min(0),
  especes:       z.coerce.number().min(0).optional().default(0),
  transfertResp: z.coerce.number().min(0),
  observation:   z.string().max(500).optional().default(''),
  soldes:        z.record(z.string(), z.coerce.number().min(0)),
  // commissions: reseauId → valeurSaisie (cumul brut pour CUMULATIF, montant direct pour DIRECT)
  commissions:   z.record(z.string(), z.coerce.number().min(0)),
})

// Construit les lignes SaisieCommission en calculant le delta pour les réseaux CUMULATIF
async function buildCommissionRows(
  tenantId: string,
  dateStr: string,
  commissions: Record<string, number>,
) {
  const reseauIds = Object.keys(commissions).filter(id => commissions[id] > 0)
  if (!reseauIds.length) return []

  const reseaux = await prisma.tenantReseau.findMany({
    where: { id: { in: reseauIds } },
    select: { id: true, nom: true, commissionLabel: true, modeCommission: true },
  })

  const saisieDate = new Date(dateStr + 'T00:00:00.000Z')

  const rows = await Promise.all(reseaux.map(async r => {
    const valeurSaisie = commissions[r.id]
    const label = r.commissionLabel ?? r.nom

    if (r.modeCommission === 'CUMULATIF') {
      // Dernier retrait pour ce réseau (point de remise à zéro)
      const lastRetrait = await prisma.commissionRetrait.findFirst({
        where: { tenantId, reseauId: r.id },
        orderBy: { date: 'desc' },
        select: { date: true },
      })

      // Dernier cumul enregistré après le dernier retrait, avant aujourd'hui
      const prevComm = await prisma.saisieCommission.findFirst({
        where: {
          reseauId: r.id,
          valeurSaisie: { not: null },
          saisie: {
            tenantId,
            date: {
              lt:  saisieDate,
              ...(lastRetrait ? { gte: lastRetrait.date } : {}),
            },
          },
        },
        orderBy: { saisie: { date: 'desc' } },
        select: { valeurSaisie: true },
      })

      const prevCumul = prevComm?.valeurSaisie ? Number(prevComm.valeurSaisie) : 0
      const montant   = Math.max(0, valeurSaisie - prevCumul)

      return { reseauId: r.id, type: label, montant, valeurSaisie }
    }

    // DIRECT : montant = ce que l'agent a saisi
    return { reseauId: r.id, type: label, montant: valeurSaisie, valeurSaisie: undefined }
  }))

  return rows
}

export async function soumettreSaisie(payload: unknown): Promise<ActionResult<{ saisieId: string }>> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { ok: false, error: 'Non authentifié' }

    const parsed = SaisieSchema.safeParse(payload)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const { tenantId, id: actorId, actorType, name } = session.user
    const isAgent = actorType === 'AGENT'
    const d = parsed.data
    const { ip, ua } = await getRequestMeta()

    const totalReseaux = Object.values(d.soldes).reduce((s, v) => s + v, 0)
    const totalGlobal  = totalReseaux + d.caisse + d.especes + d.transfertResp

    const commissionRows = await buildCommissionRows(tenantId!, d.date, d.commissions)

    const existing = await prisma.saisie.findFirst({
      where: { tenantId: tenantId!, date: new Date(d.date), agentId: isAgent ? actorId : null },
    })

    let saisieId: string

    if (existing) {
      await prisma.saisie.update({
        where: { id: existing.id },
        data: {
          caisse: d.caisse, especes: d.especes, transfertResp: d.transfertResp,
          totalReseaux, totalGlobal, observation: d.observation, statut: 'SOUMIS',
          details: {
            deleteMany: {},
            create: Object.entries(d.soldes).map(([reseauId, solde]) => ({ reseauId, solde })),
          },
          commissions: {
            deleteMany: {},
            create: commissionRows,
          },
        },
      })
      saisieId = existing.id
    } else {
      const saisie = await prisma.saisie.create({
        data: {
          tenantId:    tenantId!,
          date:        new Date(d.date),
          agentId:     isAgent ? actorId : undefined,
          userId:      !isAgent ? actorId : undefined,
          caisse:      d.caisse,
          especes:     d.especes,
          transfertResp: d.transfertResp,
          totalReseaux,
          totalGlobal,
          observation: d.observation,
          statut:      'SOUMIS',
          details: {
            create: Object.entries(d.soldes).map(([reseauId, solde]) => ({ reseauId, solde })),
          },
          commissions: { create: commissionRows },
        },
      })
      saisieId = saisie.id
    }

    await audit(
      { tenantId: tenantId!, actorType, actorId, actorName: name, ip, ua,
        ...(isAgent ? { agentId: actorId } : { userId: actorId }) },
      'CREATE', 'Saisie', saisieId, undefined,
      { date: d.date, totalGlobal, statut: 'SOUMIS' }
    )

    revalidatePath('/', 'layout')
    return { ok: true, data: { saisieId } }
  } catch (err: any) {
    return { ok: false, error: err.message ?? 'Erreur lors de la saisie' }
  }
}

export async function rapprocher(
  saisieId: string,
  montantAttendu: number,
  note?: string,
  commissionsResp?: Record<string, number>, // reseauId → valeurSaisie
): Promise<ActionResult<{ statut: 'VALIDE' | 'ALERTE_ECART' }>> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { ok: false, error: 'Non authentifié' }
    if (!['RESPONSABLE', 'SUPER_ADMIN'].includes(session.user.role)) {
      return { ok: false, error: 'Accès refusé' }
    }

    const { tenantId, id, name } = session.user
    const { ip, ua } = await getRequestMeta()

    const saisie = await prisma.saisie.findFirst({ where: { id: saisieId, tenantId: tenantId! } })
    if (!saisie) return { ok: false, error: 'Saisie introuvable' }
    if (saisie.statut !== 'SOUMIS') return { ok: false, error: "La saisie n'est pas en attente de validation" }

    const ecart  = Math.abs(Number(saisie.totalGlobal) - montantAttendu)
    const statut = ecart > SEUIL_RAPPROCHEMENT ? 'ALERTE_ECART' : 'VALIDE'

    await prisma.saisie.update({
      where: { id: saisieId },
      data:  { statut, validatedById: id, validatedAt: new Date(), montantAttendu, ecart },
    })

    // Enregistrer les commissions saisies par le responsable
    if (commissionsResp && Object.keys(commissionsResp).length > 0) {
      const reseauIds = Object.keys(commissionsResp).filter(k => (commissionsResp[k] ?? 0) > 0)
      if (reseauIds.length > 0) {
        const reseaux = await prisma.tenantReseau.findMany({
          where:  { id: { in: reseauIds }, commissionParResp: true },
          select: { id: true, nom: true, commissionLabel: true, modeCommission: true },
        })
        const commissionRows = await buildCommissionRows(tenantId!, saisie.date.toISOString().slice(0, 10), commissionsResp)
        const rowsFiltered = commissionRows.filter(r => reseaux.some(res => res.id === r.reseauId))
        if (rowsFiltered.length > 0) {
          await prisma.saisieCommission.createMany({ data: rowsFiltered.map(r => ({ ...r, saisieId })) })
        }
      }
    }

    await audit(
      { tenantId: tenantId!, actorType: 'USER', actorId: id, actorName: name, userId: id, ip, ua },
      'RAPPROCHEMENT', 'Saisie', saisieId, undefined,
      { montantAttendu, ecart, statut, ...(note ? { note } : {}) },
    )

    revalidatePath('/', 'layout')
    return { ok: true, data: { statut } }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}
