import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export default async function RootPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  if (session.user.mustChangePin) redirect('/change-pin')
  if (session.user.role === 'SUPER_ADMIN') redirect('/superadmin')
  if (session.user.actorType === 'AGENT') redirect('/saisie')
  redirect('/dashboard')
}