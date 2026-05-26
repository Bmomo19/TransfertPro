'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { createTenant } from '@/actions/superadmin'
import { toast } from '@/hooks/useToast'

export function CreateTenantModal() {
  const [open,   setOpen]   = useState(false)
  const [loading,setLoading]= useState(false)
  const [result, setResult] = useState<{respPin:string}|null>(null)

  async function handleSubmit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const res = await createTenant(new FormData(e.currentTarget))
    setLoading(false)
    if(res.ok) setResult(res.data)
    else toast.error(res.error)
  }

  function close() { setOpen(false); setResult(null) }

  return (
    <>
      <Button variant="primary" leftIcon={<Plus size={16}/>} onClick={()=>setOpen(true)}>Nouvelle structure</Button>
      <Modal open={open} onClose={close} size="lg" title={result?"Structure créée avec succès":"Créer une structure"}>
        {result ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-sm font-medium text-emerald-800 mb-3">Communiquez au responsable :</p>
              <div className="rounded-xl bg-white p-4 space-y-2 border border-emerald-100">
                <div className="flex justify-between"><span className="text-sm text-gray-500">PIN temporaire</span>
                  <span className="font-mono font-bold text-3xl tracking-widest text-emerald-600">{result.respPin}</span></div>
              </div>
              <p className="mt-3 text-xs text-emerald-700">⚠️ Le responsable devra modifier ce PIN à la première connexion.</p>
            </div>
            <Button variant="primary" fullWidth onClick={close}>Fermer</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input name="name" label="Nom de la structure" required placeholder="Ex: Hudiphen SARL"/>
              <Input name="slug" label="Slug (URL)" required placeholder="hudiphen" pattern="[a-z0-9-]+" hint="Minuscules, chiffres et tirets uniquement"/>
            </div>
            <Select name="plan" label="Plan d'abonnement" options={[
              {value:'STARTER',  label:'Starter  — 3 agents max'},
              {value:'STANDARD', label:'Standard — 15 agents + export CSV'},
              {value:'PREMIUM',  label:'Premium  — Illimité + API'},
            ]}/>
            <div className="grid grid-cols-2 gap-4">
              <Input name="colorPrimary"   label="Couleur principale" type="color" defaultValue="#F97316"/>
              <Input name="colorSecondary" label="Couleur secondaire"  type="color" defaultValue="#FFF7ED"/>
            </div>
            <hr className="border-gray-100"/>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Responsable de la structure</p>
            <div className="grid grid-cols-2 gap-4">
              <Input name="respName"  label="Nom complet" required placeholder="Jean Konan"/>
              <Input name="respEmail" label="Email"       required type="email" placeholder="resp@structure.ci"/>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" fullWidth onClick={close}>Annuler</Button>
              <Button type="submit" variant="primary" fullWidth loading={loading}>Créer la structure</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}