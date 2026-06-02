import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { ResetPinButton } from '@/components/agents/ResetPinButton'
import { ToggleAgentButton } from '@/components/agents/ToggleAgentButton'
import { AgentChart } from './AgentChart'
import { fmtN, fmtDate, fmtDateTime } from '@/lib/formatting'
import { ROLE_LABELS } from '@/lib/constants'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, TrendingUp, CalendarCheck, Coins } from 'lucide-react'

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const tenantId = session.user.tenantId!
  const today    = new Date(); today.setHours(0, 0, 0, 0)
  const trente   = new Date(today); trente.setDate(today.getDate() - 29)
  const moisDebut = new Date(today.getFullYear(), today.getMonth(), 1)

  const [agent, totalSaisies, totalVol, saisies30j, commissionsMois, ecartsRecents] = await Promise.all([
    prisma.agent.findFirst({
      where: { id, tenantId },
    }),
    prisma.saisie.count({ where: { agentId: id } }),
    prisma.saisie.aggregate({ where: { agentId: id }, _sum: { totalGlobal: true } }),
    // 30 derniers jours
    prisma.saisie.findMany({
      where:   { agentId: id, date: { gte: trente } },
      select:  { date: true, totalGlobal: true, statut: true },
      orderBy: { date: 'asc' },
    }),
    // Commissions déclarées ce mois
    prisma.saisieCommission.findMany({
      where:  { saisie: { agentId: id, date: { gte: moisDebut } } },
      select: { type: true, montant: true },
    }),
    // Alertes écart des 30 derniers jours
    prisma.saisie.findMany({
      where:   { agentId: id, statut: 'ALERTE_ECART', date: { gte: trente } },
      select:  { date: true, totalGlobal: true, montantAttendu: true, ecart: true },
      orderBy: { date: 'desc' },
      take: 5,
    }),
  ])

  if (!agent) notFound()

  // ── Graphique 30j ──────────────────────────────────────────────────
  const saisieMap = new Map(saisies30j.map(s => [s.date.toISOString().slice(0, 10), s]))
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(trente); d.setDate(trente.getDate() + i)
    const k = d.toISOString().slice(0, 10)
    const s = saisieMap.get(k)
    return {
      label:   d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      volume:  s ? Number(s.totalGlobal) : 0,
      statut:  (s?.statut ?? null) as 'VALIDE' | 'SOUMIS' | 'ALERTE_ECART' | null,
      isToday: k === today.toISOString().slice(0, 10),
    }
  })

  // ── Ponctualité ────────────────────────────────────────────────────
  const joursTravailles = 30
  const joursAvecSaisie = saisies30j.length
  const ponctualite     = Math.round((joursAvecSaisie / joursTravailles) * 100)

  // ── Commissions ce mois ────────────────────────────────────────────
  const commMap: Record<string, number> = {}
  for (const c of commissionsMois) {
    commMap[c.type] = (commMap[c.type] ?? 0) + Number(c.montant)
  }
  const totalCommMois = Object.values(commMap).reduce((s, v) => s + v, 0)

  // ── Volume ce mois ─────────────────────────────────────────────────
  const volMois = saisies30j
    .filter(s => new Date(s.date) >= moisDebut)
    .reduce((sum, s) => sum + Number(s.totalGlobal), 0)
  const nbSaisisMois = saisies30j.filter(s => new Date(s.date) >= moisDebut).length

  return (
    <div className="space-y-6">
      <Link href="/agents" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft size={16}/> Retour aux agents
      </Link>

      {/* ── Profil ── */}
      <Card>
        <div className="flex items-start gap-4">
          <Avatar name={agent.name} size="lg"/>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-semibold text-gray-900">{agent.name}</h1>
              <Badge variant={agent.isActive ? 'ok' : 'draft'} dot>{agent.isActive ? 'Actif' : 'Inactif'}</Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span className="font-mono font-medium">{agent.code}</span>
              <span>·</span>
              <span>{ROLE_LABELS[agent.role]}</span>
              {agent.phone && <><span>·</span><span>{agent.phone}</span></>}
              {agent.lastLoginAt && (
                <><span>·</span><span className="text-xs">Dernière connexion {fmtDateTime(agent.lastLoginAt)}</span></>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <ResetPinButton agentId={agent.id} agentName={agent.name}/>
          <ToggleAgentButton agentId={agent.id} isActive={agent.isActive}/>
        </div>
      </Card>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card padding="normal">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Saisies totales</p>
              <p className="mt-1 font-display text-2xl font-semibold text-gray-900">{totalSaisies}</p>
            </div>
            <TrendingUp size={16} className="text-emerald-400 mt-0.5"/>
          </div>
        </Card>
        <Card padding="normal">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Volume cumulé</p>
              <p className="mt-1 font-display text-lg font-semibold text-gray-900">{fmtN(Number(totalVol._sum.totalGlobal ?? 0))} F</p>
            </div>
            <Coins size={16} className="text-blue-400 mt-0.5"/>
          </div>
        </Card>
        <Card padding="normal">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Ce mois</p>
              <p className="mt-1 font-display text-lg font-semibold text-gray-900">{fmtN(volMois)} F</p>
              <p className="text-[11px] text-gray-400">{nbSaisisMois} saisies</p>
            </div>
            <TrendingUp size={16} className="text-orange-400 mt-0.5"/>
          </div>
        </Card>
        <Card padding="normal">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Ponctualité 30j</p>
              <p className={`mt-1 font-display text-2xl font-semibold ${ponctualite >= 80 ? 'text-emerald-600' : ponctualite >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {ponctualite}%
              </p>
              <p className="text-[11px] text-gray-400">{joursAvecSaisie} / 30 jours</p>
            </div>
            <CalendarCheck size={16} className={`mt-0.5 ${ponctualite >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}/>
          </div>
        </Card>
      </div>

      {/* ── Graphique 30j ── */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-gray-900">Volume — 30 derniers jours</h2>
          <div className="flex items-center gap-3 text-[11px] text-gray-400">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500 inline-block"/>Validé</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-blue-400 inline-block"/>Soumis</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-orange-500 inline-block"/>Écart</span>
          </div>
        </div>
        <AgentChart data={chartData}/>
      </Card>

      {/* ── Alertes écart ── */}
      {ecartsRecents.length > 0 && (
        <Card>
          <h2 className="mb-3 font-display text-sm font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle size={14} className="text-orange-500"/> Alertes écart récentes
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Date', 'Déclaré', 'Compté', 'Écart'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ecartsRecents.map(s => (
                  <tr key={s.date.toISOString()} className="bg-orange-50/30">
                    <td className="px-3 py-2 text-gray-700">{fmtDate(s.date)}</td>
                    <td className="px-3 py-2 font-mono font-semibold text-gray-900">{fmtN(Number(s.totalGlobal))} F</td>
                    <td className="px-3 py-2 font-mono text-gray-500">{s.montantAttendu ? `${fmtN(Number(s.montantAttendu))} F` : '—'}</td>
                    <td className="px-3 py-2 font-mono font-semibold text-orange-600">⚠ {fmtN(Number(s.ecart))} F</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Commissions ce mois ── */}
      {Object.keys(commMap).length > 0 && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-gray-900">Commissions déclarées ce mois</h2>
            <span className="font-display text-sm font-bold text-emerald-600">{fmtN(totalCommMois)} FCFA</span>
          </div>
          <div className="space-y-2">
            {Object.entries(commMap).sort((a, b) => b[1] - a[1]).map(([type, montant]) => (
              <div key={type} className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-2.5">
                <span className="text-sm text-gray-700">{type}</span>
                <span className="font-mono text-sm font-semibold text-emerald-700">{fmtN(montant)} FCFA</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Dernières saisies ── */}
      <Card>
        <h2 className="mb-4 font-display text-sm font-semibold text-gray-900">Dernières saisies</h2>
        {saisies30j.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Aucune saisie sur les 30 derniers jours</p>
        ) : (
          <div className="space-y-2">
            {[...saisies30j].reverse().slice(0, 10).map(s => (
              <div key={s.date.toISOString()} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{fmtDate(s.date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold">{fmtN(Number(s.totalGlobal))} F</p>
                  <Badge variant={s.statut === 'VALIDE' ? 'ok' : s.statut === 'SOUMIS' ? 'info' : 'warn'}>
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
