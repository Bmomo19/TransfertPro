'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowDownCircle } from 'lucide-react'
import { enregistrerRetrait } from '@/actions/commissions'
import { toast } from '@/hooks/useToast'
import { fmtN } from '@/lib/formatting'

interface Props {
  reseauId:     string
  nom:          string
  currentCumul: number
  onClose:      () => void
}

export function RetraitModal({ reseauId, nom, currentCumul, onClose }: Props) {
  const router  = useRouter()
  const today   = new Date().toISOString().slice(0, 10)
  const [date,    setDate]    = useState(today)
  const [montant, setMontant] = useState(currentCumul > 0 ? String(currentCumul) : '')
  const [note,    setNote]    = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const num = parseFloat(montant.replace(/\s/g, '').replace(',', '.'))
    if (!num || num <= 0) { toast.error('Montant invalide'); return }

    setLoading(true)
    const res = await enregistrerRetrait({ reseauId, date, montant: num, note })
    setLoading(false)

    if (!res.ok) { toast.error(res.error); return }
    toast.success('Retrait enregistré — le cumul repart de zéro.')
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ArrowDownCircle size={18} className="text-blue-500"/>
            <h2 className="font-display text-sm font-semibold text-gray-900">
              Retrait commission — {nom}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-400"/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Cumul actuel */}
          {currentCumul > 0 && (
            <div className="rounded-xl bg-blue-50 px-4 py-3">
              <p className="text-xs text-blue-500 font-medium">Cumul actuel à retirer</p>
              <p className="font-display text-lg font-bold text-blue-700 tabular-nums">
                {fmtN(currentCumul)} FCFA
              </p>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
              Date du retrait
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              max={today}
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 transition-colors"
            />
          </div>

          {/* Montant */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
              Montant retiré (FCFA)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={montant}
              onChange={e => setMontant(e.target.value.replace(/[^\d ,.]/g, ''))}
              placeholder="0"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-right font-mono text-sm font-semibold text-gray-900 outline-none focus:border-gray-400 transition-colors"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
              Note (optionnel)
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Référence virement, remarque…"
              maxLength={300}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60">
            {loading ? 'Enregistrement…' : 'Confirmer le retrait →'}
          </button>
        </form>
      </div>
    </div>
  )
}
