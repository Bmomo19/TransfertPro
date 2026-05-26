import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { SaisieStatut } from '@prisma/client'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { fmtN, fmtDate, fmtDateTime } from '@/lib/formatting'
import { RapprochementModal } from './RapprochementModal'

const PER = 20

function statutBadge(statut: SaisieStatut) {
  if (statut === 'VALIDE')       return <Badge variant="ok">Validé</Badge>
  if (statut === 'SOUMIS')       return <Badge variant="info">Soumis</Badge>
  if (statut === 'ALERTE_ECART') return <Badge variant="warn">Écart</Badge>
  return <Badge variant="error">Rejeté</Badge>
}

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
        details:     { include: { reseau: { select: { nom: true, code: true } } } },
        commissions: true,
      },
    }),
    prisma.saisie.count({ where }),
  ])

  const canValidate = ['RESPONSABLE', 'SUPER_ADMIN'].includes(session.user.role)

  const FILTRES = ['', 'SOUMIS', 'VALIDE', 'ALERTE_ECART', 'REJETE'] as const
  const FILTRES_LABELS: Record<string, string> = {
    '': 'Tous', SOUMIS: 'Soumis', VALIDE: 'Validé', ALERTE_ECART: 'Écart', REJETE: 'Rejeté',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
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

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Date', 'Agent', 'Déclaré', 'Compté', 'Écart', 'Réseaux', 'Statut', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {saisies.map(s => {
                const agentName = s.agent?.name ?? s.user?.name ?? '—'
                const hasEcart  = s.statut === 'ALERTE_ECART'
                return (
                  <tr key={s.id} className={`hover:bg-gray-50 ${hasEcart ? 'bg-orange-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{fmtDate(s.date)}</p>
                      <p className="text-xs text-gray-400">{fmtDateTime(s.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{agentName}</p>
                      <p className="font-mono text-xs text-gray-400">{s.agent?.code ?? 'Resp.'}</p>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">
                      {fmtN(Number(s.totalGlobal))} F
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-500">
                      {s.montantAttendu != null ? `${fmtN(Number(s.montantAttendu))} F` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {s.ecart != null ? (
                        <span className={`font-mono text-xs font-semibold ${hasEcart ? 'text-orange-600' : 'text-emerald-600'}`}>
                          {hasEcart ? '⚠ ' : '✓ '}{fmtN(Number(s.ecart))} F
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {s.details.slice(0, 3).map(d => (
                          <p key={d.id} className="text-xs text-gray-500">
                            {d.reseau.nom}: <span className="font-mono font-medium text-gray-700">{fmtN(Number(d.solde))}</span>
                          </p>
                        ))}
                        {s.details.length > 3 && <p className="text-xs text-gray-400">+{s.details.length - 3} autres</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">{statutBadge(s.statut)}</td>
                    <td className="px-4 py-3">
                      {canValidate && s.statut === 'SOUMIS' && (
                        <RapprochementModal
                          saisieId={s.id}
                          totalGlobal={Number(s.totalGlobal)}
                          agentName={agentName}
                        />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {saisies.length === 0 && <p className="py-8 text-center text-sm text-gray-400">Aucune saisie</p>}
      </div>

      <Pagination page={page} total={total} perPage={PER}/>
    </div>
  )
}
