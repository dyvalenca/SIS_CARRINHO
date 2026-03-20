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
  const { data, error } = await supabase.rpc('fn_get_cliente_cpf', { p_cpf: cpf })

  if (error) {
    console.error('[clientes GET] erro rpc:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const cliente = data?.[0] ?? null

  if (!cliente || !cliente.ativo) {
    return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
  }

  return NextResponse.json({ cliente })
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

  const { data, error } = await supabase.rpc('fn_upsert_cliente', {
    p_cpf: cpf,
    p_nome: nome,
    p_telefone: telefone,
    p_criado_por: session.profileId,
  })

  if (error) {
    console.error('[clientes POST] erro rpc:', error)
    return NextResponse.json({ error: `Erro ao cadastrar cliente: ${error.message}` }, { status: 500 })
  }

  const cliente = data?.[0] ?? null
  if (!cliente) {
    return NextResponse.json({ error: 'Erro ao cadastrar cliente.' }, { status: 500 })
  }

  return NextResponse.json({ cliente }, { status: 201 })
}
