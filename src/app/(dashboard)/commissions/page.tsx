import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getTenantBySlug, getTenantSlug } from '@/lib/tenant'
import { fmtN, fmtPercent, fmtEur } from '@/lib/formatting'
import { Card } from '@/components/ui/Card'
import { CumulCard } from './CumulCard'

export default async function CommissionsPage() {
  const session = await getServerSession(authOptions)
  if(!session?.user) redirect('/login')

  const slug   = await getTenantSlug()
  const tenant = await getTenantBySlug(slug)
  if(!tenant) redirect('/login')

  const tenantId = session.user.tenantId!
  const moisDebut = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const saisies = await prisma.saisie.findMany({
    where:  { tenantId, date: { gte: moisDebut } },
    select: {
      details: {
        select: {
          solde: true,
          reseau: { select: { id: true, nom: true, tauxCommission: true, tauxGateway: true } },
        },
      },
      commissions: { select: { type: true, montant: true } },
    },
  })

  // Calcul par réseau
  const reseauxMap: Record<string,{ nom:string; soldeTotal:number; commBrute:number; gateway:number; net:number }> = {}

  for(const s of saisies) {
    for(const d of s.details) {
      const r = d.reseau
      if(!reseauxMap[r.id]) reseauxMap[r.id] = { nom:r.nom, soldeTotal:0, commBrute:0, gateway:0, net:0 }
      const solde = Number(d.solde)
      reseauxMap[r.id].soldeTotal += solde
      reseauxMap[r.id].commBrute  += solde * Number(r.tauxCommission)
      reseauxMap[r.id].gateway    += solde * Number(r.tauxGateway)
      reseauxMap[r.id].net        += solde * (Number(r.tauxCommission) - Number(r.tauxGateway))
    }
  }

  // Commissions agents
  const commAgents = saisies.flatMap(s=>s.commissions).reduce((acc,c)=>{
    acc[c.type] = (acc[c.type]??0) + Number(c.montant)
    return acc
  }, {} as Record<string,number>)

  const totComm   = Object.values(reseauxMap).reduce((s,r)=>s+r.net,0)
  const totAgent  = Object.values(commAgents).reduce((s,v)=>s+v,0)
  const totNet    = totComm + totAgent

  // Suivi cumuls pour réseaux CUMULATIF
  const cumulatifReseaux = tenant.reseaux.filter(r => r.modeCommission === 'CUMULATIF' && r.hasCommissionAgent && r.isActive)

  const cumulTracking = await Promise.all(
    cumulatifReseaux.map(async r => {
      const lastRetrait = await prisma.commissionRetrait.findFirst({
        where:   { tenantId, reseauId: r.id },
        orderBy: { date: 'desc' },
        select:  { date: true, montant: true },
      })

      const lastComm = await prisma.saisieCommission.findFirst({
        where: {
          reseauId:    r.id,
          valeurSaisie: { not: null },
          saisie: {
            tenantId,
            ...(lastRetrait ? { date: { gte: lastRetrait.date } } : {}),
          },
        },
        orderBy: { saisie: { date: 'desc' } },
        select:  { valeurSaisie: true, saisie: { select: { date: true } } },
      })

      return {
        reseauId:           r.id,
        nom:                r.commissionLabel ?? r.nom,
        currentCumul:       lastComm?.valeurSaisie ? Number(lastComm.valeurSaisie) : 0,
        lastRetraitDate:    lastRetrait?.date?.toISOString() ?? null,
        lastRetraitMontant: lastRetrait?.montant ? Number(lastRetrait.montant) : null,
        lastSaisieDate:     lastComm?.saisie.date?.toISOString() ?? null,
      }
    })
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-gray-900">Commissions</h1>
        <p className="mt-1 text-sm text-gray-500">Synthèse du mois en cours</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {l:'Commissions réseaux', v:fmtN(totComm)+' FCFA', c:'text-emerald-600'},
          {l:'Commissions agents',  v:fmtN(totAgent)+' FCFA', c:'text-blue-600'},
          {l:'Total commissions',   v:fmtN(totNet)+' FCFA', c:'text-gray-900'},
          {l:'Équivalent EUR',      v:fmtEur(totNet), c:'text-gray-600'},
        ].map(k=>(
          <Card key={k.l} padding="normal">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{k.l}</p>
            <p className={`mt-1 font-display text-xl font-semibold tabular-nums ${k.c}`}>{k.v}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-4 font-display text-sm font-semibold text-gray-900">Détail par réseau</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">
              {['Réseau','Volume total','Commission brute','Frais gateway','Marge nette','%'].map(h=>(
                <th key={h} className="px-3 py-2 text-right first:text-left text-xs font-medium uppercase tracking-wide text-gray-400">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {Object.entries(reseauxMap).map(([id,r])=>(
                <tr key={id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900">{r.nom}</td>
                  <td className="px-3 py-2 text-right font-mono text-gray-600">{fmtN(r.soldeTotal)}</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-600">{fmtN(r.commBrute)}</td>
                  <td className="px-3 py-2 text-right font-mono text-red-500">-{fmtN(r.gateway)}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900">{fmtN(r.net)}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{fmtPercent(r.soldeTotal>0?r.net/r.soldeTotal*100:0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {Object.keys(commAgents).length>0 && (
        <Card>
          <h2 className="mb-4 font-display text-sm font-semibold text-gray-900">Commissions agents (mois)</h2>
          <div className="space-y-2">
            {Object.entries(commAgents).map(([type,montant])=>(
              <div key={type} className="flex justify-between items-center rounded-xl bg-gray-50 px-4 py-2.5">
                <span className="text-sm font-medium text-gray-700">{type}</span>
                <span className="font-mono text-sm font-semibold text-emerald-600">{fmtN(montant)} FCFA</span>
              </div>
            ))}
          </div>
        </Card>
      )}

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