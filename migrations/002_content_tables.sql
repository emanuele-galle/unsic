-- Migration: Content & Analytics Tables for UNSIC News
-- Version: 002
-- Date: 2025-12-03
-- Description: Add tables for social media content generation and analytics

-- ============================================================================
-- Table: unsic_content
-- Purpose: Store generated social media content for each news item
-- ============================================================================

CREATE TABLE IF NOT EXISTS unsic_content (
  id SERIAL PRIMARY KEY,
  news_id INTEGER NOT NULL REFERENCES unsic_news(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('linkedin', 'facebook', 'instagram', 'twitter')),

  -- Content
  content_text TEXT NOT NULL,
  content_image_url TEXT, -- Canva generated image URL
  hashtags TEXT[], -- Array of hashtags

  -- Metadata
  category VARCHAR(50), -- Inherited from news for analytics
  tone VARCHAR(50), -- professional, casual, inspiring, etc.

  -- Publishing
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_for TIMESTAMP,
  published_at TIMESTAMP,

  -- Platform response
  platform_post_id VARCHAR(255), -- ID from social platform (e.g., LinkedIn post ID)
  platform_response JSONB, -- Full response from platform API

  -- Engagement (updated periodically)
  engagement JSONB DEFAULT '{}', -- { likes: 0, comments: 0, shares: 0, impressions: 0, reach: 0 }
  last_engagement_update TIMESTAMP,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100) DEFAULT 'ai_agent',

  -- Constraints
  UNIQUE(news_id, platform) -- One content per news per platform
);

