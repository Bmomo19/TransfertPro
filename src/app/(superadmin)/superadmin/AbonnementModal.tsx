'use client'
import { useState } from 'react'
import { CreditCard, X, Plus, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { setAbonnement, genererPaiement, marquerPaye, marquerEnRetard } from '@/actions/abonnements'
import { toast } from '@/hooks/useToast'
import { useRouter } from 'next/navigation'
import { fmtN } from '@/lib/formatting'

interface Paiement {
  id:          string
  mois:        string
  montant:     number
  dateLimite:  string
  statut:      'EN_ATTENTE' | 'PAYE' | 'EN_RETARD'
  datePaiement: string | null
  note:        string | null
}

interface Props {
  tenantId:         string
  tenantName:       string
  montant:          number | null
  jourPrelevement:  number
  paiements:        Paiement[]
}

const STATUT_STYLE = {
  EN_ATTENTE: { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
  PAYE:       { label: 'Payé',       cls: 'bg-emerald-100 text-emerald-700' },
  EN_RETARD:  { label: 'En retard',  cls: 'bg-red-100 text-red-600' },
}

function fmtMois(mois: string) {
  const [y, m] = mois.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function moisCourant() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

export function AbonnementModal({ tenantId, tenantName, montant: initMontant, jourPrelevement: initJour, paiements }: Props) {
  const router  = useRouter()
  const [open,    setOpen]    = useState(false)
  const [montant, setMontant] = useState(String(initMontant ?? ''))
  const [jour,    setJour]    = useState(String(initJour))
  const [saving,  setSaving]  = useState(false)
  const [note,    setNote]    = useState('')
  const [payingId, setPayingId] = useState<string | null>(null)

  async function handleSetAbonnement(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await setAbonnement({ tenantId, montant, jourPrelevement: jour })
    setSaving(false)
    if (!res.ok) { toast.error(res.error); return }
    toast.success('Abonnement configuré')
    router.refresh()
  }

  async function handleGenerer() {
    const res = await genererPaiement(tenantId, moisCourant())
    if (!res.ok) { toast.error(res.error); return }
    toast.success('Paiement généré')
    router.refresh()
  }

  async function handlePaye(id: string) {
    setPayingId(id)
    const res = await marquerPaye(id, note || undefined)
    setPayingId(null)
    if (!res.ok) { toast.error(res.error); return }
    toast.success('Marqué comme payé')
    setNote('')
    router.refresh()
  }

  async function handleRetard(id: string) {
    const res = await marquerEnRetard(id)
    if (!res.ok) { toast.error(res.error); return }
    toast.success('Marqué en retard')
    router.refresh()
  }

  const mois = moisCourant()
  const paiementMoisCourant = paiements.find(p => p.mois === mois)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-colors ${
          initMontant ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
        }`}>
        <CreditCard size={12}/>
        {initMontant ? `${fmtN(initMontant)} F/mois` : 'Abonnement'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl max-h-[85vh] overflow-y-auto">

            <div className="sticky top-0 z-10 flex items-center justify-between bg-white border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="font-display text-base font-semibold text-gray-900">Abonnement</h2>
                <p className="text-xs text-gray-400">{tenantName}</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <X size={16}/>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Config abonnement */}
              <form onSubmit={handleSetAbonnement} className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Configuration</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Montant mensuel (FCFA)</label>
                    <input
                      type="number" min="1" required
                      value={montant} onChange={e => setMontant(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono outline-none focus:border-gray-400"/>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Jour du mois (1–28)</label>
                    <input
                      type="number" min="1" max="28"
                      value={jour} onChange={e => setJour(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono outline-none focus:border-gray-400"/>
                  </div>
                </div>
                <button type="submit" disabled={saving || !montant}
                  className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Enregistrement…' : 'Enregistrer la configuration'}
                </button>
              </form>

              {/* Paiement mois courant */}
              {initMontant && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Mois en cours — {fmtMois(mois)}</p>
                    {!paiementMoisCourant && (
                      <button onClick={handleGenerer}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                        <Plus size={11}/> Générer
                      </button>
                    )}
                  </div>

                  {paiementMoisCourant ? (
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-lg font-bold text-gray-900">{fmtN(paiementMoisCourant.montant)} FCFA</p>
                          <p className="text-xs text-gray-400">Échéance : {new Date(paiementMoisCourant.dateLimite).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUT_STYLE[paiementMoisCourant.statut].cls}`}>
                          {STATUT_STYLE[paiementMoisCourant.statut].label}
                        </span>
                      </div>

                      {paiementMoisCourant.statut !== 'PAYE' && (
                        <div className="space-y-2 pt-2 border-t border-gray-200">
                          <input
                            type="text" value={note} onChange={e => setNote(e.target.value)}
                            placeholder="Note de paiement (optionnel)"
                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-gray-400"/>
                          <div className="flex gap-2">
                            <button onClick={() => handlePaye(paiementMoisCourant.id)} disabled={payingId === paiementMoisCourant.id}
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-50">
                              <CheckCircle2 size={13}/> Marquer payé
                            </button>
                            {paiementMoisCourant.statut === 'EN_ATTENTE' && (
                              <button onClick={() => handleRetard(paiementMoisCourant.id)}
                                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-red-200 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                                <AlertTriangle size={13}/> En retard
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-gray-200 py-4 text-center text-xs text-gray-400">
                      Aucun paiement généré pour ce mois
                    </p>
                  )}
                </div>
              )}

              {/* Historique */}
              {paiements.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Historique</p>
                  <div className="space-y-2">
                    {paiements.filter(p => p.mois !== mois).map(p => (
                      <div key={p.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-gray-900 capitalize">{fmtMois(p.mois)}</p>
                          {p.datePaiement && (
                            <p className="text-xs text-gray-400">Payé le {new Date(p.datePaiement).toLocaleDateString('fr-FR')}</p>
                          )}
                          {p.note && <p className="text-xs text-gray-400 italic">{p.note}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm font-semibold text-gray-700">{fmtN(p.montant)} F</p>
                          <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${STATUT_STYLE[p.statut].cls}`}>
                            {STATUT_STYLE[p.statut].label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
