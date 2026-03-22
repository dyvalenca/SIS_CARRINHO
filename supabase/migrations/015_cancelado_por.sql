-- =============================================================================
-- SISTEMA DE ALUGUEL DE CARRINHO - SHOPPING
-- Migration: 015_cancelado_por.sql
-- Registra o usuário responsável pelo cancelamento
-- =============================================================================

ALTER TABLE pedidos
  ADD COLUMN cancelado_por UUID REFERENCES profiles(id);

ALTER TABLE itens_pedido
  ADD COLUMN cancelado_por UUID REFERENCES profiles(id);

COMMENT ON COLUMN pedidos.cancelado_por      IS 'Perfil que cancelou o pedido';
COMMENT ON COLUMN itens_pedido.cancelado_por IS 'Perfil que cancelou o item';

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- ALTER TABLE pedidos      DROP COLUMN IF EXISTS cancelado_por;
-- ALTER TABLE itens_pedido DROP COLUMN IF EXISTS cancelado_por;
