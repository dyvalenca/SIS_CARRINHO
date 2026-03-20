import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { cleanCpf } from '@/lib/utils'

export async function GET() {
  const session = await getSession()
  if (!session.profileId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('vendedores')
    .select('id, nome, cpf, telefone, ativo')
    .eq('empresa_id', session.empresaAtualId)
    .order('nome')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ vendedores: data })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.profileId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { nome, cpf, telefone } = await request.json()

  if (!nome?.trim()) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })

  const cpfLimpo = cpf ? cleanCpf(cpf) : null

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('vendedores')
    .insert({
      empresa_id: session.empresaAtualId,
      nome: nome.trim(),
      cpf: cpfLimpo || null,
      telefone: telefone?.trim() || null,
      criado_por: session.profileId,
    })
    .select('id, nome, cpf, telefone, ativo')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ vendedor: data }, { status: 201 })
}
