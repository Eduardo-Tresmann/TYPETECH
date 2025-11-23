-- ============================================================================
-- INICIALIZAÇÃO DO BANCO DE DADOS
-- ============================================================================
-- Este arquivo deve ser executado PRIMEIRO antes de qualquer outro script SQL
-- 
-- Propósito:
--   - Habilita extensões PostgreSQL necessárias para o funcionamento do sistema
--   - Extensões habilitadas:
--     * pgcrypto: Para geração de UUIDs aleatórios (gen_random_uuid())
--     * pg_trgm: Para busca por similaridade de texto (habilitada em search_profiles.sql)
--
-- Ordem de execução: 1/14 (PRIMEIRO)
-- ============================================================================

-- Extensão para geração de UUIDs aleatórios
-- Usada em: typing_results, notifications, friend_requests
create extension if not exists pgcrypto;

-- (Opcional) Caso queira usar uuid_generate_v4() ao invés de gen_random_uuid():
-- create extension if not exists "uuid-ossp";

