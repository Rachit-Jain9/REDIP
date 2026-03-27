const {
  SQFT_PER_ACRE,
  calculateLandPricing,
  normalizeAreaSqft,
  normalizeAreaUnit,
} = require('../src/utils/landPricing');
const {
  normalizePropertyType,
  normalizeLandPricingBasis,
} = require('../src/constants/domain');

describe('Land pricing utilities', () => {
  test('normalizes acres to square feet', () => {
    expect(normalizeAreaSqft(1, 'acre')).toBe(SQFT_PER_ACRE);
  });

  test('accepts common unit and property aliases', () => {
    expect(normalizeAreaUnit('acres')).toBe('acre');
    expect(normalizePropertyType('land_parcel')).toBe('land');
    expect(normalizeLandPricingBasis('per square foot')).toBe('per_sqft');
  });

  test('computes total price from per-sqft quote', () => {
    const result = calculateLandPricing({
      pricingBasis: 'per_sqft',
      landPriceRateInr: 12000,
      landExtentInputValue: 100000,
      landExtentInputUnit: 'sqft',
    });

    expect(result.computedLandAskPriceCr).toBeCloseTo(120, 4);
    expect(result.computedLandPricePerAcreInr).toBeCloseTo(12000 * SQFT_PER_ACRE, 2);
  });

  test('computes total price from per-acre quote', () => {
    const result = calculateLandPricing({
      pricingBasis: 'per_acre',
      landPriceRateInr: 250000000,
      landExtentInputValue: 2,
      landExtentInputUnit: 'acre',
    });

    expect(result.computedLandAskPriceCr).toBeCloseTo(50, 4);
    expect(result.computedLandPricePerSqftInr).toBeCloseTo(250000000 / SQFT_PER_ACRE, 2);
  });

  test('derives quoted rate from total price when area is known', () => {
    const result = calculateLandPricing({
      pricingBasis: 'total_cr',
      landAskPriceCr: 96,
      propertyAreaSqft: 80000,
    });

    expect(result.computedLandAskPriceCr).toBe(96);
    expect(result.computedLandPricePerSqftInr).toBeCloseTo((96 * 10000000) / 80000, 2);
  });
});
