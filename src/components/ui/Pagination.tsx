'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
export function Pagination({ page, total, perPage }: { page:number; total:number; perPage:number }) {
  const router=useRouter(), pathname=usePathname(), params=useSearchParams()
  const totalPages=Math.ceil(total/perPage)
  if(totalPages<=1)return null
  const go=(p:number)=>{ const q=new URLSearchParams(params.toString()); q.set('page',String(p)); router.push(`${pathname}?${q}`) }
  const pages = Array.from({length:Math.min(5,totalPages)},(_,i)=>page<=3?i+1:page+i-2).filter(p=>p>=1&&p<=totalPages)
  return (
    <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-4">
      <p className="text-sm text-gray-500">{((page-1)*perPage)+1}–{Math.min(page*perPage,total)} / {total.toLocaleString('fr-FR')}</p>
      <div className="flex gap-1">
        <Pg label="←" onClick={()=>go(page-1)} disabled={page===1}/>
        {pages.map(p=><Pg key={p} label={String(p)} onClick={()=>go(p)} active={p===page}/>)}
        <Pg label="→" onClick={()=>go(page+1)} disabled={page===totalPages}/>
      </div>
    </div>
  )
}
function Pg({label,onClick,disabled,active}:{label:string;onClick:()=>void;disabled?:boolean;active?:boolean}) {
  return <button onClick={onClick} disabled={disabled} className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors',active&&'bg-[var(--tenant-primary)] text-white',!active&&'text-gray-600 hover:bg-gray-100',disabled&&'cursor-not-allowed opacity-40')}>{label}</button>
}