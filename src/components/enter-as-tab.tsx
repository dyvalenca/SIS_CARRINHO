'use client'

import { useEffect } from 'react'

export function EnterAsTab() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter') return

      const target = e.target as HTMLElement
      const tag = target.tagName

      // Deixa Enter normal em textarea e botões
      if (tag === 'TEXTAREA') return
      if (tag === 'BUTTON') return
      if ((target as HTMLInputElement).type === 'submit') return

      const focusable = Array.from(
        document.querySelectorAll<HTMLElement>(
          'input:not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
        ),
      ).filter((el) => el.tabIndex >= 0)

      const idx = focusable.indexOf(target)
      if (idx >= 0 && idx < focusable.length - 1) {
        e.preventDefault()
        focusable[idx + 1].focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return null
}
