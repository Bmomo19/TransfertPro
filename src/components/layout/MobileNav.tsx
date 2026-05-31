'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, PenLine, Users, BookOpen, ShieldCheck, Building2, LogOut, HandCoins } from 'lucide-react'
import { useSession } from 'next-auth/react'

const TABS_RESP = [
  { href:'/dashboard',   icon:LayoutDashboard, label:'Accueil' },
  { href:'/agents',      icon:Users,           label:'Agents' },
  { href:'/journal',     icon:BookOpen,        label:'Journal' },
  { href:'/creances',    icon:HandCoins,       label:'Créances' },
  { href:'/audit',       icon:ShieldCheck,     label:'Audit' },
]
const TABS_AGENT = [
  { href:'/saisie',   icon:PenLine,   label:'Saisie' },
  { href:'/creances', icon:HandCoins, label:'Créances' },
]
const TABS_SUPER = [{ href:'/superadmin', icon:Building2, label:'Structures' }]

export function MobileNav() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const role = session?.user?.role
  const actorType = session?.user?.actorType

  const tabs = status !== 'authenticated' ? []
             : actorType === 'AGENT'     ? TABS_AGENT
             : role === 'SUPER_ADMIN'    ? TABS_SUPER
             : TABS_RESP

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-gray-100 bg-white lg:hidden" style={{paddingBottom:'env(safe-area-inset-bottom)'}}>
      <div className="flex">
        {tabs.map(tab => {
          const active = pathname===tab.href || pathname.startsWith(tab.href+'/')
          return (
            <Link key={tab.href} href={tab.href} className="flex flex-1 flex-col items-center gap-0.5 py-3 text-[10px] font-medium transition-colors" style={{color: active ? 'var(--tenant-primary)' : '#9ca3af'}}>
              <tab.icon size={20} strokeWidth={active ? 2 : 1.5}/>
              <span>{tab.label}</span>
            </Link>
          )
        })}
        <button
          onClick={() => { const s = session?.user?.tenantSlug; window.location.href = `/api/logout${s ? `?tenant=${s}` : ''}` }}
          className="flex flex-1 flex-col items-center gap-0.5 py-3 text-[10px] font-medium text-gray-400 transition-colors active:text-red-400">
          <LogOut size={20} strokeWidth={1.5}/>
          <span>Quitter</span>
        </button>
      </div>
    </nav>
  )
}
