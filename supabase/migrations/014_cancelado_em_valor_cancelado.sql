-- =============================================================================
-- SISTEMA DE ALUGUEL DE CARRINHO - SHOPPING
-- Migration: 014_cancelado_em_valor_cancelado.sql
-- =============================================================================

ALTER TABLE pedidos
  ADD COLUMN cancelado_em    TIMESTAMPTZ,
  ADD COLUMN valor_cancelado NUMERIC(12,2) NOT NULL DEFAULT 0
    CHECK (valor_cancelado >= 0);

ALTER TABLE itens_pedido
  ADD COLUMN cancelado_em TIMESTAMPTZ;

COMMENT ON COLUMN pedidos.cancelado_em      IS 'Momento em que o pedido foi cancelado';
COMMENT ON COLUMN pedidos.valor_cancelado   IS 'Soma dos valores dos itens cancelados neste pedido';
COMMENT ON COLUMN itens_pedido.cancelado_em IS 'Momento em que o item foi cancelado';

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- ALTER TABLE pedidos      DROP COLUMN IF EXISTS cancelado_em,
--                          DROP COLUMN IF EXISTS valor_cancelado;
-- ALTER TABLE itens_pedido DROP COLUMN IF EXISTS cancelado_em;
