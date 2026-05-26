'use client'
import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
export function Modal({ open, onClose, title, children, size='md' }: { open:boolean; onClose?:()=>void; title?:string; children:ReactNode; size?:'sm'|'md'|'lg' }) {
  useEffect(() => {
    const h=(e:KeyboardEvent)=>{ if(e.key==='Escape') onClose?.() }
    if(open)document.addEventListener('keydown',h)
    return ()=>document.removeEventListener('keydown',h)
  },[open,onClose])
  if(!open)return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={e=>e.target===e.currentTarget&&onClose?.()}>
      <div className={cn('w-full animate-slide-up rounded-3xl bg-white p-6 shadow-2xl',{sm:'max-w-sm',md:'max-w-md',lg:'max-w-lg'}[size])}>
        {title && (
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            {onClose && <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X size={18}/></button>}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}