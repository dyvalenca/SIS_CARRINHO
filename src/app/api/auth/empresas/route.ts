import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// POST /api/auth/empresas — retorna empresas acessíveis para um login (sem validar senha)
export async function POST(request: NextRequest) {
  const { login } = await request.json()
  if (!login?.trim()) return NextResponse.json({ empresas: [] })

  const supabase = createServerClient()

  // Busca o profile pelo login (RLS aberto — USING true)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_admin, ativo')
    .eq('login', login.trim().toLowerCase())
    .single()

  if (!profile || !profile.ativo) return NextResponse.json({ empresas: [] })

  const { data: empresasData } = await supabase
    .rpc('fn_get_empresas_usuario', { p_profile_id: profile.id, p_is_admin: profile.is_admin })

  const empresas = (empresasData ?? []).map((e: { id: string; nome: string; fantasia?: string }) => ({
    id: e.id,
    nome: e.nome,
    fantasia: e.fantasia ?? e.nome,
  }))

  return NextResponse.json({ empresas })
}
