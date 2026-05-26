'use client'
import { useState } from 'react'
import { RefreshCw, Zap, Save } from 'lucide-react'
import { updateReseauCommission } from '@/actions/commissions'
import { toast } from '@/hooks/useToast'
import { useRouter } from 'next/navigation'

interface Reseau {
  id:                string
  nom:               string
  hasCommissionAgent: boolean
  modeCommission:    'DIRECT' | 'CUMULATIF'
  commissionLabel:   string | null
}

export function ReseauxCommissionSettings({ reseaux }: { reseaux: Reseau[] }) {
  const router = useRouter()
  const [states, setStates] = useState<Record<string, {
    hasCommissionAgent: boolean
    modeCommission:     'DIRECT' | 'CUMULATIF'
    commissionLabel:    string
    saving:             boolean
  }>>(() =>
    Object.fromEntries(reseaux.map(r => [r.id, {
      hasCommissionAgent: r.hasCommissionAgent,
      modeCommission:     r.modeCommission,
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
        return (
          <div key={r.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
            {/* Nom + toggle actif */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-gray-900">{r.nom}</span>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs text-gray-500">Commission agent</span>
                <button
                  type="button"
                  onClick={() => patch(r.id, { hasCommissionAgent: !s.hasCommissionAgent })}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${s.hasCommissionAgent ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${s.hasCommissionAgent ? 'translate-x-4.5' : 'translate-x-0.5'}`}/>
                </button>
              </label>
            </div>

            {/* Mode + label (visible seulement si activé) */}
            {s.hasCommissionAgent && (
              <div className="space-y-2">
                {/* Mode DIRECT / CUMULATIF */}
                <div className="flex gap-2">
                  {(['DIRECT', 'CUMULATIF'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
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
                    {s.modeCommission === 'CUMULATIF'
                      ? 'Lecture compteur (delta calculé)'
                      : 'Montant journalier direct'}
                  </span>
                </div>

                {/* Label personnalisé */}
                <input
                  type="text"
                  value={s.commissionLabel}
                  onChange={e => patch(r.id, { commissionLabel: e.target.value })}
                  placeholder={`Ex : Commission ${r.nom}`}
                  maxLength={60}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-gray-400 transition-colors"
                />
              </div>
            )}

            {/* Bouton Enregistrer */}
            <div className="flex justify-end">
              <button
                onClick={() => save(r.id)}
                disabled={s.saving}
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
