import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session.profileId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('produtos')
    .select('id, nome, tipo, estoque, ativo')
    .eq('empresa_id', session.empresaAtualId)
    .order('nome')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ produtos: data })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.profileId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { nome, tipo, estoque } = await request.json()

  if (!nome?.trim() || !tipo) {
    return NextResponse.json({ error: 'Nome e tipo são obrigatórios.' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('produtos')
    .insert({
      empresa_id: session.empresaAtualId,
      nome: nome.trim(),
      tipo,
      estoque: tipo === 'venda' ? (estoque ?? 0) : null,
      criado_por: session.profileId,
    })
    .select('id, nome, tipo, estoque, ativo')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ produto: data }, { status: 201 })
}
