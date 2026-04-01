'use strict';

/**
 * Real Estate Financial Engine — India Specific
 * Multi-asset-class: Residential, Plotted, Commercial Office, Retail, Industrial
 * All monetary values in Crores (₹ Cr) | All areas in sqft
 */

const GST_RATE = 0.18;         // 18% GST on construction
const STAMP_DUTY_RATE = 0.05;  // 5% stamp duty on land (avg India)
const CARPET_RATIO = 0.70;     // Carpet / Saleable
const SBU_RATIO = 1.25;        // Super Built-Up / Saleable

// ─── CORE MATH ──────────────────────────────────────────────────────────────

function calculateNPV(cashFlows, annualDiscountRate) {
  if (!cashFlows || cashFlows.length === 0) return 0;
  const qr = Math.pow(1 + annualDiscountRate, 0.25) - 1;
  return cashFlows.reduce((npv, cf, t) => npv + cf / Math.pow(1 + qr, t), 0);
}

function calculateIRR(cashFlows) {
  if (!cashFlows || cashFlows.length < 2) throw new Error('At least 2 cash flows required');
  if (!cashFlows.some((c) => c < 0) || !cashFlows.some((c) => c > 0))
    throw new Error('Cash flows must have both positive and negative values');

  const MAX_ITER = 1000;
  const PREC = 1e-10;
  const npv = (r) => cashFlows.reduce((s, c, t) => s + c / Math.pow(1 + r, t), 0);
  const dnpv = (r) => cashFlows.reduce((s, c, t) => (t === 0 ? s : s - (t * c) / Math.pow(1 + r, t + 1)), 0);

  for (const r0 of [0.05, 0.02, 0.10, 0.15, 0.01, 0.20]) {
    let r = r0;
    for (let i = 0; i < MAX_ITER; i++) {
      const d = dnpv(r);
      if (Math.abs(d) < 1e-15) break;
      const rNew = r - npv(r) / d;
      if (rNew <= -1) break;
      if (Math.abs(rNew - r) < PREC) {
        if (Math.abs(npv(rNew)) < 0.001) {
          return Math.round((Math.pow(1 + rNew, 4) - 1) * 1e8) / 1e6;
        }
      }
      r = rNew;
    }
  }

  // Bisection fallback
  let lo = -0.9999, hi = 10;
  for (let h = 0.5; h <= 50; h += 0.5) {
    if (npv(-0.9999) * npv(h) < 0) { hi = h; break; }
  }
  for (let i = 0; i < MAX_ITER * 2; i++) {
    const mid = (lo + hi) / 2;
    if (Math.abs(npv(mid)) < PREC || (hi - lo) / 2 < PREC) {
      return Math.round((Math.pow(1 + mid, 4) - 1) * 1e8) / 1e6;
    }
    npv(lo) * npv(mid) < 0 ? (hi = mid) : (lo = mid);
  }
  return Math.round((Math.pow(1 + (lo + hi) / 2, 4) - 1) * 1e8) / 1e6;
}

