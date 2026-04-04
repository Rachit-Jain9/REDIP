'use strict';

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

// ─── CLAUDE API BRIEF GENERATION ─────────────────────────────────────────────

const getAnthropicClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || /your[_-]/i.test(apiKey) || apiKey.startsWith('[')) return null;
  try {
    const { Anthropic } = require('@anthropic-ai/sdk');
    return new Anthropic({ apiKey });
  } catch {
    return null;
  }
};

/**
 * Generate a Claude-powered intelligence brief from structured deal/pipeline data.
 * Contract (150-200 words max, buy-side, no hallucinated externals):
 *   1. Deal of the Day
 *   2. Market Signals
 *   3. Risk Signals
 *   4. Strategic Takeaways
 */
const generateClaudeBrief = async (dealData, pipelineStats, notes) => {
  const client = getAnthropicClient();
  if (!client) return null;

  const hasNotes = notes.micro_market?.length || notes.slowdown?.length || notes.strategic?.length;

  const systemPrompt = `You are a buy-side real estate investment analyst for REDIP, a Bengaluru-focused real estate development intelligence platform.
Generate a concise intelligence brief from the internal pipeline data provided.

Rules:
- 150-200 words maximum total
- No fluff, no generic statements
- No assumptions beyond the provided data
- Do not calculate IRR or other financials not already present
- Focus on decision quality
- Tone: professional, direct, analytical, buy-side
- Return exactly 4 sections: Deal of the Day, Market Signals, Risk Signals, Strategic Takeaways
- Format as plain text paragraphs, no markdown`;

  const userContent = JSON.stringify({
    deals: dealData,
    pipeline: pipelineStats,
    adminNotes: hasNotes ? notes : null,
  }, null, 2);

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    return message.content[0]?.text || null;
  } catch (err) {
    console.error('[Intelligence] Claude brief generation failed:', err.message);
    return null;
  }
};

// ─── BUILD BRIEF ─────────────────────────────────────────────────────────────

