import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, ShoppingCart } from 'lucide-react'
import { formatCurrency, formatDate, todayISO } from '@/lib/utils'

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>
}) {
  const session = await getSession()
  if (!session.profileId) redirect('/login')

  const params = await searchParams
  const dataFiltro = params.data ?? todayISO()

  const supabase = createServerClient()
  const { data: pedidos } = await supabase
    .from('pedidos')
    .select(`
      id, data, cpf, cliente_nome, telefone, valor_total,
      dinheiro, cartao_debito, cartao_credito, pix, outros, troco, criado_em,
      itens_pedido(id)
    `)
    .eq('empresa_id', session.empresaAtualId)
    .eq('data', dataFiltro)
    .order('criado_em', { ascending: false })

  const totalDia = pedidos?.reduce((s, p) => s + (p.valor_total ?? 0), 0) ?? 0

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-sm text-gray-500">Consulta de pedidos por data</p>
        </div>
        <Link href="/pedidos/novo" className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Pedido
        </Link>
      </div>

      {/* Filtro de data */}
      <div className="card p-4 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Data:</label>
        <form method="GET">
          <input
            type="date"
            name="data"
            defaultValue={dataFiltro}
            onChange={(e) => {
              const form = e.target.closest('form') as HTMLFormElement
              form?.submit()
            }}
            className="input w-44"
          />
        </form>
        <div className="ml-auto text-right">
          <p className="text-xs text-gray-500">Total do dia</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalDia)}</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {!pedidos?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhum pedido em {formatDate(dataFiltro)}</p>
            <Link href="/pedidos/novo" className="btn-primary mt-4 text-sm">
              <Plus className="w-4 h-4" /> Criar pedido
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Hora</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Itens</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Pagamentos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pedidos.map((pedido) => {
                const hora = new Date(pedido.criado_em).toLocaleTimeString('pt-BR', {
                  hour: '2-digit', minute: '2-digit',
                })
                const pagamentos = [
                  pedido.dinheiro > 0 && `Dinheiro ${formatCurrency(pedido.dinheiro)}`,
                  pedido.cartao_debito > 0 && `Débito ${formatCurrency(pedido.cartao_debito)}`,
                  pedido.cartao_credito > 0 && `Crédito ${formatCurrency(pedido.cartao_credito)}`,
                  pedido.pix > 0 && `PIX ${formatCurrency(pedido.pix)}`,
                  pedido.outros > 0 && `Outros ${formatCurrency(pedido.outros)}`,
                ].filter(Boolean).join(' · ')

                return (
                  <tr key={pedido.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{hora}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{pedido.cliente_nome}</p>
                      <p className="text-xs text-gray-500">{pedido.cpf}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {pedido.itens_pedido?.length ?? 0} {pedido.itens_pedido?.length === 1 ? 'item' : 'itens'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {formatCurrency(pedido.valor_total)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {pagamentos || '—'}
                      {pedido.troco > 0 && ` · Troco ${formatCurrency(pedido.troco)}`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-300 bg-gray-50">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Total ({pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''})
                </td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">
                  {formatCurrency(totalDia)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
