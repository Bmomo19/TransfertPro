import { cn } from '@/lib/cn'
export function Skeleton({ className }: { className?:string }) {
  return <div className={cn('animate-pulse rounded-lg bg-gray-200',className)} />
}
export function SkeletonCard() {
  return <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3"><Skeleton className="h-3 w-24"/><Skeleton className="h-8 w-32"/></div>
}