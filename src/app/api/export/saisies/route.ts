import { NextResponse, type NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getTenantSlug } from '@/lib/tenant'

function esc(v: string | number | null | undefined): string {
  const s = String(v ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

function row(...cols: (string | number | null | undefined)[]) {
  return cols.map(esc).join(',')
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return new NextResponse('Non authentifié', { status: 401 })
  if (!['RESPONSABLE', 'SUPER_ADMIN'].includes(session.user.role)) {
    return new NextResponse('Accès refusé', { status: 403 })
  }

  const tenantId = session.user.tenantId!
  const slug     = await getTenantSlug()
  const params   = req.nextUrl.searchParams

  // Période : ?debut=YYYY-MM-DD&fin=YYYY-MM-DD ou ?mois=YYYY-MM
  let debut: Date, fin: Date
  if (params.get('mois')) {
    const [y, m] = params.get('mois')!.split('-').map(Number)
    debut = new Date(y, m - 1, 1)
    fin   = new Date(y, m, 0, 23, 59, 59)
  } else {
    debut = params.get('debut') ? new Date(params.get('debut')!) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    fin   = params.get('fin')   ? new Date(params.get('fin')!)   : new Date()
  }

  const saisies = await prisma.saisie.findMany({
    where:   { tenantId, date: { gte: debut, lte: fin } },
    orderBy: { date: 'asc' },
    include: {
      agent:       { select: { name: true, code: true } },
      user:        { select: { name: true } },
      details:     { include: { reseau: { select: { nom: true } } } },
      commissions: { select: { type: true, montant: true } },
    },
  })

  // Collecter tous les réseaux uniques pour les colonnes
  const reseauxSet = new Set<string>()
  for (const s of saisies) s.details.forEach(d => reseauxSet.add(d.reseau.nom))
  const reseaux = Array.from(reseauxSet).sort()

  // Header
  const lines: string[] = [
    row('Date', 'Agent', 'Code', ...reseaux, 'Caisse', 'Espèces', 'Transfert resp.', 'Total déclaré', 'Montant compté', 'Écart', 'Statut', 'Commissions', 'Observation'),
  ]

  for (const s of saisies) {
    const soldeMap = Object.fromEntries(s.details.map(d => [d.reseau.nom, Number(d.solde)]))
    const commsStr = s.commissions.map(c => `${c.type}: ${Number(c.montant)}`).join(' | ')
    lines.push(row(
      s.date.toISOString().slice(0, 10),
      s.agent?.name ?? s.user?.name ?? '',
      s.agent?.code ?? 'RESP',
      ...reseaux.map(r => soldeMap[r] ?? 0),
      Number(s.caisse),
      Number(s.especes),
      Number(s.transfertResp),
      Number(s.totalGlobal),
      s.montantAttendu != null ? Number(s.montantAttendu) : '',
      s.ecart != null ? Number(s.ecart) : '',
      s.statut,
      commsStr,
      s.observation ?? '',
    ))
  }

  const csv      = lines.join('\r\n')
  const filename = `saisies_${slug}_${debut.toISOString().slice(0, 7)}.csv`

  return new NextResponse('﻿' + csv, {   // BOM pour Excel
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
