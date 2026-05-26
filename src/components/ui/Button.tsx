'use client'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   'primary'|'secondary'|'ghost'|'danger'
  size?:      'sm'|'md'|'lg'
  loading?:   boolean
  leftIcon?:  ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant='secondary', size='md', loading=false, leftIcon, rightIcon, fullWidth, className, disabled, children, ...props }, ref) => {
    const variants = {
      primary:   'bg-[var(--tenant-primary)] text-white hover:brightness-110 focus-visible:ring-[var(--tenant-primary)]',
      secondary: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus-visible:ring-gray-300',
      ghost:     'bg-transparent text-gray-600 hover:bg-gray-100 focus-visible:ring-gray-300',
      danger:    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
    }
    const sizes = {
      sm: 'h-8  px-3 text-xs  gap-1.5 rounded-lg',
      md: 'h-10 px-4 text-sm  gap-2   rounded-xl',
      lg: 'h-12 px-5 text-base gap-2  rounded-xl',
    }
    return (
      <button ref={ref} disabled={disabled||loading} className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150 select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]',
        variants[variant!], sizes[size!],
        fullWidth && 'w-full', className
      )} {...props}>
        {loading ? (
          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        ) : leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    )
  }
)
Button.displayName = 'Button'