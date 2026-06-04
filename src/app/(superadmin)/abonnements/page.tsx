import { prisma } from '@/lib/db'
import { Card } from '@/components/ui/Card'
import { fmtN } from '@/lib/formatting'
import { TrendingUp, Clock, AlertTriangle, XCircle } from 'lucide-react'
import { AbonnementsClient } from './AbonnementsClient'
import type { TenantRow } from './AbonnementsClient'
import type { StatutAcces } from '@/lib/abonnement'

function getStatutAcces(abonnement: { jourPrelevement: number } | null, paiement: { statut: string; dateLimite: Date } | null): StatutAcces {
  if (!abonnement) return 'OK'
  if (paiement?.statut === 'PAYE') return 'OK'

  const now = new Date()
  const dateLimite = paiement
    ? new Date(paiement.dateLimite)
    : new Date(now.getFullYear(), now.getMonth(), abonnement.jourPrelevement)

  const jours = Math.floor((dateLimite.getTime() - now.getTime()) / 86_400_000)
  if (jours <= -2) return 'BLOQUE'
  if (jours <= 5)  return 'ALERTE'
  return 'OK'
}

export default async function AbonnementsPage() {
  const now  = new Date()
  const mois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const anDebut = new Date(now.getFullYear(), 0, 1)

  const tenants = await prisma.tenant.findMany({
    orderBy: { name: 'asc' },
    include: {
      abonnement: {
        include: {
          paiements: {
            where:   { mois: { gte: `${now.getFullYear()}-01` } },
            orderBy: { mois: 'desc' },
          },
        },
      },
    },
  })

  // ── Calculs globaux ───────────────────────────────────────────────
  let totalAttenduMois = 0
  let totalEncaisséMois = 0
  let nbEnAttente = 0
  let nbBloqués   = 0

  const rows: TenantRow[] = tenants.map(t => {
    const ab = t.abonnement
    const paiementMois = ab?.paiements.find(p => p.mois === mois) ?? null
    const statut = getStatutAcces(ab, paiementMois)

    if (ab) {
      totalAttenduMois += Number(ab.montant)
      if (paiementMois?.statut === 'PAYE') totalEncaisséMois += Number(paiementMois.montant)
      if (paiementMois && paiementMois.statut !== 'PAYE') nbEnAttente++
      if (statut === 'BLOQUE') nbBloqués++
    }

    const totalEncaisseAnnee = (ab?.paiements ?? [])
      .filter(p => p.statut === 'PAYE')
      .reduce((s, p) => s + Number(p.montant), 0)

    return {
      id:              t.id,
      name:            t.name,
      slug:            t.slug,
      montant:         ab ? Number(ab.montant) : null,
      jourPrelevement: ab?.jourPrelevement ?? 1,
      statutAcces:     statut,
      paiementMois: paiementMois ? {
        id:          paiementMois.id,
        statut:      paiementMois.statut as 'EN_ATTENTE' | 'PAYE' | 'EN_RETARD',
        dateLimite:  paiementMois.dateLimite.toISOString(),
        datePaiement: paiementMois.datePaiement?.toISOString() ?? null,
        note:        paiementMois.note,
      } : null,
      historiqueAnnee: (ab?.paiements ?? []).map(p => ({
        id:      p.id,
        mois:    p.mois,
        montant: Number(p.montant),
        statut:  p.statut as 'EN_ATTENTE' | 'PAYE' | 'EN_RETARD',
      })),
      totalEncaisseAnnee,
    }
  })

  const totalAbonnes = tenants.filter(t => t.abonnement).length
  const moisLabel    = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-gray-900">Abonnements</h1>
        <p className="mt-1 text-sm text-gray-500 capitalize">{moisLabel}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card padding="normal">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Attendu ce mois</p>
              <p className="mt-1 font-display text-xl font-semibold text-gray-900">{fmtN(totalAttenduMois)} F</p>
              <p className="text-[11px] text-gray-400">{totalAbonnes} structure{totalAbonnes > 1 ? 's' : ''}</p>
            </div>
            <TrendingUp size={16} className="text-emerald-400 mt-0.5 shrink-0"/>
          </div>
        </Card>

        <Card padding="normal">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Encaissé ce mois</p>
              <p className="mt-1 font-display text-xl font-semibold text-emerald-600">{fmtN(totalEncaisséMois)} F</p>
              <p className="text-[11px] text-gray-400">
                {totalAttenduMois > 0 ? Math.round((totalEncaisséMois / totalAttenduMois) * 100) : 0}% du total
              </p>
            </div>
            <TrendingUp size={16} className="text-emerald-500 mt-0.5 shrink-0"/>
          </div>
        </Card>

        <Card padding="normal">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">En attente</p>
              <p className={`mt-1 font-display text-xl font-semibold ${nbEnAttente > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                {nbEnAttente}
              </p>
              <p className="text-[11px] text-gray-400">paiement{nbEnAttente > 1 ? 's' : ''} à traiter</p>
            </div>
            <Clock size={16} className={`mt-0.5 shrink-0 ${nbEnAttente > 0 ? 'text-amber-400' : 'text-gray-300'}`}/>
          </div>
        </Card>

        <Card padding="normal">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Bloqués</p>
              <p className={`mt-1 font-display text-xl font-semibold ${nbBloqués > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {nbBloqués}
              </p>
              <p className="text-[11px] text-gray-400">accès suspendu{nbBloqués > 1 ? 's' : ''}</p>
            </div>
            <XCircle size={16} className={`mt-0.5 shrink-0 ${nbBloqués > 0 ? 'text-red-400' : 'text-gray-300'}`}/>
          </div>
        </Card>
      </div>

      {/* Liste */}
      <AbonnementsClient rows={rows} moisLabel={moisLabel}/>
    </div>
  )
}
