import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase/server'
import { PedidoForm } from '@/components/pedidos/pedido-form'

export default async function NovoPedidoPage() {
  const session = await getSession()
  if (!session.profileId) redirect('/login')

  const supabase = createServerClient()

  const [{ data: produtos }, { data: planos }, { data: vendedores }] = await Promise.all([
    supabase
      .from('produtos')
      .select('id, nome, tipo, estoque')
      .eq('empresa_id', session.empresaAtualId)
      .eq('ativo', true)
      .order('nome'),
    supabase
      .from('planos')
      .select('id, produto_id, nome, preco, tempo')
      .eq('empresa_id', session.empresaAtualId)
      .eq('ativo', true)
      .order('nome'),
    supabase
      .from('vendedores')
      .select('id, nome')
      .eq('empresa_id', session.empresaAtualId)
      .eq('ativo', true)
      .order('nome'),
  ])

  return (
    <PedidoForm
      produtos={produtos ?? []}
      planos={planos ?? []}
      vendedores={vendedores ?? []}
      empresaId={session.empresaAtualId}
      profileId={session.profileId}
    />
  )
}
