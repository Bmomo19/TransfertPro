import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './db'
import { verifyPin } from './pin'
import { audit } from './audit'

declare module 'next-auth' {
  interface User {
    id:           string
    name:         string
    email:        string
    tenantId:     string | null
    tenantSlug:   string | null
    role:         string
    actorType:    'USER' | 'AGENT'
    mustChangePin: boolean
  }
  interface Session {
    user: User
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    tenantId:     string | null
    tenantSlug:   string | null
    role:         string
    actorType:    'USER' | 'AGENT'
    mustChangePin: boolean
  }
}

export const authOptions: NextAuthOptions = {
  session:  { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  pages:    { signIn: '/login' },

  providers: [
    CredentialsProvider({
      id:   'credentials',
      name: 'PIN',
      credentials: {
        tenantSlug: { type: 'text'     },
        identifier: { type: 'text'     },  // email ou code agent
        pin:        { type: 'password' },
        actorType:  { type: 'text'     },  // USER | AGENT
      },
      async authorize(creds) {
        if (!creds) return null
        const { tenantSlug, identifier, pin, actorType } = creds

        // ── Super Admin (pas de tenant) ───────────────────────────
        if (actorType === 'USER' && tenantSlug === 'superadmin') {
          const user = await prisma.user.findUnique({
            where: { email: identifier },
          })
          if (!user || user.role !== 'SUPER_ADMIN') return null
          if (!await verifyPin(pin, user.pinHash)) return null

          await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

          return {
            id:           user.id,
            name:         user.name,
            email:        user.email,
            tenantId:     null,
            tenantSlug:   null,
            role:         user.role,
            actorType:    'USER',
            mustChangePin: user.mustChangePin,
          }
        }

        // ── PIN-only (sous-domaine, pas d'identifiant) ───────────
        if (actorType === 'AUTO') {
          const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug, isActive: true } })
          if (!tenant) return null

          const [users, agents] = await Promise.all([
            prisma.user.findMany({ where: { tenantId: tenant.id, isActive: true } }),
            prisma.agent.findMany({ where: { tenantId: tenant.id, isActive: true } }),
          ])

          type Match = { kind: 'USER'; rec: typeof users[number] } | { kind: 'AGENT'; rec: typeof agents[number] }

          const [userResults, agentResults] = await Promise.all([
            Promise.all(users.map(async u => (await verifyPin(pin, u.pinHash)) ? u : null)),
            Promise.all(agents.map(async a => (await verifyPin(pin, a.pinHash)) ? a : null)),
          ])
          const matches: Match[] = [
            ...userResults.filter((u): u is typeof users[number] => u !== null).map(u => ({ kind: 'USER'  as const, rec: u })),
            ...agentResults.filter((a): a is typeof agents[number] => a !== null).map(a => ({ kind: 'AGENT' as const, rec: a })),
          ]

          if (matches.length !== 1) return null  // 0 = mauvais PIN, 2+ = ambigu

          const m = matches[0]
          if (m.kind === 'AGENT') {
            const a = m.rec
            await prisma.agent.update({ where: { id: a.id }, data: { lastLoginAt: new Date() } })
            await audit({ tenantId: tenant.id, actorType: 'AGENT', actorId: a.id, actorName: a.name, agentId: a.id }, 'LOGIN', 'Session')
            return { id: a.id, name: a.name, email: `${a.code}@${tenantSlug}`, tenantId: tenant.id, tenantSlug, role: a.role, actorType: 'AGENT', mustChangePin: a.mustChangePin }
          } else {
            const u = m.rec
            await prisma.user.update({ where: { id: u.id }, data: { lastLoginAt: new Date() } })
            await audit({ tenantId: tenant.id, actorType: 'USER', actorId: u.id, actorName: u.name, userId: u.id }, 'LOGIN', 'Session')
            return { id: u.id, name: u.name, email: u.email, tenantId: tenant.id, tenantSlug, role: u.role, actorType: 'USER', mustChangePin: u.mustChangePin }
          }
        }

        // ── Résoudre le tenant ────────────────────────────────────
        const tenant = await prisma.tenant.findUnique({
          where: { slug: tenantSlug, isActive: true },
        })
        if (!tenant) return null

        // ── AGENT ─────────────────────────────────────────────────
        if (actorType === 'AGENT') {
          const agent = await prisma.agent.findUnique({
            where: { tenantId_code: { tenantId: tenant.id, code: identifier } },
          })
          if (!agent || !agent.isActive) return null
          if (!await verifyPin(pin, agent.pinHash)) return null

          await prisma.agent.update({ where: { id: agent.id }, data: { lastLoginAt: new Date() } })

          await audit(
            { tenantId: tenant.id, actorType: 'AGENT', actorId: agent.id, actorName: agent.name, agentId: agent.id },
            'LOGIN', 'Session'
          )

          return {
            id:           agent.id,
            name:         agent.name,
            email:        `${agent.code}@${tenantSlug}`,
            tenantId:     tenant.id,
            tenantSlug:   tenantSlug,
            role:         agent.role,
            actorType:    'AGENT',
            mustChangePin: agent.mustChangePin,
          }
        }

        // ── USER (responsable) ────────────────────────────────────
        const user = await prisma.user.findUnique({
          where: { email: identifier },
        })
        if (!user || !user.isActive || user.tenantId !== tenant.id) return null
        if (!await verifyPin(pin, user.pinHash)) return null

        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

        await audit(
          { tenantId: tenant.id, actorType: 'USER', actorId: user.id, actorName: user.name, userId: user.id },
          'LOGIN', 'Session'
        )

        return {
          id:           user.id,
          name:         user.name,
          email:        user.email,
          tenantId:     tenant.id,
          tenantSlug:   tenantSlug,
          role:         user.role,
          actorType:    'USER',
          mustChangePin: user.mustChangePin,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.tenantId      = user.tenantId
        token.tenantSlug    = user.tenantSlug
        token.role          = user.role
        token.actorType     = user.actorType
        token.mustChangePin = user.mustChangePin
      }
      if (trigger === 'update' && session?.mustChangePin !== undefined) {
        token.mustChangePin = session.mustChangePin
      }
      return token
    },
    async session({ session, token }) {
      session.user.id           = token.sub!
      session.user.tenantId     = token.tenantId   as string | null
      session.user.tenantSlug   = token.tenantSlug as string | null
      session.user.role         = token.role       as string
      session.user.actorType    = token.actorType  as 'USER' | 'AGENT'
      session.user.mustChangePin = token.mustChangePin as boolean
      return session
    },
  },
}