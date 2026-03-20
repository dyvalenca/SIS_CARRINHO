import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { createServerClient } from '@/lib/supabase/server'
import { sessionOptions } from '@/lib/session'
import { SessionData, Empresa } from '@/lib/types'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { login, senha } = body as { login: string; senha: string }

  if (!login || !senha) {
    return NextResponse.json({ error: 'Login e senha são obrigatórios.' }, { status: 400 })
  }

  const supabase = createServerClient()

  // 1. Valida credenciais via fn_login
  const { data: profileId, error: rpcError } = await supabase.rpc('fn_login', {
    p_login: login.trim().toLowerCase(),
    p_senha_plain: senha,
  })

  if (rpcError || !profileId) {
    return NextResponse.json({ error: 'Login ou senha inválidos.' }, { status: 401 })
  }

  // 2. Carrega dados do profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, login, is_admin, ativo, vendedor_id')
    .eq('id', profileId)
    .single()

  if (!profile || !profile.ativo) {
    return NextResponse.json({ error: 'Usuário inativo.' }, { status: 403 })
  }

  // 3. Carrega empresas acessíveis
  let empresas: Empresa[] = []

  if (profile.is_admin) {
    const { data } = await supabase
      .from('empresas')
      .select('id, nome, fantasia, ativo')
      .eq('ativo', true)
      .order('nome')
    empresas = data ?? []
  } else {
    const { data } = await supabase
      .from('empresas')
      .select('id, nome, fantasia, ativo, usuario_empresa!inner(ativo)')
      .eq('ativo', true)
      .eq('usuario_empresa.usuario_id', profileId)
      .eq('usuario_empresa.ativo', true)
      .order('nome')
    empresas = data ?? []
  }

  if (empresas.length === 0) {
    return NextResponse.json(
      { error: 'Nenhuma empresa disponível para este usuário.' },
      { status: 403 },
    )
  }

  // 4. Grava sessão
  const cookieStore = cookies()
  const session = await getIronSession<SessionData>(cookieStore as Parameters<typeof getIronSession>[0], sessionOptions)

  session.profileId = profileId
  session.login = profile.login
  session.isAdmin = profile.is_admin
  session.vendedorId = profile.vendedor_id
  session.empresaAtualId = empresas[0].id
  session.empresas = empresas.map((e) => ({
    id: e.id,
    nome: e.nome,
    fantasia: e.fantasia ?? e.nome,
  }))

  await session.save()

  return NextResponse.json({
    ok: true,
    isAdmin: profile.is_admin,
    empresas: session.empresas,
    empresaAtualId: session.empresaAtualId,
  })
}
