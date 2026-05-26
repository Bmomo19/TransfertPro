'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, PenLine, Users, BookOpen, Coins, ShieldCheck, Settings, LogOut, Building2, HandCoins } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Avatar } from '@/components/ui/Avatar'
import { useSession, signOut } from 'next-auth/react'
import { getLogoutUrl } from '@/lib/logout'

const NAV = {
  AGENT:      [{ href:'/saisie',   icon:PenLine,    label:'Ma saisie' },
               { href:'/creances', icon:HandCoins,  label:'Créances' }],
  RESPONSABLE:[{ href:'/dashboard',   icon:LayoutDashboard, label:'Tableau de bord' },
               { href:'/agents',      icon:Users,           label:'Agents' },
               { href:'/journal',     icon:BookOpen,        label:'Journal' },
               { href:'/commissions', icon:Coins,           label:'Commissions' },
               { href:'/creances',    icon:HandCoins,       label:'Créances' },
               { href:'/audit',       icon:ShieldCheck,     label:'Audit' },
               { href:'/settings',    icon:Settings,        label:'Paramètres' }],
  SUPER_ADMIN:[{ href:'/superadmin',  icon:Building2,       label:'Structures' }],
}

interface SidebarProps { tenantName?: string; tenantColor?: string }

export function Sidebar({ tenantName, tenantColor }: SidebarProps) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const role = session?.user?.role
  const actorType = session?.user?.actorType

  const nav = status !== 'authenticated' ? []
            : actorType === 'AGENT'    ? NAV.AGENT
            : role === 'SUPER_ADMIN'   ? NAV.SUPER_ADMIN
            : NAV.RESPONSABLE

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-gray-100 bg-white lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-gray-100 px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg" style={{background: tenantColor ?? '#F97316', color:'#fff'}}>💱</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 font-display">{tenantName ?? 'TransfertPro'}</p>
          <p className="text-[10px] uppercase tracking-wider text-gray-400">Dashboard</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {nav.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link href={item.href} className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'bg-(--tenant-secondary) text-(--tenant-primary) font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}>
                  <item.icon size={17} strokeWidth={1.75}/>
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={session?.user?.name ?? '?'} size="sm"/>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{session?.user?.name}</p>
            <p className="truncate text-xs text-gray-400">{role}</p>
          </div>
          <button onClick={async () => { await signOut({ redirect: false }); window.location.href = getLogoutUrl(session?.user?.tenantSlug) }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Déconnexion">
            <LogOut size={16}/>
          </button>
        </div>
      </div>
    </aside>
  )
}