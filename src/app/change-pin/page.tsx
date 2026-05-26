'use client'
import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Delete } from 'lucide-react'
import { cn } from '@/lib/cn'
import { changePin } from '@/actions/auth'
import { getLogoutUrl } from '@/lib/logout'

type Step = 'new1' | 'new2'

export default function ChangePinPage() {
  const { data: session } = useSession()
  const [step,    setStep]    = useState<Step>('new1')
  const [pin1,    setPin1]    = useState('')
  const [pin2,    setPin2]    = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)

  const isFirstLogin = session?.user?.mustChangePin
  const KEYS = ['1','2','3','4','5','6','7','8','9','','0','del']

  async function pressKey(k: string) {
    if (loading) return
    if (step === 'new1') {
      const next = (pin1 + k).slice(0, 4)
      setPin1(next)
      if (next.length === 4) { setStep('new2'); return }
    } else {
      const next = (pin2 + k).slice(0, 4)
      setPin2(next)
      if (next.length === 4) {
        if (next !== pin1) { setError('Les PINs ne correspondent pas'); setPin1(''); setPin2(''); setStep('new1'); return }
        setLoading(true)
        const res = await changePin(next)
        if (res.ok) {
          setDone(true)
        } else {
          setError(res.error); setLoading(false)
        }
      }
    }
  }

  function del() {
    if (step === 'new1') setPin1(p => p.slice(0, -1))
    else setPin2(p => p.slice(0, -1))
  }

  const current = step === 'new1' ? pin1 : pin2
  const bg = `linear-gradient(160deg,#1652CC 0%,#0B2D8F 100%)`

  if (done) return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6" style={{background: bg}}>
      <div className="w-full max-w-xs text-center">

        {/* Cercle animé */}
        <div className="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-white/10 animate-ping" style={{animationDuration:'2s'}}/>
          <div className="absolute inset-0 rounded-full bg-white/10"/>
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/20 shadow-lg">
            <svg viewBox="0 0 52 52" className="h-10 w-10" fill="none">
              <circle cx="26" cy="26" r="24" stroke="white" strokeWidth="2.5" strokeOpacity="0.3"/>
              <path d="M14 26l8 8 16-16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                style={{strokeDasharray:40, strokeDashoffset:0, animation:'draw 0.5s ease forwards'}}/>
            </svg>
          </div>
        </div>

        <h1 className="font-display text-2xl font-bold text-white">
          PIN mis à jour !
        </h1>
        <p className="mt-2 text-sm font-medium text-white/60">
          {session?.user?.name}
        </p>

        <div className="mt-6 rounded-2xl bg-white/10 border border-white/15 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-widest text-white/50 mb-3">Nouveau PIN</p>
          <p className="mt-3 text-xs text-white/40">Mémorisez-le, il peut etre reinitialise que par le responsable.</p>
        </div>

        <button
          onClick={async () => { await signOut({ redirect: false }); window.location.href = getLogoutUrl(session?.user?.tenantSlug) }}
          className="mt-6 w-full rounded-2xl bg-white py-4 text-sm font-bold tracking-wide transition-all hover:bg-white/90 active:scale-95"
          style={{color: '#0B2D8F'}}>
          Se reconnecter →
        </button>
      </div>

      <style>{`
        @keyframes draw {
          from { stroke-dashoffset: 40; }
          to   { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6" style={{background: bg}}>
      <div className="w-full max-w-xs">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl">🔐</div>
          {isFirstLogin && <p className="mb-2 rounded-2xl bg-amber-500/20 border border-amber-400/30 px-4 py-2 text-sm text-amber-200">Première connexion — Vous devez définir votre PIN personnel</p>}
          <h1 className="font-display text-xl font-bold text-white">Définir mon PIN</h1>
          <p className="mt-1 text-sm text-white/60">{step === 'new1' ? 'Choisissez votre nouveau PIN' : 'Confirmez votre PIN'}</p>
        </div>

        <div className="mb-8 flex justify-center gap-5">
          {[0,1,2,3].map(i => (
            <div key={i} className={cn('h-4 w-4 rounded-full border-2 transition-all', i < current.length ? 'border-white bg-white scale-110' : 'border-white/40')}/>
          ))}
        </div>

        {error && <p className="mb-4 text-center text-sm text-red-300">{error}</p>}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <svg className="h-10 w-10 animate-spin text-white/80" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <p className="text-sm text-white/60">Enregistrement…</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              {KEYS.map((k, i) => {
                if (k === '') return <div key={i}/>
                if (k === 'del') return (
                  <button key="del" onClick={del} disabled={!current.length}
                    className="flex h-16 items-center justify-center rounded-2xl bg-white/15 text-white active:scale-95 disabled:opacity-30 border border-white/20">
                    <Delete size={20}/>
                  </button>
                )
                return (
                  <button key={i} onClick={() => pressKey(k)}
                    className="flex h-16 items-center justify-center rounded-2xl bg-white/15 text-white text-xl font-semibold active:scale-95 hover:bg-white/25 border border-white/20">
                    {k}
                  </button>
                )
              })}
            </div>

            {step === 'new2' && (
              <button onClick={() => { setStep('new1'); setPin2(''); setError('') }}
                className="mt-6 w-full text-center text-sm text-white/50 hover:text-white/80">
                ← Ressaisir le PIN
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}