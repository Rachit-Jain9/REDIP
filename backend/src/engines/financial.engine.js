'use strict';

/**
 * Real Estate Financial Engine - India Specific
 * All monetary values in Crores (₹ Cr)
 * All area values in Square Feet (sqft)
 */

const GST_RATE = 0.18; // 18% GST on construction
const STAMP_DUTY_RATE = 0.05; // 5% stamp duty on land cost (avg India)
const CARPET_AREA_RATIO = 0.70; // Carpet / Saleable ratio
const SUPER_BUILTUP_RATIO = 1.25; // Super built-up / Saleable ratio

/**
 * Calculate NPV using discounted cash flows
 * @param {number[]} cashFlows - Array of cash flows (index 0 = time 0, outflow negative)
 * @param {number} discountRate - Annual discount rate as decimal (e.g., 0.12 for 12%)
 * @returns {number} NPV in Crores
 */
function calculateNPV(cashFlows, discountRate) {
  if (!cashFlows || cashFlows.length === 0) return 0;
  if (discountRate < 0 || discountRate > 10) throw new Error('Discount rate must be between 0 and 1000%');

  // Convert annual rate to quarterly rate
  const quarterlyRate = Math.pow(1 + discountRate, 1 / 4) - 1;

  return cashFlows.reduce((npv, cf, t) => {
    return npv + cf / Math.pow(1 + quarterlyRate, t);
  }, 0);
}

/**
 * Calculate IRR using Newton-Raphson iterative method
 * Accurate to 6 decimal places
 * @param {number[]} cashFlows - Array of quarterly cash flows
 * @returns {number} Annual IRR as percentage (e.g., 18.5 for 18.5%)
 */
function calculateIRR(cashFlows) {
  if (!cashFlows || cashFlows.length < 2) {
    throw new Error('At least 2 cash flows required for IRR calculation');
  }

  const hasNegative = cashFlows.some((cf) => cf < 0);
  const hasPositive = cashFlows.some((cf) => cf > 0);

  if (!hasNegative || !hasPositive) {
    throw new Error('Cash flows must contain both negative and positive values for IRR calculation');
  }

  const MAX_ITERATIONS = 1000;
  const PRECISION = 1e-10;

  // NPV function for quarterly rate r
  const npvFunc = (r) => {
    return cashFlows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + r, t), 0);
  };

  // Derivative of NPV with respect to r
  const npvDerivative = (r) => {
    return cashFlows.reduce((sum, cf, t) => {
      if (t === 0) return sum;
      return sum - (t * cf) / Math.pow(1 + r, t + 1);
    }, 0);
  };

  // Initial guess for quarterly IRR (start with 5% quarterly = ~21.5% annual)
  let r = 0.05;

  // Try multiple starting points if needed
  const startingPoints = [0.05, 0.02, 0.10, 0.15, 0.01, 0.20];

  for (const startR of startingPoints) {
    r = startR;
    let converged = false;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const npv = npvFunc(r);
      const derivative = npvDerivative(r);

      if (Math.abs(derivative) < 1e-15) break; // Avoid division by near-zero

      const rNew = r - npv / derivative;

      if (rNew <= -1) {
        r = -0.999;
        break;
      }

      if (Math.abs(rNew - r) < PRECISION) {
        r = rNew;
        converged = true;
        break;
      }

      r = rNew;
    }

    if (converged && Math.abs(npvFunc(r)) < 0.0001) {
      // Convert quarterly rate to annual IRR percentage
      const annualIRR = (Math.pow(1 + r, 4) - 1) * 100;
      return Math.round(annualIRR * 1000000) / 1000000; // 6 decimal places
    }
  }

  // Bisection fallback
  let lo = -0.999;
  let hi = 10.0; // 900% quarterly max

  if (npvFunc(lo) * npvFunc(hi) > 0) {
    // Try broader range
    for (let h = 0.5; h <= 50; h += 0.5) {
      if (npvFunc(-0.9999) * npvFunc(h) < 0) {
        hi = h;
        break;
      }
    }
  }

  for (let i = 0; i < MAX_ITERATIONS * 2; i++) {
    const mid = (lo + hi) / 2;
    const npvMid = npvFunc(mid);

    if (Math.abs(npvMid) < PRECISION || (hi - lo) / 2 < PRECISION) {
      const annualIRR = (Math.pow(1 + mid, 4) - 1) * 100;
      return Math.round(annualIRR * 1000000) / 1000000;
    }

    if (npvFunc(lo) * npvMid < 0) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  const annualIRR = (Math.pow(1 + (lo + hi) / 2, 4) - 1) * 100;
  return Math.round(annualIRR * 1000000) / 1000000;
}

