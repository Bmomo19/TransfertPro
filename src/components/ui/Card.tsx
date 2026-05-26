import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'
export function Card({ children, className, padding='normal' }: { children:ReactNode; className?:string; padding?:'none'|'normal'|'lg' }) {
  return <div className={cn('rounded-2xl border border-gray-100 bg-white shadow-sm', padding==='normal'&&'p-5', padding==='lg'&&'p-6', className)}>{children}</div>
}