'use client'
import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { createAgent } from '@/actions/agents'
import { toast } from '@/hooks/useToast'

export function CreateAgentModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{code:string;pin:string}|null>(null)

  async function handleSubmit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const res = await createAgent(new FormData(e.currentTarget))
    setLoading(false)
    if(res.ok) {
      setResult(res.data)
    } else {
      toast.error(res.error)
    }
  }

  function close() { setOpen(false); setResult(null) }

  return (
    <>
      <Button variant="primary" leftIcon={<UserPlus size={16}/>} onClick={()=>setOpen(true)}>
        Créer un agent
      </Button>
      <Modal open={open} onClose={close} title={result ? "Agent créé avec succès" : "Nouvel agent"}>
        {result ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-sm font-medium text-emerald-800 mb-3">Communiquez ces informations à l'agent de manière confidentielle :</p>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-sm text-gray-600">Code agent</span><span className="font-mono font-bold text-gray-900">{result.code}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-600">PIN temporaire</span><span className="font-mono font-bold text-2xl tracking-widest text-[var(--tenant-primary)]">{result.pin}</span></div>
              </div>
              <p className="mt-3 text-xs text-emerald-700">⚠️ L'agent devra modifier ce PIN à la première connexion.</p>
            </div>
            <Button variant="primary" fullWidth onClick={close}>Fermer</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input name="name" label="Nom complet" required minLength={2} placeholder="Ex : Kouassi Adjoua"/>
            <Input name="phone" label="Téléphone" type="tel" placeholder="+225 07 00 00 00 00"/>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" fullWidth onClick={close}>Annuler</Button>
              <Button type="submit" variant="primary" fullWidth loading={loading}>Créer</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}