/**
 * Build quarterly cash flows for an Indian real estate project
 * @param {object} params
 * @returns {number[]} Array of quarterly net cash flows
 */
function buildCashFlows(params) {
  const {
    landCostCr,
    totalConstructionCostCr,
    gstCostCr,
    stampDutyCr,
    approvalCostCr,
    marketingCostCr,
    financeParams,
    totalRevenueCr,
    projectDurationMonths,
  } = params;

  const totalQuarters = Math.ceil(projectDurationMonths / 3);
  const cashFlows = new Array(totalQuarters + 1).fill(0);

  // Q0: Land cost + Stamp duty + Initial approvals (25% of approval)
  cashFlows[0] = -(landCostCr + stampDutyCr + approvalCostCr * 0.25);

  // Q1-Q2: Remaining approvals (75%) spread evenly
  const remainingApprovalPerQtr = (approvalCostCr * 0.75) / 2;
  cashFlows[1] = (cashFlows[1] || 0) - remainingApprovalPerQtr;
  cashFlows[2] = (cashFlows[2] || 0) - remainingApprovalPerQtr;

  // Construction cost spread over project duration using S-curve
  // Slow start, peak in middle, slow end
  const constructionQuarters = Math.ceil(projectDurationMonths * 0.85 / 3);
  const totalConstruction = totalConstructionCostCr + gstCostCr;

  const sCurveWeights = [];
  for (let q = 0; q < constructionQuarters; q++) {
    const progress = (q + 1) / constructionQuarters;
    // S-curve: slow start, fast middle, slow end
    const weight = Math.sin(progress * Math.PI) * 1.5;
    sCurveWeights.push(Math.max(0.01, weight));
  }
  const totalWeight = sCurveWeights.reduce((a, b) => a + b, 0);

  for (let q = 0; q < constructionQuarters && q + 1 < cashFlows.length; q++) {
    cashFlows[q + 1] -= totalConstruction * (sCurveWeights[q] / totalWeight);
  }

  // Marketing cost spread starting from Q2 (launch phase)
  const marketingStartQ = Math.max(2, Math.floor(totalQuarters * 0.25));
  const marketingEndQ = totalQuarters - 1;
  const marketingDuration = marketingEndQ - marketingStartQ + 1;
  if (marketingDuration > 0) {
    const marketingPerQtr = marketingCostCr / marketingDuration;
    for (let q = marketingStartQ; q <= marketingEndQ && q < cashFlows.length; q++) {
      cashFlows[q] -= marketingPerQtr;
    }
  }

  // Revenue inflows: start from Q4 (typical Indian pre-launch from Q3, collections from Q4)
  // Progressive collection curve: slow start, accelerates, tapers
  const revenueStartQ = Math.max(3, Math.floor(totalQuarters * 0.3));
  const revenueEndQ = totalQuarters;
  const revenueDuration = revenueEndQ - revenueStartQ + 1;

  if (revenueDuration > 0) {
    const revenueWeights = [];
    for (let q = 0; q < revenueDuration; q++) {
      const progress = (q + 1) / revenueDuration;
      // Revenue typically front-loaded in India due to pre-sales
      const weight = Math.exp(-2 * (progress - 0.3) * (progress - 0.3)) + 0.2;
      revenueWeights.push(Math.max(0.05, weight));
    }
    const totalRevWeight = revenueWeights.reduce((a, b) => a + b, 0);

    for (let q = 0; q < revenueDuration && q + revenueStartQ < cashFlows.length; q++) {
      cashFlows[q + revenueStartQ] += totalRevenueCr * (revenueWeights[q] / totalRevWeight);
    }
  }

  return cashFlows.map((cf) => Math.round(cf * 100) / 100);
}

