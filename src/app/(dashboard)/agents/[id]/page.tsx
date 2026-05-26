import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { ResetPinButton } from '@/components/agents/ResetPinButton'
import { ToggleAgentButton } from '@/components/agents/ToggleAgentButton'
import { fmtN, fmtDateTime } from '@/lib/formatting'
import { ROLE_LABELS } from '@/lib/constants'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function AgentDetailPage({ params }: { params: Promise<{ id:string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if(!session?.user) redirect('/login')

  const agent = await prisma.agent.findFirst({
    where:   { id, tenantId:session.user.tenantId! },
    include: {
      saisies: {
        orderBy: { date:'desc' },
        take:    10,
        include: { details:{ include:{ reseau:true } }, commissions:true },
      },
    },
  })
  if(!agent) notFound()

  const totalSaisies = await prisma.saisie.count({ where:{ agentId:agent.id } })
  const totalVol     = await prisma.saisie.aggregate({ where:{ agentId:agent.id }, _sum:{ totalGlobal:true } })

  return (
    <div className="space-y-6">
      <Link href="/agents" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16}/> Retour aux agents
      </Link>

      <Card>
        <div className="flex items-start gap-4">
          <Avatar name={agent.name} size="lg"/>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-semibold text-gray-900">{agent.name}</h1>
              <Badge variant={agent.isActive?'ok':'draft'} dot>{agent.isActive?'Actif':'Inactif'}</Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span className="font-mono font-medium">{agent.code}</span>
              <span>·</span>
              <span>{ROLE_LABELS[agent.role]}</span>
              {agent.phone && <><span>·</span><span>{agent.phone}</span></>}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <ResetPinButton agentId={agent.id} agentName={agent.name}/>
          <ToggleAgentButton agentId={agent.id} isActive={agent.isActive}/>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card><p className="text-xs uppercase tracking-wide text-gray-400">Saisies totales</p><p className="mt-1 font-display text-2xl font-semibold">{totalSaisies}</p></Card>
        <Card><p className="text-xs uppercase tracking-wide text-gray-400">Volume cumulé</p><p className="mt-1 font-display text-lg font-semibold">{fmtN(Number(totalVol._sum.totalGlobal??0))} F</p></Card>
      </div>

      <Card>
        <h2 className="mb-4 font-display text-sm font-semibold text-gray-900">Dernières saisies</h2>
        {agent.saisies.length===0 ? <p className="text-sm text-gray-400 py-4 text-center">Aucune saisie</p> : (
          <div className="space-y-2">
            {agent.saisies.map(s=>(
              <div key={s.id} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{s.date.toLocaleDateString('fr-FR')}</p>
                  <p className="text-xs text-gray-400">{fmtDateTime(s.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold">{fmtN(Number(s.totalGlobal))} F</p>
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