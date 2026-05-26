'use client'
import { useState } from 'react'
import { UserX, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toggleAgent } from '@/actions/agents'
import { toast } from '@/hooks/useToast'

export function ToggleAgentButton({ agentId, isActive }: { agentId:string; isActive:boolean }) {
  const [loading, setLoading] = useState(false)
  async function handle() {
    setLoading(true)
    const res = await toggleAgent(agentId)
    setLoading(false)
    if(!res.ok) toast.error(res.error)
    else toast.success(isActive ? 'Agent désactivé' : 'Agent activé')
  }
  return (
    <Button variant={isActive?'danger':'secondary'} size="sm" loading={loading}
      leftIcon={isActive ? <UserX size={14}/> : <UserCheck size={14}/>}
      onClick={handle}>
      {isActive ? 'Désactiver' : 'Activer'}
    </Button>
  )
}