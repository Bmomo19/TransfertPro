'use client'
import { useState } from 'react'
import { KeyRound, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { resetAgentPin } from '@/actions/agents'

export function ResetPinButton({ agentId, agentName }: { agentId:string; agentName:string }) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [newPin, setNewPin]   = useState<string|null>(null)
  const [error, setError]     = useState<string|null>(null)
  const [copied, setCopied]   = useState(false)

  async function handle() {
    setLoading(true); setError(null)
    const res = await resetAgentPin(agentId)
    setLoading(false)
    if (res.ok) setNewPin(res.data.pin)
    else setError(res.error ?? 'Erreur inattendue')
  }

  function copy() {
    if (!newPin) return
    navigator.clipboard.writeText(newPin)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function close() { setOpen(false); setNewPin(null); setError(null); setCopied(false) }

  return (
    <>
      <Button variant="ghost" size="sm" leftIcon={<KeyRound size={14}/>} onClick={()=>setOpen(true)}>
        Réinitialiser PIN
      </Button>
      <Modal open={open} onClose={newPin ? undefined : close} title="Réinitialiser le PIN">
        {newPin ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 text-center">
              <p className="text-sm text-amber-800 mb-3">Nouveau PIN pour <strong>{agentName}</strong></p>
              <p className="font-mono text-4xl font-bold tracking-[0.4em] text-amber-700">{newPin}</p>
              <button onClick={copy} className="mt-3 inline-flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 transition-colors">
                {copied ? <><Check size={12}/> Copié !</> : <><Copy size={12}/> Copier le PIN</>}
              </button>
              <p className="mt-3 text-xs text-amber-600">Communiquez ce PIN confidentiellement. L'agent devra le modifier à la prochaine connexion.</p>
            </div>
            <Button variant="primary" fullWidth onClick={close}>Compris, j'ai noté</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Vous allez réinitialiser le PIN de <strong>{agentName}</strong>. Un nouveau PIN temporaire sera généré.</p>
            {error && <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={close}>Annuler</Button>
              <Button variant="danger" fullWidth loading={loading} onClick={handle}>Réinitialiser</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}