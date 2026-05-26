'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import { Delete } from 'lucide-react'
import { cn } from '@/lib/cn'

type PreselectedTenant = { slug: string; name: string; color: string }
type Step = 'role' | 'direct' | 'pin'

const FALLBACK_ROLES = [
  { id: 'hudiphen',   label: 'Hudiphen',      sub: 'Agent ou Responsable',   color: '#F97316' },
  { id: 'hephed',     label: 'Hephed Finance', sub: 'Agent ou Responsable',   color: '#3B82F6' },
  { id: 'superadmin', label: 'Super Admin',    sub: 'Administration globale', color: '#059669' },
]

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','del']

function PinDots({ pin, pinErr }: { pin: string; pinErr: boolean }) {
  return (
    <div className="mb-6 flex justify-center gap-5">
      {[0,1,2,3].map(i => (
        <div key={i} className={cn('h-4 w-4 rounded-full border-2 transition-all duration-150',
          pinErr ? 'border-red-400 bg-red-400' :
          i < pin.length ? 'scale-110 border-white bg-white' : 'border-white/40'
        )}/>
      ))}
    </div>
  )
}

function PinSpinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <svg className="h-10 w-10 animate-spin text-white/80" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      <p className="text-sm text-white/60">Vérification en cours…</p>
    </div>
  )
}

function PinKeypad({ onPress, onDel, pin, disabled }: {
  onPress: (k: string) => void
  onDel: () => void
  pin: string
  disabled?: boolean
}) {
  return (
    <div className={cn('grid grid-cols-3 gap-3', disabled && 'pointer-events-none opacity-35')}>
      {KEYS.map((k, i) => {
        if (k === '') return <div key={i}/>
        if (k === 'del') return (
          <button key={i} onClick={onDel} disabled={!pin}
            className="flex h-16 items-center justify-center rounded-2xl bg-white/20 text-white transition-all active:scale-95 disabled:opacity-30 border border-white/20">
            <Delete size={20}/>
          </button>
        )
        return (
          <button key={i} onClick={() => onPress(k)}
            className="flex h-16 items-center justify-center rounded-2xl bg-white/15 text-white text-xl font-semibold transition-all active:scale-95 hover:bg-white/25 border border-white/20">
            {k}
          </button>
        )
      })}
    </div>
  )
}

export function LoginClient({ tenant }: { tenant?: PreselectedTenant }) {
  const router = useRouter()
  const params = useSearchParams()
  const { data: session, status } = useSession()

  const [tenantSlug,  setTenantSlug]  = useState(tenant?.slug  ?? '')
  const [tenantName,  setTenantName]  = useState(tenant?.name  ?? '')
  const [tenantColor, setTenantColor] = useState(tenant?.color ?? '#0B2D8F')
  const [step, setStep] = useState<Step>(tenant ? 'direct' : 'role')
  const [pin,  setPin]  = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [pinErr,      setPinErr]      = useState(false)

  useEffect(() => {
    if (status === 'authenticated') {
      const cb = params.get('callbackUrl') ?? (
        session.user.role === 'SUPER_ADMIN' ? '/superadmin' :
        session.user.actorType === 'AGENT'  ? '/saisie'     : '/dashboard'
      )
      router.push(cb)
    }
  }, [status, session, router, params])

  if (status === 'loading' || status === 'authenticated') return (
    <div className="flex min-h-screen items-center justify-center" style={{background: `linear-gradient(160deg, ${tenantColor}DD 0%, ${tenantColor} 100%)`}}>
      <svg className="h-10 w-10 animate-spin text-white/70" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </div>
  )

  const bgGrad = `linear-gradient(160deg, ${tenantColor}DD 0%, ${tenantColor} 100%)`

  async function submitPin(p: string) {
    if (p.length < 4) return
    setLoading(true); setError(''); setPinErr(false)
    const isSuper = step === 'pin'
    const res = await signIn('credentials', {
      redirect:   false,
      tenantSlug,
      identifier: isSuper ? 'superadmin@transfertpro.app' : '',
      pin:        p,
      actorType:  isSuper ? 'USER' : 'AUTO',
    })
    setLoading(false)
    if (res?.ok) return
    setPinErr(true); setPin('')
    setError('Code PIN incorrect')
    setTimeout(() => setPinErr(false), 1000)
  }

  function pressKey(k: string) {
    if (loading) return
    const next = (pin + k).slice(0, 4)
    setPin(next)
    if (next.length === 4) submitPin(next)
  }

  const del = () => setPin(p => p.slice(0, -1))

  // ── Sélection de la structure (localhost sans sous-domaine) ──
  if (step === 'role') return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-slate-900 to-blue-900 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl">💱</div>
          <h1 className="font-display text-2xl font-bold text-white">TransfertPro</h1>
          <p className="mt-1 text-sm text-white/60">Sélectionnez votre structure</p>
        </div>
        <div className="space-y-3">
          {FALLBACK_ROLES.map(r => (
            <button key={r.id} onClick={() => {
              setTenantSlug(r.id); setTenantName(r.label); setTenantColor(r.color)
              setPin(''); setError('')
              setStep(r.id === 'superadmin' ? 'pin' : 'direct')
            }} className="w-full flex items-center gap-4 rounded-2xl border border-white/20 bg-white/10 p-4 text-left transition-all hover:bg-white/20 active:scale-98">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white" style={{background: r.color}}>
                {r.id === 'superadmin' ? '🔐' : r.label.charAt(0)}
              </span>
              <div>
                <p className="font-semibold text-white">{r.label}</p>
                <p className="text-xs text-white/60">{r.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  // ── Super Admin : PIN direct (identifiant fixe) ──────────────
  if (step === 'pin') return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6" style={{background: bgGrad}}>
      <div className="w-full max-w-xs">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-2xl">🔐</div>
          <h2 className="font-display text-xl font-bold text-white">Super Admin</h2>
          <p className="mt-1 text-sm text-white/60">Entrez votre code PIN</p>
        </div>
        <PinDots pin={pin} pinErr={pinErr}/>
        {error && <p className="mb-4 text-center text-sm text-red-300">{error}</p>}
        {loading ? <PinSpinner/> : <PinKeypad onPress={pressKey} onDel={del} pin={pin}/>}
        <button onClick={() => { setStep('role'); setPin(''); setError('') }}
          className="mt-6 w-full text-center text-sm text-white/50 hover:text-white/80">
          ← Retour
        </button>
      </div>
    </div>
  )

  // ── Tenant connu : PIN seul ──────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6" style={{background: bgGrad}}>
      <div className="w-full max-w-xs">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold text-white">
            {tenantName.charAt(0)}
          </div>
          <h2 className="font-display text-xl font-bold text-white">{tenantName}</h2>
          <p className="mt-1 text-sm text-white/60">Entrez votre code PIN</p>
        </div>

        <PinDots pin={pin} pinErr={pinErr}/>
        {error && <p className="mb-4 text-center text-sm text-red-300">{error}</p>}
        {loading ? <PinSpinner/> : <PinKeypad onPress={pressKey} onDel={del} pin={pin}/>}

        {!tenant && (
          <button onClick={() => { setStep('role'); setPin(''); setError('') }}
            className="mt-6 w-full text-center text-sm text-white/50 hover:text-white/80">
            ← Retour
          </button>
        )}
      </div>
    </div>
  )
}
