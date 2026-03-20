'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, Loader2, CheckCircle, AlertCircle, Info, Save, X,
} from 'lucide-react'
import { Produto, Plano, Vendedor } from '@/lib/types'
import {
  maskCpf, maskTelefone, cleanCpf, isCpfComplete,
  formatCurrency, todayISO, generateKey, cn,
} from '@/lib/utils'

// ── Tipos locais ──────────────────────────────────────────────────────────────

interface ItemForm {
  _key: string
  produto_id: string
  produto_tipo: 'venda' | 'servico' | ''
  plano_id: string
  vendedor_id: string
  quantidade: number
  valor: number
  hora_inicio: string
  hora_fim: string
}

type ClienteStatus = 'idle' | 'loading' | 'found' | 'not-found' | 'saving' | 'saved'

const emptyItem = (): ItemForm => ({
  _key: generateKey(),
  produto_id: '',
  produto_tipo: '',
  plano_id: '',
  vendedor_id: '',
  quantidade: 1,
  valor: 0,
  hora_inicio: '',
  hora_fim: '',
})

// ── Props ─────────────────────────────────────────────────────────────────────

interface PedidoFormProps {
  produtos: Pick<Produto, 'id' | 'nome' | 'tipo'>[]
  planos: Pick<Plano, 'id' | 'produto_id' | 'nome' | 'preco' | 'tempo'>[]
  vendedores: Pick<Vendedor, 'id' | 'nome'>[]
  empresaId: string
  profileId: string
}

// ── Componente principal ──────────────────────────────────────────────────────

