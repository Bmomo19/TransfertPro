import { prisma } from './db'

export type StatutAcces = 'OK' | 'ALERTE' | 'BLOQUE'

export interface AbonnementInfo {
  statut:       StatutAcces
  montant:      number
  dateLimite:   Date | null
  joursRestants: number | null  // positif = avant échéance, négatif = retard
  moisCourant:  string
}

export async function getAbonnementInfo(tenantId: string): Promise<AbonnementInfo | null> {
  const abonnement = await prisma.abonnement.findUnique({
    where: { tenantId },
    include: {
      paiements: {
        orderBy: { mois: 'desc' },
        take: 1,
      },
    },
  })

  if (!abonnement || !abonnement.actif) return null

  const now         = new Date()
  const moisCourant = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Chercher le paiement du mois courant
  const paiementMois = await prisma.paiement.findUnique({
    where: { abonnementId_mois: { abonnementId: abonnement.id, mois: moisCourant } },
  })

  if (!paiementMois) {
    // Pas encore de paiement généré pour ce mois
    const dateLimite = new Date(now.getFullYear(), now.getMonth(), abonnement.jourPrelevement)
    const joursRestants = Math.floor((dateLimite.getTime() - now.getTime()) / 86_400_000)
    const statut: StatutAcces = joursRestants <= -2 ? 'BLOQUE' : joursRestants <= 5 ? 'ALERTE' : 'OK'
    return { statut, montant: Number(abonnement.montant), dateLimite, joursRestants, moisCourant }
  }

  if (paiementMois.statut === 'PAYE') {
    return { statut: 'OK', montant: Number(abonnement.montant), dateLimite: paiementMois.dateLimite, joursRestants: null, moisCourant }
  }

  const dateLimite    = paiementMois.dateLimite
  const joursRestants = Math.floor((dateLimite.getTime() - now.getTime()) / 86_400_000)
  const statut: StatutAcces = joursRestants <= -2 ? 'BLOQUE' : joursRestants <= 5 ? 'ALERTE' : 'OK'

  return { statut, montant: Number(abonnement.montant), dateLimite, joursRestants, moisCourant }
}
