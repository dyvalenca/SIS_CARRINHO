'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Clock, RefreshCw, Loader2, Plus, UserCheck, CheckSquare, Eye, XCircle, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, todayISO } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AluguelItem {
  id: string
  pedido_id: string
  data: string
  cliente_nome: string
  telefone: string | null
  produto: string
  plano: string
  plano_tempo: number | null
  tolerancia: number
  hora_inicio: string | null
  hora_fim: string | null
  valor: number
  vendedor: string | null
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function agoraMin() {
  const agora = new Date()
  return agora.getHours() * 60 + agora.getMinutes()
}

type StatusAluguel = 'ativo' | 'carencia' | 'expirado'

function hojeISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function statusAluguel(data: string, horaFim: string | null, tolerancia: number): StatusAluguel {
  // Data anterior a hoje → sempre expirado
  if (data < hojeISO()) return 'expirado'
  if (!horaFim) return 'ativo'
  const now = agoraMin()
  const fimMin = toMin(horaFim)
  if (now <= fimMin) return 'ativo'
  if (tolerancia > 0 && now <= fimMin + tolerancia) return 'carencia'
  return 'expirado'
}

function minutosAlemDoPrazo(data: string, horaFim: string | null): number {
  if (data < hojeISO()) return 0 // dia anterior — não calcula minutos
  if (!horaFim) return 0
  return Math.max(0, agoraMin() - toMin(horaFim))
}

const statusConfig: Record<StatusAluguel, { label: string; cls: string; row: string }> = {
  ativo:    { label: 'Em andamento', cls: 'bg-green-100 text-green-800 border-green-200',   row: 'bg-green-50 hover:bg-green-100' },
  carencia: { label: 'Em carência',  cls: 'bg-yellow-100 text-yellow-800 border-yellow-300', row: 'bg-yellow-50 hover:bg-yellow-100' },
  expirado: { label: 'Expirado',     cls: 'bg-red-100 text-red-700 border-red-200',          row: 'bg-red-50 hover:bg-red-100' },
}

