-- =============================================================================
-- SISTEMA DE ALUGUEL DE CARRINHO - SHOPPING
-- Migration: 004_rpc_security_definer.sql
-- Objetivo: Funções RPC com SECURITY DEFINER para bypasaar RLS nas
--           operações de login — necessário pois o cliente usa anon key
-- =============================================================================

-- Retorna dados do profile pelo ID (bypassa RLS)
CREATE OR REPLACE FUNCTION fn_get_profile(p_profile_id UUID)
RETURNS TABLE (
  id          UUID,
  login       TEXT,
  is_admin    BOOLEAN,
  ativo       BOOLEAN,
  vendedor_id UUID
)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id, login, is_admin, ativo, vendedor_id
  FROM profiles
  WHERE id = p_profile_id;
$$;

-- Retorna empresas acessíveis pelo usuário (bypassa RLS)
-- Admin vê todas; usuário comum vê apenas as vinculadas em usuario_empresa
CREATE OR REPLACE FUNCTION fn_get_empresas_usuario(p_profile_id UUID, p_is_admin BOOLEAN)
RETURNS TABLE (
  id       UUID,
  nome     VARCHAR,
  fantasia VARCHAR,
  ativo    BOOLEAN
)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT e.id, e.nome, e.fantasia, e.ativo
  FROM empresas e
  WHERE e.ativo = true
    AND (
      p_is_admin = true
      OR EXISTS (
        SELECT 1 FROM usuario_empresa ue
        WHERE ue.empresa_id = e.id
          AND ue.usuario_id = p_profile_id
          AND ue.ativo      = true
      )
    )
  ORDER BY e.nome;
$$;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP FUNCTION IF EXISTS fn_get_profile(UUID);
-- DROP FUNCTION IF EXISTS fn_get_empresas_usuario(UUID, BOOLEAN);
