'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export function BackButton() {
  const router = useRouter()
  return (
    <button onClick={() => router.back()} className="btn-secondary p-2" title="Voltar">
      <ArrowLeft className="w-4 h-4" />
    </button>
  )
}
