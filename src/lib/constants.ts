export const DEFAULT_RESEAUX = [
  { code: 'ORANGE',    nom: 'Orange',    tauxCommission: 0.018, tauxGateway: 0.005 },
  { code: 'MTN',       nom: 'MTN',       tauxCommission: 0.022, tauxGateway: 0.006 },
  { code: 'MOOV',      nom: 'Moov',      tauxCommission: 0.016, tauxGateway: 0.005 },
  { code: 'WAVE',      nom: 'Wave',      tauxCommission: 0.015, tauxGateway: 0.004 },
  { code: 'TRANSFERT', nom: 'Transfert', tauxCommission: 0.025, tauxGateway: 0.008 },
] as const

export const PLAN_LIMITS = {
  STARTER:  { agents: 3,  export: false, api: false },
  STANDARD: { agents: 15, export: true,  api: false },
  PREMIUM:  { agents: 999, export: true,  api: true  },
} as const

export const PLAN_LABELS = {
  STARTER:  'Starter',
  STANDARD: 'Standard',
  PREMIUM:  'Premium',
} as const

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:  'Super Admin',
  RESPONSABLE:  'Responsable',
  AGENT:        'Agent',
}

export const SEUIL_RAPPROCHEMENT = 500 // FCFA

export const AUDIT_ACTION_META: Record<string, { label: string; color: string }> = {
  LOGIN:      { label: 'Connexion',   color: 'bg-slate-100 text-slate-700' },
  LOGOUT:     { label: 'Déconnexion', color: 'bg-slate-100 text-slate-700' },
  PIN_CHANGE: { label: 'Changement PIN', color: 'bg-amber-100 text-amber-700' },
  CREATE:     { label: 'Création',    color: 'bg-emerald-100 text-emerald-700' },
  UPDATE:     { label: 'Modification',color: 'bg-blue-100 text-blue-700' },
  DELETE:     { label: 'Suppression', color: 'bg-red-100 text-red-700' },
  VALIDATE:   { label: 'Validation',  color: 'bg-emerald-100 text-emerald-700' },
  REJECT:     { label: 'Rejet',       color: 'bg-red-100 text-red-700' },
  EXPORT:          { label: 'Export',         color: 'bg-violet-100 text-violet-700' },
  RAPPROCHEMENT:   { label: 'Rapprochement',  color: 'bg-blue-100 text-blue-700' },
}