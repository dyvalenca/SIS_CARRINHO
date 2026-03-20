import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'

const SELECT = 'id, nome, preco, tempo, tolerancia, valor_minuto_excedente, cobra_tolerancia, ativo'

// GET /api/planos — lista planos da empresa
export async function GET() {
  const session = await getSession()
  if (!session.profileId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('planos')
    .select(SELECT)
    .eq('empresa_id', session.empresaAtualId)
    .order('nome')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ planos: data })
}

// POST /api/planos — cria novo plano
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.profileId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { nome, preco, tempo, tolerancia, valor_minuto_excedente, cobra_tolerancia } = await request.json()

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
      tolerancia: parseInt(tolerancia ?? 0),
      valor_minuto_excedente: parseFloat(valor_minuto_excedente ?? 0),
      cobra_tolerancia: cobra_tolerancia ?? true,
      criado_por: session.profileId,
    })
    .select(SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plano: data }, { status: 201 })
}
