import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { fmtN, fmtTimeAgo } from '@/lib/formatting'
import { ROLE_LABELS } from '@/lib/constants'

interface Props {
  agent: { id:string; code:string; name:string; phone?:string|null; role:string; isActive:boolean }
  lastSaisie?: { totalGlobal:unknown; statut:string; date:Date } | null
}

export function AgentCard({ agent, lastSaisie }: Props) {
  return (
    <Link href={`/agents/${agent.id}`} className="group flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <Avatar name={agent.name} size="md"/>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="truncate text-sm font-semibold text-gray-900">{agent.name}</p>
            <Badge variant={agent.isActive?'ok':'draft'} dot>{agent.isActive?'Actif':'Inactif'}</Badge>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="font-mono text-xs font-medium text-gray-400">{agent.code}</span>
            <span className="text-gray-200">·</span>
            <span className="text-xs text-gray-400">{ROLE_LABELS[agent.role]??agent.role}</span>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-50 pt-3">
        {lastSaisie ? (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-gray-400">{fmtTimeAgo(lastSaisie.date)}</span>
            <div className="flex items-center gap-2">
              <Badge variant={lastSaisie.statut==='VALIDE'?'ok':lastSaisie.statut==='SOUMIS'?'info':'error'}>
                {lastSaisie.statut}
              </Badge>
              <span className="font-mono text-xs font-medium text-gray-700">{fmtN(Number(lastSaisie.totalGlobal))} F</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">Aucune saisie ce mois</p>
        )}
      </div>
    </Link>
  )
}