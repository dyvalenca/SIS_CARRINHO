'use client'

import { useState, useEffect } from 'react'
import { Package, Plus, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Produto {
  id: string
  nome: string
  tipo: 'venda' | 'aluguel'
  estoque: number | null
  ativo: boolean
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nome: '', tipo: 'venda' as 'venda' | 'aluguel', estoque: 0 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/produtos').then((r) => r.json()).then((d) => {
      setProdutos(d.produtos ?? [])
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    if (!form.nome.trim()) { setError('Nome obrigatório'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setProdutos((p) => [data.produto, ...p])
    setShowForm(false)
    setForm({ nome: '', tipo: 'venda', estoque: 0 })
    setSaving(false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-sm text-gray-500">Produtos e produtos disponíveis na empresa</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Produto
        </button>
      </div>

      {/* Formulário inline */}
      {showForm && (
        <div className="card p-5 border-blue-200 bg-blue-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Novo Produto</h3>
            <button onClick={() => setShowForm(false)} className="btn-ghost p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="label">Nome</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                className="input"
                autoFocus
              />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as 'venda' | 'aluguel' }))}
                className="input"
              >
                <option value="venda">Venda</option>
                <option value="aluguel">Aluguel</option>
              </select>
            </div>
            {form.tipo === 'venda' && (
              <div>
                <label className="label">Estoque inicial</label>
                <input
                  type="number"
                  min="0"
                  value={form.estoque}
                  onChange={(e) => setForm((f) => ({ ...f, estoque: parseInt(e.target.value) || 0 }))}
                  className="input"
                />
              </div>
            )}
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !produtos.length ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Package className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhum produto cadastrado</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estoque</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {produtos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.nome}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      p.tipo === 'aluguel'
                        ? 'bg-purple-50 text-purple-700'
                        : 'bg-blue-50 text-blue-700'
                    )}>
                      {p.tipo === 'aluguel' ? 'Aluguel' : 'Venda'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.tipo === 'venda' ? (p.estoque ?? 0) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.ativo ? 'Ativo' : 'Inativo'}
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
