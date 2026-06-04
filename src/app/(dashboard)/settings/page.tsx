import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getTenantBySlug, getTenantSlug } from '@/lib/tenant'
import { Card } from '@/components/ui/Card'
import { PLAN_LABELS, PLAN_LIMITS } from '@/lib/constants'
import { Badge } from '@/components/ui/Badge'
import { ReseauxCommissionSettings } from './ReseauxCommissionSettings'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if(!session?.user || session.user.role!=='RESPONSABLE') redirect('/dashboard')

  const slug   = await getTenantSlug()
  const tenant = await getTenantBySlug(slug)
  if(!tenant) redirect('/login')

  const planLimits = PLAN_LIMITS[tenant.plan]

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-gray-900">Paramètres</h1>

      <Card>
        <h2 className="mb-4 font-display text-sm font-semibold text-gray-900">Informations de la structure</h2>
        <div className="space-y-3">
          {[{l:'Nom',v:tenant.name},{l:'Slug',v:tenant.slug},{l:'Plan',v:PLAN_LABELS[tenant.plan]}].map(r=>(
            <div key={r.l} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-sm font-medium text-gray-600">{r.l}</span>
              <span className="text-sm font-semibold text-gray-900">{r.v}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-sm font-semibold text-gray-900">Plan actuel — {PLAN_LABELS[tenant.plan]}</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2"><Badge variant={planLimits.agents<999?'info':'ok'}>{planLimits.agents<999?`Max ${planLimits.agents} agents`:'Agents illimités'}</Badge></div>
          <div className="flex items-center gap-2"><Badge variant={planLimits.export?'ok':'draft'}>{planLimits.export?'Export CSV activé':'Export CSV non disponible'}</Badge></div>
          <div className="flex items-center gap-2"><Badge variant={planLimits.api?'ok':'draft'}>{planLimits.api?'API activée':'API non disponible'}</Badge></div>
        </div>
        <p className="mt-4 text-sm text-gray-500">Pour changer de plan, contactez votre administrateur.</p>
      </Card>

      <Card>
        <h2 className="mb-1 font-display text-sm font-semibold text-gray-900">Commissions agents</h2>
        <p className="mb-4 text-xs text-gray-400">
          Activez le suivi de commission pour les réseaux où les agents déclarent ce qu'ils ont reçu.
        </p>
        <ReseauxCommissionSettings
          reseaux={tenant.reseaux.filter(r => r.isActive).map(r => ({
            id:                r.id,
            nom:               r.nom,
            hasCommissionAgent: r.hasCommissionAgent,
            commissionParResp:  r.commissionParResp,
            modeCommission:    r.modeCommission as 'DIRECT' | 'CUMULATIF',
            commissionLabel:   r.commissionLabel,
          }))}
        />
      </Card>
    </div>
  )
}