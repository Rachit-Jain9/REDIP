const { query } = require('../config/database');

const HEATMAP_MARKETS = [
  'Whitefield',
  'ORR',
  'North Bengaluru (Hebbal / Devanahalli)',
  'Sarjapur',
  'Electronic City',
  'Peripheral',
];

const VERIFIED_SOURCE_REQUIREMENTS = [
  {
    key: 'transactions',
    label: 'Verified transactions feed',
    purpose: 'Deal of the Day, pricing context, and capital-markets developments',
  },
  {
    key: 'inventory',
    label: 'Verified inventory and absorption feed',
    purpose: 'Demand heatmap, slowdown indicators, and micro-market coverage',
  },
  {
    key: 'regulatory',
    label: 'Regulatory and planning feed',
    purpose: 'Bengaluru approvals, RERA updates, zoning changes, and planning risk',
  },
];

const buildUnavailableHeatmap = () =>
  HEATMAP_MARKETS.map((market) => ({
    microMarket: market,
    absorption: 'Not available',
    pricingTrend: 'Not available',
    inventory: 'Not available',
    demandSignal: 'Awaiting verified feed',
    insight: 'No verified external data source is configured for this micro-market yet.',
  }));

const getNotesMap = async () => {
  const result = await query('SELECT section, items FROM market_notes');
  const map = {};
  for (const row of result.rows) {
    map[row.section] = row.items;
  }
  return map;
};

const buildBrief = async (briefDate) => {
  const [topDealResult, developmentsResult, marketSignalResult, notes] = await Promise.all([
    query(
      `SELECT d.id, d.name, d.stage, d.priority, p.city, p.property_type,
        f.irr_pct, f.total_revenue_cr, f.npv_cr
       FROM deals d
       LEFT JOIN properties p ON d.property_id = p.id
       LEFT JOIN financials f ON d.id = f.deal_id
       WHERE d.is_archived = FALSE
       ORDER BY
         CASE WHEN LOWER(COALESCE(p.city, '')) IN ('bangalore', 'bengaluru') THEN 0 ELSE 1 END,
         COALESCE(f.irr_pct, 0) DESC,
         d.updated_at DESC
       LIMIT 1`
    ),
    query(
      `SELECT a.description, a.activity_type, a.activity_date, d.name as deal_name, p.city
       FROM activities a
       LEFT JOIN deals d ON a.deal_id = d.id
       LEFT JOIN properties p ON d.property_id = p.id
       WHERE COALESCE(d.is_archived, FALSE) = FALSE
       ORDER BY a.activity_date DESC
       LIMIT 7`
    ),
    query(
      `SELECT
        COUNT(*) FILTER (WHERE d.is_archived = FALSE AND d.stage NOT IN ('closed', 'dead')) as live_deals,
        COUNT(*) FILTER (WHERE d.is_archived = FALSE AND d.stage = 'dead') as dead_deals,
        AVG(f.irr_pct) FILTER (WHERE d.is_archived = FALSE AND f.irr_pct IS NOT NULL) as avg_irr
       FROM deals d
       LEFT JOIN financials f ON d.id = f.deal_id`
    ),
    getNotesMap(),
  ]);

  const topDeal = topDealResult.rows[0];
  const signalRow = marketSignalResult.rows[0] || {};
  const liveDeals = parseInt(signalRow.live_deals, 10) || 0;
  const deadDeals = parseInt(signalRow.dead_deals, 10) || 0;
  const avgIrr = signalRow.avg_irr ? Number(signalRow.avg_irr) : null;

  const microMarketNotes = notes.micro_market || [];
  const slowdownNotes = notes.slowdown || [];
  const strategicNotes = notes.strategic || [];
  const hasManualNotes = microMarketNotes.length > 0 || slowdownNotes.length > 0 || strategicNotes.length > 0;

  return {
    title: `Daily Real Estate Intelligence Brief - ${briefDate}`,
    generatedDate: briefDate,
    mode: 'verified_data_required',
    hasVerifiedMarketData: false,
    hasManualNotes,
    notes: 'REDIP will not generate external market claims until verified data sources are connected. The sections below reflect either real internal pipeline data, admin-entered observations, or an explicit not-configured state.',
    verifiedSourceRequirements: VERIFIED_SOURCE_REQUIREMENTS,
    dealOfDay: topDeal
      ? {
          headline: topDeal.name,
          city: topDeal.city || 'Unknown city',
          stage: topDeal.stage,
          irrPct: topDeal.irr_pct,
          totalRevenueCr: topDeal.total_revenue_cr,
          whyItMatters: 'This is the strongest live opportunity currently inside your own REDIP pipeline based on available modeled returns.',
        }
      : null,
    keyDevelopments: developmentsResult.rows.map((entry) => ({
      headline: `${entry.deal_name || 'Pipeline activity'} - ${entry.activity_type.replace(/_/g, ' ')}`,
      city: entry.city || 'Unknown city',
      date: entry.activity_date,
      whyItMatters: entry.description,
      sourceType: 'internal_pipeline',
    })),
    marketSignals: {
      bullish: liveDeals > 0
        ? [
            `${liveDeals} live internal opportunities are currently active in REDIP.`,
            avgIrr !== null
              ? `Average modeled IRR across internally tracked live deals is ${avgIrr.toFixed(1)}%.`
              : 'Internal IRR coverage is still incomplete across the live pipeline.',
          ]
        : ['No live opportunities are currently tracked in REDIP.'],
      risk: [
        deadDeals > 0
          ? `${deadDeals} internal deals are currently marked dead and should be reviewed for recurring sourcing or diligence issues.`
          : 'No dead deals are currently tracked in REDIP.',
        'Verified external Bengaluru and India market feeds are not configured yet, so REDIP is intentionally withholding market-level pricing and demand claims.',
      ],
      sourceType: 'internal_pipeline_only',
    },
    bengaluruMicroMarketIntelligence: microMarketNotes,
    bengaluruDemandHeatmap: buildUnavailableHeatmap(),
    demandSlowdownIndicators: slowdownNotes.length > 0
      ? slowdownNotes
      : [
          'Awaiting verified external transaction, inventory, and absorption sources before REDIP will publish slowdown signals by micro-market.',
          deadDeals > 0
            ? 'Internal dead-deal count is non-zero. Review failed opportunities for recurring pricing, title, or diligence issues.'
            : 'No internal dead-deal trend is currently available as a slowdown signal.',
        ],
    strategicTakeaways: strategicNotes.length > 0
      ? strategicNotes
      : [
          'Use REDIP today for internal pipeline discipline, underwriting, and workflow execution.',
          'Connect verified Bengaluru-first data sources before relying on the intelligence brief for market-facing investment conclusions.',
        ],
    bottomLine: hasManualNotes
      ? 'This brief combines real internal pipeline data with admin-entered market observations. External verified feeds are not yet connected.'
      : 'No verified external market feeds are configured yet, so REDIP is correctly withholding market intelligence rather than fabricating it.',
  };
};

