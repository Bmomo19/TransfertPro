import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'
export type BadgeVariant = 'ok'|'warn'|'error'|'info'|'draft'|'purple'
const V: Record<BadgeVariant,string> = {
  ok:'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  warn:'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  error:'bg-red-50 text-red-700 ring-1 ring-red-200',
  info:'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  draft:'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  purple:'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
}
export function Badge({ variant, dot, children, className }: { variant:BadgeVariant; dot?:boolean; children:ReactNode; className?:string }) {
  const dotC = { ok:'bg-emerald-500',warn:'bg-amber-500',error:'bg-red-500',info:'bg-blue-500',draft:'bg-gray-400',purple:'bg-violet-500' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', V[variant], className)}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', dotC[variant])} />}
      {children}
    </span>
  )
}