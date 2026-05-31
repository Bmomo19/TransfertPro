import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getTenantBySlug, getTenantSlug } from '@/lib/tenant'
import { fmtN, fmtEur } from '@/lib/formatting'
import { Card } from '@/components/ui/Card'
import { CumulCard } from './CumulCard'

export default async function CommissionsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const slug   = await getTenantSlug()
  const tenant = await getTenantBySlug(slug)
  if (!tenant) redirect('/login')

  const tenantId  = session.user.tenantId!
  const moisDebut = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  // Commissions réelles déclarées par les agents ce mois
  const saisies = await prisma.saisie.findMany({
    where:  { tenantId, date: { gte: moisDebut } },
    select: {
      commissions: {
        select: { montant: true, type: true, reseauId: true },
      },
    },
  })

  // Agrégat par réseau
  const commParReseau: Record<string, { nom: string; montant: number }> = {}
  for (const s of saisies) {
    for (const c of s.commissions) {
      const key = c.reseauId ?? c.type
      if (!commParReseau[key]) {
        commParReseau[key] = { nom: c.type, montant: 0 }
      }
      commParReseau[key].montant += Number(c.montant)
    }
  }

  const totalMois = Object.values(commParReseau).reduce((s, r) => s + r.montant, 0)

  // Suivi cumuls pour réseaux CUMULATIF
  const cumulatifReseaux = tenant.reseaux.filter(
    r => r.modeCommission === 'CUMULATIF' && r.hasCommissionAgent && r.isActive,
  )

  // 1 query pour tous les derniers retraits (au lieu de 1 par réseau)
  const allRetraits = cumulatifReseaux.length
    ? await prisma.commissionRetrait.findMany({
        where:   { tenantId, reseauId: { in: cumulatifReseaux.map(r => r.id) } },
        orderBy: { date: 'desc' },
        select:  { reseauId: true, date: true, montant: true },
      })
    : []
  const retraitMap = new Map<string, { date: Date; montant: { toString(): string } }>()
  for (const r of allRetraits) {
    if (!retraitMap.has(r.reseauId)) retraitMap.set(r.reseauId, r)
  }

  // aggregate + findFirst lancés en parallèle par réseau
  const cumulTracking = await Promise.all(
    cumulatifReseaux.map(async r => {
      const lastRetrait = retraitMap.get(r.id) ?? null
      const dateFilter  = lastRetrait ? { gt: lastRetrait.date } : undefined

      const [cumulAgg, lastSaisie] = await Promise.all([
        prisma.saisieCommission.aggregate({
          where:  { reseauId: r.id, saisie: { tenantId, ...(dateFilter ? { date: dateFilter } : {}) } },
          _sum:   { montant: true },
        }),
        prisma.saisieCommission.findFirst({
          where:   { reseauId: r.id, saisie: { tenantId, ...(dateFilter ? { date: dateFilter } : {}) } },
          orderBy: { saisie: { date: 'desc' } },
          select:  { saisie: { select: { date: true } } },
        }),
      ])

      return {
        reseauId:           r.id,
        nom:                r.commissionLabel ?? r.nom,
        currentCumul:       Number(cumulAgg._sum.montant ?? 0),
        lastRetraitDate:    lastRetrait?.date?.toISOString() ?? null,
        lastRetraitMontant: lastRetrait?.montant ? Number(lastRetrait.montant) : null,
        lastSaisieDate:     lastSaisie?.saisie.date?.toISOString() ?? null,
      }
    }),
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-gray-900">Commissions</h1>
        <p className="mt-1 text-sm text-gray-500">
          {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Totaux */}
      <div className="grid grid-cols-2 gap-4">
        <Card padding="normal">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Total mois en cours</p>
          <p className="mt-1 font-display text-xl font-semibold tabular-nums text-emerald-600">
            {fmtN(totalMois)} FCFA
          </p>
        </Card>
        <Card padding="normal">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Équivalent EUR</p>
          <p className="mt-1 font-display text-xl font-semibold tabular-nums text-gray-600">
            {fmtEur(totalMois)}
          </p>
        </Card>
      </div>

      {/* Détail par réseau */}
      {Object.keys(commParReseau).length > 0 && (
        <Card>
          <h2 className="mb-4 font-display text-sm font-semibold text-gray-900">Détail par réseau</h2>
          <div className="space-y-2">
            {Object.entries(commParReseau)
              .sort((a, b) => b[1].montant - a[1].montant)
              .map(([id, r]) => (
                <div key={id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-2.5">
                  <span className="text-sm font-medium text-gray-700">{r.nom}</span>
                  <span className="font-mono text-sm font-semibold text-emerald-600">
                    {fmtN(r.montant)} FCFA
                  </span>
                </div>
              ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 px-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total</span>
            <span className="font-display text-base font-bold text-gray-900">{fmtN(totalMois)} FCFA</span>
          </div>
        </Card>
      )}

      {Object.keys(commParReseau).length === 0 && (
        <Card>
          <p className="py-6 text-center text-sm text-gray-400">
            Aucune commission déclarée ce mois.
          </p>
        </Card>
      )}

      {/* Suivi cumuls opérateurs */}
      {cumulTracking.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-sm font-semibold text-gray-900 px-1">
            Suivi des cumuls opérateurs
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cumulTracking.map(c => (
              <CumulCard key={c.reseauId} {...c} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
