-- =====================================================
-- MDL PostgreSQL Database Setup Script
-- Metrics Definition Library - Database Schema
-- =====================================================

-- Drop existing tables if they exist (careful in production!)
DROP TABLE IF EXISTS key_results CASCADE;
DROP TABLE IF EXISTS objectives CASCADE;
DROP TABLE IF EXISTS metrics CASCADE;
DROP TABLE IF EXISTS business_domains CASCADE;

-- =====================================================
-- Business Domains Table
-- =====================================================
CREATE TABLE business_domains (
    id SERIAL PRIMARY KEY,
    domain_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    owner_team VARCHAR(255),
    contact_email VARCHAR(255),
    tier_focus JSONB,  -- Array of tiers: ["Tier-1", "Tier-2"]
    key_areas JSONB,   -- Array of key areas
    color VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_business_domains_domain_id ON business_domains(domain_id);
CREATE INDEX idx_business_domains_name ON business_domains(name);

-- =====================================================
-- Metrics Table
-- =====================================================
CREATE TABLE metrics (
    id SERIAL PRIMARY KEY,
    metric_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    tier VARCHAR(50),
    business_domain VARCHAR(255),
    metric_type VARCHAR(50),
    tags JSONB,  -- Array of tags
    
    -- Definition
    definition JSONB,  -- { formula, unit, data_sources, calculation_logic, expected_direction }
    
    -- Strategic Alignment
    strategic_alignment JSONB,  -- { objectives, key_results, north_star_metric }
    
    -- Governance
    governance JSONB,  -- { owner_team, technical_owner, data_classification, status, review_frequency }
    
    -- Targets & Thresholds
    targets JSONB,  -- { current_value, target_value, threshold_warning, threshold_critical }
    
    -- Alert Rules
    alert_rules JSONB,  -- Array of alert rules
    
    -- Visualization
    visualization JSONB,  -- { chart_type, preferred_period, dimensions, filters }
    
    -- Usage & Documentation
    usage JSONB,  -- { primary_dashboard, report_frequency, audience, access_level }
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (business_domain) REFERENCES business_domains(name) ON DELETE SET NULL
);

CREATE INDEX idx_metrics_metric_id ON metrics(metric_id);
CREATE INDEX idx_metrics_name ON metrics(name);
CREATE INDEX idx_metrics_tier ON metrics(tier);
CREATE INDEX idx_metrics_business_domain ON metrics(business_domain);
CREATE INDEX idx_metrics_metric_type ON metrics(metric_type);
CREATE INDEX idx_metrics_category ON metrics(category);
CREATE INDEX idx_metrics_tags ON metrics USING GIN (tags);

-- =====================================================
-- Objectives Table
-- =====================================================
CREATE TABLE objectives (
    id SERIAL PRIMARY KEY,
    objective_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    owner_team VARCHAR(255),
    status VARCHAR(50),  -- draft, active, on-hold, completed, cancelled
    priority VARCHAR(50),  -- high, medium, low
    strategic_pillar VARCHAR(255),
    
    -- Timeframe
    timeframe_start DATE,
    timeframe_end DATE,
    
    -- Additional metadata
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_objectives_objective_id ON objectives(objective_id);
CREATE INDEX idx_objectives_name ON objectives(name);
CREATE INDEX idx_objectives_status ON objectives(status);
CREATE INDEX idx_objectives_owner_team ON objectives(owner_team);
CREATE INDEX idx_objectives_timeframe ON objectives(timeframe_start, timeframe_end);

-- =====================================================
-- Key Results Table
-- =====================================================
CREATE TABLE key_results (
    id SERIAL PRIMARY KEY,
    objective_id VARCHAR(100) NOT NULL,
    kr_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Values
    baseline_value DECIMAL(20, 4),
    current_value DECIMAL(20, 4),
    target_value DECIMAL(20, 4),
    unit VARCHAR(50),
    direction VARCHAR(20),  -- increase, decrease, maintain
    
    -- Associated Metrics
    metric_ids JSONB,  -- Array of metric_ids
    
    -- Progress tracking
    progress_percentage DECIMAL(5, 2),
    status VARCHAR(50),  -- on-track, at-risk, off-track
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (objective_id) REFERENCES objectives(objective_id) ON DELETE CASCADE
);

CREATE INDEX idx_key_results_objective_id ON key_results(objective_id);
CREATE INDEX idx_key_results_kr_id ON key_results(kr_id);
CREATE INDEX idx_key_results_status ON key_results(status);
CREATE INDEX idx_key_results_metric_ids ON key_results USING GIN (metric_ids);

-- =====================================================
-- Update Triggers
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for all tables
CREATE TRIGGER update_business_domains_updated_at BEFORE UPDATE ON business_domains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metrics_updated_at BEFORE UPDATE ON metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_objectives_updated_at BEFORE UPDATE ON objectives
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_key_results_updated_at BEFORE UPDATE ON key_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Views for Common Queries
-- =====================================================

-- View: Metrics with Domain Details
CREATE OR REPLACE VIEW v_metrics_with_domains AS
SELECT 
    m.*,
    bd.owner_team as domain_owner_team,
    bd.contact_email as domain_contact_email,
    bd.color as domain_color
FROM metrics m
LEFT JOIN business_domains bd ON m.business_domain = bd.name;

-- View: Objectives with Key Results Count
CREATE OR REPLACE VIEW v_objectives_summary AS
SELECT 
    o.*,
    COUNT(kr.id) as key_results_count,
    AVG(kr.progress_percentage) as avg_progress
FROM objectives o
LEFT JOIN key_results kr ON o.objective_id = kr.objective_id
GROUP BY o.id;

-- View: Key Results with Objective Details
CREATE OR REPLACE VIEW v_key_results_with_objectives AS
SELECT 
    kr.*,
    o.name as objective_name,
    o.status as objective_status,
    o.owner_team as objective_owner_team,
    o.timeframe_start,
    o.timeframe_end
FROM key_results kr
JOIN objectives o ON kr.objective_id = o.objective_id;

-- =====================================================
-- Sample Data Comments
-- =====================================================

COMMENT ON TABLE business_domains IS 'Business domains for organizing metrics';
COMMENT ON TABLE metrics IS 'Core metrics definitions with comprehensive metadata';
COMMENT ON TABLE objectives IS 'Strategic objectives (OKRs)';
COMMENT ON TABLE key_results IS 'Key results linked to objectives and metrics';

COMMENT ON COLUMN metrics.definition IS 'JSON structure: { formula, unit, data_sources, calculation_logic, expected_direction }';
COMMENT ON COLUMN metrics.strategic_alignment IS 'JSON structure: { objectives, key_results, north_star_metric }';
COMMENT ON COLUMN metrics.governance IS 'JSON structure: { owner_team, technical_owner, data_classification, status, review_frequency }';
COMMENT ON COLUMN metrics.targets IS 'JSON structure: { current_value, target_value, threshold_warning, threshold_critical }';
COMMENT ON COLUMN metrics.visualization IS 'JSON structure: { chart_type, preferred_period, dimensions, filters }';

-- =====================================================
-- Database Schema Created Successfully
-- =====================================================

SELECT 'Database schema created successfully!' as status;
SELECT 'Tables: business_domains, metrics, objectives, key_results' as tables;
SELECT 'Views: v_metrics_with_domains, v_objectives_summary, v_key_results_with_objectives' as views;
