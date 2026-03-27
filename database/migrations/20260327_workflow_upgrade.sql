-- REDIP workflow upgrade
-- Adds flexible property/deal workflows, richer activity lifecycle,
-- smarter pricing metadata, and safe archive support.

ALTER TYPE deal_stage ADD VALUE IF NOT EXISTS 'sourced';
ALTER TYPE deal_stage ADD VALUE IF NOT EXISTS 'due_diligence';
ALTER TYPE deal_stage ADD VALUE IF NOT EXISTS 'ic_review';
ALTER TYPE deal_stage ADD VALUE IF NOT EXISTS 'negotiation';

ALTER TABLE properties
  ALTER COLUMN name DROP NOT NULL,
  ALTER COLUMN address DROP NOT NULL,
  ALTER COLUMN city DROP NOT NULL,
  ALTER COLUMN state DROP NOT NULL;

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS property_type VARCHAR(50) NOT NULL DEFAULT 'land',
  ADD COLUMN IF NOT EXISTS land_area_input_value DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS land_area_input_unit VARCHAR(10) NOT NULL DEFAULT 'sqft',
  ADD COLUMN IF NOT EXISTS geocode_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS geocode_confidence DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS geocode_message TEXT,
  ADD COLUMN IF NOT EXISTS geocode_last_attempt_at TIMESTAMP WITH TIME ZONE;

UPDATE properties
SET
  property_type = CASE
    WHEN zoning = 'industrial' THEN 'industrial'
    WHEN zoning = 'commercial' THEN 'commercial'
    WHEN zoning = 'mixed_use' THEN 'mixed_use'
    ELSE 'land'
  END,
  land_area_input_value = COALESCE(land_area_input_value, land_area_sqft),
  geocode_status = CASE
    WHEN lat IS NOT NULL AND lng IS NOT NULL THEN 'matched'
    ELSE COALESCE(geocode_status, 'pending')
  END
WHERE TRUE;

ALTER TABLE deals
  ALTER COLUMN property_id DROP NOT NULL;

ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_property_id_fkey;
ALTER TABLE deals
  ADD CONSTRAINT deals_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL;

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_reason TEXT,
  ADD COLUMN IF NOT EXISTS land_pricing_basis VARCHAR(20) NOT NULL DEFAULT 'total_cr',
  ADD COLUMN IF NOT EXISTS land_price_rate_inr DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS land_extent_input_value DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS land_extent_input_unit VARCHAR(10) NOT NULL DEFAULT 'sqft';

UPDATE deals
SET
  land_extent_input_value = COALESCE(land_extent_input_value, p.land_area_sqft),
  land_extent_input_unit = COALESCE(land_extent_input_unit, 'sqft')
FROM properties p
WHERE deals.property_id = p.id;

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_deals_archived ON deals(is_archived);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_priority ON activities(priority);

CREATE TABLE IF NOT EXISTS intelligence_briefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brief_date DATE NOT NULL,
  market_scope VARCHAR(100) NOT NULL DEFAULT 'bengaluru_india',
  content JSONB NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (brief_date, market_scope)
);

CREATE INDEX IF NOT EXISTS idx_intelligence_briefs_date_scope
  ON intelligence_briefs(brief_date, market_scope);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_activities_updated_at'
  ) THEN
    CREATE TRIGGER update_activities_updated_at
      BEFORE UPDATE ON activities
      FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END $$;
