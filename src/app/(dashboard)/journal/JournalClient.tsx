'use client'
import { useState } from 'react'
import { Eye, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { fmtN, fmtDate, fmtDateTime } from '@/lib/formatting'
import { RapprochementModal } from './RapprochementModal'

type Statut = 'SOUMIS' | 'VALIDE' | 'ALERTE_ECART' | 'REJETE'

interface Detail { id: string; reseauNom: string; solde: number }
interface Commission { id: string; type: string; montant: number }

export interface SaisieRow {
  id:            string
  date:          string
  createdAt:     string
  agentName:     string
  agentCode:     string | null
  totalGlobal:   number
  caisse:        number
  especes:       number
  transfertResp: number
  montantAttendu: number | null
  ecart:         number | null
  statut:        Statut
  observation:   string | null
  details:       Detail[]
  commissions:   Commission[]
}

function StatutBadge({ statut }: { statut: Statut }) {
  if (statut === 'VALIDE')       return <Badge variant="ok">Validé</Badge>
  if (statut === 'SOUMIS')       return <Badge variant="info">Soumis</Badge>
  if (statut === 'ALERTE_ECART') return <Badge variant="warn">Écart</Badge>
  return <Badge variant="error">Rejeté</Badge>
}

interface CommReseauResp2 { id: string; label: string; mode: 'DIRECT' | 'CUMULATIF' }

function SaisieModal({ s, onClose, canValidate, commReseauxResp }: { s: SaisieRow; onClose: () => void; canValidate: boolean; commReseauxResp: CommReseauResp2[] }) {
  const hasEcart = s.statut === 'ALERTE_ECART'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white border-b border-gray-100 px-6 py-4">
          <div>
            <p className="font-display text-base font-semibold text-gray-900">
              Saisie du {fmtDate(new Date(s.date))}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {s.agentName} {s.agentCode ? `· ${s.agentCode}` : '· Resp.'} · {fmtDateTime(new Date(s.createdAt))}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatutBadge statut={s.statut}/>
            <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
              <X size={18}/>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Réseaux */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Soldes réseaux</p>
            <div className="space-y-1.5">
              {s.details.map(d => (
                <div key={d.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-2.5">
                  <span className="text-sm text-gray-700">{d.reseauNom}</span>
                  <span className="font-mono text-sm font-semibold text-gray-900">{fmtN(d.solde)} FCFA</span>
                </div>
              ))}
            </div>
          </div>

          {/* Liquidités */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Liquidités</p>
            <div className="space-y-1.5">
              {[
                { label: 'Caisse',          val: s.caisse },
                { label: 'Espèces resp.',   val: s.especes },
                { label: 'Transfert resp.', val: s.transfertResp },
              ].filter(r => r.val > 0).map(r => (
                <div key={r.label} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-2.5">
                  <span className="text-sm text-gray-700">{r.label}</span>
                  <span className="font-mono text-sm font-semibold text-gray-900">{fmtN(r.val)} FCFA</span>
                </div>
              ))}
            </div>
          </div>

          {/* Commissions */}
          {s.commissions.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Commissions déclarées</p>
              <div className="space-y-1.5">
                {s.commissions.map(c => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-2.5">
                    <span className="text-sm text-gray-700">{c.type}</span>
                    <span className="font-mono text-sm font-semibold text-blue-700">{fmtN(c.montant)} FCFA</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total + rapprochement */}
          <div className={`rounded-2xl border p-4 space-y-2 ${hasEcart ? 'border-orange-200 bg-orange-50' : 'border-emerald-100 bg-emerald-50/40'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Total déclaré</span>
              <span className="font-display text-lg font-bold text-gray-900">{fmtN(s.totalGlobal)} FCFA</span>
            </div>
            {s.montantAttendu != null && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Montant compté</span>
                <span className="font-mono text-sm font-semibold text-gray-700">{fmtN(s.montantAttendu)} FCFA</span>
              </div>
            )}
            {s.ecart != null && (
              <div className="flex items-center justify-between border-t border-gray-200 pt-2 mt-1">
                <span className="text-sm font-semibold text-gray-700">Écart</span>
                <span className={`font-mono text-sm font-bold ${hasEcart ? 'text-orange-600' : 'text-emerald-600'}`}>
                  {hasEcart ? '⚠ ' : '✓ '}{fmtN(s.ecart)} FCFA
                </span>
              </div>
            )}
          </div>

          {/* Observation */}
          {s.observation && (
            <div className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Observation</p>
              <p className="text-sm text-gray-700 italic">{s.observation}</p>
            </div>
          )}

          {/* Rapprochement */}
          {canValidate && s.statut === 'SOUMIS' && (
            <RapprochementModal
              saisieId={s.id}
              totalGlobal={s.totalGlobal}
              agentName={s.agentName}
              details={s.details}
              caisse={s.caisse}
              especes={s.especes}
              transfertResp={s.transfertResp}
              commReseauxResp={commReseauxResp}
            />
          )}
        </div>
      </div>
    </div>
  )
}

interface CommReseauResp { id: string; label: string; mode: 'DIRECT' | 'CUMULATIF' }

interface Props {
  rows:             SaisieRow[]
  canValidate:      boolean
  commReseauxResp:  CommReseauResp[]
}

export function JournalClient({ rows, canValidate, commReseauxResp }: Props) {
  const [selected, setSelected] = useState<SaisieRow | null>(null)

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Date', 'Agent', 'Déclaré', 'Compté', 'Écart', 'Statut', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(s => {
                const hasEcart = s.statut === 'ALERTE_ECART'
                return (
                  <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${hasEcart ? 'bg-orange-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{fmtDate(new Date(s.date))}</p>
                      <p className="text-xs text-gray-400">{fmtDateTime(new Date(s.createdAt))}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{s.agentName}</p>
                      <p className="font-mono text-xs text-gray-400">{s.agentCode ?? 'Resp.'}</p>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">
                      {fmtN(s.totalGlobal)} F
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-500">
                      {s.montantAttendu != null ? `${fmtN(s.montantAttendu)} F` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {s.ecart != null ? (
                        <span className={`font-mono text-xs font-semibold ${hasEcart ? 'text-orange-600' : 'text-emerald-600'}`}>
                          {hasEcart ? '⚠ ' : '✓ '}{fmtN(s.ecart)} F
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3"><StatutBadge statut={s.statut}/></td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(s)}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                        <Eye size={12}/> Voir
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="py-8 text-center text-sm text-gray-400">Aucune saisie</p>}
      </div>

      {selected && (
        <SaisieModal s={selected} onClose={() => setSelected(null)} canValidate={canValidate} commReseauxResp={commReseauxResp}/>
      )}
    </>
  )
}
