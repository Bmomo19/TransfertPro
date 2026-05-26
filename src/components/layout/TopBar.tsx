'use client'
import { useSession } from 'next-auth/react'
import { Avatar } from '@/components/ui/Avatar'

export function TopBar({ title }: { title?: string }) {
  const { data: session } = useSession()
  return (
    <header className="flex h-14 items-center border-b border-gray-100 bg-white px-4 lg:px-6">
      <h1 className="flex-1 font-display text-base font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-gray-400 sm:block">{session?.user?.name}</span>
        <Avatar name={session?.user?.name ?? '?'} size="sm"/>
      </div>
    </header>
  )
}