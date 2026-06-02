'use client'
import { useState } from 'react'
import { X, AlertTriangle, CheckCircle2, ClipboardCopy, ChevronDown, ChevronUp } from 'lucide-react'
import { rapprocher } from '@/actions/saisie'
import { toast } from '@/hooks/useToast'
import { fmtN } from '@/lib/formatting'
import { SEUIL_RAPPROCHEMENT } from '@/lib/constants'

interface Detail { id: string; reseauNom: string; solde: number }

interface Props {
  saisieId:      string
  totalGlobal:   number
  agentName:     string
  details?:      Detail[]
  caisse?:       number
  especes?:      number
  transfertResp?: number
}

function parseNum(v: string) {
  return parseFloat(v.replace(/\s/g, '').replace(',', '.')) || 0
}

export function RapprochementModal({ saisieId, totalGlobal, agentName, details, caisse, especes, transfertResp }: Props) {
  const [open,     setOpen]     = useState(false)
  const [montant,  setMontant]  = useState('')
  const [note,     setNote]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<'VALIDE' | 'ALERTE_ECART' | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  const montantNum  = parseNum(montant)
  const ecart       = montantNum > 0 ? Math.abs(totalGlobal - montantNum) : null
  const alerteEcart = ecart !== null && ecart > SEUIL_RAPPROCHEMENT

  async function confirm() {
    if (!montantNum) return
    setLoading(true)
    const res = await rapprocher(saisieId, montantNum, note || undefined)
    setLoading(false)
    if (!res.ok) { toast.error(res.error); return }
    setResult(res.data.statut)
    setOpen(false)
  }

  function preRemplir() {
    setMontant(String(totalGlobal))
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

  const hasLiquidites = (caisse ?? 0) > 0 || (especes ?? 0) > 0 || (transfertResp ?? 0) > 0

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-[var(--tenant-primary)] px-3 py-1.5 text-xs font-semibold text-white transition-all active:scale-95 hover:opacity-90">
        Rapprocher
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-display text-base font-semibold text-gray-900">Rapprochement</h3>
                <p className="text-xs text-gray-500">{agentName}</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100">
                <X size={16}/>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Montant déclaré + pré-remplir */}
              <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <span className="text-sm text-gray-500">Déclaré par l'agent</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-gray-900">{fmtN(totalGlobal)} FCFA</span>
                  <button
                    onClick={preRemplir}
                    title="Copier le montant déclaré"
                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors">
                    <ClipboardCopy size={13}/>
                  </button>
                </div>
              </div>

              {/* Détail de la saisie (pliable) */}
              {(details?.length || hasLiquidites) && (
                <div>
                  <button
                    onClick={() => setShowDetail(v => !v)}
                    className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">
                    Voir le détail de la saisie
                    {showDetail ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                  </button>
                  {showDetail && (
                    <div className="mt-2 space-y-1 rounded-xl border border-gray-100 bg-gray-50 p-3">
                      {details?.map(d => (
                        <div key={d.id} className="flex justify-between text-xs">
                          <span className="text-gray-500">{d.reseauNom}</span>
                          <span className="font-mono font-medium text-gray-700">{fmtN(d.solde)} F</span>
                        </div>
                      ))}
                      {hasLiquidites && <div className="my-1.5 border-t border-gray-200"/>}
                      {(caisse ?? 0) > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Caisse</span>
                          <span className="font-mono font-medium text-gray-700">{fmtN(caisse!)} F</span>
                        </div>
                      )}
                      {(especes ?? 0) > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Espèces resp.</span>
                          <span className="font-mono font-medium text-gray-700">{fmtN(especes!)} F</span>
                        </div>
                      )}
                      {(transfertResp ?? 0) > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Transfert resp.</span>
                          <span className="font-mono font-medium text-gray-700">{fmtN(transfertResp!)} F</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-gray-200 pt-1.5 text-xs font-bold">
                        <span className="text-gray-700">Total</span>
                        <span className="font-mono text-gray-900">{fmtN(totalGlobal)} F</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Input montant compté */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Montant compté physiquement
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
                <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                  alerteEcart ? 'bg-orange-50 border border-orange-200' : 'bg-emerald-50 border border-emerald-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {alerteEcart
                      ? <AlertTriangle size={15} className="text-orange-500"/>
                      : <CheckCircle2 size={15} className="text-emerald-500"/>}
                    <span className={`text-sm font-medium ${alerteEcart ? 'text-orange-700' : 'text-emerald-700'}`}>
                      Écart : {fmtN(ecart)} FCFA
                    </span>
                  </div>
                  <span className={`text-xs font-semibold ${alerteEcart ? 'text-orange-600' : 'text-emerald-600'}`}>
                    {alerteEcart ? `> seuil ${fmtN(SEUIL_RAPPROCHEMENT)} F` : 'OK'}
                  </span>
                </div>
              )}

              {/* Note / observation */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Note de rapprochement <span className="normal-case font-normal text-gray-300">(optionnel)</span>
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ex : billet de 5000 manquant, à régulariser demain…"
                  rows={2}
                  maxLength={300}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 transition-colors resize-none"
                />
              </div>

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
                  {loading ? 'Enregistrement…' : alerteEcart ? 'Confirmer malgré l\'écart' : 'Valider'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