function sCurveWeights(n) {
  const weights = Array.from({ length: n }, (_, q) => {
    const p = (q + 1) / n;
    return Math.max(0.01, Math.sin(p * Math.PI) * 1.5);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / total);
}

const round4 = (n) => (n != null && !isNaN(n) ? Math.round(n * 10000) / 10000 : null);
const round2 = (n) => (n != null && !isNaN(n) ? Math.round(n * 100) / 100 : null);

function safeCashFlows(cfs) {
  return cfs.map((v) => Math.round((isFinite(v) ? v : 0) * 100) / 100);
}

function structureCashFlows(cfs) {
  const quarterly = cfs.map((net, quarter) => ({ quarter, net }));

  // Aggregate into years: Q0 = pre-project, Year 1 = Q1-Q4, Year 2 = Q5-Q8, …
  const yearly = [];
  if (cfs[0] !== 0) yearly.push({ year: 0, label: 'Pre-Project', net: round2(cfs[0]) });
  for (let y = 0; y < Math.ceil((cfs.length - 1) / 4); y++) {
    const s = y * 4 + 1;
    const e = Math.min(s + 3, cfs.length - 1);
    const net = round2(cfs.slice(s, e + 1).reduce((a, b) => a + b, 0));
    yearly.push({ year: y + 1, label: `Year ${y + 1}`, net });
  }

  return {
    quarterly,
    yearly,
    summary: {
      totalInflow: round2(cfs.filter((c) => c > 0).reduce((a, b) => a + b, 0)),
      totalOutflow: round2(Math.abs(cfs.filter((c) => c < 0).reduce((a, b) => a + b, 0))),
    },
  };
}

// ─── RESIDENTIAL APARTMENTS ─────────────────────────────────────────────────

function calculateResidentialApartments(input) {
  const plotAreaSqft          = Number(input.plotAreaSqft);
  const fsi                   = Number(input.fsi);
  const loadingFactor         = Number(input.loadingFactor) || 0.65;
  const constructionCostSqft  = Number(input.constructionCostPerSqft);
  const sellingRateSqft       = Number(input.sellingRatePerSqft);
  const landCostCr            = Number(input.landCostCr) || 0;
  const marketingCostPct      = Number(input.marketingCostPct) || 5;
  const financeCostPct        = Number(input.financeCostPct) || 12;
  const developerMarginPct    = Number(input.developerMarginPct) || 20;
  const durationMonths        = Number(input.projectDurationMonths) || 36;
  const discountRatePct       = Number(input.discountRatePct) || 14;
  const pricingEscalationPct  = Number(input.pricingEscalationPct) || 0;

  // Construction phasing
  const constructionStartMonths = Number(input.constructionStartMonths) || 0;
  const constructionEndMonths   = Number(input.constructionEndMonths) > 0
    ? Math.min(Number(input.constructionEndMonths), durationMonths)
    : durationMonths * 0.85;

  if (plotAreaSqft <= 0 || fsi <= 0 || fsi > 20) throw new Error('Invalid plot area or FSI');
  if (loadingFactor <= 0 || loadingFactor > 1) throw new Error('Loading factor must be 0–1');
  if (constructionCostSqft <= 0) throw new Error('Construction cost must be positive');
  if (sellingRateSqft <= 0) throw new Error('Selling rate must be positive');

  // Areas
  const grossAreaSqft       = plotAreaSqft * fsi;
  const saleableAreaSqft    = grossAreaSqft * loadingFactor;
  const carpetAreaSqft      = saleableAreaSqft * CARPET_RATIO;
  const superBuiltupSqft    = saleableAreaSqft * SBU_RATIO;

  // Approval cost: accept ₹/sqft of gross area OR legacy Cr
  const approvalCostCr = Number(input.approvalCostPerSqft) > 0
    ? (grossAreaSqft * Number(input.approvalCostPerSqft)) / 1e7
    : Number(input.approvalCostCr) || 0;

  // Revenue — pricing escalation applied to average (half of annual rate for mid-project)
  const avgPriceEscalation = 1 + (pricingEscalationPct / 100) * (durationMonths / 24);
  const effectiveSellingRate = sellingRateSqft * avgPriceEscalation;
  const totalRevenueCr = (saleableAreaSqft * effectiveSellingRate) / 1e7;

  // Costs
  const constructionCostCr = (saleableAreaSqft * constructionCostSqft) / 1e7;
  const gstCostCr          = constructionCostCr * GST_RATE;
  const stampDutyCr        = landCostCr * STAMP_DUTY_RATE;
  const marketingCostCr    = totalRevenueCr * (marketingCostPct / 100);
  const financeCostCr      = (landCostCr + constructionCostCr + gstCostCr) * (financeCostPct / 100);
  const totalCostCr        = landCostCr + constructionCostCr + gstCostCr + stampDutyCr +
                             approvalCostCr + marketingCostCr + financeCostCr;

  const grossProfitCr  = totalRevenueCr - totalCostCr;
  const grossMarginPct = totalRevenueCr > 0 ? (grossProfitCr / totalRevenueCr) * 100 : 0;

  // Equity: land + stamp + approvals (upfront equity tranche; construction is typically debt-funded)
  const equityInvestedCr = landCostCr + stampDutyCr + approvalCostCr;
  const equityMultiple   = equityInvestedCr > 0
    ? (equityInvestedCr + grossProfitCr) / equityInvestedCr
    : null;

  // RLV = what you could pay for land and still hit developer margin
  const rlvCr = (totalRevenueCr - constructionCostCr - gstCostCr -
                 approvalCostCr - marketingCostCr - financeCostCr) /
                (1 + developerMarginPct / 100);

  // Cash flows
  const totalQ    = Math.ceil(durationMonths / 3);
  const constStartQ = Math.max(0, Math.floor(constructionStartMonths / 3));
  const constEndQ   = Math.min(totalQ, Math.ceil(constructionEndMonths / 3));
  const constDurQ   = Math.max(2, constEndQ - constStartQ);
  const cfs = new Array(totalQ + 1).fill(0);

  // Upfront (Q0): land + stamp + 25% approval
  cfs[0] -= landCostCr + stampDutyCr + approvalCostCr * 0.25;
  // Remaining 75% of approvals spread over pre-construction phase
  const approvalRem = approvalCostCr * 0.75;
  if (constStartQ >= 2) {
    for (let q = 1; q <= constStartQ && q <= totalQ; q++) cfs[q] -= approvalRem / constStartQ;
  } else if (totalQ >= 3) {
    cfs[1] -= approvalRem * 0.5;
    cfs[2] -= approvalRem * 0.5;
  } else if (totalQ >= 2) {
    cfs[1] -= approvalRem;
  }

  // Construction: S-curve from constStartQ+1 to constEndQ
  const cweights = sCurveWeights(constDurQ);
  for (let q = 0; q < constDurQ; q++) {
    const cfIdx = constStartQ + q + 1;
    if (cfIdx <= totalQ) cfs[cfIdx] -= (constructionCostCr + gstCostCr) * cweights[q];
  }

  // Marketing: spread from constStartQ+2 to Q(n-1)
  const mktStart = Math.max(constStartQ + 2, Math.floor(totalQ * 0.25));
  const mktEnd   = totalQ - 1;
  const mktDur   = mktEnd - mktStart + 1;
  if (mktDur > 0) {
    for (let q = mktStart; q <= mktEnd; q++) cfs[q] -= marketingCostCr / mktDur;
  }

  // Revenue: right-skewed logistic curve — Indian milestone-linked collections
  // ~8% in first 25% of project (bookings), ~57% in middle 50% (slab milestones),
  // ~35% in last 25% (OC + possession). Construction must exceed revenue early.
  const revStart = Math.max(1, constStartQ);
  const revEnd   = totalQ;
  const revDur   = revEnd - revStart + 1;
  if (revDur > 0) {
    const rweights = Array.from({ length: revDur }, (_, q) => {
      const p = (q + 1) / revDur;
      // Logistic: right-skewed, heavy second half
      return Math.max(0.04, 1 / (1 + Math.exp(-7 * (p - 0.60))));
    });
    const rtotal = rweights.reduce((a, b) => a + b, 0);
    for (let q = 0; q < revDur; q++) {
      const cfIdx = revStart + q;
      if (cfIdx <= totalQ) cfs[cfIdx] += totalRevenueCr * (rweights[q] / rtotal);
    }
  }

  const cashFlows = safeCashFlows(cfs);

  let irrPct = null, npvCr = null;
  try { irrPct = calculateIRR(cashFlows); } catch (e) { /* no convergence */ }
  try { npvCr  = calculateNPV(cashFlows, discountRatePct / 100); } catch (e) { /* skip */ }

  const sensitivity = buildResidentialSensitivity({
    plotAreaSqft, fsi, loadingFactor, constructionCostSqft, sellingRateSqft,
    landCostCr, approvalCostCr, marketingCostPct, financeCostPct,
    durationMonths, discountRatePct, developerMarginPct,
  });

  return {
    assetClass: 'residential_apartments',
    inputs: {
      plotAreaSqft, fsi, loadingFactor, constructionCostPerSqft: constructionCostSqft,
      sellingRatePerSqft: sellingRateSqft, landCostCr, approvalCostCr,
      approvalCostPerSqft: Number(input.approvalCostPerSqft) || null,
      marketingCostPct, financeCostPct, developerMarginPct, projectDurationMonths: durationMonths,
      discountRatePct, pricingEscalationPct,
      constructionStartMonths, constructionEndMonths,
    },
    kpis: {
      irr: round4(irrPct),
      npv: round4(npvCr),
      equityMultiple: round4(equityMultiple),
      rlv: round4(rlvCr),
      grossMarginPct: round4(grossMarginPct),
      noi: null, yieldOnCost: null, dscr: null, exitValue: null, entryValue: null,
    },
    areas: {
      grossBuiltUp: round2(grossAreaSqft),
      saleable: round2(saleableAreaSqft),
      carpet: round2(carpetAreaSqft),
      superBuiltUp: round2(superBuiltupSqft),
      leasable: null,
    },
    costs: {
      land: round4(landCostCr), construction: round4(constructionCostCr),
      gst: round4(gstCostCr), stampDuty: round4(stampDutyCr),
      approval: round4(approvalCostCr), marketing: round4(marketingCostCr),
      finance: round4(financeCostCr), total: round4(totalCostCr),
      tenantImprovements: null, leasingCommissions: null,
    },
    revenue: {
      totalRevenueCr: round4(totalRevenueCr),
      grossProfitCr: round4(grossProfitCr),
      grossMarginPct: round4(grossMarginPct),
      annualNOI: null, stabilizedNOI: null, exitValue: null,
    },
    cashFlows: structureCashFlows(cashFlows),
    sensitivityMatrix: sensitivity,
    // For backward-compat with existing DB columns
    _legacy: {
      plot_area_sqft: plotAreaSqft, fsi, loading_factor: loadingFactor,
      construction_cost_per_sqft: constructionCostSqft, selling_rate_per_sqft: sellingRateSqft,
      land_cost_cr: landCostCr, approval_cost_cr: approvalCostCr,
      marketing_cost_pct: marketingCostPct, finance_cost_pct: financeCostPct,
      developer_margin_pct: developerMarginPct, project_duration_months: durationMonths,
      gross_area_sqft: round2(grossAreaSqft), saleable_area_sqft: round2(saleableAreaSqft),
      carpet_area_sqft: round2(carpetAreaSqft), super_builtup_area_sqft: round2(superBuiltupSqft),
      total_construction_cost_cr: round4(constructionCostCr), gst_cost_cr: round4(gstCostCr),
      stamp_duty_cr: round4(stampDutyCr), marketing_cost_cr: round4(marketingCostCr),
      finance_cost_cr: round4(financeCostCr), total_cost_cr: round4(totalCostCr),
      total_revenue_cr: round4(totalRevenueCr), gross_profit_cr: round4(grossProfitCr),
      gross_margin_pct: round4(grossMarginPct), developer_profit_cr: round4(totalRevenueCr * developerMarginPct / 100),
      npv_cr: round4(npvCr), irr_pct: round4(irrPct),
      residual_land_value_cr: round4(rlvCr), equity_multiple: round4(equityMultiple),
      discount_rate_pct: discountRatePct,
    },
  };
}

// ─── PLOTTED DEVELOPMENT ────────────────────────────────────────────────────

function calculatePlottedDevelopment(input) {
  const totalLandSqft        = Number(input.totalLandSqft);
  const saleableLandPct      = Number(input.saleableLandPct) || 55;
  const avgPlotSizeSqft      = Number(input.avgPlotSizeSqft) || 1200;
  const sellingRatePerSqyd   = Number(input.sellingRatePerSqyd);   // plots quoted in sqyd
  const landCostCr           = Number(input.landCostCr) || 0;
  const devCostPerSqft       = Number(input.devCostPerSqft) || 250; // roads, infra, utilities
  const marketingCostPct     = Number(input.marketingCostPct) || 4;
  const financeCostPct       = Number(input.financeCostPct) || 12;
  const durationMonths       = Number(input.projectDurationMonths) || 24;
  const discountRatePct      = Number(input.discountRatePct) || 14;

  if (totalLandSqft <= 0) throw new Error('Total land area must be positive');
  if (sellingRatePerSqyd <= 0) throw new Error('Selling rate must be positive');
  if (avgPlotSizeSqft <= 0) throw new Error('Average plot size must be positive');

  // Approval cost: accept ₹/sqft of total land OR legacy Cr
  const approvalCostCr = Number(input.approvalCostPerSqft) > 0
    ? (totalLandSqft * Number(input.approvalCostPerSqft)) / 1e7
    : Number(input.approvalCostCr) || 0;

  const saleableLandSqft  = totalLandSqft * (saleableLandPct / 100);
  const totalPlots        = Math.floor(saleableLandSqft / avgPlotSizeSqft);
  const avgPlotSizeSqyd   = avgPlotSizeSqft / 9; // 1 sqyd = 9 sqft

  // Revenue
  const totalRevenueCr = (totalPlots * avgPlotSizeSqyd * sellingRatePerSqyd) / 1e7;

  // Costs
  const stampDutyCr      = landCostCr * STAMP_DUTY_RATE;
  const devCostCr        = (totalLandSqft * devCostPerSqft) / 1e7; // infra on entire land
  const gstCostCr        = devCostCr * 0.12; // 12% GST on civil/infra works
  const marketingCostCr  = totalRevenueCr * (marketingCostPct / 100);
  const financeCostCr    = (landCostCr + devCostCr) * (financeCostPct / 100);
  const totalCostCr      = landCostCr + devCostCr + gstCostCr + stampDutyCr +
                           approvalCostCr + marketingCostCr + financeCostCr;

  const grossProfitCr  = totalRevenueCr - totalCostCr;
  const grossMarginPct = totalRevenueCr > 0 ? (grossProfitCr / totalRevenueCr) * 100 : 0;
  const equityInvested = landCostCr + stampDutyCr + approvalCostCr;
  const equityMultiple = equityInvested > 0
    ? (equityInvested + grossProfitCr) / equityInvested
    : null;
  const rlvCr = (totalRevenueCr - devCostCr - gstCostCr - approvalCostCr - marketingCostCr - financeCostCr) / 1.20;

  // Cash flows: plotted projects sell faster, more front-loaded revenue
  const totalQ = Math.ceil(durationMonths / 3);
  const cfs = new Array(totalQ + 1).fill(0);

  // Q0: land + stamp + 25% approval
  cfs[0] -= landCostCr + stampDutyCr + approvalCostCr * 0.25;
  if (totalQ >= 2) { cfs[1] -= approvalCostCr * 0.375; cfs[2] -= approvalCostCr * 0.375; }

  // Development/infra cost: S-curve over 70% of duration
  const devQ = Math.max(2, Math.ceil(durationMonths * 0.70 / 3));
  const dweights = sCurveWeights(devQ);
  for (let q = 0; q < devQ && q + 1 <= totalQ; q++) {
    cfs[q + 1] -= (devCostCr + gstCostCr) * dweights[q];
  }

  // Marketing from Q2
  const mktDur = Math.max(1, totalQ - 2);
  for (let q = 2; q <= totalQ; q++) cfs[q] -= marketingCostCr / mktDur;

  // Revenue: plotted sales — front-loaded launch (40%) then steady absorption
  // Launch event collects large bookings; remaining collected at plot demarcation + registration
  const rweights = Array.from({ length: totalQ }, (_, q) => {
    const p = (q + 1) / totalQ;
    // Slight front-tilt but not extreme: Gaussian peak at 35% with long tail
    return Math.max(0.06, Math.exp(-4 * (p - 0.35) ** 2) + 0.10);
  });
  const rtotal = rweights.reduce((a, b) => a + b, 0);
  for (let q = 0; q < totalQ; q++) cfs[q + 1] += totalRevenueCr * (rweights[q] / rtotal);

  const cashFlows = safeCashFlows(cfs);
  let irrPct = null, npvCr = null;
  try { irrPct = calculateIRR(cashFlows); } catch (e) { /* skip */ }
  try { npvCr  = calculateNPV(cashFlows, discountRatePct / 100); } catch (e) { /* skip */ }

  return {
    assetClass: 'plotted_development',
    inputs: {
      totalLandSqft, saleableLandPct, avgPlotSizeSqft, sellingRatePerSqyd,
      landCostCr, devCostPerSqft, approvalCostCr,
      approvalCostPerSqft: Number(input.approvalCostPerSqft) || null,
      marketingCostPct, financeCostPct, projectDurationMonths: durationMonths, discountRatePct,
    },
    kpis: {
      irr: round4(irrPct), npv: round4(npvCr),
      equityMultiple: round4(equityMultiple), rlv: round4(rlvCr),
      grossMarginPct: round4(grossMarginPct),
      noi: null, yieldOnCost: null, dscr: null, exitValue: null, entryValue: null,
    },
    areas: {
      grossBuiltUp: round2(totalLandSqft),
      saleable: round2(saleableLandSqft),
      carpet: null, superBuiltUp: null, leasable: null,
      totalPlots,
      avgPlotSizeSqft: round2(avgPlotSizeSqft),
    },
    costs: {
      land: round4(landCostCr), construction: round4(devCostCr),
      gst: round4(gstCostCr), stampDuty: round4(stampDutyCr),
      approval: round4(approvalCostCr), marketing: round4(marketingCostCr),
      finance: round4(financeCostCr), total: round4(totalCostCr),
      tenantImprovements: null, leasingCommissions: null,
    },
    revenue: {
      totalRevenueCr: round4(totalRevenueCr),
      grossProfitCr: round4(grossProfitCr),
      grossMarginPct: round4(grossMarginPct),
      annualNOI: null, stabilizedNOI: null, exitValue: null,
    },
    cashFlows: structureCashFlows(cashFlows),
    sensitivityMatrix: buildPlottedSensitivity({
      totalLandSqft, saleableLandPct, avgPlotSizeSqft,
      sellingRatePerSqyd, landCostCr, devCostPerSqft, approvalCostCr,
      marketingCostPct, financeCostPct, durationMonths, discountRatePct,
    }),
    _legacy: {
      plot_area_sqft: totalLandSqft, fsi: 1, loading_factor: saleableLandPct / 100,
      land_cost_cr: landCostCr, approval_cost_cr: approvalCostCr,
      marketing_cost_pct: marketingCostPct, finance_cost_pct: financeCostPct,
      total_cost_cr: round4(totalCostCr), total_revenue_cr: round4(totalRevenueCr),
      gross_profit_cr: round4(grossProfitCr), gross_margin_pct: round4(grossMarginPct),
      npv_cr: round4(npvCr), irr_pct: round4(irrPct),
      residual_land_value_cr: round4(rlvCr), equity_multiple: round4(equityMultiple),
      project_duration_months: durationMonths, discount_rate_pct: discountRatePct,
    },
  };
}

// ─── INCOME-PRODUCING ASSETS (Office / Retail / Industrial) ─────────────────

function calculateIncomeAsset(input) {
  const assetClass           = input.assetClass;
  const leasableAreaSqft     = Number(input.leasableAreaSqft);
  const constructionCostSqft = Number(input.constructionCostPerSqft);
  const landCostCr           = Number(input.landCostCr) || 0;
  const approvalCostCr       = Number(input.approvalCostCr) || 0;
  const baseRentMonth        = Number(input.baseRentPerSqftMonth);  // ₹/sqft/month
  const rentEscalationPct    = Number(input.rentEscalationPct) || 5;
  const vacancyPct           = Number(input.vacancyPct) || 10;
  const opexPct              = Number(input.opexPct) || 20;         // % of effective gross revenue
  const tiPerSqft            = Number(input.tiPerSqft) || 0;
  const lcMonths             = Number(input.lcMonths) || 0;         // leasing commissions in months of rent
  const exitCapRate          = Number(input.exitCapRate) || 7;
  const entryCapRate         = Number(input.entryCapRate) || exitCapRate;
  const holdPeriodYears      = Number(input.holdPeriodYears) || 5;
  const constructionMonths   = Number(input.projectDurationMonths) || 36;
  const discountRatePct      = Number(input.discountRatePct) || 14;
  const debtCoverage         = Number(input.debtCoverage) || 0;
  const interestRatePct      = Number(input.interestRatePct) || 10;

  // Retail-specific: anchor proportion lowers blended rent
  const anchorPct            = assetClass === 'retail' ? (Number(input.anchorPct) || 40) : 0;
  const anchorRentDiscount   = assetClass === 'retail' ? (Number(input.anchorRentDiscount) || 20) : 0;
  const blendedRentFactor    = assetClass === 'retail'
    ? (anchorPct / 100) * (1 - anchorRentDiscount / 100) + (1 - anchorPct / 100)
    : 1;
  const effectiveBaseRent    = baseRentMonth * blendedRentFactor;

  if (leasableAreaSqft <= 0) throw new Error('Leasable area must be positive');
  if (constructionCostSqft <= 0) throw new Error('Construction cost must be positive');
  if (baseRentMonth <= 0) throw new Error('Base rent must be positive');
  if (exitCapRate <= 0 || exitCapRate > 30) throw new Error('Exit cap rate must be 0–30%');

  // DEVELOPMENT COSTS
  const constructionCostCr = (leasableAreaSqft * constructionCostSqft) / 1e7;
  const gstCostCr          = constructionCostCr * GST_RATE;
  const stampDutyCr        = landCostCr * STAMP_DUTY_RATE;
  const tiCostCr           = (leasableAreaSqft * tiPerSqft) / 1e7;
  // Leasing commissions = months of first-year rent
  const lcCostCr           = (leasableAreaSqft * effectiveBaseRent * lcMonths) / 1e7;
  const totalDevCostCr     = landCostCr + constructionCostCr + gstCostCr + stampDutyCr +
                             approvalCostCr + tiCostCr + lcCostCr;

  // STABILIZED NOI (Year 1)
  const grossRevY1Cr       = (leasableAreaSqft * effectiveBaseRent * 12) / 1e7;
  const effectiveGrossRevCr = grossRevY1Cr * (1 - vacancyPct / 100);
  const opexCr             = effectiveGrossRevCr * (opexPct / 100);
  const stabilizedNOICr    = effectiveGrossRevCr - opexCr;

  const yieldOnCost  = totalDevCostCr > 0 ? (stabilizedNOICr / totalDevCostCr) * 100 : 0;
  const entryValueCr = stabilizedNOICr / (entryCapRate / 100);

  // Exit NOI and value (compounded by rent escalation)
  const noiAtExit   = stabilizedNOICr * Math.pow(1 + rentEscalationPct / 100, holdPeriodYears);
  const exitValueCr = noiAtExit / (exitCapRate / 100);

  // CASH FLOWS
  const constQ   = Math.ceil(constructionMonths / 3);
  const opQ      = holdPeriodYears * 4;
  const totalQ   = constQ + opQ;
  const cfs      = new Array(totalQ + 1).fill(0);

  // Development phase
  cfs[0] -= landCostCr + stampDutyCr + approvalCostCr * 0.25;
  if (constQ >= 2) { cfs[1] -= approvalCostCr * 0.375; cfs[2] -= approvalCostCr * 0.375; }
  const cweights = sCurveWeights(constQ);
  for (let q = 0; q < constQ && q + 1 <= totalQ; q++) {
    cfs[q + 1] -= (constructionCostCr + gstCostCr) * cweights[q];
  }
  // TI and LC at construction completion
  if (constQ >= 1) {
    cfs[constQ] -= tiCostCr + lcCostCr;
  }

  // Operating phase: quarterly NOI with rent escalation + lease-up ramp
  for (let q = 1; q <= opQ; q++) {
    const yearIdx = Math.ceil(q / 4);
    // Lease-up: first 2 quarters at 60% occ, Q3 at 80%, then stabilized
    const occupancyFactor = q <= 2 ? 0.60 : q === 3 ? 0.80 : (1 - vacancyPct / 100);
    const rentEsc = Math.pow(1 + rentEscalationPct / 100, yearIdx - 1);
    const qRent   = (leasableAreaSqft * effectiveBaseRent * 3 * rentEsc * occupancyFactor) / 1e7;
    const qNOI    = qRent * (1 - opexPct / 100);
    const cfIdx   = constQ + q;
    if (cfIdx <= totalQ) cfs[cfIdx] += qNOI;
  }

  // Exit proceeds at end of hold period
  cfs[totalQ] += exitValueCr;

  const cashFlows = safeCashFlows(cfs);
  let irrPct = null, npvCr = null;
  try { irrPct = calculateIRR(cashFlows); } catch (e) { /* skip */ }
  try { npvCr  = calculateNPV(cashFlows, discountRatePct / 100); } catch (e) { /* skip */ }

  // Equity multiple: total cash returned / total equity invested
  const totalReturns = cashFlows.filter((c) => c > 0).reduce((a, b) => a + b, 0);
  const equityMultiple = totalDevCostCr > 0 ? totalReturns / totalDevCostCr : null;

  // DSCR (if debt coverage > 0)
  let dscr = null;
  if (debtCoverage > 0 && interestRatePct > 0) {
    const debtAmt = totalDevCostCr * debtCoverage;
    const r = interestRatePct / 100;
    const n = holdPeriodYears;
    const annualDebtService = debtAmt * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    dscr = annualDebtService > 0 ? round2(stabilizedNOICr / annualDebtService) : null;
  }

  const sensitivity = buildIncomeSensitivity({
    leasableAreaSqft, constructionCostSqft, landCostCr, stampDutyCr,
    approvalCostCr, tiCostCr, lcCostCr, opexPct, holdPeriodYears,
    constructionMonths, discountRatePct, rentEscalationPct, vacancyPct,
    baseRentMonth: effectiveBaseRent, baseExitCapRate: exitCapRate,
  });

  return {
    assetClass,
    inputs: {
      leasableAreaSqft, constructionCostPerSqft: constructionCostSqft, landCostCr, approvalCostCr,
      baseRentPerSqftMonth: baseRentMonth, rentEscalationPct, vacancyPct, opexPct,
      tiPerSqft, lcMonths, entryCapRate, exitCapRate, holdPeriodYears,
      projectDurationMonths: constructionMonths, discountRatePct, debtCoverage, interestRatePct,
      ...(assetClass === 'retail' ? { anchorPct, anchorRentDiscount } : {}),
    },
    kpis: {
      irr: round4(irrPct),
      npv: round4(npvCr),
      equityMultiple: round4(equityMultiple),
      rlv: null,
      grossMarginPct: null,
      noi: round4(stabilizedNOICr),
      yieldOnCost: round4(yieldOnCost),
      dscr,
      exitValue: round4(exitValueCr),
      entryValue: round4(entryValueCr),
    },
    areas: {
      leasable: round2(leasableAreaSqft),
      grossBuiltUp: round2(leasableAreaSqft / 0.85),
      saleable: null, carpet: null, superBuiltUp: null,
    },
    costs: {
      land: round4(landCostCr), construction: round4(constructionCostCr),
      gst: round4(gstCostCr), stampDuty: round4(stampDutyCr),
      approval: round4(approvalCostCr), marketing: null, finance: null,
      tenantImprovements: round4(tiCostCr), leasingCommissions: round4(lcCostCr),
      total: round4(totalDevCostCr),
    },
    revenue: {
      totalRevenueCr: null, grossProfitCr: null, grossMarginPct: null,
      annualNOI: round4(stabilizedNOICr),
      stabilizedNOI: round4(stabilizedNOICr),
      exitValue: round4(exitValueCr),
      grossFirstYearRent: round4(grossRevY1Cr),
    },
    cashFlows: structureCashFlows(cashFlows),
    sensitivityMatrix: sensitivity,
    _legacy: {
      land_cost_cr: landCostCr,
      total_cost_cr: round4(totalDevCostCr),
      total_revenue_cr: round4(exitValueCr),       // use exit value as proxy
      gross_profit_cr: round4(exitValueCr - totalDevCostCr),
      gross_margin_pct: totalDevCostCr > 0 ? round4((exitValueCr - totalDevCostCr) / exitValueCr * 100) : null,
      npv_cr: round4(npvCr), irr_pct: round4(irrPct),
      equity_multiple: round4(equityMultiple),
      project_duration_months: constQ * 3,
      discount_rate_pct: discountRatePct,
    },
  };
}

// ─── SENSITIVITY MATRICES ───────────────────────────────────────────────────

function buildResidentialSensitivity(p) {
  const vars = [-0.20, -0.10, 0, 0.10, 0.20];
  const sellingRates      = vars.map((v) => Math.round(p.sellingRateSqft * (1 + v)));
  const constructionCosts = vars.map((v) => Math.round(p.constructionCostSqft * (1 + v)));
  const irrGrid = constructionCosts.map((cc) =>
    sellingRates.map((sr) => {
      try {
        const inp = { ...p, constructionCostPerSqft: cc, sellingRatePerSqft: sr };
        const r = calculateResidentialApartments(inp);
        return r.kpis.irr;
      } catch { return null; }
    })
  );
  return { sellingRates, constructionCosts, irrGrid, axis: ['Constr. Cost/sqft', 'Selling Rate/sqft'] };
}

function buildPlottedSensitivity(p) {
  const vars = [-0.20, -0.10, 0, 0.10, 0.20];
  const sellingRates = vars.map((v) => Math.round(p.sellingRatePerSqyd * (1 + v)));
  const devCosts     = vars.map((v) => Math.round(p.devCostPerSqft * (1 + v)));
  const irrGrid = devCosts.map((dc) =>
    sellingRates.map((sr) => {
      try {
        const inp = { ...p, sellingRatePerSqyd: sr, devCostPerSqft: dc };
        const r = calculatePlottedDevelopment(inp);
        return r.kpis.irr;
      } catch { return null; }
    })
  );
  return { sellingRates, constructionCosts: devCosts, irrGrid, axis: ['Dev. Cost/sqft', 'Selling Rate/sqyd'] };
}

function buildIncomeSensitivity(p) {
  const rentVars   = [-0.20, -0.10, 0, 0.10, 0.20];
  const capVars    = [5, 6, 7, 8, 9];
  const rents      = rentVars.map((v) => Math.round(p.baseRentMonth * (1 + v) * 100) / 100);
  const capRates   = capVars;

  const irrGrid = capRates.map((cap) =>
    rents.map((rent) => {
      try {
        const modifiedCfs = buildIncomeQuickCFs({
          ...p, baseRentMonth: rent, exitCapRate: cap,
        });
        return calculateIRR(modifiedCfs);
      } catch { return null; }
    })
  );
  return { sellingRates: rents, constructionCosts: capRates, irrGrid, axis: ['Exit Cap Rate (%)', 'Base Rent/sqft/mo'] };
}

function buildIncomeQuickCFs(p) {
  const { leasableAreaSqft, baseRentMonth, exitCapRate, rentEscalationPct = 5,
          vacancyPct = 10, opexPct = 20, holdPeriodYears = 5,
          constructionMonths = 36, constructionCostSqft, landCostCr,
          stampDutyCr, approvalCostCr, tiCostCr, lcCostCr } = p;
  const constQ = Math.ceil(constructionMonths / 3);
  const opQ    = holdPeriodYears * 4;
  const totalQ = constQ + opQ;
  const cfs = new Array(totalQ + 1).fill(0);
  const totalCost = landCostCr + (leasableAreaSqft * constructionCostSqft) / 1e7 +
                    stampDutyCr + approvalCostCr + (tiCostCr || 0) + (lcCostCr || 0);
  cfs[0] = -totalCost;
  for (let q = 1; q <= opQ; q++) {
    const yearIdx = Math.ceil(q / 4);
    const occ     = q <= 2 ? 0.70 : (1 - vacancyPct / 100);
    const esc     = Math.pow(1 + rentEscalationPct / 100, yearIdx - 1);
    const qNOI    = (leasableAreaSqft * baseRentMonth * 3 * esc * occ * (1 - opexPct / 100)) / 1e7;
    if (constQ + q <= totalQ) cfs[constQ + q] += qNOI;
  }
  const noiExit = (leasableAreaSqft * baseRentMonth * 12 * (1 - vacancyPct / 100) * (1 - opexPct / 100)) /
                  1e7 * Math.pow(1 + rentEscalationPct / 100, holdPeriodYears);
  cfs[totalQ] += noiExit / (exitCapRate / 100);
  return safeCashFlows(cfs);
}

// ─── MASTER DISPATCHER ──────────────────────────────────────────────────────

function calculateFullFinancials(input) {
  const assetClass = input.assetClass || 'residential_apartments';
  switch (assetClass) {
    case 'residential_apartments': return calculateResidentialApartments(input);
    case 'plotted_development':    return calculatePlottedDevelopment(input);
    case 'commercial_office':
    case 'retail':
    case 'industrial':             return calculateIncomeAsset({ ...input, assetClass });
    default: throw new Error(`Unknown asset class: ${assetClass}`);
  }
}

// Keep legacy buildSensitivityMatrix alias for the sensitivity route
function buildSensitivityMatrix(baseParams) {
  return buildResidentialSensitivity({
    plotAreaSqft:         baseParams.plotAreaSqft,
    fsi:                  baseParams.fsi,
    loadingFactor:        baseParams.loadingFactor,
    constructionCostSqft: baseParams.constructionCostPerSqft,
    sellingRateSqft:      baseParams.sellingRatePerSqft,
    landCostCr:           baseParams.landCostCr,
    approvalCostCr:       baseParams.approvalCostCr,
    marketingCostPct:     baseParams.marketingCostPct,
    financeCostPct:       baseParams.financeCostPct,
    durationMonths:       baseParams.projectDurationMonths,
    discountRatePct:      baseParams.discountRatePct,
    developerMarginPct:   baseParams.developerMarginPct,
  });
}

module.exports = {
  calculateIRR,
  calculateNPV,
  calculateFullFinancials,
  buildSensitivityMatrix,
  buildCashFlows: () => { throw new Error('Use calculateFullFinancials instead'); },
  calculateResidualLandValue: () => null,
};
