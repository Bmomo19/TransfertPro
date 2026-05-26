import type { Prisma, AuditAction, ActorType } from '@prisma/client'
import { prisma } from './db'

export interface AuditCtx {
  tenantId:  string | null
  actorType: ActorType
  actorId:   string
  actorName: string
  userId?:   string
  agentId?:  string
  ip?:       string
  ua?:       string
}

export async function audit(
  ctx: AuditCtx,
  action: AuditAction,
  entity: string,
  entityId?: string,
  oldValue?: Prisma.InputJsonObject,
  newValue?: Prisma.InputJsonObject,
) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId:  ctx.tenantId,
        actorType: ctx.actorType,
        actorId:   ctx.actorId,
        actorName: ctx.actorName,
        userId:    ctx.userId,
        agentId:   ctx.agentId,
        action,
        entity,
        entityId,
        oldValue:  oldValue  ?? undefined,
        newValue:  newValue  ?? undefined,
        metadata:  ctx.ip || ctx.ua ? { ip: ctx.ip, ua: ctx.ua } : undefined,
      },
    })
  } catch (err) {
    // Ne jamais crasher l'app à cause de l'audit
    console.error('[audit] Failed to write audit log:', err)
  }
}