export function PedidoForm({ produtos, planos, vendedores }: PedidoFormProps) {
  const router = useRouter()

  // Header
  const [data, setData] = useState(todayISO())
  const [cpf, setCpf] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [clienteStatus, setClienteStatus] = useState<ClienteStatus>('idle')

  // Itens
  const [itens, setItens] = useState<ItemForm[]>([emptyItem()])

  // Pagamento
  const [dinheiro, setDinheiro] = useState(0)
  const [cartaoDebito, setCartaoDebito] = useState(0)
  const [cartaoCredito, setCartaoCredito] = useState(0)
  const [pix, setPix] = useState(0)
  const [outros, setOutros] = useState(0)
  const [obs, setObs] = useState('')
  const [troco, setTroco] = useState(0)

  // Submit
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // ── Derivados ───────────────────────────────────────────────────────────────

  const valorTotal = useMemo(
    () => itens.reduce((sum, i) => sum + (i.valor || 0), 0),
    [itens],
  )

  const totalPago = dinheiro + cartaoDebito + cartaoCredito + pix + outros
  const saldo = totalPago - troco - valorTotal
  const pagamentoOk = Math.abs(saldo) <= 0.05 && valorTotal > 0

  // ── CPF lookup ──────────────────────────────────────────────────────────────

  const buscarCliente = useCallback(async (cpfDigitos: string) => {
    setClienteStatus('loading')
    try {
      const res = await fetch(`/api/clientes?cpf=${cpfDigitos}`)
      if (res.ok) {
        const { cliente } = await res.json()
        setClienteNome(cliente.nome)
        setTelefone(maskTelefone(cliente.telefone ?? ''))
        setClienteStatus('found')
      } else {
        setClienteNome('')
        setTelefone('')
        setClienteStatus('not-found')
      }
    } catch {
      setClienteStatus('not-found')
    }
  }, [])

  const handleCpfChange = (value: string) => {
    const masked = maskCpf(value)
    setCpf(masked)
    if (clienteStatus !== 'idle') {
      setClienteStatus('idle')
      setClienteNome('')
      setTelefone('')
    }
  }

  const handleCpfBlur = () => {
    if (isCpfComplete(cpf)) buscarCliente(cleanCpf(cpf))
  }

  const handleTelefoneBlur = async () => {
    if (clienteStatus !== 'not-found') return
    if (!clienteNome.trim() || !telefone.trim()) return
    setClienteStatus('saving')
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cleanCpf(cpf), nome: clienteNome.trim(), telefone }),
      })
      if (res.ok) setClienteStatus('saved')
      else setClienteStatus('not-found')
    } catch {
      setClienteStatus('not-found')
    }
  }

  const clearCliente = () => {
    setCpf('')
    setClienteNome('')
    setTelefone('')
    setClienteStatus('idle')
  }

  // ── Gestão de itens ─────────────────────────────────────────────────────────

  const addItem = () => setItens((prev) => [...prev, emptyItem()])

  const removeItem = (key: string) =>
    setItens((prev) => (prev.length > 1 ? prev.filter((i) => i._key !== key) : prev))

  const updateItem = (key: string, patch: Partial<ItemForm>) =>
    setItens((prev) => prev.map((i) => (i._key === key ? { ...i, ...patch } : i)))

  const handleProdutoChange = (key: string, produtoId: string) => {
    const produto = produtos.find((p) => p.id === produtoId)
    updateItem(key, {
      produto_id: produtoId,
      produto_tipo: produto?.tipo ?? '',
      plano_id: '',
      valor: 0,
      quantidade: produto?.tipo === 'servico' ? 1 : 1,
      hora_inicio: '',
      hora_fim: '',
    })
  }

  const handlePlanoChange = (key: string, planoId: string) => {
    const plano = planos.find((p) => p.id === planoId)
    updateItem(key, { plano_id: planoId, valor: plano?.preco ?? 0 })
  }

  // ── Validação ───────────────────────────────────────────────────────────────

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}

    if (!isCpfComplete(cpf)) errs.cpf = 'CPF inválido ou incompleto'
    if (!clienteNome.trim()) errs.clienteNome = 'Nome do cliente obrigatório'

    itens.forEach((item, idx) => {
      if (!item.produto_id) errs[`item_${idx}_produto`] = 'Produto obrigatório'
      if (!item.valor || item.valor <= 0) errs[`item_${idx}_valor`] = 'Valor obrigatório'
      if (item.produto_tipo === 'servico' && !item.plano_id)
        errs[`item_${idx}_plano`] = 'Plano obrigatório para serviços'
      if (item.produto_tipo === 'venda' && (!item.quantidade || item.quantidade < 1))
        errs[`item_${idx}_qtd`] = 'Quantidade inválida'
    })

    if (valorTotal <= 0) errs.valorTotal = 'Adicione ao menos um item com valor'

    if (!pagamentoOk) {
      errs.pagamento =
        saldo > 0.05
          ? `Falta R$ ${formatCurrency(saldo)} para completar o pagamento`
          : `Pagamento excede o total em R$ ${formatCurrency(Math.abs(saldo))}`
    }

    if (outros > 0 && !obs.trim()) errs.obs = 'Observação obrigatória quando "Outros" estiver preenchido'

    return errs
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setIsSubmitting(true)
    setSubmitError('')

    const payload = {
      data,
      cpf: cleanCpf(cpf),
      cliente_nome: clienteNome.trim(),
      telefone: telefone.trim() || null,
      valor_total: valorTotal,
      dinheiro,
      cartao_debito: cartaoDebito,
      cartao_credito: cartaoCredito,
      pix,
      outros,
      obs: obs.trim() || null,
      troco,
      itens: itens.map((item) => ({
        produto_id: item.produto_id,
        plano_id: item.produto_tipo === 'servico' ? item.plano_id || null : null,
        vendedor_id: item.vendedor_id || null,
        quantidade: item.produto_tipo === 'venda' ? item.quantidade : null,
        valor: item.valor,
        hora_inicio: item.produto_tipo === 'servico' ? item.hora_inicio || null : null,
        hora_fim: item.produto_tipo === 'servico' ? item.hora_fim || null : null,
      })),
    }

    try {
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await res.json()
      if (!res.ok) {
        setSubmitError(result.error ?? 'Erro ao salvar pedido.')
        return
      }

      router.push('/pedidos')
      router.refresh()
    } catch {
      setSubmitError('Erro de conexão. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Cabeçalho da página */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo Pedido</h1>
          <p className="text-sm text-gray-500">Preencha os dados do pedido e os itens</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push('/pedidos')} className="btn-secondary">
            <X className="w-4 h-4" /> Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
            ) : (
              <><Save className="w-4 h-4" /> Salvar Pedido</>
            )}
          </button>
        </div>
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{submitError}</p>
        </div>
      )}

      {/* ── Seção 1: Dados do cliente ─────────────────────────────────────── */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
          Dados do Cliente
        </h2>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {/* Data */}
          <div>
            <label className="label">Data</label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="input"
            />
          </div>

          {/* CPF */}
          <div>
            <label className="label">CPF</label>
            <div className="relative">
              <input
                type="text"
                value={cpf}
                onChange={(e) => handleCpfChange(e.target.value)}
                onBlur={handleCpfBlur}
                placeholder="000.000.000-00"
                className={cn('input pr-8', errors.cpf && 'input-error')}
                maxLength={14}
              />
              {cpf && (
                <button
                  onClick={clearCliente}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Limpar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {errors.cpf && <p className="text-xs text-red-500 mt-1">{errors.cpf}</p>}
          </div>

          {/* Status do cliente */}
          <div className="flex items-end">
            <ClienteStatusBadge status={clienteStatus} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mt-4 md:grid-cols-2">
          {/* Nome */}
          <div>
            <label className="label">
              Nome do Cliente
              {clienteStatus === 'not-found' && (
                <span className="text-orange-500 ml-1">*</span>
              )}
            </label>
            <input
              type="text"
              value={clienteNome}
              onChange={(e) => setClienteNome(e.target.value)}
              placeholder="Nome completo"
              className={cn(
                'input',
                errors.clienteNome && 'input-error',
                (clienteStatus === 'found' || clienteStatus === 'saved') && 'bg-green-50',
              )}
              readOnly={clienteStatus === 'found'}
              disabled={clienteStatus === 'loading' || clienteStatus === 'saving'}
            />
            {errors.clienteNome && <p className="text-xs text-red-500 mt-1">{errors.clienteNome}</p>}
          </div>

          {/* Telefone */}
          <div>
            <label className="label">Telefone</label>
            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(maskTelefone(e.target.value))}
              onBlur={handleTelefoneBlur}
              placeholder="(00) 00000-0000"
              className={cn(
                'input',
                (clienteStatus === 'found' || clienteStatus === 'saved') && 'bg-green-50',
              )}
              readOnly={clienteStatus === 'found'}
              disabled={clienteStatus === 'loading' || clienteStatus === 'saving'}
              maxLength={15}
            />
          </div>
        </div>
      </div>

      {/* ── Seção 2: Itens do pedido ──────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Itens do Pedido
          </h2>
          <button onClick={addItem} className="btn-secondary text-xs py-1.5">
            <Plus className="w-3.5 h-3.5" /> Adicionar Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-2 w-44">Produto</th>
                <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-2 w-36">Plano</th>
                <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-2 w-16">Qtd</th>
                <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-2 w-28">Valor (R$)</th>
                <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-2 w-36">Vendedor</th>
                <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-2 w-24">Início</th>
                <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-2 w-24">Fim</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {itens.map((item, idx) => (
                <ItemRow
                  key={item._key}
                  item={item}
                  idx={idx}
                  produtos={produtos}
                  planos={planos.filter((p) => p.produto_id === item.produto_id)}
                  vendedores={vendedores}
                  errors={errors}
                  onProdutoChange={(id) => handleProdutoChange(item._key, id)}
                  onPlanoChange={(id) => handlePlanoChange(item._key, id)}
                  onChange={(patch) => updateItem(item._key, patch)}
                  onRemove={() => removeItem(item._key)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Total dos itens */}
        <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
          <div className="text-right">
            <p className="text-xs text-gray-500">Total dos itens</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(valorTotal)}</p>
          </div>
        </div>

        {errors.valorTotal && (
          <p className="text-sm text-red-500 text-right mt-1">{errors.valorTotal}</p>
        )}
      </div>

      {/* ── Seção 3: Pagamento ────────────────────────────────────────────── */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
          Pagamento
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Resumo */}
          <div className="bg-gray-50 rounded-xl p-5 flex flex-col justify-center">
            <p className="text-xs text-gray-500 mb-1">Total do pedido</p>
            <p className="text-4xl font-bold text-gray-900 mb-4">{formatCurrency(valorTotal)}</p>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total recebido</span>
                <span className="font-medium">{formatCurrency(totalPago)}</span>
              </div>
              {troco > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Troco</span>
                  <span className="font-medium text-orange-600">- {formatCurrency(troco)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                <span className="text-gray-600 font-medium">Saldo</span>
                <span className={cn('font-bold', pagamentoOk ? 'text-green-600' : 'text-red-600')}>
                  {formatCurrency(Math.abs(saldo))}
                  {saldo > 0.05 && ' a receber'}
                  {saldo < -0.05 && ' a mais'}
                </span>
              </div>
            </div>

            {pagamentoOk && valorTotal > 0 && (
              <div className="mt-4 flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-medium">Pagamento correto</span>
              </div>
            )}

            {errors.pagamento && (
              <div className="mt-3 flex items-center gap-2 text-red-700 bg-red-50 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs">{errors.pagamento}</span>
              </div>
            )}
          </div>

          {/* Campos de pagamento */}
          <div className="space-y-3">
            <MoneyField label="Dinheiro" value={dinheiro} onChange={setDinheiro} />
            <MoneyField label="Cartão de Débito" value={cartaoDebito} onChange={setCartaoDebito} />
            <MoneyField label="Cartão de Crédito" value={cartaoCredito} onChange={setCartaoCredito} />
            <MoneyField label="PIX" value={pix} onChange={setPix} />

            <div>
              <MoneyField
                label="Outros"
                value={outros}
                onChange={setOutros}
                highlight={outros > 0}
              />
            </div>

            {/* Obs (aparece quando Outros > 0) */}
            {outros > 0 && (
              <div>
                <label className="label">
                  Observação <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Descreva a forma de pagamento"
                  className={cn('input', errors.obs && 'input-error')}
                />
                {errors.obs && <p className="text-xs text-red-500 mt-1">{errors.obs}</p>}
              </div>
            )}

            {/* Troco */}
            <div>
              <label className="label">Troco</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={troco || ''}
                onChange={(e) => setTroco(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                className="input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Botão de salvar inferior */}
      <div className="flex justify-end gap-3 pb-6">
        <button onClick={() => router.push('/pedidos')} className="btn-secondary">
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="btn-primary px-8"
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
          ) : (
            <><Save className="w-4 h-4" /> Salvar Pedido</>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Sub-componente: Linha de item ─────────────────────────────────────────────

function ItemRow({
  item, idx, produtos, planos, vendedores, errors,
  onProdutoChange, onPlanoChange, onChange, onRemove,
}: {
  item: ItemForm
  idx: number
  produtos: PedidoFormProps['produtos']
  planos: PedidoFormProps['planos']
  vendedores: PedidoFormProps['vendedores']
  errors: Record<string, string>
  onProdutoChange: (id: string) => void
  onPlanoChange: (id: string) => void
  onChange: (patch: Partial<ItemForm>) => void
  onRemove: () => void
}) {
  const isServico = item.produto_tipo === 'servico'
  const isVenda = item.produto_tipo === 'venda'

  return (
    <tr className="group">
      {/* Produto */}
      <td className="py-2 pr-2">
        <select
          value={item.produto_id}
          onChange={(e) => onProdutoChange(e.target.value)}
          className={cn('input text-xs', errors[`item_${idx}_produto`] && 'input-error')}
        >
          <option value="">Selecione...</option>
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} ({p.tipo === 'servico' ? 'Serviço' : 'Venda'})
            </option>
          ))}
        </select>
      </td>

      {/* Plano (apenas serviço) */}
      <td className="py-2 pr-2">
        <select
          value={item.plano_id}
          onChange={(e) => onPlanoChange(e.target.value)}
          disabled={!isServico}
          className={cn(
            'input text-xs',
            !isServico && 'opacity-40',
            errors[`item_${idx}_plano`] && 'input-error',
          )}
        >
          <option value="">{isServico ? 'Selecione...' : '—'}</option>
          {planos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} ({formatCurrency(p.preco)} / {p.tempo}min)
            </option>
          ))}
        </select>
      </td>

      {/* Quantidade */}
      <td className="py-2 pr-2">
        <input
          type="number"
          min="1"
          value={item.quantidade}
          onChange={(e) => onChange({ quantidade: parseInt(e.target.value) || 1 })}
          disabled={isServico}
          className={cn(
            'input text-xs text-center w-16',
            isServico && 'opacity-40',
            errors[`item_${idx}_qtd`] && 'input-error',
          )}
        />
      </td>

      {/* Valor */}
      <td className="py-2 pr-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={item.valor || ''}
          onChange={(e) => onChange({ valor: parseFloat(e.target.value) || 0 })}
          placeholder="0,00"
          className={cn('input text-xs w-28', errors[`item_${idx}_valor`] && 'input-error')}
        />
      </td>

      {/* Vendedor */}
      <td className="py-2 pr-2">
        <select
          value={item.vendedor_id}
          onChange={(e) => onChange({ vendedor_id: e.target.value })}
          className="input text-xs"
        >
          <option value="">—</option>
          {vendedores.map((v) => (
            <option key={v.id} value={v.id}>{v.nome}</option>
          ))}
        </select>
      </td>

      {/* Hora início */}
      <td className="py-2 pr-2">
        <input
          type="time"
          value={item.hora_inicio}
          onChange={(e) => onChange({ hora_inicio: e.target.value })}
          disabled={!isServico}
          className={cn('input text-xs w-24', !isServico && 'opacity-40')}
        />
      </td>

      {/* Hora fim */}
      <td className="py-2 pr-2">
        <input
          type="time"
          value={item.hora_fim}
          onChange={(e) => onChange({ hora_fim: e.target.value })}
          disabled={!isServico}
          className={cn('input text-xs w-24', !isServico && 'opacity-40')}
        />
      </td>

      {/* Remover */}
      <td className="py-2">
        <button
          onClick={onRemove}
          className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Remover item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  )
}

