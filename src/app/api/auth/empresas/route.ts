import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// POST /api/auth/empresas — retorna empresas acessíveis para um login (sem validar senha)
export async function POST(request: NextRequest) {
  const { login } = await request.json()
  if (!login?.trim()) return NextResponse.json({ empresas: [] })

  const supabase = createServerClient()

  const { data, error } = await supabase
    .rpc('fn_get_empresas_by_login', { p_login: login.trim() })

  if (error) {
    console.error('[empresas] rpc error:', error)
    return NextResponse.json({ empresas: [], rpc_error: error.message })
  }

  const empresas = (data ?? []).map((e: { id: string; nome: string; fantasia?: string }) => ({
    id: e.id,
    nome: e.nome,
    fantasia: e.fantasia ?? e.nome,
  }))

  console.log('[empresas] login:', login.trim(), '→', empresas.length, 'empresa(s)')
  return NextResponse.json({ empresas })
}
