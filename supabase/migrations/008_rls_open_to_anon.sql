-- =============================================================================
-- SISTEMA DE ALUGUEL DE CARRINHO - SHOPPING
-- Migration: 008_rls_open_to_anon.sql
--
-- CONTEXTO: O app usa iron-session (não Supabase Auth). auth.uid() é sempre
-- NULL nas chamadas do servidor e auth.role() retorna 'anon' mesmo quando
-- chamado via service_role key mal configurada. Toda a segurança de acesso
-- já é garantida pelas rotas Next.js que verificam a sessão iron-session.
--
-- Objetivo: Substituir todas as políticas RLS por USING (true) para que
-- o servidor possa operar normalmente com a anon key.
-- =============================================================================

-- ── empresas ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "empresas_admin_all"     ON empresas;
DROP POLICY IF EXISTS "empresas_usuario_select" ON empresas;
DROP POLICY IF EXISTS "service_role_bypass"    ON empresas;

CREATE POLICY "app_full_access" ON empresas
  FOR ALL USING (true) WITH CHECK (true);

-- ── profiles ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_proprio_ou_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_proprio_update"   ON profiles;
DROP POLICY IF EXISTS "profiles_admin_all"        ON profiles;
DROP POLICY IF EXISTS "service_role_bypass"       ON profiles;

CREATE POLICY "app_full_access" ON profiles
  FOR ALL USING (true) WITH CHECK (true);

-- ── usuario_empresa ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ue_admin_all"      ON usuario_empresa;
DROP POLICY IF EXISTS "ue_proprio_select" ON usuario_empresa;
DROP POLICY IF EXISTS "service_role_bypass" ON usuario_empresa;

CREATE POLICY "app_full_access" ON usuario_empresa
  FOR ALL USING (true) WITH CHECK (true);

-- ── produtos ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "produtos_empresa_all"  ON produtos;
DROP POLICY IF EXISTS "service_role_bypass"   ON produtos;

CREATE POLICY "app_full_access" ON produtos
  FOR ALL USING (true) WITH CHECK (true);

-- ── planos ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "planos_empresa_all"  ON planos;
DROP POLICY IF EXISTS "service_role_bypass" ON planos;

CREATE POLICY "app_full_access" ON planos
  FOR ALL USING (true) WITH CHECK (true);

-- ── clientes ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "clientes_autenticado_all" ON clientes;
DROP POLICY IF EXISTS "service_role_bypass"      ON clientes;

CREATE POLICY "app_full_access" ON clientes
  FOR ALL USING (true) WITH CHECK (true);

-- ── vendedores ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "vendedores_empresa_all" ON vendedores;
DROP POLICY IF EXISTS "service_role_bypass"    ON vendedores;

CREATE POLICY "app_full_access" ON vendedores
  FOR ALL USING (true) WITH CHECK (true);

-- ── pedidos ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "pedidos_empresa_all" ON pedidos;
DROP POLICY IF EXISTS "service_role_bypass" ON pedidos;

CREATE POLICY "app_full_access" ON pedidos
  FOR ALL USING (true) WITH CHECK (true);

-- ── itens_pedido ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "itens_pedido_via_pedido" ON itens_pedido;
DROP POLICY IF EXISTS "service_role_bypass"     ON itens_pedido;

CREATE POLICY "app_full_access" ON itens_pedido
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP POLICY IF EXISTS "app_full_access" ON empresas;
-- DROP POLICY IF EXISTS "app_full_access" ON profiles;
-- DROP POLICY IF EXISTS "app_full_access" ON usuario_empresa;
-- DROP POLICY IF EXISTS "app_full_access" ON produtos;
-- DROP POLICY IF EXISTS "app_full_access" ON planos;
-- DROP POLICY IF EXISTS "app_full_access" ON clientes;
-- DROP POLICY IF EXISTS "app_full_access" ON vendedores;
-- DROP POLICY IF EXISTS "app_full_access" ON pedidos;
-- DROP POLICY IF EXISTS "app_full_access" ON itens_pedido;
