import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Clock, UserCheck } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const statusPedidoConfig: Record<string, { label: string; cls: string }> = {
  'EM ABERTO':  { label: 'Em Aberto',  cls: 'bg-blue-50 text-blue-700' },
  'FINALIZADO': { label: 'Finalizado', cls: 'bg-green-50 text-green-700' },
  'CANCELADO':  { label: 'Cancelado',  cls: 'bg-red-50 text-red-700' },
}

const statusItemConfig: Record<string, { label: string; cls: string }> = {
  'EM ABERTO':  { label: 'Em Aberto',  cls: 'bg-blue-50 text-blue-700' },
  'FINALIZADO': { label: 'Finalizado', cls: 'bg-green-50 text-green-700' },
  'CANCELADO':  { label: 'Cancelado',  cls: 'bg-red-50 text-red-700' },
}

export default async function PedidoViewPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getSession()
  if (!session.profileId) redirect('/login')

  const supabase = createServerClient()
  const { data: pedido } = await supabase
    .from('pedidos')
    .select(`
      id, data, cpf, cliente_nome, telefone, valor_total, status, criado_em, finalizado_em,
      dinheiro, cartao_debito, cartao_credito, pix, outros, obs, troco,
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

  if (!pedido) redirect('/pedidos')

  const itens = (pedido.itens_pedido as any[]) ?? []
  const hora = new Date(pedido.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const pagamentos = [
    pedido.dinheiro > 0     && { label: 'Dinheiro',         valor: pedido.dinheiro },
    pedido.cartao_debito > 0 && { label: 'Cartão de Débito', valor: pedido.cartao_debito },
    pedido.cartao_credito > 0 && { label: 'Cartão de Crédito', valor: pedido.cartao_credito },
    pedido.pix > 0          && { label: 'PIX',              valor: pedido.pix },
    pedido.outros > 0       && { label: 'Outros',           valor: pedido.outros },
  ].filter(Boolean) as { label: string; valor: number }[]

  const statusPedido = statusPedidoConfig[pedido.status] ?? { label: pedido.status, cls: 'bg-gray-100 text-gray-600' }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/pedidos" className="btn-secondary p-2">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pedido</h1>
            <p className="text-sm text-gray-500">{formatDate(pedido.data)} · {hora}</p>
          </div>
        </div>
        <span className={cn('px-3 py-1 rounded-full text-sm font-semibold', statusPedido.cls)}>
          {statusPedido.label}
        </span>
      </div>

      {/* Dados do cliente */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Dados do Cliente</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-400">Nome</p>
            <p className="font-medium text-gray-900">{pedido.cliente_nome}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">CPF</p>
            <p className="font-mono text-gray-700">{pedido.cpf}</p>
          </div>
          {pedido.telefone && (
            <div>
              <p className="text-xs text-gray-400">Telefone</p>
              <p className="text-gray-700">{pedido.telefone}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400">Data</p>
            <p className="text-gray-700">{formatDate(pedido.data)}</p>
          </div>
        </div>
      </div>

      {/* Itens */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Itens do Pedido</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Produto / Plano</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qtd / Horário</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vendedor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {itens.map((item: any) => {
              const isAluguel = item.produtos?.tipo === 'aluguel'
              const st = statusItemConfig[item.status] ?? { label: item.status, cls: 'bg-gray-100 text-gray-600' }
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.produtos?.nome ?? '—'}</p>
                    {item.planos && (
                      <p className="text-xs text-gray-500">
                        {item.planos.nome}
                        <span className="ml-1 text-gray-400">· {item.planos.tempo}min</span>
                        {item.tolerancia != null && (
                          <span className="ml-1 text-gray-400">· tol. {item.tolerancia}min</span>
                        )}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {isAluguel ? (
                      <span className="inline-flex items-center gap-1 font-mono text-xs">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {item.hora_inicio ?? '—'} → {item.hora_fim ?? '—'}
                      </span>
                    ) : (
                      <span className="text-gray-600">{item.quantidade ?? 1}x</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {item.vendedores ? (
                      <span className="inline-flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                        {item.vendedores.nome}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', st.cls)}>
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                    {formatCurrency(item.valor)}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="border-t-2 border-gray-200 bg-gray-50">
            <tr>
              <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</td>
              <td className="px-4 py-3 text-right font-bold text-gray-900 text-base">
                {formatCurrency(pedido.valor_total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagamento */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Pagamento</h2>
        <div className="space-y-2 max-w-xs">
          {pagamentos.map((p) => (
            <div key={p.label} className="flex justify-between text-sm">
              <span className="text-gray-500">{p.label}</span>
              <span className="font-medium text-gray-900">{formatCurrency(p.valor)}</span>
            </div>
          ))}
          {pedido.troco > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Troco</span>
              <span className="font-medium text-orange-600">- {formatCurrency(pedido.troco)}</span>
            </div>
          )}
          {pedido.obs && (
            <p className="text-xs text-gray-400 pt-1">Obs: {pedido.obs}</p>
          )}
          <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-2">
            <span className="text-gray-700">Total do pedido</span>
            <span className="text-gray-900">{formatCurrency(pedido.valor_total)}</span>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div className="flex justify-start pb-6">
        <Link href="/pedidos" className="btn-secondary">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
      </div>
    </div>
  )
}
