import { __TEST_ONLY } from '../useDatabase';

const { sanitizeFinancialConfig, sanitizeFiscalYear, operatingBudgetToRow } =
  __TEST_ONLY;

describe('sanitizeFiscalYear', () => {
  it('returns fallback when value is null or undefined', () => {
    expect(sanitizeFiscalYear(null, 2030)).toBe(2030);
    expect(sanitizeFiscalYear(undefined, 2040)).toBe(2040);
  });

  it('normalizes numeric and string inputs within the valid range', () => {
    expect(sanitizeFiscalYear(2024)).toBe(2024);
    expect(sanitizeFiscalYear('2026')).toBe(2026);
    expect(sanitizeFiscalYear('2050.4')).toBe(2050);
  });

  it('extracts four digit years embedded in formatted strings', () => {
    expect(sanitizeFiscalYear('FY2028')).toBe(2028);
    expect(sanitizeFiscalYear('Budget FY 2031/32')).toBe(2031);
  });

  it('rejects out-of-range values', () => {
    expect(sanitizeFiscalYear(1899, 2025)).toBe(2025);
    expect(sanitizeFiscalYear('1200', 2025)).toBe(2025);
    expect(sanitizeFiscalYear('abc', 2025)).toBe(2025);
  });
});

describe('sanitizeFinancialConfig', () => {
  it('falls back to the current year when start year is missing or invalid', () => {
    const currentYear = new Date().getFullYear();
    expect(sanitizeFinancialConfig({}).startYear).toBe(currentYear);
    expect(sanitizeFinancialConfig({ startYear: null }).startYear).toBe(currentYear);
    expect(sanitizeFinancialConfig({ startYear: 1890 }).startYear).toBe(currentYear);
  });

  it('preserves valid configuration values', () => {
    const config = sanitizeFinancialConfig({
      startYear: 2028,
      projectionYears: 7,
      startingCashBalance: '500000',
      targetCoverageRatio: 1.75,
    });

    expect(config.startYear).toBe(2028);
    expect(config.projectionYears).toBe(7);
    expect(config.startingCashBalance).toBe(500000);
    expect(config.targetCoverageRatio).toBe(1.75);
  });
});

describe('operatingBudgetToRow', () => {
  const sampleRow = {
    year: 2027,
    revenueLineItems: [
      { id: 'utilitySales', amount: 1250000 },
      { id: 'nonOperatingRevenue', amount: 45000 },
    ],
    expenseLineItems: [
      { id: 'operationsMaintenance', amount: 510000 },
      { id: 'otherAdministrative', amount: 225000 },
    ],
    rateIncreasePercent: 3.25,
    existingDebtService: 150000,
  };

  it('returns a normalized persistence payload when inputs are valid', () => {
    const payload = operatingBudgetToRow('org-1', 'water', sampleRow);

    expect(payload).not.toBeNull();
    expect(payload.organization_id).toBe('org-1');
    expect(payload.utility_key).toBe('water');
    expect(payload.fiscal_year).toBe(2027);
    expect(payload.operating_revenue).toBe(1250000);
    expect(payload.non_operating_revenue).toBe(45000);
    expect(payload.om_expenses).toBe(510000);
    expect(payload.admin_expenses).toBe(225000);

    const revenueItems = JSON.parse(payload.revenue_line_items);
    const expenseItems = JSON.parse(payload.expense_line_items);
    expect(Array.isArray(revenueItems)).toBe(true);
    expect(Array.isArray(expenseItems)).toBe(true);
  });

  it('returns null when utility key or fiscal year is invalid', () => {
    expect(operatingBudgetToRow('org-1', 'invalid', sampleRow)).toBeNull();
    expect(operatingBudgetToRow('org-1', 'water', { ...sampleRow, year: 1899 })).toBeNull();
  });
});
