'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Clock, RefreshCw, Loader2, Plus, UserCheck, MessageCircle, CheckSquare } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, todayISO } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AluguelItem {
  id: string
  cliente_nome: string
  telefone: string | null
  produto: string
  plano: string
  plano_tempo: number | null
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

function statusAluguel(horaInicio: string | null, horaFim: string | null) {
  const now = agoraMin()
  if (horaFim) {
    const fimMin = toMin(horaFim)
    if (now > fimMin) return 'expirado'
    if (fimMin - now <= 3) return 'terminando'
  }
  if (horaInicio && now >= toMin(horaInicio)) return 'ativo'
  return 'ativo'
}

function minutosExpirado(horaFim: string | null): number {
  if (!horaFim) return 0
  return Math.max(0, agoraMin() - toMin(horaFim))
}

function whatsappUrl(telefone: string) {
  const numero = telefone.replace(/\D/g, '')
  const com55 = numero.startsWith('55') ? numero : `55${numero}`
  const msg = encodeURIComponent('Faltam menos de 3 minutos para o aluguel terminar')
  return `https://wa.me/${com55}?text=${msg}`
}

const statusConfig = {
  ativo:      { label: 'Em andamento', cls: 'bg-green-100 text-green-800 border-green-200' },
  terminando: { label: 'Terminando',   cls: 'bg-orange-100 text-orange-800 border-orange-300' },
  expirado:   { label: 'Expirado',     cls: 'bg-red-100 text-red-700 border-red-200' },
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

  const carregar = useCallback((d: string) => {
    setLoading(true)
    fetch(`/api/alugueis?data=${d}`)
      .then((r) => r.json())
      .then((res) => {
        setAlugueis(res.alugueis ?? [])
        setLoading(false)
      })
  }, [])

  // Carrega ao montar e ao mudar data
  useEffect(() => { carregar(data) }, [data, carregar])

  // Atualiza hora atual a cada minuto para recalcular status
  useEffect(() => {
    function tick() {
      const agora = new Date()
      setHoraAtual(`${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  async function handleFinalizar() {
    if (!selectedId) return
    const item = alugueis.find((a) => a.id === selectedId)
    if (!item) return

    const st = statusAluguel(item.hora_inicio, item.hora_fim)
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

  const ativos     = alugueis.filter((a) => statusAluguel(a.hora_inicio, a.hora_fim) === 'ativo')
  const terminando = alugueis.filter((a) => statusAluguel(a.hora_inicio, a.hora_fim) === 'terminando')
  const expirados  = alugueis.filter((a) => statusAluguel(a.hora_inicio, a.hora_fim) === 'expirado')

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
            onClick={handleFinalizar}
            disabled={!selectedId || finalizando}
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
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 border-l-4 border-green-500">
          <p className="text-xs text-gray-500 uppercase font-semibold">Em andamento</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{ativos.length}</p>
        </div>
        <div className="card p-4 border-l-4 border-orange-400">
          <p className="text-xs text-gray-500 uppercase font-semibold">Terminando</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{terminando.length}</p>
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Expirado há</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vendedor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alugueis.map((item) => {
                const st = statusAluguel(item.hora_inicio, item.hora_fim)
                const { label, cls } = statusConfig[st]
                return (
                  <tr key={item.id} className={cn(
                    'transition-colors cursor-pointer',
                    st === 'ativo'      && 'bg-green-50 hover:bg-green-100',
                    st === 'terminando' && 'bg-orange-50 hover:bg-orange-100 animate-pulse',
                    st === 'expirado'   && 'bg-red-50 hover:bg-red-100',
                    selectedId === item.id && 'ring-2 ring-inset ring-blue-400',
                  )} onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                        checked={selectedId === item.id}
                        onChange={() => setSelectedId(selectedId === item.id ? null : item.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-semibold border', cls)}>
                        {label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.cliente_nome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.telefone && <span className="text-xs text-gray-500">{item.telefone}</span>}
                        {st === 'terminando' && item.telefone && (
                          <a
                            href={whatsappUrl(item.telefone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors"
                            title="Avisar pelo WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3" /> WhatsApp
                          </a>
                        )}
                      </div>
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
                      {item.hora_inicio ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-700">
                      {item.hora_fim ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {st === 'expirado'
                        ? <span className="font-semibold text-red-600">{minutosExpirado(item.hora_fim)} min</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {formatCurrency(item.valor)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.vendedor
                        ? <span className="inline-flex items-center gap-1"><UserCheck className="w-3.5 h-3.5 text-gray-400" />{item.vendedor}</span>
                        : <span className="text-gray-400">—</span>}
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
