'use client'
import { SessionProvider as P } from 'next-auth/react'
import type { ReactNode } from 'react'
export function SessionProvider({ children }: { children:ReactNode }) {
  return <P>{children}</P>
}