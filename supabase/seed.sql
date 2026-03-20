-- =============================================================================
-- SISTEMA DE ALUGUEL DE CARRINHO - SHOPPING
-- Seed: dados iniciais de desenvolvimento/produção
-- Executar APÓS todas as migrations
-- =============================================================================

DO $$
DECLARE
    v_admin_id   UUID := 'a0000000-0000-0000-0000-000000000001'; -- UUID fixo p/ reprodutibilidade
    v_empresa1   UUID := 'b0000000-0000-0000-0000-000000000001';
    v_empresa2   UUID := 'b0000000-0000-0000-0000-000000000002';
    v_empresa3   UUID := 'b0000000-0000-0000-0000-000000000003';
BEGIN

    -- =========================================================================
    -- USUÁRIO ADMIN: dyego
    -- =========================================================================

    -- 1. Entrada mínima em auth.users (necessária pela FK de profiles)
    INSERT INTO auth.users (
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data
    )
    VALUES (
        v_admin_id,
        'authenticated',
        'authenticated',
        'dyego@sistema.local',          -- e-mail interno, não usado no login
        crypt('123456', gen_salt('bf', 10)),
        NOW(),
        NOW(),
        NOW(),
        '{"nome": "Dyego"}'::jsonb
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2. O trigger fn_handle_new_auth_user cria o profile automaticamente.
    --    Aguarda o INSERT acima e então atualiza os campos necessários.
    UPDATE profiles
       SET is_admin   = TRUE,
           login      = 'dyego',
           criado_por = v_admin_id
     WHERE id = v_admin_id;

    -- 3. Define a senha de sistema (hash bcrypt separado do auth.users)
    PERFORM fn_set_senha(v_admin_id, '123456');

    -- =========================================================================
    -- EMPRESAS
    -- =========================================================================
    INSERT INTO empresas (id, nome, fantasia, criado_por)
    VALUES
        (v_empresa1, 'QUISQUE 1', 'QUISQUE 1', v_admin_id),
        (v_empresa2, 'QUISQUE 2', 'QUISQUE 2', v_admin_id),
        (v_empresa3, 'QUISQUE 3', 'QUISQUE 3', v_admin_id)
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE '✔ Seed concluído.';
    RAISE NOTICE '  Admin criado  : login=dyego | senha=123456 | is_admin=TRUE';
    RAISE NOTICE '  Empresas      : QUISQUE 1, QUISQUE 2, QUISQUE 3';

END;
$$;
