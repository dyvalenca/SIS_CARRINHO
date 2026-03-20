-- =============================================================================
-- SISTEMA DE ALUGUEL DE CARRINHO - SHOPPING
-- Migration: 011_planos_tolerancia.sql
-- =============================================================================

ALTER TABLE planos
  ADD COLUMN tolerancia            INTEGER      NOT NULL DEFAULT 5    CHECK (tolerancia >= 0),
  ADD COLUMN valor_minuto_excedente NUMERIC(10,2) NOT NULL DEFAULT 1.00 CHECK (valor_minuto_excedente >= 0),
  ADD COLUMN cobra_tolerancia      BOOLEAN      NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN planos.tolerancia             IS 'Minutos de tolerância antes de cobrar excedente';
COMMENT ON COLUMN planos.valor_minuto_excedente IS 'Valor cobrado por minuto excedente';
COMMENT ON COLUMN planos.cobra_tolerancia       IS 'TRUE = tolerância é cobrada junto com o excedente';

-- Registros existentes: 5 min tolerância, R$1,00/min, cobra tolerância
UPDATE planos SET
  tolerancia             = 5,
  valor_minuto_excedente = 1.00,
  cobra_tolerancia       = TRUE;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- ALTER TABLE planos
--   DROP COLUMN IF EXISTS tolerancia,
--   DROP COLUMN IF EXISTS valor_minuto_excedente,
--   DROP COLUMN IF EXISTS cobra_tolerancia;
