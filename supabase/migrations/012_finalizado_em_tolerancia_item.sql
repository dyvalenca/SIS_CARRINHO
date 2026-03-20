-- =============================================================================
-- SISTEMA DE ALUGUEL DE CARRINHO - SHOPPING
-- Migration: 012_finalizado_em_tolerancia_item.sql
-- =============================================================================

-- Data/hora de finalização
ALTER TABLE pedidos
  ADD COLUMN finalizado_em TIMESTAMPTZ;

ALTER TABLE itens_pedido
  ADD COLUMN finalizado_em          TIMESTAMPTZ,
  ADD COLUMN tolerancia             INTEGER       CHECK (tolerancia >= 0),
  ADD COLUMN valor_minuto_excedente NUMERIC(10,2) CHECK (valor_minuto_excedente >= 0),
  ADD COLUMN cobra_tolerancia       BOOLEAN;

COMMENT ON COLUMN pedidos.finalizado_em               IS 'Momento em que o pedido foi finalizado';
COMMENT ON COLUMN itens_pedido.finalizado_em          IS 'Momento em que o item foi finalizado';
COMMENT ON COLUMN itens_pedido.tolerancia             IS 'Snapshot: minutos de tolerância do plano no momento da venda';
COMMENT ON COLUMN itens_pedido.valor_minuto_excedente IS 'Snapshot: valor/min excedente do plano no momento da venda';
COMMENT ON COLUMN itens_pedido.cobra_tolerancia       IS 'Snapshot: se cobrava tolerância no excedente no momento da venda';

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- ALTER TABLE pedidos      DROP COLUMN IF EXISTS finalizado_em;
-- ALTER TABLE itens_pedido DROP COLUMN IF EXISTS finalizado_em,
--                          DROP COLUMN IF EXISTS tolerancia,
--                          DROP COLUMN IF EXISTS valor_minuto_excedente,
--                          DROP COLUMN IF EXISTS cobra_tolerancia;
