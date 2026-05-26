'use client'
import { useState } from 'react'
import { UserPlus, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { createAgent } from '@/actions/agents'
import { toast } from '@/hooks/useToast'

export function CreateAgentModal() {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<{code:string;pin:string}|null>(null)
  const [copied, setCopied]   = useState(false)

  async function handleSubmit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const res = await createAgent(new FormData(e.currentTarget))
    setLoading(false)
    if (res.ok) setResult(res.data)
    else toast.error(res.error)
  }

  function copy() {
    if (!result) return
    navigator.clipboard.writeText(`Code : ${result.code}\nPIN  : ${result.pin}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function close() { setOpen(false); setResult(null); setCopied(false) }

  return (
    <>
      <Button variant="primary" leftIcon={<UserPlus size={16}/>} onClick={()=>setOpen(true)}>
        Créer un agent
      </Button>
      {/* onClose=undefined quand le PIN est affiché → empêche fermeture accidentelle */}
      <Modal open={open} onClose={result ? undefined : close} title={result ? 'Agent créé — notez le PIN' : 'Nouvel agent'}>
        {result ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
              <p className="text-sm font-medium text-emerald-800 mb-4">Communiquez ces informations à l'agent de manière confidentielle :</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-white border border-emerald-100 px-4 py-3">
                  <span className="text-sm text-gray-500">Code agent</span>
                  <span className="font-mono font-bold text-gray-900 text-lg">{result.code}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white border border-emerald-100 px-4 py-3">
                  <span className="text-sm text-gray-500">PIN temporaire</span>
                  <span className="font-mono font-bold text-3xl tracking-[0.3em] text-[var(--tenant-primary)]">{result.pin}</span>
                </div>
              </div>
              <button onClick={copy} className="mt-4 w-full inline-flex items-center justify-center gap-2 text-sm text-emerald-700 hover:text-emerald-900 transition-colors">
                {copied ? <><Check size={14}/> Copié !</> : <><Copy size={14}/> Copier code + PIN</>}
              </button>
              <p className="mt-3 text-xs text-emerald-600 text-center">L'agent devra modifier ce PIN à la première connexion.</p>
            </div>
            <Button variant="primary" fullWidth onClick={close}>J'ai noté, fermer</Button>
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