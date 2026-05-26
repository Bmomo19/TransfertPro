import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../.env.local') })
config({ path: resolve(__dirname, '../.env') })

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const DEFAULT_RESEAUX = [
  { code: 'ORANGE',    nom: 'Orange',    tauxCommission: 0.018, tauxGateway: 0.005, ordre: 1, modeCommission: 'DIRECT'    as const, hasCommissionAgent: false, commissionLabel: null },
  { code: 'MTN',       nom: 'MTN',       tauxCommission: 0.022, tauxGateway: 0.006, ordre: 2, modeCommission: 'CUMULATIF' as const, hasCommissionAgent: true,  commissionLabel: null },
  { code: 'MOOV',      nom: 'Moov',      tauxCommission: 0.016, tauxGateway: 0.005, ordre: 3, modeCommission: 'DIRECT'    as const, hasCommissionAgent: true,  commissionLabel: null },
  { code: 'WAVE',      nom: 'Wave',      tauxCommission: 0.015, tauxGateway: 0.004, ordre: 4, modeCommission: 'DIRECT'    as const, hasCommissionAgent: false, commissionLabel: null },
  { code: 'TRANSFERT', nom: 'Transfert', tauxCommission: 0.025, tauxGateway: 0.008, ordre: 5, modeCommission: 'DIRECT'    as const, hasCommissionAgent: true,  commissionLabel: "Transfert d'unités" },
]

async function main() {
  console.log('🌱 Seeding TransfertPro...\n')

  // ── Super Admin ───────────────────────────────────────────────────
  const superAdminPin = await bcrypt.hash('0000', 12)
  await prisma.user.upsert({
    where:  { email: 'superadmin@transfertpro.app' },
    update: {},
    create: {
      email:         'superadmin@transfertpro.app',
      name:          'Super Administrateur',
      pinHash:       superAdminPin,
      role:          'SUPER_ADMIN',
      mustChangePin: true,
      tenantId:      null,
    },
  })
  console.log(`✅ Super Admin créé: superadmin@transfertpro.app | PIN: 0000`)

  // ── Tenant 1 : Hudiphen ───────────────────────────────────────────
  const hudiphen = await prisma.tenant.upsert({
    where:  { slug: 'hudiphen' },
    update: {},
    create: {
      slug:           'hudiphen',
      name:           'Hudiphen SARL',
      colorPrimary:   '#F97316',
      colorSecondary: '#FFF7ED',
      plan:           'STANDARD',
    },
  })

  const reseauxHud = await Promise.all(
    DEFAULT_RESEAUX.map(({ commissionLabel, ...r }) =>
      prisma.tenantReseau.upsert({
        where:  { tenantId_code: { tenantId: hudiphen.id, code: r.code } },
        update: { modeCommission: r.modeCommission, hasCommissionAgent: r.hasCommissionAgent, commissionLabel },
        create: { ...r, commissionLabel, tenantId: hudiphen.id },
      })
    )
  )

  await Promise.all(
    reseauxHud.map(r =>
      prisma.threshold.upsert({
        where:  { tenantId_reseauId: { tenantId: hudiphen.id, reseauId: r.id } },
        update: {},
        create: { tenantId: hudiphen.id, reseauId: r.id, min: 200000, max: 5000000 },
      })
    )
  )

  const respHudPin = await bcrypt.hash('1111', 12)
  const respHud = await prisma.user.upsert({
    where:  { email: 'resp@hudiphen.ci' },
    update: {},
    create: {
      tenantId:      hudiphen.id,
      email:         'resp@hudiphen.ci',
      name:          'Marie Konan',
      pinHash:       respHudPin,
      role:          'RESPONSABLE',
      mustChangePin: true,
    },
  })
  console.log(`✅ Responsable Hudiphen: resp@hudiphen.ci | PIN: 1111`)

  const agent1Pin = await bcrypt.hash('2222', 12)
  await prisma.agent.upsert({
    where:  { tenantId_code: { tenantId: hudiphen.id, code: 'HUD-001' } },
    update: {},
    create: {
      tenantId:      hudiphen.id,
      code:          'HUD-001',
      name:          'Victoire Adjoua',
      phone:         '+225 07 12 34 56',
      pinHash:       agent1Pin,
      role:          'AGENT',
      mustChangePin: true,
      createdById:   respHud.id,
    },
  })

  const agent2Pin = await bcrypt.hash('3333', 12)
  await prisma.agent.upsert({
    where:  { tenantId_code: { tenantId: hudiphen.id, code: 'HUD-002' } },
    update: {},
    create: {
      tenantId:      hudiphen.id,
      code:          'HUD-002',
      name:          'Gildas Assi',
      pinHash:       agent2Pin,
      role:          'AGENT',
      mustChangePin: true,
      createdById:   respHud.id,
    },
  })
  console.log(`✅ Agents Hudiphen: HUD-001 (PIN:2222) | HUD-002 (PIN:3333)`)

  // ── Tenant 2 : Hephed ─────────────────────────────────────────────
  const hephed = await prisma.tenant.upsert({
    where:  { slug: 'hephed' },
    update: {},
    create: {
      slug:           'hephed',
      name:           'Hephed Finance',
      colorPrimary:   '#3B82F6',
      colorSecondary: '#EFF6FF',
      plan:           'STARTER',
    },
  })

  const reseauxHep = await Promise.all(
    DEFAULT_RESEAUX.map(({ commissionLabel, ...r }) =>
      prisma.tenantReseau.upsert({
        where:  { tenantId_code: { tenantId: hephed.id, code: r.code } },
        update: { modeCommission: r.modeCommission, hasCommissionAgent: r.hasCommissionAgent, commissionLabel },
        create: { ...r, commissionLabel, tenantId: hephed.id },
      })
    )
  )

  await Promise.all(
    reseauxHep.map(r =>
      prisma.threshold.upsert({
        where:  { tenantId_reseauId: { tenantId: hephed.id, reseauId: r.id } },
        update: {},
        create: { tenantId: hephed.id, reseauId: r.id, min: 150000, max: 4000000 },
      })
    )
  )

  const respHepPin = await bcrypt.hash('4444', 12)
  await prisma.user.upsert({
    where:  { email: 'resp@hephed.ci' },
    update: {},
    create: {
      tenantId:      hephed.id,
      email:         'resp@hephed.ci',
      name:          'Jean-Baptiste Koffi',
      pinHash:       respHepPin,
      role:          'RESPONSABLE',
      mustChangePin: true,
    },
  })
  console.log(`✅ Responsable Hephed: resp@hephed.ci | PIN: 4444`)

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎉 Seed terminé ! Résumé:\n')
  console.log('  SUPER ADMIN')
  console.log('    Email : superadmin@transfertpro.app')
  console.log('    PIN   : 0000  ⚠️  À changer à la première connexion\n')
  console.log('  HUDIPHEN (slug: hudiphen)')
  console.log('    Responsable : resp@hudiphen.ci | PIN: 1111')
  console.log('    Agent HUD-001              | PIN: 2222')
  console.log('    Agent HUD-002              | PIN: 3333\n')
  console.log('  HEPHED (slug: hephed)')
  console.log('    Responsable : resp@hephed.ci | PIN: 4444')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch(e => { console.error('❌ Seed error:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })
