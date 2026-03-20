import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session.profileId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  if (!session.isAdmin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('empresas')
    .select('id, nome, fantasia, ativo')
    .order('nome')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ empresas: data })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isAdmin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  const { nome, fantasia } = await request.json()
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório.' }, { status: 400 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('empresas')
    .insert({ nome: nome.trim(), fantasia: fantasia?.trim() || null, criado_por: session.profileId })
    .select('id, nome, fantasia, ativo')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ empresa: data }, { status: 201 })
}
