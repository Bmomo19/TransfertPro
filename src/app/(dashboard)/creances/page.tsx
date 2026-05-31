import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getTenantBySlug, getTenantSlug } from '@/lib/tenant'
import { fmtN } from '@/lib/formatting'
import { Card } from '@/components/ui/Card'
import { CreancesClient } from './CreancesClient'
import type { CreanceStatut } from '@prisma/client'

const PER = 20

export default async function CreancesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; page?: string; client?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const slug   = await getTenantSlug()
  const tenant = await getTenantBySlug(slug)
  if (!tenant) redirect('/login')

  const { statut: statutParam, page: pageParam, client: clientFilter } = await searchParams
  const page    = Math.max(1, parseInt(pageParam ?? '1'))
  const isAgent = session.user.actorType === 'AGENT'
  const isResp  = ['RESPONSABLE', 'SUPER_ADMIN'].includes(session.user.role)
  const tenantId = session.user.tenantId!

  const statutFilter = ['EN_COURS', 'REMBOURSE', 'ANNULE'].includes(statutParam ?? '')
    ? (statutParam as CreanceStatut)
    : undefined

  const where = {
    tenantId,
    ...(statutFilter ? { statut: statutFilter } : {}),
    ...(isAgent ? { agentId: session.user.id } : {}),
    ...(clientFilter ? { clientNom: clientFilter } : {}),
  }

  const agentFilter = isAgent ? { agentId: session.user.id } : {}

  // Toutes les queries en parallèle
  const [creances, total, allCreancesFlat, statsEnCours, statsPending] = await Promise.all([
    prisma.creance.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER,
      take: PER,
      include: {
        reseau:         { select: { nom: true } },
        remboursements: { select: { montant: true, statut: true } },
        agent:          { select: { name: true, code: true } },
      },
    }),
    prisma.creance.count({ where }),
    prisma.creance.findMany({
      where:  { tenantId, ...agentFilter },
      select: { clientNom: true, clientPhone: true, montant: true, statut: true, echeance: true },
    }),
    prisma.creance.aggregate({
      where: { tenantId, statut: 'EN_COURS', ...agentFilter },
      _sum:   { montant: true },
      _count: { _all: true },
    }),
    isResp
      ? prisma.remboursement.count({ where: { statut: 'EN_ATTENTE', creance: { tenantId } } })
      : Promise.resolve(0),
  ])

  type ClientStat = { nom: string; phone: string | null; count: number; enCoursCount: number; enCoursMontant: number; hasOverdue: boolean }
  const clientMap = new Map<string, ClientStat>()
  for (const c of allCreancesFlat) {
    const key = c.clientNom.toLowerCase().trim()
    const s   = clientMap.get(key) ?? { nom: c.clientNom, phone: c.clientPhone ?? null, count: 0, enCoursCount: 0, enCoursMontant: 0, hasOverdue: false }
    s.count++
    if (c.statut === 'EN_COURS') {
      s.enCoursCount++
      s.enCoursMontant += Number(c.montant)
      if (c.echeance && new Date(c.echeance) < new Date()) s.hasOverdue = true
    }
    clientMap.set(key, s)
  }
  const clients = Array.from(clientMap.values())
    .filter(c => c.count > 0)
    .sort((a, b) => b.enCoursCount - a.enCoursCount || a.nom.localeCompare(b.nom))

  const rows = creances.map(c => {
    const paye    = c.remboursements.filter(r => r.statut === 'VALIDE').reduce((s, r) => s + Number(r.montant), 0)
    const pending = c.remboursements.filter(r => r.statut === 'EN_ATTENTE').length
    return {
      id:          c.id,
      clientNom:   c.clientNom,
      clientPhone: c.clientPhone,
      reseau:      c.reseau?.nom ?? null,
      montant:     Number(c.montant),
      paye,
      restant:     Math.max(0, Number(c.montant) - paye),
      date:        c.date.toISOString(),
      echeance:    c.echeance?.toISOString() ?? null,
      statut:      c.statut,
      pendingCount: pending,
      agentName:   c.agent ? `${c.agent.name} (${c.agent.code})` : null,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-gray-900">Créances</h1>
        <p className="mt-1 text-sm text-gray-500">
          {isAgent ? 'Mes transactions à crédit' : 'Suivi des créances clients'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card padding="normal">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Encours</p>
          <p className="mt-1 font-display text-xl font-semibold tabular-nums text-amber-600">
            {fmtN(Number(statsEnCours._sum.montant ?? 0))} FCFA
          </p>
          <p className="text-[11px] text-gray-400">{statsEnCours._count._all} créance(s)</p>
        </Card>
        {isResp && (
          <Card padding="normal">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">En attente validation</p>
            <p className={`mt-1 font-display text-xl font-semibold tabular-nums ${statsPending > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
              {statsPending}
            </p>
            <p className="text-[11px] text-gray-400">remboursement(s)</p>
          </Card>
        )}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: 'Toutes',      value: undefined  },
          { label: 'En cours',    value: 'EN_COURS'  },
          { label: 'Remboursées', value: 'REMBOURSE' },
          { label: 'Annulées',    value: 'ANNULE'    },
        ].map(f => {
          const active = (statutFilter ?? undefined) === f.value
          const href   = f.value ? `?statut=${f.value}` : '?'
          return (
            <a key={f.label} href={href}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                active ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {f.label}
            </a>
          )
        })}
      </div>

      <CreancesClient
        rows={rows}
        total={total}
        page={page}
        perPage={PER}
        isResp={isResp}
        reseaux={tenant.reseaux.filter(r => r.isActive).map(r => ({ id: r.id, nom: r.nom }))}
        clients={clients}
        clientFilter={clientFilter ?? null}
      />
    </div>
  )
}
