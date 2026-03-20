'use client'

import { useRouter } from 'next/navigation'

export function FiltroData({ dataFiltro, totalDia }: { dataFiltro: string; totalDia: string }) {
  const router = useRouter()

  return (
    <div className="card p-4 flex items-center gap-4">
      <label className="text-sm font-medium text-gray-700">Data:</label>
      <input
        type="date"
        defaultValue={dataFiltro}
        onChange={(e) => router.push(`/pedidos?data=${e.target.value}`)}
        className="input w-44"
      />
      <div className="ml-auto text-right">
        <p className="text-xs text-gray-500">Total do dia</p>
        <p className="text-xl font-bold text-gray-900">{totalDia}</p>
      </div>
    </div>
  )
}