/**
 * Calculate Residual Land Value
 * RLV = (Total Revenue - Construction - GST - Approval - Marketing - Finance) / (1 + Developer Margin)
 * @param {object} params
 * @returns {number} Residual Land Value in Crores
 */
function calculateResidualLandValue(params) {
  const {
    totalRevenueCr,
    totalConstructionCostCr,
    gstCostCr,
    approvalCostCr,
    marketingCostCr,
    financeCostCr,
    developerMarginPct,
  } = params;

  const developerMarginDecimal = (developerMarginPct || 20) / 100;

  const residual =
    (totalRevenueCr -
      totalConstructionCostCr -
      gstCostCr -
      approvalCostCr -
      marketingCostCr -
      financeCostCr) /
    (1 + developerMarginDecimal);

  return Math.round(residual * 10000) / 10000;
}

/**
 * Master financial calculation function
 * @param {object} input - All input parameters
 * @returns {object} Complete financial model with all computed values
 */
function calculateFullFinancials(input) {
  // Input validation
  const required = ['plotAreaSqft', 'fsi', 'constructionCostPerSqft', 'sellingRatePerSqft'];
  for (const field of required) {
    if (input[field] === undefined || input[field] === null || isNaN(Number(input[field]))) {
      throw new Error(`Required field missing or invalid: ${field}`);
    }
  }

  // Parse inputs
  const plotAreaSqft = Number(input.plotAreaSqft);
  const fsi = Number(input.fsi);
  const loadingFactor = Number(input.loadingFactor) || 0.65; // 65% avg saleable area in India
  const constructionCostPerSqft = Number(input.constructionCostPerSqft);
  const sellingRatePerSqft = Number(input.sellingRatePerSqft);
  const landCostCr = Number(input.landCostCr) || 0;
  const approvalCostCr = Number(input.approvalCostCr) || 0;
  const marketingCostPct = Number(input.marketingCostPct) || 3.5;
  const financeCostPct = Number(input.financeCostPct) || 12;
  const developerMarginPct = Number(input.developerMarginPct) || 20;
  const projectDurationMonths = Number(input.projectDurationMonths) || 36;
  const discountRatePct = Number(input.discountRatePct) || 12;

  // Validate ranges
  if (plotAreaSqft <= 0) throw new Error('Plot area must be greater than 0');
  if (fsi <= 0 || fsi > 20) throw new Error('FSI must be between 0 and 20');
  if (loadingFactor <= 0 || loadingFactor > 1) throw new Error('Loading factor must be between 0 and 1');
  if (constructionCostPerSqft <= 0) throw new Error('Construction cost must be greater than 0');
  if (sellingRatePerSqft <= 0) throw new Error('Selling rate must be greater than 0');
  if (projectDurationMonths < 6 || projectDurationMonths > 120) throw new Error('Project duration must be between 6 and 120 months');

  // === AREA CALCULATIONS ===
  const grossAreaSqft = plotAreaSqft * fsi;
  const saleableAreaSqft = grossAreaSqft * loadingFactor;
  const carpetAreaSqft = saleableAreaSqft * CARPET_AREA_RATIO;
  const superBuiltupAreaSqft = saleableAreaSqft * SUPER_BUILTUP_RATIO;

  // === REVENUE CALCULATION ===
  const totalRevenueCr = (saleableAreaSqft * sellingRatePerSqft) / 1e7; // Convert to Crores (1 Cr = 1e7)

  // === COST CALCULATIONS ===
  const totalConstructionCostCr = (saleableAreaSqft * constructionCostPerSqft) / 1e7;
  const gstCostCr = totalConstructionCostCr * GST_RATE;
  const stampDutyCr = landCostCr * STAMP_DUTY_RATE;
  const marketingCostCr = totalRevenueCr * (marketingCostPct / 100);

  // Finance cost applied on (land + construction) as base
  const financeCostCr = (landCostCr + totalConstructionCostCr + gstCostCr) * (financeCostPct / 100);

  const totalCostCr =
    landCostCr +
    totalConstructionCostCr +
    gstCostCr +
    stampDutyCr +
    approvalCostCr +
    marketingCostCr +
    financeCostCr;

  // === PROFIT CALCULATIONS ===
  const grossProfitCr = totalRevenueCr - totalCostCr;
  const grossMarginPct = totalRevenueCr > 0 ? (grossProfitCr / totalRevenueCr) * 100 : 0;
  const developerProfitCr = totalRevenueCr * (developerMarginPct / 100);

  // === EQUITY MULTIPLE ===
  const equityInvestedCr = landCostCr + stampDutyCr + approvalCostCr * 0.25; // Upfront equity
  const equityMultiple = equityInvestedCr > 0 ? grossProfitCr / equityInvestedCr : 0;

  // === CASH FLOWS ===
  const cashFlows = buildCashFlows({
    landCostCr,
    totalConstructionCostCr,
    gstCostCr,
    stampDutyCr,
    approvalCostCr,
    marketingCostCr,
    financeParams: { financeCostPct },
    totalRevenueCr,
    projectDurationMonths,
  });

  // === IRR & NPV ===
  let irrPct = null;
  let npvCr = null;

  try {
    irrPct = calculateIRR(cashFlows);
  } catch (e) {
    console.warn('IRR calculation failed:', e.message);
    irrPct = null;
  }

  try {
    npvCr = calculateNPV(cashFlows, discountRatePct / 100);
  } catch (e) {
    console.warn('NPV calculation failed:', e.message);
    npvCr = null;
  }

  // === RESIDUAL LAND VALUE ===
  const residualLandValueCr = calculateResidualLandValue({
    totalRevenueCr,
    totalConstructionCostCr,
    gstCostCr,
    approvalCostCr,
    marketingCostCr,
    financeCostCr,
    developerMarginPct,
  });

  // === SENSITIVITY MATRIX ===
  const sensitivityMatrix = buildSensitivityMatrix({
    plotAreaSqft,
    fsi,
    loadingFactor,
    constructionCostPerSqft,
    sellingRatePerSqft,
    landCostCr,
    approvalCostCr,
    marketingCostPct,
    financeCostPct,
    developerMarginPct,
    projectDurationMonths,
    discountRatePct,
  });

  // Build structured cash flow output
  const structuredCashFlows = {
    quarterly: cashFlows.map((cf, i) => ({
      quarter: i,
      net: Math.round(cf * 100) / 100,
    })),
    summary: {
      totalInflow: Math.round(cashFlows.filter((c) => c > 0).reduce((a, b) => a + b, 0) * 100) / 100,
      totalOutflow: Math.round(Math.abs(cashFlows.filter((c) => c < 0).reduce((a, b) => a + b, 0)) * 100) / 100,
    },
  };

  const round4 = (n) => (n !== null && n !== undefined ? Math.round(n * 10000) / 10000 : null);
  const round2 = (n) => (n !== null && n !== undefined ? Math.round(n * 100) / 100 : null);

  return {
    // Inputs (stored for reference)
    inputs: {
      plotAreaSqft,
      fsi,
      loadingFactor,
      constructionCostPerSqft,
      sellingRatePerSqft,
      landCostCr,
      approvalCostCr,
      marketingCostPct,
      financeCostPct,
      developerMarginPct,
      projectDurationMonths,
      discountRatePct,
    },
    // Area outputs
    grossAreaSqft: round2(grossAreaSqft),
    saleableAreaSqft: round2(saleableAreaSqft),
    carpetAreaSqft: round2(carpetAreaSqft),
    superBuiltupAreaSqft: round2(superBuiltupAreaSqft),
    // Revenue
    totalRevenueCr: round4(totalRevenueCr),
    // Costs
    landCostCr: round4(landCostCr),
    totalConstructionCostCr: round4(totalConstructionCostCr),
    gstCostCr: round4(gstCostCr),
    stampDutyCr: round4(stampDutyCr),
    approvalCostCr: round4(approvalCostCr),
    marketingCostCr: round4(marketingCostCr),
    financeCostCr: round4(financeCostCr),
    totalCostCr: round4(totalCostCr),
    // Profit
    grossProfitCr: round4(grossProfitCr),
    grossMarginPct: round4(grossMarginPct),
    developerProfitCr: round4(developerProfitCr),
    equityMultiple: round4(equityMultiple),
    // Investment metrics
    irrPct: round4(irrPct),
    npvCr: round4(npvCr),
    residualLandValueCr: round4(residualLandValueCr),
    // Cash flows
    cashFlows: structuredCashFlows,
    // Sensitivity
    sensitivityMatrix,
  };
}