const buildBrief = async (briefDate) => {
  const [topDealResult, developmentsResult, marketSignalResult, notes] = await Promise.all([
    query(
      `SELECT d.id, d.name, d.stage, d.priority, p.city, p.property_type,
        f.irr_pct, f.total_revenue_cr, f.npv_cr, f.asset_class
       FROM deals d
       LEFT JOIN properties p ON d.property_id = p.id
       LEFT JOIN financials f ON d.id = f.deal_id
       WHERE d.is_archived = FALSE
       ORDER BY
         CASE WHEN LOWER(COALESCE(p.city, '')) IN ('bangalore', 'bengaluru') THEN 0 ELSE 1 END,
         COALESCE(f.irr_pct, 0) DESC,
         d.updated_at DESC
       LIMIT 5`
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
        AVG(f.irr_pct) FILTER (WHERE d.is_archived = FALSE AND f.irr_pct IS NOT NULL) as avg_irr,
        SUM(f.total_revenue_cr) FILTER (WHERE d.is_archived = FALSE) as total_pipeline_cr
       FROM deals d
       LEFT JOIN financials f ON d.id = f.deal_id`
    ),
    getNotesMap(),
  ]);

  const topDeal = topDealResult.rows[0];
  const allTopDeals = topDealResult.rows;
  const signalRow = marketSignalResult.rows[0] || {};
  const liveDeals = parseInt(signalRow.live_deals, 10) || 0;
  const deadDeals = parseInt(signalRow.dead_deals, 10) || 0;
  const avgIrr = signalRow.avg_irr ? Number(signalRow.avg_irr) : null;
  const totalPipelineCr = signalRow.total_pipeline_cr ? Number(signalRow.total_pipeline_cr) : null;

  const microMarketNotes = notes.micro_market || [];
  const slowdownNotes = notes.slowdown || [];
  const strategicNotes = notes.strategic || [];
  const hasManualNotes = microMarketNotes.length > 0 || slowdownNotes.length > 0 || strategicNotes.length > 0;

  // Attempt Claude brief if we have meaningful data
  let claudeBrief = null;
  if (topDeal || liveDeals > 0) {
    claudeBrief = await generateClaudeBrief(
      allTopDeals.map((d) => ({
        name: d.name,
        city: d.city,
        stage: d.stage,
        priority: d.priority,
        assetClass: d.asset_class,
        irrPct: d.irr_pct,
        totalRevenueCr: d.total_revenue_cr,
        npvCr: d.npv_cr,
      })),
      { liveDeals, deadDeals, avgIrrPct: avgIrr, totalPipelineCr },
      notes,
    );
  }

  return {
    title: `Daily Real Estate Intelligence Brief — ${briefDate}`,
    generatedDate: briefDate,
    mode: 'verified_data_required',
    hasVerifiedMarketData: false,
    hasManualNotes,
    claudeBrief,
    notes: 'REDIP will not generate external market claims until verified data sources are connected. Sections below reflect real internal pipeline data, admin-entered observations, or an explicit not-configured state.',
    verifiedSourceRequirements: VERIFIED_SOURCE_REQUIREMENTS,
    dealOfDay: topDeal
      ? {
          headline: topDeal.name,
          city: topDeal.city || 'Unknown city',
          stage: topDeal.stage,
          irrPct: topDeal.irr_pct,
          totalRevenueCr: topDeal.total_revenue_cr,
          assetClass: topDeal.asset_class,
          whyItMatters: 'Strongest live opportunity in the current REDIP pipeline based on available modeled returns.',
        }
      : null,
    keyDevelopments: developmentsResult.rows.map((entry) => ({
      headline: `${entry.deal_name || 'Pipeline activity'} — ${entry.activity_type.replace(/_/g, ' ')}`,
      city: entry.city || 'Unknown city',
      date: entry.activity_date,
      whyItMatters: entry.description,
      sourceType: 'internal_pipeline',
    })),
    marketSignals: {
      bullish: liveDeals > 0
        ? [
            `${liveDeals} live internal deal${liveDeals !== 1 ? 's' : ''} currently active in REDIP.`,
            avgIrr !== null
              ? `Average modeled IRR across live pipeline: ${avgIrr.toFixed(1)}%.`
              : 'IRR coverage incomplete across live pipeline.',
            totalPipelineCr ? `Total tracked pipeline value: ₹${totalPipelineCr.toFixed(1)} Cr.` : null,
          ].filter(Boolean)
        : ['No live opportunities currently tracked in REDIP.'],
      risk: [
        deadDeals > 0
          ? `${deadDeals} deal${deadDeals !== 1 ? 's' : ''} marked dead — review for recurring sourcing or diligence failures.`
          : 'No dead deals currently tracked.',
        'Verified external Bengaluru market feeds not configured — REDIP is intentionally withholding market-level pricing and demand claims.',
      ],
      sourceType: 'internal_pipeline_only',
    },
    bengaluruMicroMarketIntelligence: microMarketNotes,
    bengaluruDemandHeatmap: buildUnavailableHeatmap(),
    demandSlowdownIndicators: slowdownNotes.length > 0
      ? slowdownNotes
      : [
          'Awaiting verified external transaction, inventory, and absorption sources before REDIP will publish slowdown signals.',
          deadDeals > 0
            ? 'Internal dead-deal count is non-zero — review failed opportunities for recurring pricing, title, or diligence issues.'
            : 'No internal dead-deal trend currently available.',
        ],
    strategicTakeaways: strategicNotes.length > 0
      ? strategicNotes
      : [
          'Use REDIP for internal pipeline discipline, underwriting workflow, and deal velocity.',
          'Connect verified Bengaluru-first data sources before relying on this brief for market-facing investment conclusions.',
        ],
    bottomLine: hasManualNotes
      ? 'This brief combines real internal pipeline data with admin-entered market observations. External verified feeds are not yet connected.'
      : 'No verified external market feeds configured — REDIP is correctly withholding market intelligence rather than fabricating it.',
  };
};

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

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
  if (!VALID_SECTIONS.includes(section)) throw new Error(`Invalid section: ${section}`);
  if (!Array.isArray(items)) throw new Error('items must be an array');
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

const getMarketTransactions = async ({ city = 'Bengaluru', fy, quarter, dealType } = {}) => {
  const conditions = [`LOWER(city) = LOWER($1)`];
  const values = [city];
  let p = 2;

  if (fy) { conditions.push(`fiscal_year = $${p++}`); values.push(fy); }
  if (quarter) { conditions.push(`quarter = $${p++}`); values.push(quarter); }
  if (dealType) { conditions.push(`LOWER(deal_type) = LOWER($${p++})`); values.push(dealType); }

  const result = await query(
    `SELECT * FROM market_transactions
     WHERE ${conditions.join(' AND ')}
     ORDER BY fiscal_year DESC, quarter DESC, quantum_inr_mn DESC NULLS LAST`,
    values
  );
  return result.rows;
};

const getMicroMarketBenchmarks = async ({ city = 'Bengaluru' } = {}) => {
  const result = await query(
    `SELECT * FROM micro_market_benchmarks
     WHERE LOWER(city) = LOWER($1)
     ORDER BY avg_price_max_per_sqft DESC NULLS LAST`,
    [city]
  );
  return result.rows;
};

module.exports = {
  getDailyBrief,
  getMarketNotes,
  saveMarketNotes,
  getMarketTransactions,
  getMicroMarketBenchmarks,
};
