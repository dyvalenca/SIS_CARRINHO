import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { cleanCpf } from '@/lib/utils'

// GET /api/clientes?cpf=XXX — busca cliente pelo CPF
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.profileId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const cpf = cleanCpf(request.nextUrl.searchParams.get('cpf') ?? '')
  if (cpf.length !== 11) {
    return NextResponse.json({ error: 'CPF inválido.' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data } = await supabase
    .from('clientes')
    .select('id, cpf, nome, telefone')
    .eq('cpf', cpf)
    .eq('ativo', true)
    .single()

  if (!data) {
    return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
  }

  return NextResponse.json({ cliente: data })
}

// POST /api/clientes — cria novo cliente
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.profileId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const body = await request.json()
  const cpf = cleanCpf(body.cpf ?? '')
  const nome = (body.nome ?? '').trim()
  const telefone = (body.telefone ?? '').trim() || null

  if (cpf.length !== 11 || !nome) {
    return NextResponse.json({ error: 'CPF e nome são obrigatórios.' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Evita duplicata se alguém já cadastrou enquanto o usuário digitava
  const { data: existing } = await supabase
    .from('clientes')
    .select('id, cpf, nome, telefone')
    .eq('cpf', cpf)
    .single()

  if (existing) return NextResponse.json({ cliente: existing }, { status: 200 })

  const { data, error } = await supabase
    .from('clientes')
    .insert({ cpf, nome, telefone, criado_por: session.profileId })
    .select('id, cpf, nome, telefone')
    .single()

  if (error) {
    console.error('[clientes POST] erro supabase:', error)
    return NextResponse.json({ error: `Erro ao cadastrar cliente: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ cliente: data }, { status: 201 })
}
