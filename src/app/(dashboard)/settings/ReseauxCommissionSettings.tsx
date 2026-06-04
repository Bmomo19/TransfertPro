'use client'
import { useState } from 'react'
import { RefreshCw, Zap, Save, User, UserCheck } from 'lucide-react'
import { updateReseauCommission } from '@/actions/commissions'
import { toast } from '@/hooks/useToast'
import { useRouter } from 'next/navigation'

interface Reseau {
  id:                 string
  nom:                string
  hasCommissionAgent: boolean
  commissionParResp:  boolean
  modeCommission:     'DIRECT' | 'CUMULATIF'
  commissionLabel:    string | null
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <span className="text-xs text-gray-500">{label}</span>
      <button type="button" onClick={onChange}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-200'}`}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`}/>
      </button>
    </label>
  )
}

export function ReseauxCommissionSettings({ reseaux }: { reseaux: Reseau[] }) {
  const router = useRouter()
  const [states, setStates] = useState(() =>
    Object.fromEntries(reseaux.map(r => [r.id, {
      hasCommissionAgent: r.hasCommissionAgent,
      commissionParResp:  r.commissionParResp,
      modeCommission:     r.modeCommission as 'DIRECT' | 'CUMULATIF',
      commissionLabel:    r.commissionLabel ?? '',
      saving:             false,
    }]))
  )

  function patch(id: string, val: Partial<typeof states[string]>) {
    setStates(s => ({ ...s, [id]: { ...s[id], ...val } }))
  }

  async function save(id: string) {
    const s = states[id]
    patch(id, { saving: true })
    const res = await updateReseauCommission({
      reseauId:          id,
      hasCommissionAgent: s.hasCommissionAgent,
      commissionParResp:  s.commissionParResp,
      modeCommission:    s.modeCommission,
      commissionLabel:   s.commissionLabel || undefined,
    })
    patch(id, { saving: false })
    if (!res.ok) { toast.error(res.error); return }
    toast.success('Réseau mis à jour')
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {reseaux.map(r => {
        const s = states[r.id]
        const anyActive = s.hasCommissionAgent || s.commissionParResp
        return (
          <div key={r.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
            {/* Nom + toggles */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-semibold text-gray-900">{r.nom}</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <User size={12} className="text-gray-400"/>
                  <Toggle
                    checked={s.hasCommissionAgent}
                    onChange={() => patch(r.id, { hasCommissionAgent: !s.hasCommissionAgent })}
                    label="Agent saisit"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <UserCheck size={12} className="text-gray-400"/>
                  <Toggle
                    checked={s.commissionParResp}
                    onChange={() => patch(r.id, { commissionParResp: !s.commissionParResp })}
                    label="Responsable saisit"
                  />
                </div>
              </div>
            </div>

            {/* Mode + label si au moins un toggle actif */}
            {anyActive && (
              <div className="space-y-2">
                <div className="flex gap-2 flex-wrap">
                  {(['DIRECT', 'CUMULATIF'] as const).map(mode => (
                    <button key={mode} type="button"
                      onClick={() => patch(r.id, { modeCommission: mode })}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        s.modeCommission === mode
                          ? mode === 'CUMULATIF' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                          : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}>
                      {mode === 'CUMULATIF' ? <RefreshCw size={11}/> : <Zap size={11}/>}
                      {mode === 'CUMULATIF' ? 'Cumulatif' : 'Direct'}
                    </button>
                  ))}
                  <span className="ml-auto text-[11px] text-gray-400 self-center">
                    {s.modeCommission === 'CUMULATIF' ? 'Lecture compteur (delta calculé)' : 'Montant journalier direct'}
                  </span>
                </div>
                <input
                  type="text" value={s.commissionLabel}
                  onChange={e => patch(r.id, { commissionLabel: e.target.value })}
                  placeholder={`Ex : Commission ${r.nom}`}
                  maxLength={60}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-gray-400 transition-colors"/>
              </div>
            )}

            {anyActive && (
              <div className="flex items-center gap-2 rounded-lg bg-white border border-gray-100 px-3 py-2 text-[11px] text-gray-500">
                {s.hasCommissionAgent && <span className="flex items-center gap-1"><User size={10}/> Agent saisit dans sa saisie journalière</span>}
                {s.hasCommissionAgent && s.commissionParResp && <span className="text-gray-300">·</span>}
                {s.commissionParResp && <span className="flex items-center gap-1"><UserCheck size={10}/> Responsable saisit lors du rapprochement</span>}
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={() => save(r.id)} disabled={s.saving}
                className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50 transition-colors">
                <Save size={12}/>
                {s.saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
