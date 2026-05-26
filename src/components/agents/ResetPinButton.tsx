'use client'
import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { resetAgentPin } from '@/actions/agents'
import { toast } from '@/hooks/useToast'

export function ResetPinButton({ agentId, agentName }: { agentId:string; agentName:string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newPin, setNewPin] = useState<string|null>(null)

  async function handle() {
    setLoading(true)
    const res = await resetAgentPin(agentId)
    setLoading(false)
    if(res.ok) setNewPin(res.data.pin)
    else toast.error(res.error)
  }

  return (
    <>
      <Button variant="ghost" size="sm" leftIcon={<KeyRound size={14}/>} onClick={()=>setOpen(true)}>
        Réinitialiser PIN
      </Button>
      <Modal open={open} onClose={()=>{setOpen(false);setNewPin(null)}} title="Réinitialiser le PIN">
        {newPin ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center">
              <p className="text-sm text-amber-800 mb-2">Nouveau PIN pour <strong>{agentName}</strong></p>
              <p className="font-mono text-3xl font-bold tracking-widest text-amber-700">{newPin}</p>
              <p className="mt-2 text-xs text-amber-600">Communiquez ce PIN confidentiellement. L'agent devra le modifier à la prochaine connexion.</p>
            </div>
            <Button variant="primary" fullWidth onClick={()=>{setOpen(false);setNewPin(null)}}>Compris</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Vous allez réinitialiser le PIN de <strong>{agentName}</strong>. Un nouveau PIN temporaire sera généré.</p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={()=>setOpen(false)}>Annuler</Button>
              <Button variant="danger" fullWidth loading={loading} onClick={handle}>Réinitialiser</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}