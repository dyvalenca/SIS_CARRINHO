-- =============================================================================
-- SISTEMA DE ALUGUEL DE CARRINHO - SHOPPING
-- Migration: 006_rls_service_role_bypass.sql
-- Objetivo: Adicionar política de bypass para service_role em todas as tabelas.
--
-- CONTEXTO: O app usa iron-session (não Supabase Auth), logo auth.uid()
-- é sempre NULL nas chamadas do servidor. O service_role key deve
-- contornar o RLS — estas políticas garantem isso explicitamente.
-- =============================================================================

-- empresas
CREATE POLICY "service_role_bypass" ON empresas
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- profiles
CREATE POLICY "service_role_bypass" ON profiles
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- usuario_empresa
CREATE POLICY "service_role_bypass" ON usuario_empresa
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- produtos
CREATE POLICY "service_role_bypass" ON produtos
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- planos
CREATE POLICY "service_role_bypass" ON planos
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- clientes
CREATE POLICY "service_role_bypass" ON clientes
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- vendedores
CREATE POLICY "service_role_bypass" ON vendedores
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- pedidos
CREATE POLICY "service_role_bypass" ON pedidos
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- itens_pedido
CREATE POLICY "service_role_bypass" ON itens_pedido
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP POLICY IF EXISTS "service_role_bypass" ON empresas;
-- DROP POLICY IF EXISTS "service_role_bypass" ON profiles;
-- DROP POLICY IF EXISTS "service_role_bypass" ON usuario_empresa;
-- DROP POLICY IF EXISTS "service_role_bypass" ON produtos;
-- DROP POLICY IF EXISTS "service_role_bypass" ON planos;
-- DROP POLICY IF EXISTS "service_role_bypass" ON clientes;
-- DROP POLICY IF EXISTS "service_role_bypass" ON vendedores;
-- DROP POLICY IF EXISTS "service_role_bypass" ON pedidos;
-- DROP POLICY IF EXISTS "service_role_bypass" ON itens_pedido;
