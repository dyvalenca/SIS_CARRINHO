export type TipoProduto = 'venda' | 'aluguel'

export interface Empresa {
  id: string
  nome: string
  fantasia: string | null
  ativo: boolean
}

export interface Profile {
  id: string
  login: string
  is_admin: boolean
  ativo: boolean
  vendedor_id: string | null
}

export interface Produto {
  id: string
  empresa_id: string
  nome: string
  tipo: TipoProduto
  estoque: number | null
  ativo: boolean
}

export interface Plano {
  id: string
  empresa_id: string
  nome: string
  preco: number
  tempo: number
  ativo: boolean
}

export interface Cliente {
  id: string
  cpf: string
  nome: string
  telefone: string | null
  ativo: boolean
}

export interface Vendedor {
  id: string
  empresa_id: string
  nome: string
  cpf: string | null
  telefone: string | null
  ativo: boolean
}

export interface Pedido {
  id: string
  empresa_id: string
  data: string
  cpf: string
  cliente_nome: string
  telefone: string | null
  valor_total: number
  dinheiro: number
  cartao_debito: number
  cartao_credito: number
  pix: number
  outros: number
  obs: string | null
  troco: number
  criado_em: string
  criado_por: string | null
}

export interface ItemPedido {
  id: string
  pedido_id: string
  produto_id: string
  plano_id: string | null
  vendedor_id: string | null
  quantidade: number | null
  valor: number
  hora_inicio: string | null
  hora_fim: string | null
}

export interface SessionData {
  profileId: string
  login: string
  isAdmin: boolean
  vendedorId: string | null
  empresaAtualId: string
  empresas: Array<{ id: string; fantasia: string; nome: string }>
}
