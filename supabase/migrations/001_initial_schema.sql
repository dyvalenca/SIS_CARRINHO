-- =============================================================================
-- SISTEMA DE ALUGUEL DE CARRINHO - SHOPPING
-- Migration: 001_initial_schema.sql
-- Banco: Supabase (PostgreSQL)
-- =============================================================================

-- =============================================================================
-- EXTENSÕES
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =============================================================================
-- TIPOS ENUMERADOS
-- =============================================================================
CREATE TYPE tipo_produto AS ENUM ('venda', 'servico');

-- =============================================================================
-- TABELA: empresas
-- =============================================================================
CREATE TABLE empresas (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome        VARCHAR(200) NOT NULL,
    fantasia    VARCHAR(200),
    ativo       BOOLEAN      NOT NULL DEFAULT TRUE,

    -- Auditoria
    criado_por  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    criado_em   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    alterado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    alterado_em TIMESTAMPTZ
);

COMMENT ON TABLE  empresas            IS 'Empresas cadastradas no sistema (multi-tenant)';
COMMENT ON COLUMN empresas.nome       IS 'Razão social da empresa';
COMMENT ON COLUMN empresas.fantasia   IS 'Nome fantasia da empresa';

-- =============================================================================
-- TABELA: profiles (espelho de auth.users com dados extras)
-- =============================================================================
CREATE TABLE profiles (
    id           UUID     PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    vendedor_id  UUID,    -- FK adicionada após criar vendedores (ver migration 002)
    is_admin     BOOLEAN  NOT NULL DEFAULT FALSE,
    ativo        BOOLEAN  NOT NULL DEFAULT TRUE,
    senha        TEXT,    -- hash bcrypt via pgcrypto — ver fn_set_senha()

    -- Auditoria
    criado_por   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    alterado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    alterado_em  TIMESTAMPTZ
);

COMMENT ON TABLE  profiles             IS 'Perfis de acesso ao sistema — dados pessoais ficam em vendedores';
COMMENT ON COLUMN profiles.vendedor_id IS 'Associa o login ao cadastro do vendedor — admin pode ficar NULL';
COMMENT ON COLUMN profiles.is_admin    IS 'Admin pode acessar qualquer empresa sem vínculo explícito';
COMMENT ON COLUMN profiles.senha       IS 'Hash bcrypt — use fn_set_senha() para gravar e fn_verificar_senha() para autenticar';

-- =============================================================================
-- TABELA: usuario_empresa (controle de acesso usuário ↔ empresa)
-- =============================================================================
CREATE TABLE usuario_empresa (
    id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id  UUID    NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
    empresa_id  UUID    NOT NULL REFERENCES empresas(id)  ON DELETE CASCADE,
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,

    UNIQUE (usuario_id, empresa_id),

    -- Auditoria
    criado_por   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    alterado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    alterado_em  TIMESTAMPTZ
);

COMMENT ON TABLE usuario_empresa IS 'Vínculo entre usuário comum e empresa(s) que ele pode acessar';

-- =============================================================================
-- TABELA: produtos
-- =============================================================================
CREATE TABLE produtos (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id  UUID         NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nome        VARCHAR(200) NOT NULL,
    tipo        tipo_produto  NOT NULL,
    estoque     INTEGER      CHECK (estoque >= 0),
    ativo       BOOLEAN      NOT NULL DEFAULT TRUE,

    -- Estoque somente para produto do tipo 'venda'
    CONSTRAINT chk_estoque_apenas_venda CHECK (
        (tipo = 'venda'   AND estoque IS NOT NULL) OR
        (tipo = 'servico' AND estoque IS NULL)
    ),

    -- Auditoria
    criado_por   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    alterado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    alterado_em  TIMESTAMPTZ
);

COMMENT ON TABLE  produtos         IS 'Produtos e serviços cadastrados por empresa';
COMMENT ON COLUMN produtos.estoque IS 'Quantidade em estoque — preenchido apenas quando tipo = venda';

