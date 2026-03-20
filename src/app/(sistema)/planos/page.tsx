'use client'

import { useState, useEffect } from 'react'
import { Clock, Plus, X, Loader2 } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

interface Plano {
  id: string
  nome: string
  preco: number
  tempo: number
  ativo: boolean
}

const emptyForm = { nome: '', preco: '', tempo: '' }

export default function PlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/planos').then((r) => r.json()).then((d) => {
      setPlanos(d.planos ?? [])
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    if (!form.nome.trim() || !form.preco || !form.tempo) {
      setError('Todos os campos são obrigatórios.')
      return
    }
    setSaving(true)
    setError('')
    const res = await fetch('/api/planos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: form.nome, preco: form.preco, tempo: form.tempo }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setPlanos((prev) => [...prev, data.plano])
    setShowForm(false)
    setForm(emptyForm)
    setSaving(false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planos de Aluguel</h1>
          <p className="text-sm text-gray-500">Tabela de preços e duração dos aluguéis</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Plano
        </button>
      </div>

      {/* Formulário inline */}
      {showForm && (
        <div className="card p-5 border-blue-200 bg-blue-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Novo Plano</h3>
            <button onClick={() => { setShowForm(false); setForm(emptyForm); setError('') }} className="btn-ghost p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-3">
              <label className="label">Nome do plano</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: 1 hora, Meio período, Dia inteiro..."
                className="input"
                autoFocus
              />
            </div>
            <div>
              <label className="label">Preço (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.preco}
                onChange={(e) => setForm((f) => ({ ...f, preco: e.target.value }))}
                placeholder="0,00"
                className="input"
              />
            </div>
            <div>
              <label className="label">Duração (minutos)</label>
              <input
                type="number"
                min="1"
                value={form.tempo}
                onChange={(e) => setForm((f) => ({ ...f, tempo: e.target.value }))}
                placeholder="Ex: 60"
                className="input"
              />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => { setShowForm(false); setForm(emptyForm); setError('') }} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !planos.length ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Clock className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhum plano cadastrado</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Plano</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Duração</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Preço</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {planos.map((plano) => (
                <tr key={plano.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{plano.nome}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {plano.tempo >= 60
                        ? `${Math.floor(plano.tempo / 60)}h${plano.tempo % 60 > 0 ? ` ${plano.tempo % 60}min` : ''}`
                        : `${plano.tempo}min`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                    {formatCurrency(plano.preco)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      plano.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500',
                    )}>
                      {plano.ativo ? 'Ativo' : 'Inativo'}
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
