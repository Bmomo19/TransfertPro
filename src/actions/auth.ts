'use server'
import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hashPin, isValidPin } from '@/lib/pin'
import { audit } from '@/lib/audit'
import { getRequestMeta } from '@/lib/tenant'
import type { ActionResult } from '@/types'

export async function changePin(newPin: string): Promise<ActionResult> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { ok: false, error: 'Non authentifié' }

  if (!isValidPin(newPin)) return { ok: false, error: 'PIN invalide (4 chiffres requis)' }

  const { id, actorType, tenantId, name } = session.user
  const { ip, ua } = await getRequestMeta()
  const pinHash = await hashPin(newPin)

  if (actorType === 'AGENT') {
    await prisma.agent.update({ where: { id }, data: { pinHash, mustChangePin: false } })
  } else {
    await prisma.user.update({ where: { id }, data: { pinHash, mustChangePin: false } })
  }

  await audit(
    { tenantId: tenantId!, actorType, actorId: id, actorName: name, ip, ua,
      ...(actorType === 'USER' ? { userId: id } : { agentId: id }) },
    'PIN_CHANGE', actorType === 'AGENT' ? 'Agent' : 'User', id
  )

  return { ok: true, data: undefined }
}