-- =============================================================================
-- TABELA: planos (somente para produtos do tipo 'servico')
-- =============================================================================
CREATE TABLE planos (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id  UUID         NOT NULL REFERENCES empresas(id)  ON DELETE CASCADE,
    produto_id  UUID         NOT NULL REFERENCES produtos(id)  ON DELETE CASCADE,
    nome        VARCHAR(200) NOT NULL,
    preco       NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
    tempo       INTEGER       NOT NULL CHECK (tempo > 0),  -- duração em minutos
    ativo       BOOLEAN       NOT NULL DEFAULT TRUE,

    -- Auditoria
    criado_por   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    alterado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    alterado_em  TIMESTAMPTZ
);

COMMENT ON TABLE  planos       IS 'Planos de tempo/preço para produtos do tipo serviço (ex: aluguel)';
COMMENT ON COLUMN planos.tempo IS 'Duração do plano em minutos';

-- Garante que o produto referenciado seja do tipo 'servico'
CREATE OR REPLACE FUNCTION fn_check_plano_produto_servico()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM produtos WHERE id = NEW.produto_id AND tipo = 'servico'
    ) THEN
        RAISE EXCEPTION 'Plano só pode ser vinculado a produto do tipo SERVIÇO (produto_id: %)', NEW.produto_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_planos_check_produto
    BEFORE INSERT OR UPDATE ON planos
    FOR EACH ROW EXECUTE FUNCTION fn_check_plano_produto_servico();

-- =============================================================================
-- TABELA: clientes
-- =============================================================================
CREATE TABLE clientes (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    cpf         VARCHAR(14)  NOT NULL UNIQUE,
    nome        VARCHAR(200) NOT NULL,
    telefone    VARCHAR(20),
    ativo       BOOLEAN      NOT NULL DEFAULT TRUE,

    -- Auditoria
    criado_por   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    alterado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    alterado_em  TIMESTAMPTZ
);

COMMENT ON TABLE  clientes     IS 'Clientes globais — compartilhados entre todas as empresas; CPF único no sistema';
COMMENT ON COLUMN clientes.cpf IS 'CPF único globalmente — chave de busca do cliente em qualquer empresa';

-- =============================================================================
-- TABELA: vendedores
-- =============================================================================
CREATE TABLE vendedores (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id  UUID         NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nome        VARCHAR(200) NOT NULL,
    cpf         VARCHAR(14),
    telefone    VARCHAR(20),
    ativo       BOOLEAN      NOT NULL DEFAULT TRUE,

    -- CPF único por empresa (quando informado)
    UNIQUE (empresa_id, cpf),

    -- Auditoria
    criado_por   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    alterado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    alterado_em  TIMESTAMPTZ
);

COMMENT ON TABLE vendedores IS 'Vendedores/atendentes por empresa';

-- =============================================================================
-- TABELA: pedidos
-- =============================================================================
CREATE TABLE pedidos (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id      UUID         NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,

    -- Dados do cliente no momento do pedido (desnormalizado intencionalmente)
    data            DATE         NOT NULL DEFAULT CURRENT_DATE,
    cpf             VARCHAR(14)  NOT NULL,
    cliente_nome    VARCHAR(200) NOT NULL,
    telefone        VARCHAR(20),

    -- Totais e pagamentos
    valor_total     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (valor_total >= 0),
    dinheiro        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (dinheiro        >= 0),
    cartao_debito   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (cartao_debito   >= 0),
    cartao_credito  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (cartao_credito  >= 0),
    pix             NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (pix             >= 0),
    outros          NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (outros          >= 0),
    obs             TEXT,
    troco           NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (troco           >= 0),

    -- Quando "outros" for usado, obs é obrigatório
    CONSTRAINT chk_outros_exige_obs CHECK (
        outros = 0 OR (outros > 0 AND obs IS NOT NULL AND TRIM(obs) <> '')
    ),

    -- Auditoria
    criado_por   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    alterado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    alterado_em  TIMESTAMPTZ
);

COMMENT ON TABLE  pedidos              IS 'Pedidos de venda/aluguel por empresa';
COMMENT ON COLUMN pedidos.cpf          IS 'CPF do cliente no momento do pedido';
COMMENT ON COLUMN pedidos.outros       IS 'Valor pago em outra forma de pagamento';
COMMENT ON COLUMN pedidos.obs          IS 'Obrigatório quando campo outros > 0';
COMMENT ON COLUMN pedidos.troco        IS 'Troco devolvido ao cliente';

