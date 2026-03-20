import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { todayISO } from '@/lib/utils'

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
        id, hora_inicio, hora_fim, valor,
        produtos(id, nome, tipo),
        planos(id, nome, tempo),
        vendedores(id, nome)
      )
    `)
    .eq('empresa_id', session.empresaAtualId)
    .eq('data', data)
    .order('criado_em')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Achata e filtra apenas itens de aluguel
  const alugueis = (pedidos ?? []).flatMap((p) =>
    ((p.itens_pedido as any[]) ?? [])
      .filter((item) => item.produtos?.tipo === 'aluguel')
      .map((item) => ({
        id: item.id,
        cliente_nome: p.cliente_nome,
        telefone: p.telefone,
        produto: item.produtos?.nome ?? '—',
        plano: item.planos?.nome ?? '—',
        plano_tempo: item.planos?.tempo ?? null,
        hora_inicio: item.hora_inicio,
        hora_fim: item.hora_fim,
        valor: item.valor,
        vendedor: item.vendedores?.nome ?? null,
      })),
  )

  // Ordena por hora_fim (quem termina primeiro aparece primeiro)
  alugueis.sort((a, b) => (a.hora_fim ?? '99:99').localeCompare(b.hora_fim ?? '99:99'))

  return NextResponse.json({ alugueis, data })
}
