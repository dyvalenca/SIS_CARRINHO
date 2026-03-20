import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { cleanCpf } from '@/lib/utils'

// GET /api/pedidos?data=YYYY-MM-DD — lista pedidos da empresa
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.profileId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const data = request.nextUrl.searchParams.get('data')
  const supabase = createServerClient()

  let query = supabase
    .from('pedidos')
    .select(
      `id, data, cpf, cliente_nome, telefone, valor_total,
       dinheiro, cartao_debito, cartao_credito, pix, outros, obs, troco,
       criado_em, criado_por,
       itens_pedido(id, produto_id, plano_id, vendedor_id, quantidade, valor, hora_inicio, hora_fim)`,
    )
    .eq('empresa_id', session.empresaAtualId)
    .order('criado_em', { ascending: false })

  if (data) query = query.eq('data', data)

  const { data: pedidos, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ pedidos })
}

// POST /api/pedidos — cria pedido + itens
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.profileId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const body = await request.json()

  const {
    data,
    cpf,
    cliente_nome,
    telefone,
    valor_total,
    dinheiro = 0,
    cartao_debito = 0,
    cartao_credito = 0,
    pix = 0,
    outros = 0,
    obs,
    troco = 0,
    itens,
  } = body

  // Validações
  if (!cpf || !cliente_nome || !itens?.length) {
    return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
  }

  if (outros > 0 && !obs?.trim()) {
    return NextResponse.json(
      { error: 'Observação obrigatória quando "Outros" estiver preenchido.' },
      { status: 400 },
    )
  }

  const totalPago = dinheiro + cartao_debito + cartao_credito + pix + outros
  const saldo = Math.abs(totalPago - troco - valor_total)
  if (saldo > 0.05) {
    return NextResponse.json({ error: 'Soma dos pagamentos não confere com o total.' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Determina status pelo tipo dos produtos
  const produtoIds = itens.map((i: Record<string, unknown>) => i.produto_id as string)
  const { data: produtosInfo } = await supabase
    .from('produtos')
    .select('id, tipo')
    .in('id', produtoIds)

  const temAluguel = produtosInfo?.some((p) => p.tipo === 'aluguel') ?? false
  const pedidoStatus = temAluguel ? 'EM ABERTO' : 'FINALIZADO'

  // Busca snapshot dos planos para copiar tolerância para os itens
  const planoIds = Array.from(new Set<string>(
    itens.map((i: Record<string, unknown>) => i.plano_id as string).filter(Boolean)
  ))
  const { data: planosInfo } = planoIds.length
    ? await supabase
        .from('planos')
        .select('id, tolerancia, valor_minuto_excedente, cobra_tolerancia')
        .in('id', planoIds)
    : { data: [] }

  const agora = new Date().toISOString()

  // Insere pedido
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .insert({
      empresa_id: session.empresaAtualId,
      data: data ?? agora.slice(0, 10),
      cpf: cleanCpf(cpf),
      cliente_nome: cliente_nome.trim(),
      telefone: telefone?.trim() || null,
      valor_total,
      dinheiro,
      cartao_debito,
      cartao_credito,
      pix,
      outros,
      obs: obs?.trim() || null,
      troco,
      status: pedidoStatus,
      finalizado_em: pedidoStatus === 'FINALIZADO' ? agora : null,
      criado_por: session.profileId,
    })
    .select('id')
    .single()

  if (pedidoError || !pedido) {
    return NextResponse.json({ error: pedidoError?.message ?? 'Erro ao salvar pedido.' }, { status: 500 })
  }

  // Insere itens com status, finalizado_em e snapshot do plano
  const itensPayload = itens.map((item: Record<string, unknown>) => {
    const tipo = produtosInfo?.find((p) => p.id === item.produto_id)?.tipo
    const plano = planosInfo?.find((p) => p.id === item.plano_id)
    const isAluguel = tipo === 'aluguel'
    return {
      pedido_id: pedido.id,
      produto_id: item.produto_id,
      plano_id: item.plano_id ?? null,
      vendedor_id: item.vendedor_id ?? null,
      quantidade: item.quantidade ?? null,
      valor: item.valor,
      hora_inicio: item.hora_inicio ?? null,
      hora_fim: item.hora_fim ?? null,
      status: isAluguel ? 'EM ABERTO' : 'FINALIZADO',
      finalizado_em: isAluguel ? null : agora,
      tolerancia: plano?.tolerancia ?? null,
      valor_minuto_excedente: plano?.valor_minuto_excedente ?? null,
      cobra_tolerancia: plano?.cobra_tolerancia ?? null,
      criado_por: session.profileId,
    }
  })

  const { error: itensError } = await supabase.from('itens_pedido').insert(itensPayload)

  if (itensError) {
    // Rollback manual: apaga o pedido inserido
    await supabase.from('pedidos').delete().eq('id', pedido.id)
    return NextResponse.json({ error: itensError.message }, { status: 500 })
  }

  return NextResponse.json({ pedido }, { status: 201 })
}
