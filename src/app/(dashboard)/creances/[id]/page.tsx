import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, AlertCircle } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getTenantSlug } from '@/lib/tenant'
import { fmtN } from '@/lib/formatting'
import { Card } from '@/components/ui/Card'
import { RemboursementForm } from './RemboursementForm'
import { ValidationButtons, AnnulerCreanceButton } from './ValidationButtons'

function fmtDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const STATUT_STYLE = {
  EN_COURS:  { label: 'En cours',  cls: 'bg-amber-100 text-amber-700' },
  REMBOURSE: { label: 'Remboursé', cls: 'bg-emerald-100 text-emerald-700' },
  ANNULE:    { label: 'Annulé',    cls: 'bg-gray-100 text-gray-500' },
}

const REMB_STYLE = {
  EN_ATTENTE: { label: 'En attente', cls: 'bg-orange-100 text-orange-700' },
  VALIDE:     { label: 'Validé',     cls: 'bg-emerald-100 text-emerald-700' },
  REJETE:     { label: 'Rejeté',     cls: 'bg-red-100 text-red-600' },
}

export default async function CreanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const slug = await getTenantSlug()
  const { id } = await params
  const tenantId = session.user.tenantId!
  const isAgent  = session.user.actorType === 'AGENT'
  const isResp   = ['RESPONSABLE', 'SUPER_ADMIN'].includes(session.user.role)

  const creance = await prisma.creance.findFirst({
    where: { id, tenantId },
    include: {
      reseau:        { select: { nom: true } },
      agent:         { select: { name: true, code: true } },
      remboursements: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!creance) notFound()

  // Un agent ne peut voir que ses propres créances
  if (isAgent && creance.agentId !== session.user.id) notFound()

  const paye   = creance.remboursements.filter(r => r.statut === 'VALIDE').reduce((s, r) => s + Number(r.montant), 0)
  const restant = Math.max(0, Number(creance.montant) - paye)
  const pct    = Number(creance.montant) > 0 ? Math.min(100, (paye / Number(creance.montant)) * 100) : 0
  const { label: statutLabel, cls: statutCls } = STATUT_STYLE[creance.statut]

  const isOverdue = creance.echeance && creance.statut === 'EN_COURS' && new Date(creance.echeance) < new Date()

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/creances" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2 transition-colors">
            <ChevronLeft size={14}/> Créances
          </Link>
          <h1 className="font-display text-xl font-semibold text-gray-900">{creance.clientNom}</h1>
          <div className="flex items-center gap-3 flex-wrap mt-0.5">
            {creance.clientPhone && (
              <p className="text-sm text-gray-500">{creance.clientPhone}</p>
            )}
            <Link href={`/creances?client=${encodeURIComponent(creance.clientNom)}`}
              className="text-xs text-amber-600 hover:text-amber-800 underline underline-offset-2 transition-colors">
              Voir toutes ses créances →
            </Link>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statutCls}`}>{statutLabel}</span>
      </div>

      {/* Info card */}
      <Card>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Montant total</p>
            <p className="font-display text-lg font-bold tabular-nums text-gray-900">{fmtN(Number(creance.montant))} FCFA</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Solde restant</p>
            <p className={`font-display text-lg font-bold tabular-nums ${restant > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {fmtN(restant)} FCFA
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Date</p>
            <p className="font-medium text-gray-700">{fmtDate(creance.date)}</p>
          </div>
          {creance.echeance && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Échéance</p>
              <p className={`font-medium flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                {isOverdue && <AlertCircle size={13}/>}
                {fmtDate(creance.echeance)}
              </p>
            </div>
          )}
          {creance.reseau && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Réseau</p>
              <p className="font-medium text-gray-700">{creance.reseau.nom}</p>
            </div>
          )}
          {isResp && creance.agent && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Agent</p>
              <p className="font-medium text-gray-700">{creance.agent.name} ({creance.agent.code})</p>
            </div>
          )}
        </div>

        {/* Barre de progression */}
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Remboursé : {fmtN(paye)} FCFA</span>
            <span>{Math.round(pct)}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }}/>
          </div>
        </div>

        {creance.note && (
          <p className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600 italic">
            {creance.note}
          </p>
        )}
      </Card>

      {/* Historique remboursements */}
      <div>
        <h2 className="mb-3 font-display text-sm font-semibold text-gray-900">Historique des remboursements</h2>

        {creance.remboursements.length === 0 ? (
          <p className="text-sm text-gray-400 px-1">Aucun remboursement enregistré.</p>
        ) : (
          <div className="space-y-2">
            {creance.remboursements.map(r => {
              const { label, cls } = REMB_STYLE[r.statut]
              return (
                <div key={r.id} className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-gray-900">{fmtN(Number(r.montant))} FCFA</span>
                        <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${cls}`}>{label}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDate(r.date)}</p>
                      {r.note && <p className="text-xs text-gray-500 mt-0.5 italic">{r.note}</p>}
                      {r.rejectedNote && (
                        <p className="text-xs text-red-500 mt-0.5">Motif : {r.rejectedNote}</p>
                      )}
                    </div>
                  </div>

                  {/* Boutons validation responsable */}
                  {isResp && r.statut === 'EN_ATTENTE' && (
                    <ValidationButtons remboursementId={r.id} creanceId={creance.id}/>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Formulaire remboursement (EN_COURS uniquement) */}
      {creance.statut === 'EN_COURS' && restant > 0 && (
        <RemboursementForm creanceId={creance.id} restant={restant}/>
      )}

      {/* Actions responsable */}
      {isResp && creance.statut === 'EN_COURS' && (
        <div className="flex justify-end pt-2">
          <AnnulerCreanceButton creanceId={creance.id}/>
        </div>
      )}
    </div>
  )
}
