'use client'
import { useState } from 'react'
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { rapprocher } from '@/actions/saisie'
import { toast } from '@/hooks/useToast'
import { fmtN } from '@/lib/formatting'
import { SEUIL_RAPPROCHEMENT } from '@/lib/constants'

interface Props {
  saisieId:    string
  totalGlobal: number
  agentName:   string
}

function parseNum(v: string) {
  return parseFloat(v.replace(/\s/g, '').replace(',', '.')) || 0
}

export function RapprochementModal({ saisieId, totalGlobal, agentName }: Props) {
  const [open,    setOpen]    = useState(false)
  const [montant, setMontant] = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<'VALIDE' | 'ALERTE_ECART' | null>(null)

  const montantNum  = parseNum(montant)
  const ecart       = montantNum > 0 ? Math.abs(totalGlobal - montantNum) : null
  const alerteEcart = ecart !== null && ecart > SEUIL_RAPPROCHEMENT

  async function confirm() {
    if (!montantNum) return
    setLoading(true)
    const res = await rapprocher(saisieId, montantNum)
    setLoading(false)
    if (!res.ok) { toast.error(res.error); return }
    setResult(res.data.statut)
    setOpen(false)
  }

  if (result === 'VALIDE') return (
    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
      <CheckCircle2 size={13}/> Validé
    </span>
  )
  if (result === 'ALERTE_ECART') return (
    <span className="flex items-center gap-1 text-xs font-semibold text-orange-600">
      <AlertTriangle size={13}/> Écart
    </span>
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-[var(--tenant-primary)] px-3 py-1.5 text-xs font-semibold text-white transition-all active:scale-95 hover:opacity-90">
        Valider
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">

            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-semibold text-gray-900">Rapprochement</h3>
                <p className="text-xs text-gray-500">{agentName}</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100">
                <X size={16}/>
              </button>
            </div>

            {/* Montant déclaré */}
            <div className="mb-4 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-sm text-gray-500">Déclaré par l'agent</span>
              <span className="font-mono text-sm font-bold text-gray-900">{fmtN(totalGlobal)} FCFA</span>
            </div>

            {/* Input montant compté */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-gray-400">
                Montant compté
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 focus-within:border-gray-400 transition-colors">
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={montant}
                  onChange={e => setMontant(e.target.value.replace(/[^\d ,.]/g, ''))}
                  placeholder="0"
                  className="flex-1 text-right font-mono text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-300"
                />
                <span className="text-xs font-medium text-gray-400">FCFA</span>
              </div>
            </div>

            {/* Écart live */}
            {ecart !== null && (
              <div className={`mb-5 flex items-center justify-between rounded-xl px-4 py-3 ${
                alerteEcart ? 'bg-orange-50 border border-orange-200' : 'bg-emerald-50 border border-emerald-200'
              }`}>
                <div className="flex items-center gap-2">
                  {alerteEcart
                    ? <AlertTriangle size={15} className="text-orange-500"/>
                    : <CheckCircle2 size={15} className="text-emerald-500"/>
                  }
                  <span className={`text-sm font-medium ${alerteEcart ? 'text-orange-700' : 'text-emerald-700'}`}>
                    Écart : {fmtN(ecart)} FCFA
                  </span>
                </div>
                <span className={`text-xs font-semibold ${alerteEcart ? 'text-orange-600' : 'text-emerald-600'}`}>
                  {alerteEcart ? `> seuil ${fmtN(SEUIL_RAPPROCHEMENT)} F` : 'OK'}
                </span>
              </div>
            )}

            {/* Avertissement écart */}
            {alerteEcart && (
              <p className="mb-4 text-xs text-orange-600">
                L'écart dépasse le seuil. La saisie sera marquée <strong>Alerte écart</strong> et nécessitera un contrôle.
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Annuler
              </button>
              <button
                onClick={confirm}
                disabled={!montantNum || loading}
                className={`flex-1 rounded-xl py-3 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 ${
                  alerteEcart ? 'bg-orange-500' : 'bg-emerald-500'
                }`}>
                {loading ? 'Enregistrement…' : alerteEcart ? 'Confirmer l\'écart' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
