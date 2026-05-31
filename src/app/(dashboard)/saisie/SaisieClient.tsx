'use client'
import { useState } from 'react'
import { CheckCircle2, RefreshCw } from 'lucide-react'
interface TenantReseau {
  id: string; tenantId: string; code: string; nom: string
  tauxCommission: number; tauxGateway: number
  isActive: boolean; ordre: number; modeCommission: string
  hasCommissionAgent: boolean; commissionLabel: string | null
}
import { soumettreSaisie } from '@/actions/saisie'
import { toast } from '@/hooks/useToast'
import { fmtN } from '@/lib/formatting'

export interface CommissionReseau {
  reseauId:    string
  label:       string
  mode:        'DIRECT' | 'CUMULATIF'
  dernierCumul: number | null  // null = DIRECT, 0+ = CUMULATIF
}

interface InitialData {
  caisse:        number
  especes:       number
  transfertResp: number
  observation:   string
  soldes:        Record<string, number>
  commissions:   Record<string, number>  // reseauId → valeurSaisie
}

interface Props {
  reseaux:           TenantReseau[]
  commissionReseaux: CommissionReseau[]
  isHud:             boolean
  color:             string
  agentName:         string
  initialData?:      InitialData
}

function parseNum(v: string) {
  return parseFloat(v.replace(/\s/g, '').replace(',', '.')) || 0
}

function fmt(n: number) {
  return n > 0 ? fmtN(n) : ''
}

function AmountField({
  label, value, onChange, sublabel,
}: {
  label: string; value: string; onChange: (v: string) => void; sublabel?: string
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm focus-within:border-gray-300 focus-within:ring-1 focus-within:ring-gray-200 transition-all">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="w-32 shrink-0 text-sm text-gray-600">{label}</span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value.replace(/[^\d ,.]/g, ''))}
          placeholder="0"
          className="min-w-0 flex-1 text-right font-mono text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-300"
        />
        <span className="shrink-0 text-xs font-medium text-gray-400">FCFA</span>
      </div>
      {sublabel && (
        <div className="border-t border-gray-50 px-4 py-1.5">
          <p className="text-[11px] text-gray-400">{sublabel}</p>
        </div>
      )}
    </div>
  )
}

