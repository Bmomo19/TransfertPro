'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, HandCoins } from 'lucide-react'
import { creerCreance } from '@/actions/creances'
import { toast } from '@/hooks/useToast'

interface Reseau { id: string; nom: string }

interface Props {
  reseaux:  Reseau[]
  onClose:  () => void
}

export function NouvelleCreanceModal({ reseaux, onClose }: Props) {
  const router = useRouter()
  const today  = new Date().toISOString().slice(0, 10)

  const [clientNom,   setClientNom]   = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [reseauId,    setReseauId]    = useState('')
  const [montant,     setMontant]     = useState('')
  const [date,        setDate]        = useState(today)
  const [echeance,    setEcheance]    = useState('')
  const [note,        setNote]        = useState('')
  const [loading,     setLoading]     = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const num = parseFloat(montant.replace(/\s/g, '').replace(',', '.'))
    if (!num || num <= 0) { toast.error('Montant invalide'); return }

    setLoading(true)
    const res = await creerCreance({
      clientNom, clientPhone, reseauId: reseauId || undefined,
      montant: num, date, echeance: echeance || undefined, note,
    })
    setLoading(false)

    if (!res.ok) { toast.error(res.error); return }
    toast.success('Créance enregistrée')
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <HandCoins size={18} className="text-amber-500"/>
            <h2 className="font-display text-sm font-semibold text-gray-900">Nouvelle créance</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-400"/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Client */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                Nom du client <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={clientNom}
                onChange={e => setClientNom(e.target.value)}
                placeholder="Ex : Kouassi Adjoua"
                required
                minLength={2}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 transition-colors"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                Téléphone
              </label>
              <input
                type="tel"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                placeholder="+225 07 00 00 00 00"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 transition-colors"
              />
            </div>
          </div>

          {/* Réseau */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
              Réseau concerné
            </label>
            <select
              value={reseauId}
              onChange={e => setReseauId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 transition-colors bg-white">
              <option value="">— Aucun —</option>
              {reseaux.map(r => (
                <option key={r.id} value={r.id}>{r.nom}</option>
              ))}
            </select>
          </div>

          {/* Montant */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
              Montant (FCFA) <span className="text-red-400">*</span>
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

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                Date <span className="text-red-400">*</span>
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
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                Échéance
              </label>
              <input
                type="date"
                value={echeance}
                onChange={e => setEcheance(e.target.value)}
                min={today}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 transition-colors"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
              Note
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Motif, référence…"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60">
            {loading ? 'Enregistrement…' : 'Créer la créance →'}
          </button>
        </form>
      </div>
    </div>
  )
}
