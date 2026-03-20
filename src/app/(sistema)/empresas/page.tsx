import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Building2 } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'

export default async function EmpresasPage() {
  const session = await getSession()
  if (!session.profileId) redirect('/login')
  if (!session.isAdmin) redirect('/pedidos/novo')

  const supabase = createServerClient()
  const { data: empresas } = await supabase
    .from('empresas')
    .select('id, nome, fantasia, ativo')
    .order('nome')

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-sm text-gray-500">Gerenciamento de empresas (somente administradores)</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {!empresas?.length ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Building2 className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma empresa cadastrada</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Razão Social</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fantasia</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {empresas.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{e.nome}</td>
                  <td className="px-4 py-3 text-gray-600">{e.fantasia ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      e.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {e.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
