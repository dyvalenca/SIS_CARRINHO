import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { createServerClient } from '@/lib/supabase/server'
import { sessionOptions } from '@/lib/session'
import { SessionData, Empresa } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { login, senha, empresaId } = body as { login: string; senha: string; empresaId?: string }

    if (!login || !senha) {
      return NextResponse.json({ error: 'Login e senha são obrigatórios.' }, { status: 400 })
    }

    const supabase = createServerClient()

    // 1. Valida credenciais via fn_login
    const { data: profileId, error: rpcError } = await supabase.rpc('fn_login', {
      p_login: login.trim().toLowerCase(),
      p_senha_plain: senha,
    })

    if (rpcError) {
      return NextResponse.json({ error: `Erro RPC: ${rpcError.message}` }, { status: 500 })
    }
    if (!profileId) {
      return NextResponse.json({ error: 'Login ou senha inválidos.' }, { status: 401 })
    }

    // 2. Carrega dados do profile
    const { data: profileRows, error: profileError } = await supabase
      .rpc('fn_get_profile', { p_profile_id: profileId })

    if (profileError) {
      return NextResponse.json({ error: `Erro profile: ${profileError.message}` }, { status: 500 })
    }

    const profile = profileRows?.[0] ?? null
    if (!profile || !profile.ativo) {
      return NextResponse.json({ error: 'Usuário inativo.' }, { status: 403 })
    }

    // 3. Carrega empresas acessíveis
    const { data: empresasData, error: empError } = await supabase
      .rpc('fn_get_empresas_usuario', { p_profile_id: profileId, p_is_admin: profile.is_admin })

    if (empError) {
      return NextResponse.json({ error: `Erro empresas: ${empError.message}` }, { status: 500 })
    }

    const empresas: Empresa[] = empresasData ?? []
    if (empresas.length === 0) {
      return NextResponse.json({ error: 'Nenhuma empresa disponível para este usuário.' }, { status: 403 })
    }

    // Sem empresaId: devolve lista para o frontend escolher
    if (!empresaId) {
      return NextResponse.json({
        step: 'select-empresa',
        empresas: empresas.map((e) => ({ id: e.id, nome: e.nome, fantasia: e.fantasia ?? e.nome })),
      })
    }

    // Com empresaId: valida acesso e grava sessão
    const empresaEscolhida = empresas.find((e) => e.id === empresaId)
    if (!empresaEscolhida) {
      return NextResponse.json({ error: 'Empresa inválida ou sem acesso.' }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await getIronSession<SessionData>(cookies() as any, sessionOptions)
    session.profileId = profileId
    session.login = profile.login
    session.isAdmin = profile.is_admin
    session.vendedorId = profile.vendedor_id
    session.empresaAtualId = empresaEscolhida.id
    session.empresas = empresas.map((e) => ({ id: e.id, nome: e.nome, fantasia: e.fantasia ?? e.nome }))
    await session.save()

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[login] ERRO INESPERADO:', err)
    return NextResponse.json(
      { error: `Erro interno: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    )
  }
}
