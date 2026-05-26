import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export const EUR_RATE = 655.957

export const fmtN = (v: number | string | null | undefined): string =>
  Math.round(Number(v ?? 0)).toLocaleString('fr-FR')

export const fmtEur = (fcfa: number): string =>
  `${fmtN(fcfa / EUR_RATE)} €`

export const fmtPercent = (v: number, d = 1): string =>
  `${v.toFixed(d)}%`

export const fmtDate = (d: Date | string): string =>
  format(new Date(d), 'dd/MM/yyyy', { locale: fr })

export const fmtDateLong = (d: Date | string): string =>
  format(new Date(d), 'EEEE d MMMM yyyy', { locale: fr })

export const fmtDateTime = (d: Date | string): string =>
  format(new Date(d), 'dd/MM à HH:mm', { locale: fr })

export const fmtTimeAgo = (d: Date | string): string =>
  formatDistanceToNow(new Date(d), { addSuffix: true, locale: fr })