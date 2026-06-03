import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { fmtDate } from '@/lib/formatting'
import { PLAN_LABELS } from '@/lib/constants'
import { CreateTenantModal } from './CreateTenantModal'
import { TenantActions } from './TenantActions'
import { ReseauxModal } from './ReseauxModal'

export default async function SuperAdminPage() {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count:  { select: { agents: true, users: true, saisies: true } },
      reseaux: { orderBy: { ordre: 'asc' }, select: { id: true, nom: true, code: true, tauxCommission: true, tauxGateway: true, isActive: true } },
    },
  })

  const stats = {
    total:  tenants.length,
    actifs: tenants.filter(t=>t.isActive).length,
    agents: tenants.reduce((s,t)=>s+t._count.agents, 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-gray-900">Structures clientes</h1>
          <p className="mt-1 text-sm text-gray-500">{stats.actifs} actives · {stats.agents} agents au total</p>
        </div>
        <CreateTenantModal/>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[{l:'Structures',v:stats.total},{l:'Actives',v:stats.actifs},{l:'Agents total',v:stats.agents}].map(s=>(
          <Card key={s.l} padding="normal" className="text-center">
            <p className="font-display text-2xl font-semibold text-gray-900">{s.v}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{s.l}</p>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        {tenants.map(t=>(
          <Card key={t.id} padding="normal">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" style={{background:t.colorPrimary,color:'#fff'}}>💱</div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-base font-semibold text-gray-900">{t.name}</h3>
                  <Badge variant={t.isActive?'ok':'draft'} dot>{t.isActive?'Active':'Inactive'}</Badge>
                  <Badge variant={t.plan==='PREMIUM'?'purple':t.plan==='STANDARD'?'info':'draft'}>{PLAN_LABELS[t.plan]}</Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>Slug: <span className="font-mono font-medium">{t.slug}</span></span>
                  <span>·</span>
                  <span>{t._count.agents} agent{t._count.agents>1?'s':''}</span>
                  <span>·</span>
                  <span>{t._count.saisies} saisie{t._count.saisies>1?'s':''}</span>
                  <span>·</span>
                  <span>Créé {fmtDate(t.createdAt)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <TenantActions tenantId={t.id} tenantSlug={t.slug} isActive={t.isActive} currentPlan={t.plan}/>
                <ReseauxModal
                  tenantId={t.id}
                  tenantName={t.name}
                  reseaux={t.reseaux.map(r => ({
                    ...r,
                    tauxCommission: Number(r.tauxCommission),
                    tauxGateway:    Number(r.tauxGateway),
                  }))}
                />
              </div>
            </div>
          </Card>
        ))}
        {tenants.length===0 && (
          <Card padding="normal" className="py-12 text-center">
            <p className="text-gray-500">Aucune structure créée</p>
            <p className="mt-1 text-sm text-gray-400">Créez la première structure avec le bouton ci-dessus.</p>
          </Card>
        )}
      </div>
    </div>
  )
}