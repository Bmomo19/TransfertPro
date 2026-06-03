'use client'
import { useState } from 'react'
import { Network, Plus, ToggleLeft, ToggleRight, X, ChevronDown, ChevronUp } from 'lucide-react'
import { addReseau, toggleReseau } from '@/actions/superadmin'
import { toast } from '@/hooks/useToast'
import { useRouter } from 'next/navigation'

interface Reseau {
  id:             string
  nom:            string
  code:           string
  tauxCommission: number
  tauxGateway:    number
  isActive:       boolean
}

interface Props {
  tenantId:   string
  tenantName: string
  reseaux:    Reseau[]
}

export function ReseauxModal({ tenantId, tenantName, reseaux }: Props) {
  const router = useRouter()
  const [open,    setOpen]    = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const [nom,    setNom]    = useState('')
  const [code,   setCode]   = useState('')
  const [taux,   setTaux]   = useState('1.8')
  const [gw,     setGw]     = useState('0.5')
  const [saving, setSaving] = useState(false)

  async function handleToggle(reseauId: string) {
    setLoading(reseauId)
    const res = await toggleReseau(reseauId)
    setLoading(null)
    if (!res.ok) toast.error(res.error)
    else router.refresh()
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await addReseau({
      tenantId,
      nom:            nom.trim(),
      code:           code.trim() || nom.trim().toUpperCase().slice(0, 10).replace(/\s+/g, '_'),
      tauxCommission: parseFloat(taux) / 100,
      tauxGateway:    parseFloat(gw) / 100,
    })
    setSaving(false)
    if (!res.ok) { toast.error(res.error); return }
    toast.success(`Réseau "${nom}" ajouté`)
    setNom(''); setCode(''); setTaux('1.8'); setGw('0.5')
    setShowAdd(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
        <Network size={12}/> Réseaux ({reseaux.length})
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between bg-white border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="font-display text-base font-semibold text-gray-900">Réseaux</h2>
                <p className="text-xs text-gray-400">{tenantName}</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <X size={16}/>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Liste des réseaux existants */}
              <div className="space-y-2">
                {reseaux.map(r => (
                  <div key={r.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${r.isActive ? 'border-gray-100 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{r.nom}</span>
                        <span className="font-mono text-xs text-gray-400">{r.code}</span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Comm. {(r.tauxCommission * 100).toFixed(2)}% · Gateway {(r.tauxGateway * 100).toFixed(2)}%
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggle(r.id)}
                      disabled={loading === r.id}
                      className="shrink-0 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40">
                      {r.isActive
                        ? <ToggleRight size={22} className="text-emerald-500"/>
                        : <ToggleLeft size={22}/>}
                    </button>
                  </div>
                ))}
                {reseaux.length === 0 && (
                  <p className="py-4 text-center text-sm text-gray-400">Aucun réseau configuré</p>
                )}
              </div>

              {/* Ajouter un réseau */}
              <div className="rounded-xl border border-dashed border-gray-200">
                <button
                  onClick={() => setShowAdd(v => !v)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  <Plus size={15}/>
                  Ajouter un réseau
                  {showAdd ? <ChevronUp size={13} className="ml-auto"/> : <ChevronDown size={13} className="ml-auto"/>}
                </button>

                {showAdd && (
                  <form onSubmit={handleAdd} className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">Nom <span className="text-red-400">*</span></label>
                        <input
                          value={nom}
                          onChange={e => { setNom(e.target.value); if (!code) setCode(e.target.value.toUpperCase().slice(0, 10).replace(/\s+/g, '_')) }}
                          required minLength={2} placeholder="Ex : Orange Money"
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"/>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">Code</label>
                        <input
                          value={code}
                          onChange={e => setCode(e.target.value.toUpperCase())}
                          placeholder="ORANGE"
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono outline-none focus:border-gray-400"/>
                      </div>
                      <div/>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">Taux comm. (%)</label>
                        <input
                          type="number" step="0.01" min="0" max="100"
                          value={taux} onChange={e => setTaux(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono outline-none focus:border-gray-400"/>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">Gateway (%)</label>
                        <input
                          type="number" step="0.01" min="0" max="100"
                          value={gw} onChange={e => setGw(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono outline-none focus:border-gray-400"/>
                      </div>
                    </div>
                    <button
                      type="submit" disabled={saving || !nom.trim()}
                      className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50 transition-colors">
                      {saving ? 'Ajout…' : 'Ajouter le réseau'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
