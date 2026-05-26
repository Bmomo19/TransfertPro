'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, ChevronRight, Clock, AlertCircle, Users, List, X } from 'lucide-react'
import { NouvelleCreanceModal } from './NouvelleCreanceModal'
import { Pagination } from '@/components/ui/Pagination'
import { fmtN } from '@/lib/formatting'

interface Row {
  id:          string
  clientNom:   string
  clientPhone: string | null
  reseau:      string | null
  montant:     number
  paye:        number
  restant:     number
  date:        string
  echeance:    string | null
  statut:      'EN_COURS' | 'REMBOURSE' | 'ANNULE'
  pendingCount: number
  agentName:   string | null
}

interface ClientStat {
  nom:           string
  phone:         string | null
  count:         number
  enCoursCount:  number
  enCoursMontant: number
  hasOverdue:    boolean
}

interface Props {
  rows:         Row[]
  total:        number
  page:         number
  perPage:      number
  isResp:       boolean
  reseaux:      { id: string; nom: string }[]
  clients:      ClientStat[]
  clientFilter: string | null
}

const STATUT_STYLE = {
  EN_COURS:  { label: 'En cours',    cls: 'bg-amber-100 text-amber-700' },
  REMBOURSE: { label: 'Remboursé',   cls: 'bg-emerald-100 text-emerald-700' },
  ANNULE:    { label: 'Annulé',      cls: 'bg-gray-100 text-gray-500' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isOverdue(echeance: string | null, statut: string) {
  if (!echeance || statut !== 'EN_COURS') return false
  return new Date(echeance) < new Date()
}

export function CreancesClient({ rows, total, page, perPage, isResp, reseaux, clients, clientFilter }: Props) {
  const router = useRouter()
  const [modal, setModal] = useState(false)
  const [vue,   setVue]   = useState<'liste' | 'clients'>('liste')

  return (
    <>
      {/* Barre d'actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Toggle vue */}
        <div className="flex items-center rounded-xl border border-gray-200 bg-white p-0.5">
          <button onClick={() => setVue('liste')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${vue === 'liste' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'}`}>
            <List size={13}/> Liste
          </button>
          <button onClick={() => setVue('clients')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${vue === 'clients' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'}`}>
            <Users size={13}/> Clients
            {clients.filter(c => c.enCoursCount > 0).length > 0 && (
              <span className="ml-0.5 rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-white">
                {clients.filter(c => c.enCoursCount > 0).length}
              </span>
            )}
          </button>
        </div>

        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600 active:scale-[0.98] transition-all">
          <Plus size={16}/>
          Nouvelle créance
        </button>
      </div>

      {/* Filtre client actif */}
      {clientFilter && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
          <Users size={14} className="text-amber-600 shrink-0"/>
          <span className="text-sm text-amber-800 flex-1">
            Créances de <strong>{clientFilter}</strong>
          </span>
          <Link href="/creances" className="rounded-lg p-0.5 text-amber-500 hover:bg-amber-100 transition-colors">
            <X size={14}/>
          </Link>
        </div>
      )}

      {/* ── VUE CLIENTS ── */}
      {vue === 'clients' && (
        <div>
          {clients.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
              <p className="text-sm text-gray-400">Aucun client enregistré.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {clients.map(c => (
                <button key={c.nom}
                  onClick={() => { router.push(`/creances?client=${encodeURIComponent(c.nom)}`); setVue('liste') }}
                  className="text-left rounded-2xl border border-gray-100 bg-white px-4 py-3.5 hover:border-amber-200 hover:shadow-sm transition-all active:scale-[0.98]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                          {c.nom.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">{c.nom}</p>
                          {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400">{c.count} créance{c.count > 1 ? 's' : ''}</p>
                      {c.enCoursCount > 0 && (
                        <p className="font-mono text-sm font-bold text-amber-600">{fmtN(c.enCoursMontant)} F</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {c.enCoursCount > 0 && (
                      <span className="text-[11px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-semibold">
                        {c.enCoursCount} en cours
                      </span>
                    )}
                    {c.hasOverdue && (
                      <span className="flex items-center gap-1 text-[11px] text-red-500 font-semibold">
                        <AlertCircle size={11}/> En retard
                      </span>
                    )}
                    {c.enCoursCount === 0 && (
                      <span className="text-[11px] bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-semibold">
                        Soldé
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── VUE LISTE ── */}
      {vue === 'liste' && (
        <>
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
              <p className="text-sm text-gray-400">Aucune créance pour cette sélection.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map(row => {
                const { label, cls } = STATUT_STYLE[row.statut]
                const overdue = isOverdue(row.echeance, row.statut)
                const pct     = row.montant > 0 ? Math.min(100, (row.paye / row.montant) * 100) : 0

                return (
                  <Link key={row.id} href={`/creances/${row.id}`}
                    className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white px-4 py-3 hover:border-gray-200 hover:shadow-sm transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900">{row.clientNom}</span>
                        {row.reseau && (
                          <span className="text-[11px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{row.reseau}</span>
                        )}
                        <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${cls}`}>{label}</span>
                        {overdue && (
                          <span className="flex items-center gap-1 text-[11px] text-red-500 font-semibold">
                            <AlertCircle size={11}/> En retard
                          </span>
                        )}
                        {row.pendingCount > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-orange-500 font-semibold">
                            <Clock size={11}/> {row.pendingCount} en attente
                          </span>
                        )}
                      </div>
                      {isResp && row.agentName && (
                        <p className="text-[11px] text-gray-400 mt-0.5">{row.agentName}</p>
                      )}
                      {row.statut === 'EN_COURS' && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full bg-gray-100">
                            <div className="h-1 rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }}/>
                          </div>
                          <span className="text-[10px] text-gray-400 shrink-0">{Math.round(pct)}%</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm font-bold text-gray-900">{fmtN(row.montant)} FCFA</p>
                      {row.statut === 'EN_COURS' && (
                        <p className="font-mono text-xs text-amber-600">Restant : {fmtN(row.restant)}</p>
                      )}
                      <p className="text-[11px] text-gray-400">{fmtDate(row.date)}</p>
                    </div>

                    <ChevronRight size={16} className="text-gray-300 shrink-0"/>
                  </Link>
                )
              })}
            </div>
          )}

          {total > perPage && (
            <Pagination page={page} total={total} perPage={perPage}/>
          )}
        </>
      )}

      {modal && (
        <NouvelleCreanceModal
          reseaux={reseaux}
          clients={clients}
          onClose={() => setModal(false)}
        />
      )}
    </>
  )
}
