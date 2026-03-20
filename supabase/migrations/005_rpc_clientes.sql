-- =============================================================================
-- SISTEMA DE ALUGUEL DE CARRINHO - SHOPPING
-- Migration: 005_rpc_clientes.sql
-- Objetivo: Funções RPC com SECURITY DEFINER para operações em clientes
--           necessário pois o cliente usa anon key (sem Supabase Auth session)
-- =============================================================================

-- Busca cliente pelo CPF (bypassa RLS)
CREATE OR REPLACE FUNCTION fn_get_cliente_cpf(p_cpf TEXT)
RETURNS TABLE (
  id       UUID,
  cpf      VARCHAR,
  nome     VARCHAR,
  telefone VARCHAR,
  ativo    BOOLEAN
)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id, cpf, nome, telefone, ativo
  FROM clientes
  WHERE cpf = p_cpf
  LIMIT 1;
$$;

-- Upsert de cliente pelo CPF (bypassa RLS)
-- Retorna o cliente existente ou o recém-criado
CREATE OR REPLACE FUNCTION fn_upsert_cliente(
  p_cpf       TEXT,
  p_nome      TEXT,
  p_telefone  TEXT,
  p_criado_por UUID
)
RETURNS TABLE (
  id       UUID,
  cpf      VARCHAR,
  nome     VARCHAR,
  telefone VARCHAR
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Tenta encontrar existente
  SELECT c.id INTO v_id FROM clientes c WHERE c.cpf = p_cpf LIMIT 1;

  IF v_id IS NOT NULL THEN
    -- Retorna existente
    RETURN QUERY
      SELECT c.id, c.cpf, c.nome, c.telefone FROM clientes c WHERE c.id = v_id;
    RETURN;
  END IF;

  -- Insere novo
  INSERT INTO clientes (cpf, nome, telefone, criado_por)
  VALUES (p_cpf, p_nome, p_telefone, p_criado_por)
  RETURNING clientes.id INTO v_id;

  RETURN QUERY
    SELECT c.id, c.cpf, c.nome, c.telefone FROM clientes c WHERE c.id = v_id;
END;
$$;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP FUNCTION IF EXISTS fn_get_cliente_cpf(TEXT);
-- DROP FUNCTION IF EXISTS fn_upsert_cliente(TEXT, TEXT, TEXT, UUID);
