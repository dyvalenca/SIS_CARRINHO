-- =============================================================================
-- SISTEMA DE ALUGUEL DE CARRINHO - SHOPPING
-- Migration: 013_rpc_empresas_by_login.sql
-- Objetivo: RPC para buscar empresas acessíveis apenas pelo login,
--           sem necessidade de senha — usada na tela de login para
--           popular o select de empresa.
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_get_empresas_by_login(p_login TEXT)
RETURNS TABLE (
  id       UUID,
  nome     VARCHAR,
  fantasia VARCHAR
)
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_profile_id UUID;
  v_is_admin   BOOLEAN;
BEGIN
  SELECT p.id, p.is_admin
    INTO v_profile_id, v_is_admin
  FROM profiles p
  WHERE LOWER(p.login) = LOWER(TRIM(p_login))
    AND p.ativo = TRUE;

  IF v_profile_id IS NULL THEN
    RETURN; -- login não encontrado ou inativo
  END IF;

  RETURN QUERY
    SELECT e.id, e.nome, e.fantasia
    FROM empresas e
    WHERE e.ativo = TRUE
      AND (
        v_is_admin = TRUE
        OR EXISTS (
          SELECT 1 FROM usuario_empresa ue
          WHERE ue.empresa_id = e.id
            AND ue.usuario_id = v_profile_id
            AND ue.ativo      = TRUE
        )
      )
    ORDER BY e.nome;
END;
$$;

COMMENT ON FUNCTION fn_get_empresas_by_login(TEXT) IS
  'Retorna empresas acessíveis para um login (sem validar senha). Usado na tela de login.';

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP FUNCTION IF EXISTS fn_get_empresas_by_login(TEXT);
