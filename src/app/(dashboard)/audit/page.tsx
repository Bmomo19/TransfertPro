import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Pagination } from '@/components/ui/Pagination'
import { Avatar } from '@/components/ui/Avatar'
import { fmtDateTime } from '@/lib/formatting'
import { AUDIT_ACTION_META } from '@/lib/constants'
import { cn } from '@/lib/cn'
import type { AuditAction } from '@prisma/client'

const PER = 25

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?:string; action?:string }> }) {
  const session = await getServerSession(authOptions)
  if(!session?.user || !['RESPONSABLE','SUPER_ADMIN'].includes(session.user.role)) redirect('/dashboard')

  const { page: pageParam, action } = await searchParams
  const page     = Math.max(1, parseInt(pageParam ?? '1'))
  const tenantId = session.user.tenantId!

  const where = { tenantId, ...(action ? { action: action as AuditAction } : {}) }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where, orderBy:{ createdAt:'desc' }, skip:(page-1)*PER, take:PER,
    }),
    prisma.auditLog.count({ where }),
  ])

  const actions = Object.keys(AUDIT_ACTION_META)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-gray-900">Journal d'audit</h1>
        <p className="mt-1 text-sm text-gray-500">{total.toLocaleString('fr-FR')} entrées</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <a href="?" className={cn('rounded-xl px-3 py-1.5 text-xs font-medium',!action?'bg-gray-900 text-white':'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}>Toutes</a>
        {actions.map(a=>(
          <a key={a} href={`?action=${a}`} className={cn('rounded-xl px-3 py-1.5 text-xs font-medium',action===a?'bg-gray-900 text-white':'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}>{AUDIT_ACTION_META[a].label}</a>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="divide-y divide-gray-50">
          {logs.map(log=>{
            const meta = AUDIT_ACTION_META[log.action] ?? { label:log.action, color:'bg-gray-100 text-gray-700' }
            return (
              <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
                <Avatar name={log.actorName} size="sm"/>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{log.actorName}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', meta.color)}>{meta.label}</span>
                    <span className="text-xs text-gray-500">{log.entity}{log.entityId && ` #${log.entityId.slice(-6)}`}</span>
                  </div>
                  {log.newValue && (
                    <p className="mt-0.5 text-xs text-gray-400 font-mono truncate">
                      {JSON.stringify(log.newValue).slice(0, 80)}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-gray-400">{fmtDateTime(log.createdAt)} · {log.actorType}</p>
                </div>
              </div>
            )
          })}
          {logs.length===0 && <p className="py-8 text-center text-sm text-gray-400">Aucune entrée</p>}
        </div>
      </div>
      <Pagination page={page} total={total} perPage={PER}/>
    </div>
  )
}