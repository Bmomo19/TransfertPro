import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getTenantSlug, getTenantBySlug } from '@/lib/tenant'
import { fmtN, fmtEur, fmtDateTime } from '@/lib/formatting'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Wallet, Users, TrendingUp, AlertTriangle, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if(!session?.user) redirect('/login')
  if(session.user.actorType==='AGENT') redirect('/saisie')

  const slug   = await getTenantSlug()
  const tenant = await getTenantBySlug(slug)
  if(!tenant) redirect('/login')

  const today = new Date(); today.setHours(0,0,0,0)

  const [saisiesAujourdhui, agentsActifs, totalMois] = await Promise.all([
    prisma.saisie.findMany({
      where:   { tenantId:tenant.id, date:{ gte:today } },
      include: {
        agent:   { select:{ name:true, code:true } },
        user:    { select:{ name:true } },
        details: { include:{ reseau:{ include:{ thresholds:{ where:{ tenantId:tenant.id } } } } } },
      },
      orderBy: { createdAt:'desc' },
    }),
    prisma.agent.count({ where:{ tenantId:tenant.id, isActive:true } }),
    prisma.saisie.aggregate({
      where:  { tenantId:tenant.id, date:{ gte:new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      _sum:   { totalGlobal:true },
      _count: true,
    }),
  ])

  const totalTresorerie = saisiesAujourdhui.reduce((s,x)=>s+Number(x.totalGlobal),0)
  const nonValides = saisiesAujourdhui.filter(s=>s.statut==='SOUMIS'||s.statut==='ALERTE_ECART').length

  // Alertes seuils
  const alertes: {reseau:string; type:'critical'|'warning'; solde:number; threshold:number}[] = []
  for(const s of saisiesAujourdhui) {
    for(const d of s.details) {
      const th = d.reseau.thresholds[0]
      if(!th) continue
      const sol = Number(d.solde)
      if(sol < Number(th.min)) alertes.push({ reseau:d.reseau.nom, type:'critical', solde:sol, threshold:Number(th.min) })
      else if(sol > Number(th.max)) alertes.push({ reseau:d.reseau.nom, type:'warning', solde:sol, threshold:Number(th.max) })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-gray-900">Tableau de bord</h1>
        <p className="mt-1 text-sm text-gray-500">{new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon:Wallet,     label:'Trésorerie du jour',   value:fmtN(totalTresorerie)+' FCFA', sub:fmtEur(totalTresorerie),         color:'text-orange-500 bg-orange-50' },
          { icon:Users,      label:'Agents actifs',        value:String(agentsActifs),           sub:`${saisiesAujourdhui.length} saisies aujourd'hui`, color:'text-blue-500 bg-blue-50' },
          { icon:TrendingUp, label:'Volume ce mois',       value:fmtN(Number(totalMois._sum.totalGlobal??0))+' FCFA', sub:`${totalMois._count} saisies`, color:'text-emerald-500 bg-emerald-50' },
          { icon:AlertTriangle, label:'Alertes seuils',   value:String(alertes.length),         sub:nonValides>0?`${nonValides} à valider`:'Tout validé', color:'text-red-500 bg-red-50' },
        ].map(k=>(
          <div key={k.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{k.label}</p>
                <p className="mt-1 font-display text-xl font-semibold tabular-nums text-gray-900 truncate">{k.value}</p>
                <p className="mt-0.5 text-xs text-gray-400 truncate">{k.sub}</p>
              </div>
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${k.color}`}>
                <k.icon size={17} strokeWidth={1.75}/>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alertes */}
      {alertes.length > 0 && (
        <Card>
          <h2 className="mb-3 font-display text-sm font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-500"/> Alertes seuils
          </h2>
          <div className="space-y-2">
            {alertes.map((a,i)=>(
              <div key={i} className={`flex items-center gap-3 rounded-xl p-3 ${a.type==='critical'?'bg-red-50 border border-red-100':'bg-amber-50 border border-amber-100'}`}>
                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${a.type==='critical'?'bg-red-500':'bg-amber-500'}`}/>
                <p className="flex-1 text-sm">
                  <span className="font-medium">{a.reseau}</span>
                  {' — '}{a.type==='critical'?`Sous le seuil minimum (${fmtN(a.solde)} FCFA < ${fmtN(a.threshold)} FCFA)`:`Dépasse le seuil max (${fmtN(a.solde)} FCFA > ${fmtN(a.threshold)} FCFA)`}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Fil des saisies */}
      <Card>
        <h2 className="mb-4 font-display text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Clock size={15} className="text-gray-400"/> Saisies du jour
        </h2>
        {saisiesAujourdhui.length===0 ? (
          <p className="py-6 text-center text-sm text-gray-400">Aucune saisie aujourd'hui</p>
        ) : (
          <div className="space-y-2">
            {saisiesAujourdhui.map(s=>(
              <div key={s.id} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
                <Avatar name={(s.agent?.name??s.user?.name)??'?'} size="sm"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.agent?.name??s.user?.name}</p>
                  <p className="text-xs text-gray-400">{s.agent?.code} · {fmtDateTime(s.createdAt)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-mono text-sm font-semibold text-gray-900">{fmtN(Number(s.totalGlobal))} F</p>
                  <Badge variant={s.statut==='VALIDE'?'ok':s.statut==='SOUMIS'?'info':'error'}>{s.statut}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}