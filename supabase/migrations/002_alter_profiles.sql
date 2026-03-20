-- =============================================================================
-- SISTEMA DE ALUGUEL DE CARRINHO - SHOPPING
-- Migration: 002_alter_profiles.sql
-- Objetivo: Reestruturar profiles — remover dados pessoais, vincular a
--           vendedor e adicionar senha criptografada para login no sistema.
-- =============================================================================

-- pgcrypto já foi habilitado na 001, garantimos aqui por segurança
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. REMOVER COLUNAS DE DADOS PESSOAIS
-- =============================================================================
ALTER TABLE profiles DROP COLUMN IF EXISTS nome;
ALTER TABLE profiles DROP COLUMN IF EXISTS cpf;
ALTER TABLE profiles DROP COLUMN IF EXISTS telefone;

-- =============================================================================
-- 2. ADICIONAR VÍNCULO COM VENDEDOR
--    O FK é nullable: admin do sistema pode não ter vendedor associado
-- =============================================================================
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS vendedor_id UUID REFERENCES vendedores(id) ON DELETE SET NULL;

COMMENT ON COLUMN profiles.vendedor_id IS
    'Associa o login ao cadastro do vendedor — admin pode ficar NULL';

-- =============================================================================
-- 3. ADICIONAR CAMPO DE SENHA CRIPTOGRAFADA (bcrypt via pgcrypto)
-- =============================================================================
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS senha TEXT;

COMMENT ON COLUMN profiles.senha IS
    'Hash bcrypt da senha de acesso ao sistema — use fn_set_senha() para gravar e fn_verificar_senha() para autenticar';

-- =============================================================================
-- 4. ATUALIZAR TRIGGER DE CRIAÇÃO AUTOMÁTICA DE PROFILE
--    O trigger da migration 001 tentava inserir "nome", que não existe mais
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO profiles (id, criado_em)
    VALUES (NEW.id, NOW())
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- =============================================================================
-- 5. FUNÇÕES PARA GERENCIAR SENHA
-- =============================================================================

-- Grava a senha do usuário como hash bcrypt (custo 10)
-- Uso: SELECT fn_set_senha('<uuid-do-profile>', 'senha-em-texto-puro');
CREATE OR REPLACE FUNCTION fn_set_senha(p_profile_id UUID, p_senha_plain TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF LENGTH(TRIM(p_senha_plain)) < 6 THEN
        RAISE EXCEPTION 'Senha deve ter no mínimo 6 caracteres';
    END IF;

    UPDATE profiles
       SET senha       = crypt(p_senha_plain, gen_salt('bf', 10)),
           alterado_em = NOW()
     WHERE id = p_profile_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile não encontrado: %', p_profile_id;
    END IF;
END;
$$;

-- Verifica se a senha informada confere com o hash armazenado
-- Retorna TRUE/FALSE — use no processo de login
-- Uso: SELECT fn_verificar_senha('<uuid-do-profile>', 'senha-em-texto-puro');
CREATE OR REPLACE FUNCTION fn_verificar_senha(p_profile_id UUID, p_senha_plain TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT EXISTS (
        SELECT 1
        FROM profiles
        WHERE id    = p_profile_id
          AND ativo = TRUE
          AND senha = crypt(p_senha_plain, senha)
    );
$$;

-- Busca o profile pelo e-mail do auth.users e valida a senha
-- Retorna o UUID do profile em caso de sucesso, NULL se inválido
-- Uso: SELECT fn_login('email@exemplo.com', 'minha-senha');
CREATE OR REPLACE FUNCTION fn_login(p_email TEXT, p_senha_plain TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    SELECT p.id INTO v_profile_id
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE u.email   = LOWER(TRIM(p_email))
      AND p.ativo   = TRUE
      AND p.senha   = crypt(p_senha_plain, p.senha);

    RETURN v_profile_id; -- NULL se não encontrar
END;
$$;

-- =============================================================================
-- 6. ATUALIZAR COMENTÁRIO DA TABELA
-- =============================================================================
COMMENT ON TABLE profiles IS
    'Perfis de acesso ao sistema — vinculados a auth.users; dados pessoais ficam em vendedores';

-- =============================================================================
-- ROLLBACK (executar em caso de reversão)
-- =============================================================================
-- ALTER TABLE profiles ADD COLUMN nome     VARCHAR(200);
-- ALTER TABLE profiles ADD COLUMN cpf      VARCHAR(14) UNIQUE;
-- ALTER TABLE profiles ADD COLUMN telefone VARCHAR(20);
-- ALTER TABLE profiles DROP COLUMN IF EXISTS vendedor_id;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS senha;
-- DROP FUNCTION IF EXISTS fn_set_senha(UUID, TEXT);
-- DROP FUNCTION IF EXISTS fn_verificar_senha(UUID, TEXT);
-- DROP FUNCTION IF EXISTS fn_login(TEXT, TEXT);
