'use client'
import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?:string; error?:string; hint?:string }
export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, hint, className, id, ...props }, ref) => {
  const iid = id ?? label?.toLowerCase().replace(/\s+/g,'-')
  return (
    <div className="w-full">
      {label && <label htmlFor={iid} className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>}
      <input ref={ref} id={iid} className={cn(
        'block w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400',
        'transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]',
        error && 'border-red-400 focus:ring-red-400', className
      )} {...props} />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-gray-400">{hint}</p>}
    </div>
  )
})
Input.displayName = 'Input'