-- =============================================================================
-- TABELA: itens_pedido
-- =============================================================================
CREATE TABLE itens_pedido (
    id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id   UUID          NOT NULL REFERENCES pedidos(id)    ON DELETE CASCADE,
    produto_id  UUID          NOT NULL REFERENCES produtos(id)   ON DELETE RESTRICT,
    plano_id    UUID          REFERENCES planos(id)              ON DELETE RESTRICT,
    vendedor_id UUID          REFERENCES vendedores(id)          ON DELETE SET NULL,
    quantidade  INTEGER       CHECK (quantidade > 0),           -- somente tipo 'venda'
    valor       NUMERIC(10,2) NOT NULL CHECK (valor >= 0),
    hora_inicio TIME,                                           -- somente tipo 'serviço'
    hora_fim    TIME,                                           -- somente tipo 'serviço'

    -- hora_fim deve ser após hora_inicio quando ambos informados
    CONSTRAINT chk_hora_fim_apos_inicio CHECK (
        hora_inicio IS NULL OR hora_fim IS NULL OR hora_fim > hora_inicio
    ),

    -- Auditoria
    criado_por   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    alterado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    alterado_em  TIMESTAMPTZ
);

COMMENT ON TABLE  itens_pedido             IS 'Itens de cada pedido (produtos de venda ou serviços)';
COMMENT ON COLUMN itens_pedido.plano_id    IS 'Preenchido quando produto é do tipo serviço';
COMMENT ON COLUMN itens_pedido.quantidade  IS 'Preenchido quando produto é do tipo venda';
COMMENT ON COLUMN itens_pedido.hora_inicio IS 'Horário de início do serviço/aluguel';
COMMENT ON COLUMN itens_pedido.hora_fim    IS 'Horário de término do serviço/aluguel';

-- Valida consistência do item conforme tipo do produto
CREATE OR REPLACE FUNCTION fn_check_item_pedido_tipo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_tipo tipo_produto;
BEGIN
    SELECT tipo INTO v_tipo FROM produtos WHERE id = NEW.produto_id;

    IF v_tipo = 'venda' THEN
        IF NEW.quantidade IS NULL THEN
            RAISE EXCEPTION 'Item de produto VENDA exige quantidade (produto_id: %)', NEW.produto_id;
        END IF;
        IF NEW.plano_id IS NOT NULL THEN
            RAISE EXCEPTION 'Item de produto VENDA não deve ter plano_id (produto_id: %)', NEW.produto_id;
        END IF;
    END IF;

    IF v_tipo = 'servico' THEN
        IF NEW.plano_id IS NULL THEN
            RAISE EXCEPTION 'Item de produto SERVIÇO exige plano_id (produto_id: %)', NEW.produto_id;
        END IF;
        IF NEW.quantidade IS NOT NULL THEN
            RAISE EXCEPTION 'Item de produto SERVIÇO não deve ter quantidade (produto_id: %)', NEW.produto_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_itens_pedido_check_tipo
    BEFORE INSERT OR UPDATE ON itens_pedido
    FOR EACH ROW EXECUTE FUNCTION fn_check_item_pedido_tipo();

-- =============================================================================
-- ÍNDICES
-- =============================================================================

-- empresas
CREATE INDEX idx_empresas_ativo            ON empresas (ativo);

-- usuario_empresa
CREATE INDEX idx_ue_usuario                ON usuario_empresa (usuario_id);
CREATE INDEX idx_ue_empresa                ON usuario_empresa (empresa_id);
CREATE INDEX idx_ue_usuario_empresa_ativo  ON usuario_empresa (usuario_id, empresa_id, ativo);

-- produtos
CREATE INDEX idx_produtos_empresa          ON produtos (empresa_id);
CREATE INDEX idx_produtos_empresa_tipo     ON produtos (empresa_id, tipo);
CREATE INDEX idx_produtos_ativo            ON produtos (ativo);

-- planos
CREATE INDEX idx_planos_empresa            ON planos (empresa_id);
CREATE INDEX idx_planos_produto            ON planos (produto_id);

-- clientes
CREATE INDEX idx_clientes_cpf              ON clientes (cpf);
CREATE INDEX idx_clientes_ativo            ON clientes (ativo);

-- vendedores
CREATE INDEX idx_vendedores_empresa        ON vendedores (empresa_id);

