import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { SaisieStatut } from '@prisma/client'
import { Pagination } from '@/components/ui/Pagination'
import { JournalClient } from './JournalClient'
import type { SaisieRow } from './JournalClient'

const PER = 20

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ page?:string; statut?:string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const { page: pageParam, statut } = await searchParams
  const page     = Math.max(1, parseInt(pageParam ?? '1'))
  const tenantId = session.user.tenantId!

  const where = { tenantId, ...(statut ? { statut: statut as SaisieStatut } : {}) }

  const [saisies, total] = await Promise.all([
    prisma.saisie.findMany({
      where, orderBy: { date: 'desc' }, skip: (page - 1) * PER, take: PER,
      include: {
        agent:       { select: { name: true, code: true } },
        user:        { select: { name: true } },
        details:     { include: { reseau: { select: { nom: true } } } },
        commissions: true,
      },
    }),
    prisma.saisie.count({ where }),
  ])

  const canValidate = ['RESPONSABLE', 'SUPER_ADMIN'].includes(session.user.role)

  const rows: SaisieRow[] = saisies.map(s => ({
    id:             s.id,
    date:           s.date.toISOString(),
    createdAt:      s.createdAt.toISOString(),
    agentName:      s.agent?.name ?? s.user?.name ?? '—',
    agentCode:      s.agent?.code ?? null,
    totalGlobal:    Number(s.totalGlobal),
    caisse:         Number(s.caisse),
    especes:        Number(s.especes),
    transfertResp:  Number(s.transfertResp),
    montantAttendu: s.montantAttendu != null ? Number(s.montantAttendu) : null,
    ecart:          s.ecart != null ? Number(s.ecart) : null,
    statut:         s.statut as SaisieRow['statut'],
    observation:    s.observation ?? null,
    details:        s.details.map(d => ({
      id:        d.id,
      reseauNom: d.reseau.nom,
      solde:     Number(d.solde),
    })),
    commissions:    s.commissions.map(c => ({
      id:      c.id,
      type:    c.type,
      montant: Number(c.montant),
    })),
  }))

  const FILTRES = ['', 'SOUMIS', 'VALIDE', 'ALERTE_ECART', 'REJETE'] as const
  const FILTRES_LABELS: Record<string, string> = {
    '': 'Tous', SOUMIS: 'Soumis', VALIDE: 'Validé', ALERTE_ECART: 'Écart', REJETE: 'Rejeté',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold text-gray-900">Journal des saisies</h1>
          <p className="mt-1 text-sm text-gray-500">{total} saisie{total > 1 ? 's' : ''}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTRES.map(s => (
            <a key={s} href={s ? `?statut=${s}` : '?'}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                (statut === s || (s === '' && !statut))
                  ? 'bg-gray-900 text-white'
                  : s === 'ALERTE_ECART'
                    ? 'border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}>
              {FILTRES_LABELS[s]}
            </a>
          ))}
        </div>
      </div>

      <JournalClient rows={rows} canValidate={canValidate}/>

      <Pagination page={page} total={total} perPage={PER}/>
    </div>
  )
}
