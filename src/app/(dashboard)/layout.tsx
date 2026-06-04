import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getTenantBySlug, getTenantSlug } from '@/lib/tenant'
import { getAbonnementInfo } from '@/lib/abonnement'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { AlertTriangle, XCircle } from 'lucide-react'
import { fmtN } from '@/lib/formatting'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  if (session.user.mustChangePin) redirect('/change-pin')

  const slug   = await getTenantSlug()
  const tenant = slug ? await getTenantBySlug(slug) : null

  const cssVars = tenant ? {
    '--tenant-primary':   tenant.colorPrimary,
    '--tenant-secondary': tenant.colorSecondary,
    '--tenant-text':      '#ffffff',
  } as React.CSSProperties : {}

  // Vérification abonnement (uniquement pour les tenants, pas superadmin)
  const isResp = session.user.role === 'RESPONSABLE'
  const info   = tenant && isResp ? await getAbonnementInfo(tenant.id) : null

  // Blocage : rediriger vers page dédiée
  if (info?.statut === 'BLOQUE') {
    return (
      <div style={cssVars} className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-3xl bg-white border border-red-100 shadow-xl p-8 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
            <XCircle size={32} className="text-red-500"/>
          </div>
          <h1 className="font-display text-xl font-bold text-gray-900">Accès suspendu</h1>
          <p className="text-sm text-gray-600">
            Votre abonnement mensuel de <strong>{fmtN(info.montant)} FCFA</strong> n'a pas été réglé.
            L'accès a été suspendu 2 jours après la date d'échéance.
          </p>
          <p className="text-xs text-gray-400">
            Contactez votre administrateur pour régulariser votre situation.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={cssVars}>
      <Sidebar tenantName={tenant?.name} tenantColor={tenant?.colorPrimary}/>
      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Bannière alerte abonnement */}
        {info?.statut === 'ALERTE' && (
          <div className="bg-amber-500 px-4 py-2.5 text-center text-sm font-medium text-white flex items-center justify-center gap-2">
            <AlertTriangle size={15}/>
            {info.joursRestants !== null && info.joursRestants >= 0
              ? `Abonnement dû dans ${info.joursRestants} jour${info.joursRestants > 1 ? 's' : ''} — ${fmtN(info.montant)} FCFA à régler avant le ${info.dateLimite?.toLocaleDateString('fr-FR')}`
              : `Abonnement en retard de ${Math.abs(info.joursRestants ?? 0)} jour${Math.abs(info.joursRestants ?? 0) > 1 ? 's' : ''} — ${fmtN(info.montant)} FCFA — Contactez votre administrateur`
            }
          </div>
        )}
        <main className="flex-1 px-4 py-6 pb-24 lg:px-6 lg:pb-6">
          {children}
        </main>
      </div>
      <MobileNav/>
    </div>
  )
}
