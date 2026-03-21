import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { todayISO } from '@/lib/utils'

// GET /api/alugueis?data=YYYY-MM-DD — itens de aluguel EM ABERTO
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.profileId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const data = request.nextUrl.searchParams.get('data') ?? todayISO()
  const supabase = createServerClient()

  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select(`
      id, cliente_nome, telefone,
      itens_pedido(
        id, hora_inicio, hora_fim, valor, status, tolerancia,
        produtos(id, nome, tipo),
        planos(id, nome, tempo),
        vendedores(id, nome)
      )
    `)
    .eq('empresa_id', session.empresaAtualId)
    .eq('data', data)
    .order('criado_em')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const alugueis = (pedidos ?? []).flatMap((p) =>
    ((p.itens_pedido as any[]) ?? [])
      .filter((item) => item.produtos?.tipo === 'aluguel' && item.status === 'EM ABERTO')
      .map((item) => ({
        id: item.id,
        pedido_id: p.id,
        data: data,
        cliente_nome: p.cliente_nome,
        telefone: p.telefone,
        produto: item.produtos?.nome ?? '—',
        plano: item.planos?.nome ?? '—',
        plano_tempo: item.planos?.tempo ?? null,
        tolerancia: item.tolerancia ?? 0,
        hora_inicio: item.hora_inicio,
        hora_fim: item.hora_fim,
        valor: item.valor,
        vendedor: item.vendedores?.nome ?? null,
      })),
  )

  alugueis.sort((a, b) => (a.hora_fim ?? '99:99').localeCompare(b.hora_fim ?? '99:99'))

  return NextResponse.json({ alugueis, data })
}

// PATCH /api/alugueis — finaliza um item e, se necessário, o pedido
export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session.profileId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { item_id } = await request.json()
  if (!item_id) return NextResponse.json({ error: 'item_id obrigatório.' }, { status: 400 })

  const supabase = createServerClient()

  const agora = new Date().toISOString()

  // Finaliza o item
  const { data: item, error: itemError } = await supabase
    .from('itens_pedido')
    .update({ status: 'FINALIZADO', finalizado_em: agora })
    .eq('id', item_id)
    .select('pedido_id')
    .single()

  if (itemError || !item) {
    return NextResponse.json({ error: itemError?.message ?? 'Item não encontrado.' }, { status: 500 })
  }

  // Verifica se o pedido ainda tem itens EM ABERTO
  const { count } = await supabase
    .from('itens_pedido')
    .select('*', { count: 'exact', head: true })
    .eq('pedido_id', item.pedido_id)
    .eq('status', 'EM ABERTO')

  if (count === 0) {
    await supabase
      .from('pedidos')
      .update({ status: 'FINALIZADO', finalizado_em: agora })
      .eq('id', item.pedido_id)
  }

  return NextResponse.json({ ok: true })
}