function CumulatifField({
  label, value, onChange, dernierCumul,
}: {
  label: string; value: string; onChange: (v: string) => void; dernierCumul: number
}) {
  const saisi     = parseNum(value)
  const delta     = saisi > 0 ? Math.max(0, saisi - dernierCumul) : null

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/40 shadow-sm focus-within:border-blue-300 focus-within:ring-1 focus-within:ring-blue-100 transition-all">
      {/* Badge mode */}
      <div className="flex items-center gap-2 border-b border-blue-100/60 px-4 py-2">
        <RefreshCw size={11} className="text-blue-400"/>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-500">Cumulatif</span>
        <span className="ml-auto text-[10px] text-blue-400">
          Cumul précédent : {fmtN(dernierCumul)} FCFA
        </span>
      </div>
      {/* Saisie */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="w-32 shrink-0 text-sm text-gray-700 font-medium">{label}</span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value.replace(/[^\d ,.]/g, ''))}
          placeholder={dernierCumul > 0 ? fmtN(dernierCumul) : '0'}
          className="min-w-0 flex-1 text-right font-mono text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-300"
        />
        <span className="shrink-0 text-xs font-medium text-gray-400">FCFA</span>
      </div>
      {/* Delta calculé */}
      {delta !== null && (
        <div className="border-t border-blue-100/60 px-4 py-2 flex items-center justify-between">
          <span className="text-[11px] text-blue-500">Commission du jour</span>
          <span className="font-mono text-xs font-bold text-blue-700">
            + {fmtN(delta)} FCFA
          </span>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

export function SaisieClient({ reseaux, commissionReseaux, isHud, color, agentName, initialData }: Props) {
  const [soldes, setSoldes] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    if (initialData) reseaux.forEach(r => { if (initialData.soldes[r.id]) init[r.id] = fmt(initialData.soldes[r.id]) })
    return init
  })
  const [caisse,        setCaisse]        = useState(initialData ? fmt(initialData.caisse)        : '')
  const [especes,       setEspeces]       = useState(initialData ? fmt(initialData.especes)       : '')
  const [transfertResp, setTransfertResp] = useState(initialData ? fmt(initialData.transfertResp) : '')
  const [commissions,   setCommissions]   = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    if (initialData) {
      commissionReseaux.forEach(r => {
        if (initialData.commissions[r.reseauId]) init[r.reseauId] = fmt(initialData.commissions[r.reseauId])
      })
    }
    return init
  })
  const [observation, setObservation] = useState(initialData?.observation ?? '')
  const [loading,     setLoading]     = useState(false)
  const [done,        setDone]        = useState(false)

  const totalReseaux = reseaux.reduce((s, r) => s + parseNum(soldes[r.id] ?? ''), 0)
  const total        = totalReseaux + parseNum(caisse) + (isHud ? parseNum(especes) : 0) + parseNum(transfertResp)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const soldesNum: Record<string, number> = {}
    reseaux.forEach(r => { soldesNum[r.id] = parseNum(soldes[r.id] ?? '') })
    const commNum: Record<string, number> = {}
    commissionReseaux.forEach(r => { commNum[r.reseauId] = parseNum(commissions[r.reseauId] ?? '') })

    const res = await soumettreSaisie({
      date:          new Date().toISOString().slice(0, 10),
      caisse:        parseNum(caisse),
      especes:       parseNum(especes),
      transfertResp: parseNum(transfertResp),
      observation,
      soldes:        soldesNum,
      commissions:   commNum,
    })
    setLoading(false)
    if (!res.ok) { toast.error(res.error); return }
    setDone(true)
  }

  if (done) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
        <CheckCircle2 size={40} className="text-emerald-500"/>
      </div>
      <h2 className="font-display text-xl font-semibold text-gray-900">Saisie enregistrée !</h2>
      <p className="mt-1 text-sm text-gray-500">La responsable a été notifiée.</p>
      <p className="mt-4 font-display text-lg font-bold tabular-nums" style={{ color }}>
        {fmtN(total)} FCFA
      </p>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-48">
      <div>
        <h1 className="font-display text-xl font-semibold text-gray-900">
          {initialData ? 'Modifier la saisie' : 'Saisie journalière'}
        </h1>
        <p className="mt-0.5 text-sm text-gray-500 capitalize">
          {agentName} · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <Section title="Soldes réseaux ce soir">
        {reseaux.map(r => (
          <AmountField key={r.id} label={r.nom}
            value={soldes[r.id] ?? ''}
            onChange={v => setSoldes(p => ({ ...p, [r.id]: v }))}
          />
        ))}
      </Section>

      <Section title="Liquidités">
        <AmountField label="Caisse" value={caisse} onChange={setCaisse}/>
        {isHud && <AmountField label="Espèces resp." value={especes} onChange={setEspeces}/>}
        <AmountField label="Transfert resp." value={transfertResp} onChange={setTransfertResp}/>
      </Section>

      {commissionReseaux.length > 0 && (
        <Section title="Commissions agents">
          {commissionReseaux.map(r => (
            r.mode === 'CUMULATIF' ? (
              <CumulatifField
                key={r.reseauId}
                label={r.label}
                value={commissions[r.reseauId] ?? ''}
                onChange={v => setCommissions(p => ({ ...p, [r.reseauId]: v }))}
                dernierCumul={r.dernierCumul ?? 0}
              />
            ) : (
              <AmountField
                key={r.reseauId}
                label={r.label}
                value={commissions[r.reseauId] ?? ''}
                onChange={v => setCommissions(p => ({ ...p, [r.reseauId]: v }))}
              />
            )
          ))}
        </Section>
      )}

      <Section title="Observations">
        <textarea
          value={observation}
          onChange={e => setObservation(e.target.value)}
          placeholder="Aucun incident..."
          rows={3}
          className="w-full rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none placeholder:text-gray-300 resize-none focus:border-gray-300 transition-colors"
        />
      </Section>

      {/* Sticky footer */}
      <div className="fixed bottom-16 lg:bottom-0 inset-x-0 z-20 px-4 pb-3 pt-3"
        style={{ background: 'linear-gradient(to top, #f9fafb 70%, transparent)' }}>
        <div className="mx-auto max-w-lg rounded-2xl border border-gray-100 bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Trésorerie totale</span>
            <span className="font-display text-xl font-bold tabular-nums" style={{ color }}>
              {fmtN(total)} FCFA
            </span>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ background: color }}>
            {loading ? 'Enregistrement…' : initialData ? 'Mettre à jour la saisie' : 'Soumettre la saisie →'}
          </button>
        </div>
      </div>
    </form>
  )
}
