'use client'
import { useToasts } from '@/hooks/useToast'
import { cn } from '@/lib/cn'

export function ToastProvider() {
  const { toasts, dismiss } = useToasts()
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 lg:bottom-6">
      {toasts.map(t => (
        <div key={t.id} onClick={()=>dismiss(t.id)} className={cn(
          'flex items-start gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg cursor-pointer',
          'animate-slide-up max-w-xs border',
          t.type==='success' && 'bg-emerald-600 text-white border-emerald-700',
          t.type==='error'   && 'bg-red-600    text-white border-red-700',
          t.type==='warn'    && 'bg-amber-500  text-white border-amber-600',
          t.type==='info'    && 'bg-blue-600   text-white border-blue-700',
        )}>
          <span>{t.type==='success'?'✓':t.type==='error'?'✗':t.type==='warn'?'⚠':'ℹ'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}