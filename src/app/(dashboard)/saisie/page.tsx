import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getTenantBySlug, getTenantSlug } from '@/lib/tenant'
import { prisma } from '@/lib/db'
import { SaisieClient } from './SaisieClient'
import type { CommissionReseau } from './SaisieClient'

export default async function SaisiePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const slug   = await getTenantSlug()
  const tenant = await getTenantBySlug(slug)
  if (!tenant) redirect('/login')

  const isAgent = session.user.actorType === 'AGENT'
  const today   = new Date(); today.setHours(0, 0, 0, 0)

  // Réseaux avec commission agent, dans l'ordre défini
  const commReseaux    = tenant.reseaux.filter(r => r.hasCommissionAgent && r.isActive)
  const cumulatifIds   = commReseaux.filter(r => r.modeCommission === 'CUMULATIF').map(r => r.id)

  // 1 seule query pour tous les derniers retraits des réseaux CUMULATIF
  const allRetraits = cumulatifIds.length
    ? await prisma.commissionRetrait.findMany({
        where:   { tenantId: tenant.id, reseauId: { in: cumulatifIds } },
        orderBy: { date: 'desc' },
        select:  { reseauId: true, date: true },
      })
    : []
  const retraitMap = new Map<string, Date>()
  for (const r of allRetraits) {
    if (!retraitMap.has(r.reseauId)) retraitMap.set(r.reseauId, r.date)
  }

  // Toutes les queries saisieCommission lancées en parallèle
  const commissionReseaux: CommissionReseau[] = await Promise.all(
    commReseaux.map(async r => {
      if (r.modeCommission !== 'CUMULATIF') {
        return { reseauId: r.id, label: r.commissionLabel ?? r.nom, mode: 'DIRECT' as const, dernierCumul: null }
      }
      const lastRetraitDate = retraitMap.get(r.id) ?? null
      const prev = await prisma.saisieCommission.findFirst({
        where: {
          reseauId:    r.id,
          valeurSaisie: { not: null },
          saisie: {
            tenantId: tenant.id,
            date: { lt: today, ...(lastRetraitDate ? { gte: lastRetraitDate } : {}) },
          },
        },
        orderBy: { saisie: { date: 'desc' } },
        select:  { valeurSaisie: true },
      })
      return {
        reseauId:    r.id,
        label:       r.commissionLabel ?? r.nom,
        mode:        'CUMULATIF' as const,
        dernierCumul: prev?.valeurSaisie ? Number(prev.valeurSaisie) : 0,
      }
    })
  )

  // Saisie existante du jour pour pré-remplissage
  const existing = await prisma.saisie.findFirst({
    where: {
      tenantId: tenant.id,
      date:     { gte: today },
      agentId:  isAgent ? session.user.id : null,
      userId:   !isAgent ? session.user.id : null,
    },
    include: {
      details: true,
      commissions: { select: { reseauId: true, valeurSaisie: true, montant: true } },
    },
  })

  const initialData = existing ? {
    caisse:        Number(existing.caisse),
    especes:       Number(existing.especes),
    transfertResp: Number(existing.transfertResp),
    observation:   existing.observation ?? '',
    soldes: Object.fromEntries(existing.details.map(d => [d.reseauId, Number(d.solde)])),
    // Pour les commissions : montrer le cumul brut (valeurSaisie) si disponible, sinon le montant
    commissions: Object.fromEntries(
      existing.commissions
        .filter(c => c.reseauId)
        .map(c => [c.reseauId!, Number(c.valeurSaisie ?? c.montant)])
    ),
  } : undefined

  const reseauxSerialized = tenant.reseaux.map(r => ({
    ...r,
    tauxCommission: Number(r.tauxCommission),
    tauxGateway:    Number(r.tauxGateway),
  }))

  return (
    <SaisieClient
      reseaux={reseauxSerialized}
      commissionReseaux={commissionReseaux}
      isHud={slug === 'hudiphen'}
      color={tenant.colorPrimary}
      agentName={session.user.name}
      initialData={initialData}
    />
  )
}
