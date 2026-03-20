-- =============================================================================
-- SISTEMA DE ALUGUEL DE CARRINHO - SHOPPING
-- Migration: 003_add_login_to_profiles.sql
-- Objetivo: Adicionar campo login (nome de usuário) em profiles e atualizar
--           fn_login para autenticar por login + senha (sem depender de email)
-- =============================================================================

-- =============================================================================
-- 1. ADICIONAR CAMPO LOGIN
-- =============================================================================
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS login VARCHAR(50) UNIQUE;

COMMENT ON COLUMN profiles.login IS
    'Nome de usuário para acesso ao sistema — único, case-insensitive';

-- Índice para busca rápida no login
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_login_lower
    ON profiles (LOWER(login));

-- =============================================================================
-- 2. ATUALIZAR fn_login PARA USAR LOGIN + SENHA
--    Remove dependência de auth.users.email — usa profiles.login diretamente
--    DROP necessário: PostgreSQL não permite renomear parâmetros com OR REPLACE
-- =============================================================================
DROP FUNCTION IF EXISTS fn_login(TEXT, TEXT);

CREATE FUNCTION fn_login(p_login TEXT, p_senha_plain TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    SELECT id INTO v_profile_id
    FROM profiles
    WHERE LOWER(login) = LOWER(TRIM(p_login))
      AND ativo        = TRUE
      AND senha        = crypt(p_senha_plain, senha);

    RETURN v_profile_id; -- NULL se login ou senha inválidos
END;
$$;

COMMENT ON FUNCTION fn_login(TEXT, TEXT) IS
    'Autentica usuário por login + senha. Retorna UUID do profile ou NULL se inválido.';

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP INDEX IF EXISTS idx_profiles_login_lower;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS login;
-- DROP FUNCTION IF EXISTS fn_login(TEXT, TEXT);
-- (recriar fn_login original via migration 002 se necessário)
