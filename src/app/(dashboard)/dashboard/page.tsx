import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getTenantSlug, getTenantBySlug } from '@/lib/tenant'
import { fmtN, fmtEur, fmtDateTime } from '@/lib/formatting'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { VolumeChart } from './VolumeChart'
import {
  Wallet, Users, TrendingUp, AlertTriangle,
  Clock, UserX, TrendingDown, CheckCircle2, ChevronRight,
} from 'lucide-react'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  if (session.user.actorType === 'AGENT') redirect('/saisie')

  const slug   = await getTenantSlug()
  const tenant = await getTenantBySlug(slug)
  if (!tenant) redirect('/login')

  const today    = new Date(); today.setHours(0, 0, 0, 0)
  const hier     = new Date(today); hier.setDate(hier.getDate() - 1)
  const sept     = new Date(today); sept.setDate(sept.getDate() - 6)
  const moisDebut = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const moisPrecedent = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
  const finMoisPrec   = new Date(new Date().getFullYear(), new Date().getMonth(), 0)

  const tenantId = tenant.id

  const [
    saisiesAujourdhui,
    totalHier,
    totalMois,
    totalMoisPrec,
    agentsActifs,
    agentsSansSaisie,
    saisies7j,
    topAgentsSaisies,
    agentsVue,
  ] = await Promise.all([
    // Saisies d'aujourd'hui avec détails
    prisma.saisie.findMany({
      where:   { tenantId, date: { gte: today } },
      include: {
        agent:   { select: { name: true, code: true } },
        user:    { select: { name: true } },
        details: { include: { reseau: { include: { thresholds: { where: { tenantId } } } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    // Volume J-1
    prisma.saisie.aggregate({
      where: { tenantId, date: { gte: hier, lt: today } },
      _sum:  { totalGlobal: true },
    }),
    // Volume mois en cours
    prisma.saisie.aggregate({
      where: { tenantId, date: { gte: moisDebut } },
      _sum:  { totalGlobal: true },
      _count: true,
    }),
    // Volume mois précédent
    prisma.saisie.aggregate({
      where: { tenantId, date: { gte: moisPrecedent, lte: finMoisPrec } },
      _sum:  { totalGlobal: true },
    }),
    // Agents actifs
    prisma.agent.count({ where: { tenantId, isActive: true } }),
    // Agents sans saisie aujourd'hui
    prisma.agent.findMany({
      where: {
        tenantId,
        isActive: true,
        saisies:  { none: { date: { gte: today } } },
      },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    }),
    // Volume 7 derniers jours
    prisma.saisie.findMany({
      where:   { tenantId, date: { gte: sept } },
      select:  { date: true, totalGlobal: true },
      orderBy: { date: 'asc' },
    }),
    // Top agents ce mois (saisies individuelles groupées en JS)
    prisma.saisie.findMany({
      where:   { tenantId, agentId: { not: null }, date: { gte: moisDebut } },
      select:  { agentId: true, totalGlobal: true, agent: { select: { name: true, code: true } } },
    }),
    // Vue agents : solde dernier + volume mois
    prisma.agent.findMany({
      where:   { tenantId, isActive: true },
      select: {
        id: true, name: true, code: true,
        saisies: {
          where:   { date: { gte: moisDebut } },
          orderBy: { date: 'desc' },
          select:  { totalGlobal: true, statut: true, date: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
  ])

  // ── Calculs ──────────────────────────────────────────────────────────
  const totalTresorerie = saisiesAujourdhui.reduce((s, x) => s + Number(x.totalGlobal), 0)
  const totalHierVal    = Number(totalHier._sum.totalGlobal ?? 0)
  const totalMoisVal    = Number(totalMois._sum.totalGlobal ?? 0)
  const totalMoisPrecVal = Number(totalMoisPrec._sum.totalGlobal ?? 0)

  const evJ   = totalHierVal > 0 ? ((totalTresorerie - totalHierVal) / totalHierVal) * 100 : null
  const evMois = totalMoisPrecVal > 0 ? ((totalMoisVal - totalMoisPrecVal) / totalMoisPrecVal) * 100 : null

  const nonValides = saisiesAujourdhui.filter(s => s.statut === 'SOUMIS' || s.statut === 'ALERTE_ECART').length

  // Alertes seuils
  const alertes: { reseau: string; type: 'critical' | 'warning'; solde: number; threshold: number }[] = []
  for (const s of saisiesAujourdhui) {
    for (const d of s.details) {
      const th = d.reseau.thresholds[0]
      if (!th) continue
      const sol = Number(d.solde)
      if (sol < Number(th.min)) alertes.push({ reseau: d.reseau.nom, type: 'critical', solde: sol, threshold: Number(th.min) })
      else if (sol > Number(th.max)) alertes.push({ reseau: d.reseau.nom, type: 'warning', solde: sol, threshold: Number(th.max) })
    }
  }

  // Données graphique 7j
  const volumeParJour = new Map<string, number>()
  for (let i = 0; i < 7; i++) {
    const d = new Date(sept); d.setDate(sept.getDate() + i)
    volumeParJour.set(d.toISOString().slice(0, 10), 0)
  }
  for (const s of saisies7j) {
    const k = s.date.toISOString().slice(0, 10)
    volumeParJour.set(k, (volumeParJour.get(k) ?? 0) + Number(s.totalGlobal))
  }
  const todayKey = today.toISOString().slice(0, 10)
  const chartData = Array.from(volumeParJour.entries()).map(([date, volume]) => ({
    label:   new Date(date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
    volume,
    isToday: date === todayKey,
  }))

  // Top 5 agents ce mois
  const agentMap = new Map<string, { name: string; code: string; volume: number }>()
  for (const s of topAgentsSaisies) {
    if (!s.agentId || !s.agent) continue
    const cur = agentMap.get(s.agentId) ?? { name: s.agent.name, code: s.agent.code, volume: 0 }
    cur.volume += Number(s.totalGlobal)
    agentMap.set(s.agentId, cur)
  }
  const topAgents = Array.from(agentMap.values()).sort((a, b) => b.volume - a.volume).slice(0, 5)
  const maxVol = topAgents[0]?.volume ?? 1

  // Vue agents : solde actuel + volume mois
  const agentsVueData = agentsVue.map(a => ({
    id:           a.id,
    name:         a.name,
    code:         a.code,
    dernierSolde: a.saisies[0] ? Number(a.saisies[0].totalGlobal) : null,
    dernierStatut: a.saisies[0]?.statut ?? null,
    dernierDate:  a.saisies[0]?.date?.toISOString().slice(0, 10) ?? null,
    volumeMois:   a.saisies.reduce((s, x) => s + Number(x.totalGlobal), 0),
    nbSaisies:    a.saisies.length,
  })).sort((a, b) => b.volumeMois - a.volumeMois)

  function evBadge(ev: number | null) {
    if (ev === null) return null
    const pos = ev >= 0
    return (
      <span className={`flex items-center gap-0.5 text-xs font-semibold ${pos ? 'text-emerald-600' : 'text-red-500'}`}>
        {pos ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
        {pos ? '+' : ''}{ev.toFixed(1)}%
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-gray-900">Tableau de bord</h1>
        <p className="mt-1 text-sm text-gray-500 capitalize">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Trésorerie J */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Trésorerie du jour</p>
              <p className="mt-1 font-display text-xl font-semibold tabular-nums text-gray-900">{fmtN(totalTresorerie)} F</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="text-xs text-gray-400">{fmtEur(totalTresorerie)}</span>
                {evBadge(evJ)}
              </div>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-orange-500 bg-orange-50">
              <Wallet size={17} strokeWidth={1.75}/>
            </div>
          </div>
        </div>

        {/* Volume mois */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Volume ce mois</p>
              <p className="mt-1 font-display text-xl font-semibold tabular-nums text-gray-900">{fmtN(totalMoisVal)} F</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="text-xs text-gray-400">{totalMois._count} saisies</span>
                {evBadge(evMois)}
              </div>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-emerald-500 bg-emerald-50">
              <TrendingUp size={17} strokeWidth={1.75}/>
            </div>
          </div>
        </div>

        {/* Saisies manquantes */}
        <div className={`rounded-2xl border bg-white p-4 shadow-sm ${agentsSansSaisie.length > 0 ? 'border-red-200' : 'border-gray-100'}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Saisies manquantes</p>
              <p className={`mt-1 font-display text-xl font-semibold tabular-nums ${agentsSansSaisie.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {agentsSansSaisie.length === 0 ? '✓ Tous' : agentsSansSaisie.length}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                {agentsSansSaisie.length === 0 ? 'agents ont soumis' : `sur ${agentsActifs} agents actifs`}
              </p>
            </div>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${agentsSansSaisie.length > 0 ? 'text-red-500 bg-red-50' : 'text-emerald-500 bg-emerald-50'}`}>
              {agentsSansSaisie.length > 0 ? <UserX size={17} strokeWidth={1.75}/> : <CheckCircle2 size={17} strokeWidth={1.75}/>}
            </div>
          </div>
        </div>

        {/* À valider */}
        <div className={`rounded-2xl border bg-white p-4 shadow-sm ${nonValides > 0 ? 'border-amber-200' : 'border-gray-100'}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">À valider</p>
              <p className={`mt-1 font-display text-xl font-semibold tabular-nums ${nonValides > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                {nonValides}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                {alertes.length > 0 ? `${alertes.length} alerte(s) seuil` : 'Saisies en attente'}
              </p>
            </div>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${nonValides > 0 ? 'text-amber-500 bg-amber-50' : 'text-gray-400 bg-gray-50'}`}>
              <Clock size={17} strokeWidth={1.75}/>
            </div>
          </div>
        </div>
      </div>

      {/* ── Alerte saisies manquantes ── */}
      {agentsSansSaisie.length > 0 && (
        <Card>
          <h2 className="mb-3 font-display text-sm font-semibold text-gray-900 flex items-center gap-2">
            <UserX size={15} className="text-red-500"/>
            {agentsSansSaisie.length === 1 ? '1 agent n\'a pas soumis sa saisie' : `${agentsSansSaisie.length} agents n'ont pas soumis leur saisie`}
          </h2>
          <div className="flex flex-wrap gap-2">
            {agentsSansSaisie.map(a => (
              <div key={a.id} className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-red-400 shrink-0"/>
                <span className="text-sm font-medium text-red-800">{a.name}</span>
                <span className="font-mono text-xs text-red-500">{a.code}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Alertes seuils ── */}
      {alertes.length > 0 && (
        <Card>
          <h2 className="mb-3 font-display text-sm font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-500"/> Alertes seuils
          </h2>
          <div className="space-y-2">
            {alertes.map((a, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-xl p-3 ${a.type === 'critical' ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}`}>
                <span className={`h-2 w-2 rounded-full shrink-0 ${a.type === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}/>
                <p className="flex-1 text-sm">
                  <span className="font-medium">{a.reseau}</span>
                  {' — '}{a.type === 'critical'
                    ? `Sous le seuil minimum (${fmtN(a.solde)} < ${fmtN(a.threshold)} FCFA)`
                    : `Dépasse le seuil max (${fmtN(a.solde)} > ${fmtN(a.threshold)} FCFA)`}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Graphique 7j ── */}
        <Card>
          <h2 className="mb-4 font-display text-sm font-semibold text-gray-900">Volume — 7 derniers jours</h2>
          <VolumeChart data={chartData}/>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-400 px-1">
            <span>J-6</span>
            <span>Aujourd'hui</span>
          </div>
        </Card>

        {/* ── Top agents ce mois ── */}
        <Card>
          <h2 className="mb-4 font-display text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Users size={14} className="text-gray-400"/> Top agents — {new Date().toLocaleDateString('fr-FR', { month: 'long' })}
          </h2>
          {topAgents.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Aucune saisie agent ce mois</p>
          ) : (
            <div className="space-y-3">
              {topAgents.map((a, i) => (
                <div key={a.code} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-gray-300 w-4 text-right shrink-0">{i + 1}</span>
                      <span className="font-medium text-gray-900 truncate">{a.name}</span>
                      <span className="font-mono text-xs text-gray-400 shrink-0">{a.code}</span>
                    </div>
                    <span className="font-mono text-sm font-semibold text-gray-900 shrink-0 ml-2">{fmtN(a.volume)} F</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${(a.volume / maxVol) * 100}%`, background: 'var(--tenant-primary, #F97316)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Vue agents : solde + volume mois ── */}
      <Card>
        <h2 className="mb-4 font-display text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Users size={14} className="text-gray-400"/>
          Agents — solde & volume {new Date().toLocaleDateString('fr-FR', { month: 'long' })}
        </h2>
        {agentsVueData.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">Aucun agent actif</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Agent', 'Dernier solde', 'Statut', 'Volume du mois', 'Saisies'].map(h => (
                    <th key={h} className="px-3 pb-2 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400 first:pl-1">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {agentsVueData.map(a => {
                  const statut = a.dernierStatut
                  return (
                    <tr key={a.id} className="group hover:bg-gray-50/60 transition-colors">
                      {/* Agent */}
                      <td className="px-3 py-2.5 first:pl-1">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-500 uppercase">
                            {a.name.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate max-w-[120px]">{a.name}</p>
                            <p className="font-mono text-[11px] text-gray-400">{a.code}</p>
                          </div>
                        </div>
                      </td>
                      {/* Dernier solde */}
                      <td className="px-3 py-2.5">
                        {a.dernierSolde != null ? (
                          <span className="font-mono text-sm font-semibold text-gray-900">{fmtN(a.dernierSolde)} F</span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                        {a.dernierDate && (
                          <p className="text-[11px] text-gray-400">{new Date(a.dernierDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                        )}
                      </td>
                      {/* Statut dernière saisie */}
                      <td className="px-3 py-2.5">
                        {statut === 'VALIDE'       && <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Validé</span>}
                        {statut === 'SOUMIS'       && <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">Soumis</span>}
                        {statut === 'ALERTE_ECART' && <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">Écart</span>}
                        {statut === 'REJETE'       && <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">Rejeté</span>}
                        {!statut                   && <span className="text-xs text-gray-300">—</span>}
                      </td>
                      {/* Volume mois */}
                      <td className="px-3 py-2.5">
                        <div className="space-y-1">
                          <span className="font-mono text-sm font-semibold text-gray-900">{fmtN(a.volumeMois)} F</span>
                          {agentsVueData[0]?.volumeMois > 0 && (
                            <div className="h-1 w-24 rounded-full bg-gray-100">
                              <div
                                className="h-1 rounded-full"
                                style={{
                                  width: `${Math.round((a.volumeMois / (agentsVueData[0]?.volumeMois ?? 1)) * 100)}%`,
                                  background: 'var(--tenant-primary, #F97316)',
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      {/* Nb saisies */}
                      <td className="px-3 py-2.5">
                        <a href={`/agents/${a.id}`} className="flex items-center gap-1 text-xs font-medium text-gray-400 group-hover:text-gray-700 transition-colors">
                          {a.nbSaisies} <ChevronRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Saisies du jour ── */}
      <Card>
        <h2 className="mb-4 font-display text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Clock size={15} className="text-gray-400"/> Saisies du jour
        </h2>
        {saisiesAujourdhui.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">Aucune saisie aujourd'hui</p>
        ) : (
          <div className="space-y-2">
            {saisiesAujourdhui.map(s => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
                <Avatar name={(s.agent?.name ?? s.user?.name) ?? '?'} size="sm"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.agent?.name ?? s.user?.name}</p>
                  <p className="text-xs text-gray-400">{s.agent?.code ?? 'Resp.'} · {fmtDateTime(s.createdAt)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm font-semibold text-gray-900">{fmtN(Number(s.totalGlobal))} F</p>
                  <Badge variant={s.statut === 'VALIDE' ? 'ok' : s.statut === 'SOUMIS' ? 'info' : 'error'}>
                    {s.statut === 'VALIDE' ? 'Validé' : s.statut === 'SOUMIS' ? 'Soumis' : 'Écart'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
