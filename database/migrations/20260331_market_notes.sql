-- Market notes: admin-managed intelligence observations per section
CREATE TABLE IF NOT EXISTS market_notes (
  section    VARCHAR(50)  PRIMARY KEY,
  items      JSONB        NOT NULL DEFAULT '[]',
  updated_by UUID         REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Valid sections: micro_market, slowdown, strategic
