'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle } from 'lucide-react'
import { ajouterRemboursement } from '@/actions/creances'
import { toast } from '@/hooks/useToast'
import { fmtN } from '@/lib/formatting'

interface Props {
  creanceId: string
  restant:   number
}

export function RemboursementForm({ creanceId, restant }: Props) {
  const router  = useRouter()
  const today   = new Date().toISOString().slice(0, 10)
  const [open,    setOpen]    = useState(false)
  const [montant, setMontant] = useState('')
  const [date,    setDate]    = useState(today)
  const [note,    setNote]    = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const num = parseFloat(montant.replace(/\s/g, '').replace(',', '.'))
    if (!num || num <= 0) { toast.error('Montant invalide'); return }

    setLoading(true)
    const res = await ajouterRemboursement({ creanceId, montant: num, date, note })
    setLoading(false)

    if (!res.ok) { toast.error(res.error); return }
    toast.success('Remboursement soumis — en attente de validation')
    setMontant(''); setNote(''); setDate(today); setOpen(false)
    router.refresh()
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 w-full rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition-colors">
      <PlusCircle size={16}/>
      Enregistrer un remboursement
    </button>
  )

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
        Nouveau remboursement — restant : {fmtN(restant)} FCFA
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Montant (FCFA)</label>
          <input
            type="text"
            inputMode="numeric"
            value={montant}
            onChange={e => setMontant(e.target.value.replace(/[^\d ,.]/g, ''))}
            placeholder="0"
            required
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-right font-mono text-sm font-semibold text-gray-900 outline-none focus:border-amber-400 bg-white transition-colors"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            max={today}
            required
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-amber-400 bg-white transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">Note (optionnel)</label>
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          maxLength={300}
          placeholder="Référence, remarque…"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-amber-400 bg-white transition-colors"
        />
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)}
          className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Annuler
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 rounded-xl bg-amber-500 py-2 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60">
          {loading ? 'Envoi…' : 'Soumettre →'}
        </button>
      </div>
    </form>
  )
}
