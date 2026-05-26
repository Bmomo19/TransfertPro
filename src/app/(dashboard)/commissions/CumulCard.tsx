'use client'
import { useState } from 'react'
import { ArrowDownCircle, RefreshCw } from 'lucide-react'
import { RetraitModal } from './RetraitModal'
import { fmtN } from '@/lib/formatting'

interface Props {
  reseauId:          string
  nom:               string
  currentCumul:      number
  lastRetraitDate:   string | null  // ISO date string
  lastRetraitMontant: number | null
  lastSaisieDate:    string | null
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function CumulCard({ reseauId, nom, currentCumul, lastRetraitDate, lastRetraitMontant, lastSaisieDate }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <RefreshCw size={14} className="text-blue-400 shrink-0"/>
            <span className="text-sm font-semibold text-gray-800">{nom}</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 bg-blue-100 rounded-full px-2 py-0.5 shrink-0">
            Cumulatif
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-xs text-gray-500">Cumul actuel</span>
          <span className="font-display text-lg font-bold tabular-nums text-blue-700">
            {fmtN(currentCumul)} FCFA
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-white border border-blue-100 px-3 py-2">
            <p className="text-gray-400 mb-0.5">Dernier retrait</p>
            <p className="font-medium text-gray-700">{fmtDate(lastRetraitDate) ?? '—'}</p>
            {lastRetraitMontant != null && (
              <p className="font-mono text-blue-600 font-semibold">{fmtN(lastRetraitMontant)} FCFA</p>
            )}
          </div>
          <div className="rounded-lg bg-white border border-blue-100 px-3 py-2">
            <p className="text-gray-400 mb-0.5">Dernière saisie</p>
            <p className="font-medium text-gray-700">{fmtDate(lastSaisieDate) ?? '—'}</p>
          </div>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 active:scale-[0.98] transition-all">
          <ArrowDownCircle size={15}/>
          Enregistrer un retrait
        </button>
      </div>

      {open && (
        <RetraitModal
          reseauId={reseauId}
          nom={nom}
          currentCumul={currentCumul}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
