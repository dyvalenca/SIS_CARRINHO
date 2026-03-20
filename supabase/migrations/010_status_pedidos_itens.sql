-- =============================================================================
-- SISTEMA DE ALUGUEL DE CARRINHO - SHOPPING
-- Migration: 010_status_pedidos_itens.sql
-- Objetivo: Adicionar campo status em pedidos e itens_pedido
-- =============================================================================

ALTER TABLE pedidos
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'EM ABERTO'
  CONSTRAINT pedidos_status_check CHECK (status IN ('EM ABERTO', 'CANCELADO', 'FINALIZADO'));

ALTER TABLE itens_pedido
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'EM ABERTO'
  CONSTRAINT itens_pedido_status_check CHECK (status IN ('EM ABERTO', 'CANCELADO', 'FINALIZADO'));

-- Registros existentes: marcar como FINALIZADO (criados antes desta feature)
UPDATE pedidos      SET status = 'EM ABERTO';
UPDATE itens_pedido SET status = 'EM ABERTO';

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- ALTER TABLE pedidos      DROP COLUMN IF EXISTS status;
-- ALTER TABLE itens_pedido DROP COLUMN IF EXISTS status;
