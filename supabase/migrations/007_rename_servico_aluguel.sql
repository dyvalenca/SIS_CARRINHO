-- =============================================================================
-- SISTEMA DE ALUGUEL DE CARRINHO - SHOPPING
-- Migration: 007_rename_servico_aluguel.sql
-- Objetivo: Renomear o valor do ENUM 'servico' para 'aluguel' e atualizar
--           as funções e constraints que referenciam esse valor.
-- =============================================================================

-- 1. Renomeia o valor no ENUM
ALTER TYPE tipo_produto RENAME VALUE 'servico' TO 'aluguel';

-- 2. Atualiza a constraint da tabela produtos
ALTER TABLE produtos DROP CONSTRAINT IF EXISTS produtos_tipo_estoque_check;
ALTER TABLE produtos ADD CONSTRAINT produtos_tipo_estoque_check CHECK (
    (tipo = 'venda'   AND estoque IS NOT NULL) OR
    (tipo = 'aluguel' AND estoque IS NULL)
);

-- 3. Recria a função que valida plano → produto do tipo aluguel
CREATE OR REPLACE FUNCTION fn_check_plano_produto_servico()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM produtos WHERE id = NEW.produto_id AND tipo = 'aluguel'
    ) THEN
        RAISE EXCEPTION 'Plano só pode ser vinculado a produto do tipo ALUGUEL (produto_id: %)', NEW.produto_id;
    END IF;
    RETURN NEW;
END;
$$;

-- 4. Recria a função que valida itens de pedido
CREATE OR REPLACE FUNCTION fn_check_item_pedido_tipo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_tipo tipo_produto;
BEGIN
    SELECT tipo INTO v_tipo FROM produtos WHERE id = NEW.produto_id;

    IF v_tipo = 'venda' THEN
        IF NEW.plano_id IS NOT NULL THEN
            RAISE EXCEPTION 'Item de produto VENDA não deve ter plano_id (produto_id: %)', NEW.produto_id;
        END IF;
        IF NEW.quantidade IS NULL OR NEW.quantidade < 1 THEN
            RAISE EXCEPTION 'Item de produto VENDA exige quantidade >= 1 (produto_id: %)', NEW.produto_id;
        END IF;
    END IF;

    IF v_tipo = 'aluguel' THEN
        IF NEW.plano_id IS NULL THEN
            RAISE EXCEPTION 'Item de produto ALUGUEL exige plano_id (produto_id: %)', NEW.produto_id;
        END IF;
        IF NEW.quantidade IS NOT NULL THEN
            RAISE EXCEPTION 'Item de produto ALUGUEL não deve ter quantidade (produto_id: %)', NEW.produto_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- ALTER TYPE tipo_produto RENAME VALUE 'aluguel' TO 'servico';
-- (recriar constraints e funções com 'servico' se necessário)
