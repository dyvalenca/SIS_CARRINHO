-- =============================================================================
-- SISTEMA DE ALUGUEL DE CARRINHO - SHOPPING
-- Migration: 009_planos_remove_produto_id.sql
-- Objetivo: Remover o vínculo produto_id da tabela planos.
--           Plano é um cadastro independente; a obrigatoriedade de informar
--           um plano ao selecionar um produto do tipo 'aluguel' é apenas
--           regra de negócio da tela de pedido.
-- =============================================================================

-- Remove trigger e função de validação de produto no plano
DROP TRIGGER IF EXISTS trg_planos_check_produto ON planos;
DROP FUNCTION IF EXISTS fn_check_plano_produto_servico();

-- Remove a coluna produto_id da tabela planos
ALTER TABLE planos DROP COLUMN IF EXISTS produto_id;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- ALTER TABLE planos ADD COLUMN produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE;
