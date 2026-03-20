// ── CPF ──────────────────────────────────────────────────────────────────────

export function maskCpf(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function cleanCpf(value: string): string {
  return value.replace(/\D/g, '')
}

export function isCpfComplete(value: string): boolean {
  return cleanCpf(value).length === 11
}

// ── Telefone ──────────────────────────────────────────────────────────────────

export function maskTelefone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

// ── Moeda ─────────────────────────────────────────────────────────────────────

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function parseCurrency(value: string): number {
  const clean = value.replace(/[^\d,]/g, '').replace(',', '.')
  const parsed = parseFloat(clean)
  return isNaN(parsed) ? 0 : parsed
}

// Input de moeda: aceita "R$ 1.234,56" e converte para número
export function currencyInputToNumber(input: string): number {
  const clean = input
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const parsed = parseFloat(clean)
  return isNaN(parsed) ? 0 : parsed
}

// ── Data ──────────────────────────────────────────────────────────────────────

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function formatDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ── Geral ─────────────────────────────────────────────────────────────────────

export function generateKey(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
