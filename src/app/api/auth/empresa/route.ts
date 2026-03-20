import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

// PATCH — troca a empresa ativa na sessão
export async function PATCH(request: NextRequest) {
  const session = await getSession()

  if (!session.profileId) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const { empresaId } = await request.json()

  const allowed = session.empresas.some((e) => e.id === empresaId)
  if (!allowed && !session.isAdmin) {
    return NextResponse.json({ error: 'Acesso negado a esta empresa.' }, { status: 403 })
  }

  session.empresaAtualId = empresaId
  await session.save()

  return NextResponse.json({ ok: true })
}