const getDailyBrief = async (userId, date = new Date().toISOString().slice(0, 10)) => {
  const brief = await buildBrief(date);

  await query(
    `INSERT INTO intelligence_briefs (brief_date, market_scope, content, created_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (brief_date, market_scope)
     DO UPDATE SET content = EXCLUDED.content, created_by = EXCLUDED.created_by`,
    [date, 'bengaluru_india', brief, userId || null]
  );

  return brief;
};

const getMarketNotes = async () => {
  const result = await query('SELECT section, items, updated_at FROM market_notes');
  const notes = { micro_market: [], slowdown: [], strategic: [] };
  for (const row of result.rows) {
    if (notes[row.section] !== undefined) {
      notes[row.section] = row.items;
    }
  }
  return notes;
};

const saveMarketNotes = async (section, items, userId) => {
  const VALID_SECTIONS = ['micro_market', 'slowdown', 'strategic'];
  if (!VALID_SECTIONS.includes(section)) {
    throw new Error(`Invalid section: ${section}`);
  }
  if (!Array.isArray(items)) {
    throw new Error('items must be an array');
  }
  const cleaned = items.map((s) => String(s).trim()).filter(Boolean);

  await query(
    `INSERT INTO market_notes (section, items, updated_by, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (section)
     DO UPDATE SET items = EXCLUDED.items, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [section, JSON.stringify(cleaned), userId || null]
  );

  return cleaned;
};

module.exports = {
  getDailyBrief,
  getMarketNotes,
  saveMarketNotes,
};
