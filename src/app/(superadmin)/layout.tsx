import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'

export default async function SuperAdminLayout({ children }: { children:React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if(!session?.user || session.user.role !== 'SUPER_ADMIN') redirect('/login')
  if(session.user.mustChangePin) redirect('/change-pin')

  return (
    <div style={{ '--tenant-primary':'#059669', '--tenant-secondary':'#F0FDF4', '--tenant-text':'#ffffff' } as React.CSSProperties}>
      <Sidebar tenantName="TransfertPro Admin" tenantColor="#059669"/>
      <div className="flex min-h-screen flex-col lg:pl-64">
        <main className="flex-1 px-4 py-6 pb-24 lg:px-6 lg:pb-6">{children}</main>
      </div>
      <MobileNav/>
    </div>
  )
}