import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'

// GET /api/planos — lista planos da empresa
export async function GET() {
  const session = await getSession()
  if (!session.profileId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('planos')
    .select('id, nome, preco, tempo, ativo')
    .eq('empresa_id', session.empresaAtualId)
    .order('nome')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ planos: data })
}

// POST /api/planos — cria novo plano
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.profileId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { nome, preco, tempo } = await request.json()

  if (!nome?.trim() || preco == null || !tempo) {
    return NextResponse.json({ error: 'Nome, preço e tempo são obrigatórios.' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('planos')
    .insert({
      empresa_id: session.empresaAtualId,
      nome: nome.trim(),
      preco: parseFloat(preco),
      tempo: parseInt(tempo),
      criado_por: session.profileId,
    })
    .select('id, nome, preco, tempo, ativo')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plano: data }, { status: 201 })
}