-- pedidos
CREATE INDEX idx_pedidos_empresa           ON pedidos (empresa_id);
CREATE INDEX idx_pedidos_data              ON pedidos (data);
CREATE INDEX idx_pedidos_empresa_data      ON pedidos (empresa_id, data);
CREATE INDEX idx_pedidos_cpf               ON pedidos (cpf);

-- itens_pedido
CREATE INDEX idx_itens_pedido_pedido       ON itens_pedido (pedido_id);
CREATE INDEX idx_itens_pedido_produto      ON itens_pedido (produto_id);
CREATE INDEX idx_itens_pedido_plano        ON itens_pedido (plano_id);
CREATE INDEX idx_itens_pedido_vendedor     ON itens_pedido (vendedor_id);

-- =============================================================================
-- TRIGGER: atualiza alterado_em automaticamente em qualquer UPDATE
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_set_alterado_em()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.alterado_em = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_empresas_alterado_em
    BEFORE UPDATE ON empresas
    FOR EACH ROW EXECUTE FUNCTION fn_set_alterado_em();

CREATE TRIGGER trg_profiles_alterado_em
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION fn_set_alterado_em();

CREATE TRIGGER trg_usuario_empresa_alterado_em
    BEFORE UPDATE ON usuario_empresa
    FOR EACH ROW EXECUTE FUNCTION fn_set_alterado_em();

CREATE TRIGGER trg_produtos_alterado_em
    BEFORE UPDATE ON produtos
    FOR EACH ROW EXECUTE FUNCTION fn_set_alterado_em();

CREATE TRIGGER trg_planos_alterado_em
    BEFORE UPDATE ON planos
    FOR EACH ROW EXECUTE FUNCTION fn_set_alterado_em();

CREATE TRIGGER trg_clientes_alterado_em
    BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION fn_set_alterado_em();

CREATE TRIGGER trg_vendedores_alterado_em
    BEFORE UPDATE ON vendedores
    FOR EACH ROW EXECUTE FUNCTION fn_set_alterado_em();

CREATE TRIGGER trg_pedidos_alterado_em
    BEFORE UPDATE ON pedidos
    FOR EACH ROW EXECUTE FUNCTION fn_set_alterado_em();

CREATE TRIGGER trg_itens_pedido_alterado_em
    BEFORE UPDATE ON itens_pedido
    FOR EACH ROW EXECUTE FUNCTION fn_set_alterado_em();

-- =============================================================================
-- TRIGGER: cria profile automaticamente ao criar usuário no Supabase Auth
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO profiles (id, nome, criado_em)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION fn_handle_new_auth_user();

-- =============================================================================
-- FUNÇÕES HELPER PARA RLS
-- =============================================================================

-- Verifica se o usuário autenticado é admin
CREATE OR REPLACE FUNCTION fn_is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT COALESCE(
        (SELECT is_admin FROM profiles WHERE id = p_user_id),
        FALSE
    );
$$;

