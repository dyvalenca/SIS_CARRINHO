'use client'

import { useState, useEffect } from 'react'
import { UserCheck, Plus, X, Loader2 } from 'lucide-react'
import { maskCpf, maskTelefone } from '@/lib/utils'

interface Vendedor {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
  ativo: boolean
}

export default function VendedoresPage() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nome: '', cpf: '', telefone: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/vendedores').then((r) => r.json()).then((d) => {
      setVendedores(d.vendedores ?? [])
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    if (!form.nome.trim()) { setError('Nome obrigatório'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/vendedores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setVendedores((v) => [data.vendedor, ...v])
    setShowForm(false)
    setForm({ nome: '', cpf: '', telefone: '' })
    setSaving(false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendedores</h1>
          <p className="text-sm text-gray-500">Atendentes e vendedores da empresa</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Vendedor
        </button>
      </div>

      {showForm && (
        <div className="card p-5 border-blue-200 bg-blue-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Novo Vendedor</h3>
            <button onClick={() => setShowForm(false)} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="label">Nome *</label>
              <input type="text" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} className="input" autoFocus />
            </div>
            <div>
              <label className="label">CPF</label>
              <input type="text" value={form.cpf} onChange={(e) => setForm((f) => ({ ...f, cpf: maskCpf(e.target.value) }))} placeholder="000.000.000-00" className="input" maxLength={14} />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input type="text" value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: maskTelefone(e.target.value) }))} placeholder="(00) 00000-0000" className="input" maxLength={15} />
            </div>
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
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : !vendedores.length ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <UserCheck className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhum vendedor cadastrado</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">CPF</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Telefone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vendedores.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{v.nome}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{v.cpf ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{v.telefone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.ativo ? 'Ativo' : 'Inativo'}
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
