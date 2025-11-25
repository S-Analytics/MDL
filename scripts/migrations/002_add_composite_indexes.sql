-- =====================================================
-- Migration 002: Database Optimization - Add Composite Indexes
-- =====================================================
-- Purpose: Add composite indexes to improve query performance for
--          common multi-column filter combinations
-- 
-- Impact: Improves performance for:
--   - Category + Tier filters
--   - Category + Business Domain filters
--   - Tier + Business Domain filters
--   - Category + Tier + Business Domain filters
--
-- Estimated time: 1-5 seconds (depends on table size)
-- Rollback: See rollback script at bottom
-- =====================================================

-- =====================================================
-- Composite Index: Category + Tier
-- =====================================================
-- Supports queries filtering by both category and tier
-- Common pattern: "Show all strategic tier1 metrics"
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_category_tier 
ON metrics(category, tier);

-- =====================================================
-- Composite Index: Category + Business Domain
-- =====================================================
-- Supports queries filtering by category and business domain
-- Common pattern: "Show all operational engineering metrics"
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_category_domain 
ON metrics(category, business_domain);

-- =====================================================
-- Composite Index: Tier + Business Domain
-- =====================================================
-- Supports queries filtering by tier and business domain
-- Common pattern: "Show all tier1 metrics for sales"
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_tier_domain 
ON metrics(tier, business_domain);

-- =====================================================
-- Composite Index: Category + Tier + Business Domain
-- =====================================================
-- Supports queries with all three filters
-- Common pattern: "Show tier1 strategic metrics for engineering"
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_cat_tier_domain 
ON metrics(category, tier, business_domain);

-- =====================================================
-- Composite Index: Metric Type + Business Domain
-- =====================================================
-- Supports queries filtering by metric type and domain
-- Common pattern: "Show all counter metrics for engineering"
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_type_domain 
ON metrics(metric_type, business_domain);

-- =====================================================
-- Verify Indexes Created
-- =====================================================
SELECT 
    tablename, 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename = 'metrics'
    AND indexname LIKE 'idx_metrics_%'
ORDER BY indexname;

-- =====================================================
-- Index Size Report
-- =====================================================
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public' 
    AND tablename = 'metrics'
    AND indexname LIKE 'idx_metrics_%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- =====================================================
-- ROLLBACK SCRIPT (if needed)
-- =====================================================
-- Run these commands to remove the indexes:
--
-- DROP INDEX CONCURRENTLY IF EXISTS idx_metrics_category_tier;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_metrics_category_domain;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_metrics_tier_domain;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_metrics_cat_tier_domain;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_metrics_type_domain;
