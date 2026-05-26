import { cn } from '@/lib/cn'
const C = ['bg-orange-100 text-orange-700','bg-blue-100 text-blue-700','bg-emerald-100 text-emerald-700','bg-violet-100 text-violet-700','bg-pink-100 text-pink-700','bg-amber-100 text-amber-700']
export function Avatar({ name, size='md', className }: { name:string; size?:'sm'|'md'|'lg'; className?:string }) {
  const color = C[(name.charCodeAt(0)??0)%C.length]
  const init = name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()
  const s = { sm:'h-7 w-7 text-xs', md:'h-9 w-9 text-sm', lg:'h-11 w-11 text-base' }
  return <div className={cn('flex flex-shrink-0 items-center justify-center rounded-full font-semibold',color,s[size],className)}>{init}</div>
}