-- Indexes for performance
CREATE INDEX idx_content_news ON unsic_content(news_id);
CREATE INDEX idx_content_status ON unsic_content(status);
CREATE INDEX idx_content_platform ON unsic_content(platform);
CREATE INDEX idx_content_scheduled ON unsic_content(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_content_published ON unsic_content(published_at) WHERE status = 'published';
CREATE INDEX idx_content_category ON unsic_content(category);

-- ============================================================================
-- Table: unsic_analytics
-- Purpose: Time-series analytics data for content performance
-- ============================================================================

CREATE TABLE IF NOT EXISTS unsic_analytics (
  id SERIAL PRIMARY KEY,
  content_id INTEGER NOT NULL REFERENCES unsic_content(id) ON DELETE CASCADE,

  -- Metric
  metric_type VARCHAR(50) NOT NULL, -- impressions, reach, likes, comments, shares, clicks, etc.
  metric_value INTEGER NOT NULL DEFAULT 0,
  metric_delta INTEGER, -- Change since last measurement

  -- Context
  platform VARCHAR(20), -- Platform-specific metrics
  source VARCHAR(50) DEFAULT 'platform_api', -- platform_api, manual, estimated

  -- Time
  recorded_at TIMESTAMP DEFAULT NOW(),
  period_start TIMESTAMP, -- For aggregated metrics
  period_end TIMESTAMP,

  -- Metadata
  metadata JSONB, -- Additional context

  CONSTRAINT check_metric_value CHECK (metric_value >= 0)
);

-- Indexes for analytics queries
CREATE INDEX idx_analytics_content ON unsic_analytics(content_id);
CREATE INDEX idx_analytics_type ON unsic_analytics(metric_type);
CREATE INDEX idx_analytics_recorded ON unsic_analytics(recorded_at DESC);
CREATE INDEX idx_analytics_platform ON unsic_analytics(platform);

-- ============================================================================
-- Table: unsic_content_templates
-- Purpose: Store Canva templates and brand guidelines per category
-- ============================================================================

CREATE TABLE IF NOT EXISTS unsic_content_templates (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL UNIQUE,

  -- Canva integration
  canva_template_id VARCHAR(255), -- Canva template ID
  canva_template_url TEXT,

  -- Brand colors (JSON array)
  brand_colors JSONB, -- ["#1E3A8A", "#3B82F6", "#DBEAFE"]

  -- Style guide
  visual_style TEXT, -- Description: "Professional, charts, numbers"
  tone_guidelines TEXT, -- "Tecnico, chiaro, rassicurante"

  -- Platform-specific overrides
  platform_settings JSONB, -- { linkedin: {...}, facebook: {...} }

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default templates for 6 categories
INSERT INTO unsic_content_templates (category, brand_colors, visual_style, tone_guidelines) VALUES
('fisco', '["#1E3A8A", "#3B82F6", "#DBEAFE"]', 'Professional, charts, numbers', 'Tecnico, chiaro, rassicurante'),
('lavoro', '["#059669", "#10B981", "#D1FAE5"]', 'People-focused, teamwork', 'Pratico, motivazionale, inclusivo'),
('agricoltura', '["#15803D", "#22C55E", "#DCFCE7"]', 'Nature, fields, products', 'Settoriale, rispettoso tradizione'),
('pnrr', '["#7C3AED", "#A78BFA", "#EDE9FE"]', 'EU flag, institutional', 'Istituzionale, informativo, propositivo'),
('made_in_italy', '["#DC2626", "#EF4444", "#FEE2E2"]', 'Italian flag, excellence', 'Celebrativo, orgoglioso, ispirante'),
('impresa', '["#EA580C", "#FB923C", "#FED7AA"]', 'Innovative, dynamic, growth', 'Motivazionale, innovativo, dinamico')
ON CONFLICT (category) DO NOTHING;

-- ============================================================================
-- Views for reporting
-- ============================================================================

-- View: Content performance summary
CREATE OR REPLACE VIEW v_content_performance AS
SELECT
  c.id,
  c.news_id,
  n.title AS news_title,
  c.platform,
  c.category,
  c.status,
  c.published_at,
  (c.engagement->>'likes')::INTEGER AS likes,
  (c.engagement->>'comments')::INTEGER AS comments,
  (c.engagement->>'shares')::INTEGER AS shares,
  (c.engagement->>'impressions')::INTEGER AS impressions,
  (c.engagement->>'reach')::INTEGER AS reach,
  c.last_engagement_update
FROM unsic_content c
LEFT JOIN unsic_news n ON c.news_id = n.id
WHERE c.status = 'published';

-- View: Daily publishing schedule
CREATE OR REPLACE VIEW v_publishing_schedule AS
SELECT
  DATE(scheduled_for) AS publish_date,
  platform,
  COUNT(*) AS posts_count,
  ARRAY_AGG(id ORDER BY scheduled_for) AS content_ids
FROM unsic_content
WHERE status = 'scheduled'
GROUP BY DATE(scheduled_for), platform
ORDER BY publish_date, platform;

-- ============================================================================
-- Functions
-- ============================================================================

-- Function: Update engagement from JSON
CREATE OR REPLACE FUNCTION update_content_engagement(
  p_content_id INTEGER,
  p_engagement JSONB
) RETURNS VOID AS $$
BEGIN
  UPDATE unsic_content
  SET
    engagement = p_engagement,
    last_engagement_update = NOW(),
    updated_at = NOW()
  WHERE id = p_content_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Get content ready to publish
CREATE OR REPLACE FUNCTION get_publishable_content()
RETURNS TABLE (
  id INTEGER,
  news_id INTEGER,
  platform VARCHAR,
  content_text TEXT,
  content_image_url TEXT,
  scheduled_for TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.news_id,
    c.platform,
    c.content_text,
    c.content_image_url,
    c.scheduled_for
  FROM unsic_content c
  WHERE c.status = 'scheduled'
    AND c.scheduled_for <= NOW()
  ORDER BY c.scheduled_for
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger: Update updated_at on content change
CREATE OR REPLACE FUNCTION update_content_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_content_timestamp
BEFORE UPDATE ON unsic_content
FOR EACH ROW
EXECUTE FUNCTION update_content_timestamp();

-- ============================================================================
-- Grants (adjust based on your user setup)
-- ============================================================================

-- GRANT ALL ON unsic_content TO unsic_user;
-- GRANT ALL ON unsic_analytics TO unsic_user;
-- GRANT ALL ON unsic_content_templates TO unsic_user;
-- GRANT ALL ON SEQUENCE unsic_content_id_seq TO unsic_user;
-- GRANT ALL ON SEQUENCE unsic_analytics_id_seq TO unsic_user;
-- GRANT ALL ON SEQUENCE unsic_content_templates_id_seq TO unsic_user;

-- ============================================================================
-- Migration complete
-- ============================================================================

-- Add comment for tracking
COMMENT ON TABLE unsic_content IS 'Social media content generated by AI agents for UNSIC news';
COMMENT ON TABLE unsic_analytics IS 'Time-series analytics data for content performance tracking';
COMMENT ON TABLE unsic_content_templates IS 'Canva templates and brand guidelines per category';

SELECT 'Migration 002: Content & Analytics tables created successfully' AS status;