-- Verifica se o usuário tem acesso à empresa (admin tem acesso a todas)
CREATE OR REPLACE FUNCTION fn_has_empresa_access(p_empresa_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT fn_is_admin(p_user_id)
        OR EXISTS (
            SELECT 1
            FROM usuario_empresa
            WHERE usuario_id = p_user_id
              AND empresa_id  = p_empresa_id
              AND ativo        = TRUE
        );
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE empresas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE planos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendedores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_pedido    ENABLE ROW LEVEL SECURITY;

-- ---- empresas ---------------------------------------------------------------
-- Admin gerencia tudo; usuário comum lê apenas as suas
CREATE POLICY "empresas_admin_all"
    ON empresas FOR ALL
    USING (fn_is_admin());

CREATE POLICY "empresas_usuario_select"
    ON empresas FOR SELECT
    USING (fn_has_empresa_access(id));

-- ---- profiles ---------------------------------------------------------------
CREATE POLICY "profiles_proprio_ou_admin"
    ON profiles FOR SELECT
    USING (id = auth.uid() OR fn_is_admin());

CREATE POLICY "profiles_proprio_update"
    ON profiles FOR UPDATE
    USING (id = auth.uid() OR fn_is_admin());

CREATE POLICY "profiles_admin_all"
    ON profiles FOR ALL
    USING (fn_is_admin());

-- ---- usuario_empresa --------------------------------------------------------
CREATE POLICY "ue_admin_all"
    ON usuario_empresa FOR ALL
    USING (fn_is_admin());

CREATE POLICY "ue_proprio_select"
    ON usuario_empresa FOR SELECT
    USING (usuario_id = auth.uid() OR fn_is_admin());

-- ---- produtos ---------------------------------------------------------------
CREATE POLICY "produtos_empresa_all"
    ON produtos FOR ALL
    USING (fn_has_empresa_access(empresa_id));

-- ---- planos -----------------------------------------------------------------
CREATE POLICY "planos_empresa_all"
    ON planos FOR ALL
    USING (fn_has_empresa_access(empresa_id));

-- ---- clientes ---------------------------------------------------------------
-- Qualquer usuário autenticado pode ler/criar/editar clientes (base global)
CREATE POLICY "clientes_autenticado_all"
    ON clientes FOR ALL
    USING (auth.uid() IS NOT NULL);

-- ---- vendedores -------------------------------------------------------------
CREATE POLICY "vendedores_empresa_all"
    ON vendedores FOR ALL
    USING (fn_has_empresa_access(empresa_id));

-- ---- pedidos ----------------------------------------------------------------
CREATE POLICY "pedidos_empresa_all"
    ON pedidos FOR ALL
    USING (fn_has_empresa_access(empresa_id));

-- ---- itens_pedido -----------------------------------------------------------
-- Acesso via join ao pedido pai (herda controle de empresa)
CREATE POLICY "itens_pedido_via_pedido"
    ON itens_pedido FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM pedidos p
            WHERE p.id = pedido_id
              AND fn_has_empresa_access(p.empresa_id)
        )
    );

-- =============================================================================
-- VIEW: pedidos com totais calculados (útil para relatórios)
-- =============================================================================
CREATE OR REPLACE VIEW vw_pedidos_resumo AS
SELECT
    p.id,
    p.empresa_id,
    e.fantasia                             AS empresa_fantasia,
    p.data,
    p.cpf,
    p.cliente_nome,
    p.telefone,
    p.valor_total,
    p.dinheiro,
    p.cartao_debito,
    p.cartao_credito,
    p.pix,
    p.outros,
    p.obs,
    p.troco,
    (p.dinheiro + p.cartao_debito + p.cartao_credito + p.pix + p.outros) AS total_recebido,
    COUNT(ip.id)                           AS qtd_itens,
    p.criado_por,
    p.criado_em,
    p.alterado_por,
    p.alterado_em
FROM pedidos p
JOIN empresas e ON e.id = p.empresa_id
LEFT JOIN itens_pedido ip ON ip.pedido_id = p.id
GROUP BY p.id, e.fantasia;

COMMENT ON VIEW vw_pedidos_resumo IS 'Pedidos com totais recebidos e contagem de itens';

-- =============================================================================
-- VIEW: itens com detalhes de produto, plano e vendedor
-- =============================================================================
CREATE OR REPLACE VIEW vw_itens_pedido_detalhado AS
SELECT
    ip.id,
    ip.pedido_id,
    p.data                  AS pedido_data,
    p.empresa_id,
    pr.nome                 AS produto_nome,
    pr.tipo                 AS produto_tipo,
    pl.nome                 AS plano_nome,
    pl.preco                AS plano_preco,
    pl.tempo                AS plano_tempo_min,
    ip.quantidade,
    ip.valor,
    v.nome                  AS vendedor_nome,
    ip.hora_inicio,
    ip.hora_fim,
    CASE
        WHEN ip.hora_inicio IS NOT NULL AND ip.hora_fim IS NOT NULL
        THEN EXTRACT(EPOCH FROM (ip.hora_fim::TIME - ip.hora_inicio::TIME)) / 60
        ELSE NULL
    END                     AS duracao_minutos,
    ip.criado_por,
    ip.criado_em,
    ip.alterado_por,
    ip.alterado_em
FROM itens_pedido ip
JOIN pedidos   p  ON p.id  = ip.pedido_id
JOIN produtos  pr ON pr.id = ip.produto_id
LEFT JOIN planos    pl ON pl.id = ip.plano_id
LEFT JOIN vendedores v ON v.id  = ip.vendedor_id;

COMMENT ON VIEW vw_itens_pedido_detalhado IS 'Itens com informações completas de produto, plano e vendedor';
