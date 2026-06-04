'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertTriangle, Plus, ChevronDown, ChevronUp, XCircle, Clock } from 'lucide-react'
import { genererPaiement, marquerPaye, marquerEnRetard } from '@/actions/abonnements'
import { toast } from '@/hooks/useToast'
import { fmtN } from '@/lib/formatting'

type PaiementStatut = 'EN_ATTENTE' | 'PAYE' | 'EN_RETARD'
type StatutAcces    = 'OK' | 'ALERTE' | 'BLOQUE'

export interface TenantRow {
  id:              string
  name:            string
  slug:            string
  montant:         number | null
  jourPrelevement: number
  statutAcces:     StatutAcces
  paiementMois: {
    id:          string
    statut:      PaiementStatut
    dateLimite:  string
    datePaiement: string | null
    note:        string | null
  } | null
  historiqueAnnee: {
    id:     string
    mois:   string
    montant: number
    statut: PaiementStatut
  }[]
  totalEncaisseAnnee: number
}

const STATUT_BADGE: Record<PaiementStatut, { label: string; cls: string }> = {
  EN_ATTENTE: { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
  PAYE:       { label: 'Payé',       cls: 'bg-emerald-100 text-emerald-700' },
  EN_RETARD:  { label: 'En retard',  cls: 'bg-red-100 text-red-600' },
}

const ACCES_ICON: Record<StatutAcces, React.ReactNode> = {
  OK:     <CheckCircle2 size={14} className="text-emerald-500"/>,
  ALERTE: <AlertTriangle size={14} className="text-amber-500"/>,
  BLOQUE: <XCircle size={14} className="text-red-500"/>,
}

function fmtMois(mois: string) {
  const [y, m] = mois.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

function moisCourant() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

function TenantCard({ row }: { row: TenantRow }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [note,     setNote]     = useState('')
  const [loading,  setLoading]  = useState<string | null>(null)

  async function handleGenerer() {
    setLoading('gen')
    const res = await genererPaiement(row.id, moisCourant())
    setLoading(null)
    if (!res.ok) { toast.error(res.error); return }
    toast.success('Paiement généré')
    router.refresh()
  }

  async function handlePaye(id: string) {
    setLoading('pay')
    const res = await marquerPaye(id, note || undefined)
    setLoading(null)
    if (!res.ok) { toast.error(res.error); return }
    toast.success('Marqué comme payé')
    setNote('')
    router.refresh()
  }

  async function handleRetard(id: string) {
    setLoading('ret')
    const res = await marquerEnRetard(id)
    setLoading(null)
    if (!res.ok) { toast.error(res.error); return }
    toast.success('Marqué en retard')
    router.refresh()
  }

  const p = row.paiementMois

  return (
    <div className={`rounded-2xl border bg-white ${row.statutAcces === 'BLOQUE' ? 'border-red-200' : row.statutAcces === 'ALERTE' ? 'border-amber-200' : 'border-gray-100'}`}>
      {/* Ligne principale */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="flex items-center gap-2 shrink-0">
          {ACCES_ICON[row.statutAcces]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-gray-900 truncate">{row.name}</p>
            <span className="font-mono text-xs text-gray-400">{row.slug}</span>
          </div>
          <p className="text-xs text-gray-400">
            {row.montant ? `${fmtN(row.montant)} FCFA / mois · J-${row.jourPrelevement}` : 'Pas d\'abonnement configuré'}
          </p>
        </div>

        {/* Statut mois courant */}
        <div className="text-right shrink-0">
          {p ? (
            <div>
              <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${STATUT_BADGE[p.statut].cls}`}>
                {STATUT_BADGE[p.statut].label}
              </span>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Échéance {new Date(p.dateLimite).toLocaleDateString('fr-FR')}
              </p>
            </div>
          ) : row.montant ? (
            <button onClick={handleGenerer} disabled={loading === 'gen'}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              <Plus size={11}/> {loading === 'gen' ? '…' : 'Générer'}
            </button>
          ) : (
            <span className="text-xs text-gray-300">—</span>
          )}
        </div>

        {/* Expand toggle */}
        <button onClick={() => setExpanded(v => !v)} className="text-gray-400 hover:text-gray-700 shrink-0">
          {expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
        </button>
      </div>

      {/* Détail expandé */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          {/* Actions paiement mois courant */}
          {p && p.statut !== 'PAYE' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Action — mois courant</p>
              <input
                type="text" value={note} onChange={e => setNote(e.target.value)}
                placeholder="Note de paiement (optionnel)"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"/>
              <div className="flex gap-2">
                <button onClick={() => handlePaye(p.id)} disabled={loading === 'pay'}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-50">
                  <CheckCircle2 size={13}/> {loading === 'pay' ? 'Enregistrement…' : 'Marquer payé'}
                </button>
                {p.statut === 'EN_ATTENTE' && (
                  <button onClick={() => handleRetard(p.id)} disabled={loading === 'ret'}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-red-200 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">
                    <AlertTriangle size={13}/> {loading === 'ret' ? '…' : 'Retard'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Récapitulatif année */}
          {row.historiqueAnnee.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Historique {new Date().getFullYear()}</p>
                <p className="text-xs font-semibold text-emerald-600">
                  Encaissé : {fmtN(row.totalEncaisseAnnee)} FCFA
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {row.historiqueAnnee.map(h => (
                  <div key={h.id} className={`rounded-xl border px-2 py-2 text-center ${
                    h.statut === 'PAYE' ? 'border-emerald-100 bg-emerald-50' :
                    h.statut === 'EN_RETARD' ? 'border-red-100 bg-red-50' :
                    'border-gray-100 bg-gray-50'
                  }`}>
                    <p className="text-[10px] font-medium text-gray-500 capitalize">{fmtMois(h.mois)}</p>
                    <p className={`text-[10px] font-bold mt-0.5 ${
                      h.statut === 'PAYE' ? 'text-emerald-600' :
                      h.statut === 'EN_RETARD' ? 'text-red-500' :
                      'text-amber-500'
                    }`}>
                      {h.statut === 'PAYE' ? '✓' : h.statut === 'EN_RETARD' ? '!' : <Clock size={8} className="inline"/>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function AbonnementsClient({ rows, moisLabel }: { rows: TenantRow[]; moisLabel: string }) {
  const [filtre, setFiltre] = useState<'tous' | 'alertes'>('tous')

  const affichés = filtre === 'alertes'
    ? rows.filter(r => r.statutAcces !== 'OK' || r.paiementMois?.statut === 'EN_ATTENTE')
    : rows

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex items-center gap-2">
        {[
          { v: 'tous',    label: `Toutes (${rows.length})` },
          { v: 'alertes', label: `À traiter (${rows.filter(r => r.statutAcces !== 'OK' || (r.paiementMois && r.paiementMois.statut !== 'PAYE')).length})` },
        ].map(f => (
          <button key={f.v} onClick={() => setFiltre(f.v as any)}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${filtre === f.v ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {affichés.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
          <p className="text-sm text-gray-400">Aucune structure à afficher</p>
        </div>
      ) : (
        <div className="space-y-3">
          {affichés.map(row => <TenantCard key={row.id} row={row}/>)}
        </div>
      )}
    </div>
  )
}
