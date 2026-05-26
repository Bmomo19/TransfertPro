'use server'
import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generatePin, hashPin, isValidPin } from '@/lib/pin'
import { audit } from '@/lib/audit'
import { getRequestMeta } from '@/lib/tenant'
import type { ActionResult } from '@/types'

async function requireResponsable() {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Non authentifié')
  if (!['RESPONSABLE', 'SUPER_ADMIN'].includes(session.user.role)) throw new Error('Accès refusé')
  return session.user
}

const CreateSchema = z.object({
  name:  z.string().min(2).max(80),
  phone: z.string().optional(),
  role:  z.enum(['AGENT']).default('AGENT'),
})

export async function createAgent(formData: FormData): Promise<ActionResult<{ code: string; pin: string }>> {
  try {
    const user = await requireResponsable()
    const parsed = CreateSchema.safeParse({
      name:  formData.get('name'),
      phone: formData.get('phone') || undefined,
      role:  formData.get('role')  || 'AGENT',
    })
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const tenantId = user.tenantId!
    const slug     = user.tenantSlug!.slice(0, 3).toUpperCase()
    const count    = await prisma.agent.count({ where: { tenantId } })
    const code     = `${slug}-${String(count + 1).padStart(3, '0')}`
    const pin      = generatePin()
    const pinHash  = await hashPin(pin)
    const { ip, ua } = await getRequestMeta()

    const agent = await prisma.agent.create({
      data: { tenantId, code, name: parsed.data.name, phone: parsed.data.phone,
              pinHash, role: parsed.data.role, mustChangePin: true, createdById: user.id },
    })

    await audit(
      { tenantId, actorType: 'USER', actorId: user.id, actorName: user.name, userId: user.id, ip, ua },
      'CREATE', 'Agent', agent.id, undefined,
      { code: agent.code, name: agent.name, role: agent.role }
    )

    revalidatePath('/agents')
    return { ok: true, data: { code, pin } }
  } catch (err: any) {
    return { ok: false, error: err.message ?? 'Erreur lors de la création' }
  }
}

export async function toggleAgent(agentId: string): Promise<ActionResult> {
  try {
    const user  = await requireResponsable()
    const agent = await prisma.agent.findFirst({ where: { id: agentId, tenantId: user.tenantId! } })
    if (!agent) return { ok: false, error: 'Agent introuvable' }
    const { ip, ua } = await getRequestMeta()

    const updated = await prisma.agent.update({
      where: { id: agentId },
      data:  { isActive: !agent.isActive },
    })

    await audit(
      { tenantId: user.tenantId!, actorType: 'USER', actorId: user.id, actorName: user.name, userId: user.id, ip, ua },
      'UPDATE', 'Agent', agentId,
      { isActive: agent.isActive }, { isActive: updated.isActive }
    )
    revalidatePath('/agents')
    return { ok: true, data: undefined }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

export async function resetAgentPin(agentId: string): Promise<ActionResult<{ pin: string }>> {
  try {
    const user  = await requireResponsable()
    const agent = await prisma.agent.findFirst({ where: { id: agentId, tenantId: user.tenantId! } })
    if (!agent) return { ok: false, error: 'Agent introuvable' }
    const { ip, ua } = await getRequestMeta()

    const pin     = generatePin()
    const pinHash = await hashPin(pin)

    await prisma.agent.update({ where: { id: agentId }, data: { pinHash, mustChangePin: true } })

    await audit(
      { tenantId: user.tenantId!, actorType: 'USER', actorId: user.id, actorName: user.name, userId: user.id, ip, ua },
      'PIN_CHANGE', 'Agent', agentId
    )
    revalidatePath('/agents')
    return { ok: true, data: { pin } }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}