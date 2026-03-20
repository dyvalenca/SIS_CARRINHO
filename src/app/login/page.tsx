'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Eye, EyeOff, Loader2, Building2 } from 'lucide-react'

interface EmpresaOption {
  id: string
  nome: string
  fantasia: string
}

export default function LoginPage() {
  const router = useRouter()

  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [empresaId, setEmpresaId] = useState('')
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([])
  const [loadingEmpresas, setLoadingEmpresas] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLoginBlur(e: React.FocusEvent<HTMLInputElement>) {
    const valor = e.target.value.trim()
    if (!valor) return
    setLoadingEmpresas(true)
    setEmpresas([])
    setEmpresaId('')
    try {
      const res = await fetch('/api/auth/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: valor }),
      })
      const data = await res.json()
      const lista: EmpresaOption[] = data.empresas ?? []
      setEmpresas(lista)
      setEmpresaId(lista[0]?.id ?? '')
    } catch {
      // silencioso — empresa permanece vazia
    } finally {
      setLoadingEmpresas(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!empresaId) { setError('Selecione uma empresa.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: login.trim(), senha, empresaId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? `Erro ${res.status}`); return }
      router.push('/pedidos/novo')
      router.refresh()
    } catch (err) {
      setError(`Erro de conexão: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <ShoppingCart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Aluguel de Carrinho</h1>
          <p className="text-gray-400 text-sm mt-1">Sistema de Gestão — Shopping</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label text-gray-700">Usuário</label>
              <input
                type="text"
                value={login}
                onChange={(e) => { setLogin(e.target.value); setEmpresas([]); setEmpresaId('') }}
                onBlur={(e) => handleLoginBlur(e)}
                placeholder="seu.usuario"
                className="input"
                autoFocus
                autoComplete="username"
                disabled={loading}
              />
            </div>

            <div>
              <label className="label text-gray-700">Senha</label>
              <div className="relative">
                <input
                  type={showSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="input pr-10"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowSenha((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label text-gray-700">
                <Building2 className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                Empresa
              </label>
              {loadingEmpresas ? (
                <div className="input flex items-center gap-2 text-gray-400 text-sm">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando empresas...
                </div>
              ) : empresas.length === 0 ? (
                <div className="input text-gray-400 text-sm select-none">
                  {login.trim() ? 'Nenhuma empresa encontrada' : 'Informe o usuário acima'}
                </div>
              ) : (
                <select
                  value={empresaId}
                  onChange={(e) => setEmpresaId(e.target.value)}
                  className="input"
                  disabled={loading}
                >
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fantasia || emp.nome}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !login || !senha || !empresaId}
              className="btn-primary w-full py-2.5"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
                : 'Entrar'
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
