'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle } from 'lucide-react'
import { validerRemboursement, rejeterRemboursement, annulerCreance } from '@/actions/creances'
import { toast } from '@/hooks/useToast'

/* ── Valider / Rejeter un remboursement ── */
export function ValidationButtons({ remboursementId, creanceId }: { remboursementId: string; creanceId: string }) {
  const router  = useRouter()
  const [loading,  setLoading]  = useState<'valider' | 'rejeter' | null>(null)
  const [showNote, setShowNote] = useState(false)
  const [note,     setNote]     = useState('')
  const [error,    setError]    = useState<string | null>(null)

  async function handleValider() {
    setLoading('valider'); setError(null)
    const res = await validerRemboursement(remboursementId)
    setLoading(null)
    if (!res.ok) { setError(res.error ?? 'Erreur'); return }
    toast.success('Remboursement validé')
    router.refresh()
  }

  async function handleRejeter() {
    setLoading('rejeter'); setError(null)
    const res = await rejeterRemboursement(remboursementId, note)
    setLoading(null)
    if (!res.ok) { setError(res.error ?? 'Erreur'); return }
    setShowNote(false); setNote('')
    router.refresh()
  }

  if (showNote) return (
    <div className="flex flex-col gap-2 mt-2">
      <input
        type="text"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Motif du rejet (optionnel)"
        autoFocus
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-red-400 transition-colors"
      />
      <div className="flex gap-2">
        <button onClick={() => setShowNote(false)}
          className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
          Annuler
        </button>
        <button onClick={handleRejeter} disabled={loading === 'rejeter'}
          className="flex-1 rounded-lg bg-red-500 py-1.5 text-xs font-bold text-white disabled:opacity-60">
          {loading === 'rejeter' ? '…' : 'Confirmer rejet'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="mt-2 space-y-1.5">
      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs text-red-700">{error}</p>
      )}
      <div className="flex gap-2">
        <button onClick={handleValider} disabled={!!loading}
          className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-60 transition-colors active:scale-[0.97]">
          <CheckCircle2 size={13}/>
          {loading === 'valider' ? '…' : 'Valider'}
        </button>
        <button onClick={() => { setShowNote(true); setError(null) }} disabled={!!loading}
          className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-60 transition-colors active:scale-[0.97]">
          <XCircle size={13}/>
          Rejeter
        </button>
      </div>
    </div>
  )
}

/* ── Annuler une créance ── */
export function AnnulerCreanceButton({ creanceId }: { creanceId: string }) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function handleAnnuler() {
    setLoading(true)
    const res = await annulerCreance(creanceId)
    setLoading(false)
    if (!res.ok) { toast.error(res.error); return }
    toast.success('Créance annulée')
    router.refresh()
  }

  if (!confirm) return (
    <button onClick={() => setConfirm(true)}
      className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors">
      Annuler la créance
    </button>
  )

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-red-600 font-medium">Confirmer l'annulation ?</span>
      <button onClick={() => setConfirm(false)} className="text-xs text-gray-500 hover:text-gray-700">Non</button>
      <button onClick={handleAnnuler} disabled={loading}
        className="text-xs font-bold text-red-600 hover:text-red-800 disabled:opacity-60">
        {loading ? '…' : 'Oui, annuler'}
      </button>
    </div>
  )
}
