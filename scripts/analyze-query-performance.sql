-- =====================================================
-- Query Performance Analysis Script
-- =====================================================
-- This script helps identify query performance issues,
-- index usage, and optimization opportunities

-- =====================================================
-- 1. Current Index Usage Statistics
-- =====================================================
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND tablename = 'metrics'
ORDER BY idx_scan DESC;

-- =====================================================
-- 2. Table Statistics
-- =====================================================
SELECT
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename = 'metrics';

-- =====================================================
-- 3. Unused Indexes (candidates for removal)
-- =====================================================
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public' 
    AND tablename = 'metrics'
    AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- =====================================================
-- 4. EXPLAIN ANALYZE - List all metrics (no filter)
-- =====================================================
EXPLAIN ANALYZE
SELECT * FROM metrics WHERE 1=1 ORDER BY name;

-- =====================================================
-- 5. EXPLAIN ANALYZE - Filter by category
-- =====================================================
EXPLAIN ANALYZE
SELECT * FROM metrics WHERE 1=1 AND category = 'operational' ORDER BY name;

-- =====================================================
-- 6. EXPLAIN ANALYZE - Filter by category + tier
-- =====================================================
EXPLAIN ANALYZE
SELECT * FROM metrics WHERE 1=1 AND category = 'strategic' AND tier = 'tier1' ORDER BY name;

-- =====================================================
-- 7. EXPLAIN ANALYZE - Filter by business_domain
-- =====================================================
EXPLAIN ANALYZE
SELECT * FROM metrics WHERE 1=1 AND business_domain = 'engineering' ORDER BY name;

-- =====================================================
-- 8. EXPLAIN ANALYZE - Filter by tags (GIN index)
-- =====================================================
EXPLAIN ANALYZE
SELECT * FROM metrics WHERE 1=1 AND tags @> '["performance"]' ORDER BY name;

-- =====================================================
-- 9. EXPLAIN ANALYZE - Multiple filters
-- =====================================================
EXPLAIN ANALYZE
SELECT * FROM metrics 
WHERE 1=1 
    AND category = 'operational' 
    AND business_domain = 'engineering' 
    AND tier = 'tier1'
ORDER BY name;

-- =====================================================
-- 10. Find Missing Indexes
-- =====================================================
-- This query identifies tables with high sequential scan ratios
SELECT
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    seq_tup_read / NULLIF(seq_scan, 0) as avg_rows_per_seq_scan,
    CASE 
        WHEN seq_scan > 0 AND idx_scan > 0 
        THEN ROUND(100.0 * seq_scan / (seq_scan + idx_scan), 2)
        ELSE 0 
    END as seq_scan_pct
FROM pg_stat_user_tables
WHERE schemaname = 'public' AND tablename = 'metrics'
ORDER BY seq_scan DESC;
