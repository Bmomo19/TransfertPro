import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AgentCard } from '@/components/agents/AgentCard'
import { CreateAgentModal } from '@/components/agents/CreateAgentModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Users } from 'lucide-react'

export default async function AgentsPage() {
  const session = await getServerSession(authOptions)
  if(!session?.user) redirect('/login')
  if(session.user.role==='SUPER_ADMIN') redirect('/superadmin')

  const tenantId = session.user.tenantId!

  const agents = await prisma.agent.findMany({
    where:   { tenantId },
    orderBy: [{ isActive:'desc' }, { code:'asc' }],
    include: {
      saisies: {
        where:   { date:{ gte:new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
        orderBy: { date:'desc' },
        take:    1,
        select:  { totalGlobal:true, statut:true, date:true },
      },
    },
  })

  const stats = {
    total:  agents.length,
    actifs: agents.filter(a=>a.isActive).length,
    saisi:  agents.filter(a=>a.saisies[0]?.date && new Date(a.saisies[0].date).toDateString()===new Date().toDateString()).length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-gray-900">Gestion des agents</h1>
          <p className="mt-1 text-sm text-gray-500">{stats.actifs} actif{stats.actifs>1?'s':''} · {stats.saisi} saisie{stats.saisi>1?'s':''} aujourd'hui</p>
        </div>
        <CreateAgentModal/>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[{l:'Total',v:stats.total},{l:'Actifs',v:stats.actifs},{l:'Ont saisi',v:stats.saisi}].map(s=>(
          <div key={s.l} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm text-center">
            <p className="font-display text-2xl font-semibold text-gray-900">{s.v}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{s.l}</p>
          </div>
        ))}
      </div>

      {agents.length===0 ? (
        <EmptyState icon={<Users size={40}/>} title="Aucun agent" description="Créez votre premier agent pour commencer." action={<CreateAgentModal/>}/>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map(a=><AgentCard key={a.id} agent={a} lastSaisie={a.saisies[0]??null}/>)}
        </div>
      )}
    </div>
  )
}