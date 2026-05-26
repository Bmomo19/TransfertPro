import type { TenantReseau, Threshold } from '@prisma/client'

export interface TenantWithReseaux {
  id:             string
  slug:           string
  name:           string
  colorPrimary:   string
  colorSecondary: string
  logo?:          string | null
  plan:           'STARTER' | 'STANDARD' | 'PREMIUM'
  planExpiresAt?: Date | null
  reseaux:        TenantReseau[]
  thresholds:     (Threshold & { reseau: TenantReseau })[]
}

export interface SaisieFormData {
  date:          string
  caisse:        number
  especes:       number
  transfertResp: number
  observation:   string
  soldes:        Record<string, number>   // reseauId → solde
  commissions:   Record<string, number>   // type → montant
}


export type ActionResult<T = void> =
  | { ok: true;  data: T }
  | { ok: false; error: string }