export default function AlugueisPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dataParam = searchParams.get('data') ?? todayISO()

  const [alugueis, setAlugueis] = useState<AluguelItem[]>([])
  const [data, setData] = useState(dataParam)
  const [loading, setLoading] = useState(true)
  const [horaAtual, setHoraAtual] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [finalizando, setFinalizando] = useState(false)
  const [cancelando, setCancelando] = useState(false)

  const carregar = useCallback((d: string) => {
    setLoading(true)
    fetch(`/api/alugueis?data=${d}`)
      .then((r) => r.json())
      .then((res) => {
        setAlugueis(res.alugueis ?? [])
        setLoading(false)
      })
  }, [])

  useEffect(() => { carregar(data) }, [data, carregar])

  useEffect(() => {
    function tick() {
      const agora = new Date()
      setHoraAtual(`${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  async function handleCancelar() {
    if (!selectedId) return
    const ok = window.confirm('Deseja cancelar este item de aluguel?')
    if (!ok) return
    setCancelando(true)
    try {
      await fetch('/api/alugueis', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: selectedId, action: 'cancelar' }),
      })
      setSelectedId(null)
      carregar(data)
    } finally {
      setCancelando(false)
    }
  }

  async function handleFinalizar() {
    if (!selectedId) return
    const item = alugueis.find((a) => a.id === selectedId)
    if (!item) return

    const st = statusAluguel(item.data, item.hora_fim, item.tolerancia)
    if (st === 'ativo') {
      const ok = window.confirm('Este aluguel ainda está em andamento. Deseja realmente finalizá-lo?')
      if (!ok) return
    }

    setFinalizando(true)
    try {
      await fetch('/api/alugueis', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: selectedId }),
      })
      setSelectedId(null)
      carregar(data)
    } finally {
      setFinalizando(false)
    }
  }

  function handleDataChange(novaData: string) {
    setData(novaData)
    router.replace(`/alugueis?data=${novaData}`)
  }

  const isHoje = data === hojeISO()
  const pendentesAnteriores = alugueis.filter((a) => a.data < hojeISO())
  const alugueisHoje = alugueis.filter((a) => a.data >= hojeISO())

  const ativos    = alugueisHoje.filter((a) => statusAluguel(a.data, a.hora_fim, a.tolerancia) === 'ativo')
  const carencias = alugueisHoje.filter((a) => statusAluguel(a.data, a.hora_fim, a.tolerancia) === 'carencia')
  const expirados = alugueisHoje.filter((a) => statusAluguel(a.data, a.hora_fim, a.tolerancia) === 'expirado')

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel de Aluguéis</h1>
          <p className="text-sm text-gray-500">
            Acompanhamento em tempo real · hora atual: <span className="font-mono font-medium">{horaAtual}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={data}
            onChange={(e) => handleDataChange(e.target.value)}
            className="input w-44"
          />
          <button onClick={() => carregar(data)} className="btn-secondary" title="Atualizar">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancelar}
            disabled={!selectedId || cancelando || finalizando}
            className="btn-secondary text-red-600 border-red-300 hover:bg-red-50 disabled:opacity-40"
          >
            {cancelando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Cancelando...</>
              : <><XCircle className="w-4 h-4" /> Cancelar</>}
          </button>
          <button
            onClick={handleFinalizar}
            disabled={!selectedId || finalizando || cancelando}
            className="btn-primary bg-green-600 hover:bg-green-700 disabled:opacity-40"
          >
            {finalizando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Finalizando...</>
              : <><CheckSquare className="w-4 h-4" /> Finalizar</>}
          </button>
          <Link href="/pedidos/novo" className="btn-primary">
            <Plus className="w-4 h-4" /> Novo Pedido
          </Link>
        </div>
      </div>

      {/* Resumo */}
      <div className={cn('grid gap-4', isHoje && pendentesAnteriores.length > 0 ? 'grid-cols-4' : 'grid-cols-3')}>
        {isHoje && pendentesAnteriores.length > 0 && (
          <div className="card p-4 border-l-4 border-orange-500 bg-orange-50">
            <p className="text-xs text-orange-700 uppercase font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Dias anteriores
            </p>
            <p className="text-3xl font-bold text-orange-600 mt-1">{pendentesAnteriores.length}</p>
          </div>
        )}
        <div className="card p-4 border-l-4 border-green-500">
          <p className="text-xs text-gray-500 uppercase font-semibold">Em andamento</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{ativos.length}</p>
        </div>
        <div className="card p-4 border-l-4 border-yellow-400">
          <p className="text-xs text-gray-500 uppercase font-semibold">Em carência</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">{carencias.length}</p>
        </div>
        <div className="card p-4 border-l-4 border-red-400">
          <p className="text-xs text-gray-500 uppercase font-semibold">Expirados</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{expirados.length}</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : alugueis.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Clock className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhum aluguel registrado nesta data</p>
            <Link href="/pedidos/novo" className="btn-primary mt-4 text-sm">
              <Plus className="w-4 h-4" /> Novo Pedido
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-10 px-4 py-3"></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Produto / Plano</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Início</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fim</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Além do prazo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vendedor</th>
                <th className="w-10 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alugueis.map((item) => {
                const st = statusAluguel(item.data, item.hora_fim, item.tolerancia)
                const { label, cls, row } = statusConfig[st]
                const minExtra = minutosAlemDoPrazo(item.data, item.hora_fim)
                const diaAnterior = item.data < hojeISO()
                const pendenciaAnterior = isHoje && diaAnterior
                return (
                  <tr
                    key={item.id}
                    className={cn(
                      'transition-colors cursor-pointer',
                      pendenciaAnterior
                        ? 'bg-orange-50 hover:bg-orange-100 border-l-4 border-orange-400'
                        : row,
                      selectedId === item.id && 'ring-2 ring-inset ring-blue-400',
                    )}
                    onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                        checked={selectedId === item.id}
                        onChange={() => setSelectedId(selectedId === item.id ? null : item.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {pendenciaAnterior ? (
                        <span className="inline-flex flex-col gap-0.5">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold border bg-orange-100 text-orange-700 border-orange-300 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Dia anterior
                          </span>
                          <span className="text-xs text-orange-500 font-mono pl-1">
                            {item.data.split('-').reverse().join('/')}
                          </span>
                        </span>
                      ) : (
                        <span className={cn('px-2 py-1 rounded-full text-xs font-semibold border', cls)}>
                          {label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.cliente_nome}</p>
                      {item.telefone && (
                        <span className="text-xs text-gray-500">{item.telefone}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.produto}</p>
                      <p className="text-xs text-gray-500">
                        {item.plano}
                        {item.plano_tempo != null && (
                          <span className="ml-1 text-gray-400">· {item.plano_tempo}min</span>
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-700">
                      {item.hora_inicio?.slice(0, 5) ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-700">
                      {item.hora_fim?.slice(0, 5) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {st === 'carencia' && (
                        <span className="font-semibold text-yellow-600">{minExtra} min</span>
                      )}
                      {st === 'expirado' && (
                        diaAnterior
                          ? <span className="font-semibold text-red-600">Dia anterior</span>
                          : <span className="font-semibold text-red-600">{minExtra} min</span>
                      )}
                      {st === 'ativo' && (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {formatCurrency(item.valor)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.vendedor
                        ? <span className="inline-flex items-center gap-1"><UserCheck className="w-3.5 h-3.5 text-gray-400" />{item.vendedor}</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/pedidos/${item.pedido_id}`}
                        className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors inline-flex"
                        title="Visualizar pedido"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
