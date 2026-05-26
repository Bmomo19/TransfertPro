import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getTenantBySlug, getTenantSlug } from '@/lib/tenant'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'

export default async function DashboardLayout({ children }: { children:React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if(!session?.user) redirect('/login')
  if(session.user.mustChangePin) redirect('/change-pin')

  const slug   = await getTenantSlug()
  const tenant = slug ? await getTenantBySlug(slug) : null

  const cssVars = tenant ? {
    '--tenant-primary':   tenant.colorPrimary,
    '--tenant-secondary': tenant.colorSecondary,
    '--tenant-text':      '#ffffff',
  } as React.CSSProperties : {}

  return (
    <div style={cssVars}>
      <Sidebar tenantName={tenant?.name} tenantColor={tenant?.colorPrimary}/>
      <div className="flex min-h-screen flex-col lg:pl-64">
        <main className="flex-1 px-4 py-6 pb-24 lg:px-6 lg:pb-6">
          {children}
        </main>
      </div>
      <MobileNav/>
    </div>
  )
}