/**
 * Build sensitivity matrix: vary selling rate and construction cost ±20% in 5% steps
 * Returns grid of IRR values
 */
function buildSensitivityMatrix(baseParams) {
  const { sellingRatePerSqft, constructionCostPerSqft } = baseParams;

  const variations = [-0.20, -0.15, -0.10, -0.05, 0, 0.05, 0.10, 0.15, 0.20];
  const sellingRates = variations.map((v) => Math.round(sellingRatePerSqft * (1 + v)));
  const constructionCosts = variations.map((v) => Math.round(constructionCostPerSqft * (1 + v)));

  const irrGrid = [];

  for (const ccost of constructionCosts) {
    const row = [];
    for (const srate of sellingRates) {
      try {
        const modifiedParams = {
          ...baseParams,
          sellingRatePerSqft: srate,
          constructionCostPerSqft: ccost,
        };

        const plotAreaSqft = modifiedParams.plotAreaSqft;
        const fsi = modifiedParams.fsi;
        const loadingFactor = modifiedParams.loadingFactor;
        const landCostCr = modifiedParams.landCostCr;
        const approvalCostCr = modifiedParams.approvalCostCr;
        const marketingCostPct = modifiedParams.marketingCostPct;
        const financeCostPct = modifiedParams.financeCostPct;
        const projectDurationMonths = modifiedParams.projectDurationMonths;

        const saleableAreaSqft = plotAreaSqft * fsi * loadingFactor;
        const revenueCr = (saleableAreaSqft * srate) / 1e7;
        const constructionCr = (saleableAreaSqft * ccost) / 1e7;
        const gstCr = constructionCr * GST_RATE;
        const stampCr = landCostCr * STAMP_DUTY_RATE;
        const marketingCr = revenueCr * (marketingCostPct / 100);
        const financeCr = (landCostCr + constructionCr + gstCr) * (financeCostPct / 100);

        const cfs = buildCashFlows({
          landCostCr,
          totalConstructionCostCr: constructionCr,
          gstCostCr: gstCr,
          stampDutyCr: stampCr,
          approvalCostCr,
          marketingCostCr: marketingCr,
          financeParams: { financeCostPct },
          totalRevenueCr: revenueCr,
          projectDurationMonths,
        });

        const irr = calculateIRR(cfs);
        row.push(Math.round(irr * 100) / 100);
      } catch {
        row.push(null);
      }
    }
    irrGrid.push(row);
  }

  return {
    sellingRates,
    constructionCosts,
    irrGrid,
    variations: variations.map((v) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(0)}%`),
  };
}

module.exports = {
  calculateIRR,
  calculateNPV,
  calculateResidualLandValue,
  calculateFullFinancials,
  buildCashFlows,
  buildSensitivityMatrix,
};
