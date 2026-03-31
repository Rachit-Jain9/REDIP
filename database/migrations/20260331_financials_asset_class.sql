-- Add asset class support to financials table
ALTER TABLE financials
  ADD COLUMN IF NOT EXISTS asset_class VARCHAR(50) NOT NULL DEFAULT 'residential_apartments',
  ADD COLUMN IF NOT EXISTS model_params JSONB,
  ADD COLUMN IF NOT EXISTS noi_cr DECIMAL(15, 4),
  ADD COLUMN IF NOT EXISTS yield_on_cost_pct DECIMAL(8, 4),
  ADD COLUMN IF NOT EXISTS exit_value_cr DECIMAL(15, 4),
  ADD COLUMN IF NOT EXISTS entry_value_cr DECIMAL(15, 4),
  ADD COLUMN IF NOT EXISTS dscr DECIMAL(8, 4),
  ADD COLUMN IF NOT EXISTS stabilized_noi_cr DECIMAL(15, 4);

CREATE INDEX IF NOT EXISTS idx_financials_asset_class ON financials(asset_class);
