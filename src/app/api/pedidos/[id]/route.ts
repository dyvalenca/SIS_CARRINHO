import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession()
  if (!session.profileId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const supabase = createServerClient()

  const { data: pedido, error } = await supabase
    .from('pedidos')
    .select(`
      id, data, cpf, cliente_nome, telefone, valor_total, status, criado_em,
      dinheiro, cartao_debito, cartao_credito, pix, outros, obs, troco, finalizado_em,
      itens_pedido(
        id, valor, quantidade, hora_inicio, hora_fim, status, finalizado_em,
        tolerancia, valor_minuto_excedente, cobra_tolerancia,
        produtos(id, nome, tipo),
        planos(id, nome, tempo, preco),
        vendedores(id, nome)
      )
    `)
    .eq('id', params.id)
    .eq('empresa_id', session.empresaAtualId)
    .single()

  if (error || !pedido) {
    return NextResponse.json({ error: error?.message ?? 'Pedido não encontrado.' }, { status: 404 })
  }

  return NextResponse.json({ pedido })
}
