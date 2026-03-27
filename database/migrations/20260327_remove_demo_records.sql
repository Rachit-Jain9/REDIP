-- Remove legacy demo/sample data and locally generated verification artifacts.
-- This migration is intentionally targeted so it does not wipe genuine user records.

DELETE FROM intelligence_briefs
WHERE market_scope = 'bengaluru_india';

DELETE FROM activities
WHERE deal_id IN (
  'c1b2c3d4-0000-0000-0000-000000000001',
  'c1b2c3d4-0000-0000-0000-000000000002',
  'c1b2c3d4-0000-0000-0000-000000000003',
  'c1b2c3d4-0000-0000-0000-000000000004'
)
OR description = 'Discussed pricing expectations'
OR description = 'Initial owner call completed';

DELETE FROM deal_stage_history
WHERE deal_id IN (
  'c1b2c3d4-0000-0000-0000-000000000001',
  'c1b2c3d4-0000-0000-0000-000000000002',
  'c1b2c3d4-0000-0000-0000-000000000003',
  'c1b2c3d4-0000-0000-0000-000000000004'
);

DELETE FROM financials
WHERE deal_id IN (
  'c1b2c3d4-0000-0000-0000-000000000001',
  'c1b2c3d4-0000-0000-0000-000000000003'
);

DELETE FROM documents
WHERE deal_id IN (
  'c1b2c3d4-0000-0000-0000-000000000001',
  'c1b2c3d4-0000-0000-0000-000000000002',
  'c1b2c3d4-0000-0000-0000-000000000003',
  'c1b2c3d4-0000-0000-0000-000000000004'
);

DELETE FROM deals
WHERE id IN (
  'c1b2c3d4-0000-0000-0000-000000000001',
  'c1b2c3d4-0000-0000-0000-000000000002',
  'c1b2c3d4-0000-0000-0000-000000000003',
  'c1b2c3d4-0000-0000-0000-000000000004'
)
OR name = 'Automation Flow Deal'
OR name = 'QA Verified Deal'
OR notes = 'Smoke-tested deal workflow';

DELETE FROM properties
WHERE id IN (
  'b1b2c3d4-0000-0000-0000-000000000001',
  'b1b2c3d4-0000-0000-0000-000000000002',
  'b1b2c3d4-0000-0000-0000-000000000003',
  'b1b2c3d4-0000-0000-0000-000000000004',
  'b1b2c3d4-0000-0000-0000-000000000005'
)
OR notes = 'Created from automated verification'
OR notes = 'QA-created verified record';

DELETE FROM comps
WHERE project_name IN (
  'Lodha World Crest',
  'Kalpataru Paramount',
  'Prestige Lakeside Habitat',
  'Sobha Dream Acres',
  'My Home Avatar',
  'Aparna Constructions Sarovar',
  'Oberoi Commerz III',
  'RMZ Ecoworld',
  'Phoenix Palassio'
);

DELETE FROM users
WHERE id IN (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'a1b2c3d4-0000-0000-0000-000000000002',
  'a1b2c3d4-0000-0000-0000-000000000003'
)
OR email LIKE 'audit+%@example.com'
OR email LIKE 'flow+%@example.com'
OR email LIKE 'qa+%@example.com';
