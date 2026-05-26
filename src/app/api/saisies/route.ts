import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) return NextResponse.json({ saisies:[] })

  const today = new Date(); today.setHours(0,0,0,0)

  const saisies = await prisma.saisie.findMany({
    where:   { tenantId:session.user.tenantId, date:{ gte:today } },
    include: {
      agent: { select:{ name:true, code:true } },
      user:  { select:{ name:true } },
    },
    orderBy: { createdAt:'desc' },
  })

  return NextResponse.json({ saisies })
}