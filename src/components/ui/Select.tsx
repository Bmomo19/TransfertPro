'use client'
import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { label?:string; error?:string; options:{value:string;label:string}[] }
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, error, options, className, id, ...props }, ref) => {
  const iid = id ?? label?.toLowerCase().replace(/\s+/g,'-')
  return (
    <div className="w-full">
      {label && <label htmlFor={iid} className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>}
      <select ref={ref} id={iid} className={cn('block w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]', error&&'border-red-400', className)} {...props}>
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  )
})
Select.displayName = 'Select'