// ── Sub-componente: Campo de moeda ────────────────────────────────────────────

function MoneyField({
  label, value, onChange, highlight = false,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  highlight?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-gray-600 w-36 flex-shrink-0">{label}</label>
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder="0,00"
          className={cn('input pl-8 text-right', highlight && 'border-orange-300 focus:border-orange-400')}
        />
      </div>
    </div>
  )
}

// ── Sub-componente: Badge de status do cliente ────────────────────────────────

function ClienteStatusBadge({ status }: { status: ClienteStatus }) {
  const configs: Record<ClienteStatus, { text: string; cls: string; icon: React.ElementType } | null> = {
    idle: null,
    loading: {
      text: 'Buscando...',
      cls: 'text-blue-600 bg-blue-50 border-blue-200',
      icon: Loader2,
    },
    found: {
      text: 'Cliente localizado',
      cls: 'text-green-700 bg-green-50 border-green-200',
      icon: CheckCircle,
    },
    'not-found': {
      text: 'Cliente não localizado',
      cls: 'text-orange-700 bg-orange-50 border-orange-200',
      icon: AlertCircle,
    },
    saving: {
      text: 'Cadastrando...',
      cls: 'text-blue-600 bg-blue-50 border-blue-200',
      icon: Loader2,
    },
    saved: {
      text: 'Cliente cadastrado com sucesso',
      cls: 'text-green-700 bg-green-50 border-green-200',
      icon: CheckCircle,
    },
  }

  const config = configs[status]
  if (!config) return <div />

  const Icon = config.icon

  return (
    <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium', config.cls)}>
      <Icon className={cn('w-3.5 h-3.5', (status === 'loading' || status === 'saving') && 'animate-spin')} />
      {config.text}
    </div>
  )
}
