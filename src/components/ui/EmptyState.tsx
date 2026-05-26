import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
export function EmptyState({ icon, title, description, action, className }: { icon?:ReactNode; title:string; description?:string; action?:ReactNode; className?:string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center', className)}>
      {icon&&<div className="mb-4 text-gray-300">{icon}</div>}
      <p className="font-medium text-gray-700">{title}</p>
      {description&&<p className="mt-1 text-sm text-gray-400">{description}</p>}
      {action&&<div className="mt-6">{action}</div>}
    </div>
  )
}