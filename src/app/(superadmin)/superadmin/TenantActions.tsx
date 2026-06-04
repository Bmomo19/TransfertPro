'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { toggleTenant, updateTenantPlan } from '@/actions/superadmin'
import { toast } from '@/hooks/useToast'

interface Props { tenantId:string; tenantSlug:string; isActive:boolean; currentPlan:string }

export function TenantActions({ tenantId, tenantSlug, isActive, currentPlan }: Props) {
  function visitSubdomain() {
    const { protocol, port } = window.location
    const p = port ? `:${port}` : ''
    const isLocal = window.location.hostname.includes('localhost')
    const url = isLocal
      ? `${protocol}//${tenantSlug}.localhost${p}`
      : `${protocol}//${tenantSlug}.transfertpro.com`
    window.open(url, '_blank', 'noopener')
  }
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    const res = await toggleTenant(tenantId)
    setLoading(false)
    if(!res.ok) toast.error(res.error)
    else toast.success(isActive ? 'Structure désactivée' : 'Structure activée')
  }

  async function handlePlan(e:React.ChangeEvent<HTMLSelectElement>) {
    const plan = e.target.value as any
    const res = await updateTenantPlan(tenantId, plan)
    if(!res.ok) toast.error(res.error)
    else toast.success(`Plan mis à jour : ${plan}`)
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <select defaultValue={currentPlan} onChange={handlePlan}
        className="rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-(--tenant-primary)">
        <option value="STARTER">Starter</option>
        <option value="STANDARD">Standard</option>
        <option value="PREMIUM">Premium</option>
      </select>
      <Button size="sm" variant="secondary" onClick={visitSubdomain}>
        Accéder →
      </Button>
      <Button size="sm" variant={isActive?'danger':'secondary'} loading={loading} onClick={handleToggle}>
        {isActive?'Désactiver':'Activer'}
      </Button>
    </div>
  )
}