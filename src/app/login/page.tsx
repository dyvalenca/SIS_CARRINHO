'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Eye, EyeOff, Loader2, Building2 } from 'lucide-react'

interface EmpresaOption {
  id: string
  nome: string
  fantasia: string
}

type Step = 'credentials' | 'empresa'

export default function LoginPage() {
  const router = useRouter()

  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [step, setStep] = useState<Step>('credentials')
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([])
  const [empresaId, setEmpresaId] = useState('')

  // Passo 1: valida credenciais e retorna lista de empresas
  async function handleBuscarEmpresas(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: login.trim(), senha }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? `Erro ${res.status}`); return }

      const lista: EmpresaOption[] = data.empresas ?? []
      setEmpresas(lista)
      setEmpresaId(lista[0]?.id ?? '')
      setStep('empresa')
    } catch (err) {
      setError(`Erro de conexão: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  // Passo 2: efetua login com a empresa escolhida
  async function handleEntrar(e: FormEvent) {
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

  function handleVoltarCredenciais() {
    setStep('credentials')
    setEmpresas([])
    setEmpresaId('')
    setError('')
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <ShoppingCart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Aluguel de Carrinho</h1>
          <p className="text-gray-400 text-sm mt-1">Sistema de Gestão — Shopping</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {step === 'credentials' ? (
            <form onSubmit={handleBuscarEmpresas} className="space-y-5">
              <div>
                <label className="label text-gray-700">Usuário</label>
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
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

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !login || !senha}
                className="btn-primary w-full py-2.5"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
                ) : (
                  'Próximo'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleEntrar} className="space-y-5">
              {/* Identificação do usuário (somente leitura) */}
              <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-600 font-medium">{login}</span>
                <button
                  type="button"
                  onClick={handleVoltarCredenciais}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Trocar
                </button>
              </div>

              <div>
                <label className="label text-gray-700">
                  <Building2 className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                  Empresa
                </label>
                <select
                  value={empresaId}
                  onChange={(e) => setEmpresaId(e.target.value)}
                  className="input"
                  autoFocus
                  disabled={loading}
                >
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fantasia || emp.nome}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !empresaId}
                className="btn-primary w-full py-2.5"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
