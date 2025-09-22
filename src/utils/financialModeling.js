const sanitizeNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const sanitizePositiveInteger = (value, fallback = 0) => {
  const numeric = parseInt(value, 10);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
};

const sanitizePercent = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const cloneBudgetRow = (year, template) => ({
  year,
  operatingRevenue: sanitizeNumber(template?.operatingRevenue),
  nonOperatingRevenue: sanitizeNumber(template?.nonOperatingRevenue),
  omExpenses: sanitizeNumber(template?.omExpenses),
  salaries: sanitizeNumber(template?.salaries),
  adminExpenses: sanitizeNumber(template?.adminExpenses),
  existingDebtService: sanitizeNumber(template?.existingDebtService),
  rateIncreasePercent: sanitizePercent(template?.rateIncreasePercent),
});

export const generateDefaultOperatingBudget = (startYear, years = 5) => {
  const baseYear = sanitizePositiveInteger(startYear, new Date().getFullYear());
  const totalYears = Math.max(1, sanitizePositiveInteger(years, 5));
  const rows = [];

  for (let i = 0; i < totalYears; i += 1) {
    rows.push(
      cloneBudgetRow(baseYear + i, {
        operatingRevenue: 0,
        nonOperatingRevenue: 0,
        omExpenses: 0,
        salaries: 0,
        adminExpenses: 0,
        existingDebtService: 0,
        rateIncreasePercent: 0,
      })
    );
  }

  return rows;
};

export const ensureBudgetYears = (rows, startYear, projectionYears) => {
  const desiredStart = sanitizePositiveInteger(
    startYear,
    new Date().getFullYear()
  );
  const yearsNeeded = Math.max(1, sanitizePositiveInteger(projectionYears, 1));
  const existingMap = new Map();

  (rows || []).forEach((row) => {
    if (row && Number.isFinite(row.year)) {
      existingMap.set(Number(row.year), { ...row, year: Number(row.year) });
    }
  });

  const result = [];
  let lastTemplate = null;

  for (let offset = 0; offset < yearsNeeded; offset += 1) {
    const year = desiredStart + offset;
    if (existingMap.has(year)) {
      const existing = existingMap.get(year);
      result.push({
        ...existing,
        year,
      });
      lastTemplate = existing;
    } else {
      const template = lastTemplate || existingMap.get(year - 1);
      result.push(cloneBudgetRow(year, template));
      lastTemplate = template;
    }
  }

  return result;
};

const FINANCING_TYPE_PRESETS = {
  bond: {
    interestRate: 4.25,
    termYears: 25,
  },
  srf: {
    interestRate: 2.0,
    termYears: 30,
  },
  cash: {
    interestRate: 0,
    termYears: 0,
  },
  grant: {
    interestRate: 0,
    termYears: 0,
  },
};

const inferFinancingType = (fundingSource) => {
  if (!fundingSource || !fundingSource.name) {
    return "cash";
  }

  const name = fundingSource.name.toLowerCase();

  if (name.includes("bond")) {
    return "bond";
  }

  if (name.includes("loan") || name.includes("srf") || name.includes("revolving")) {
    return "srf";
  }

  if (name.includes("grant")) {
    return "grant";
  }

  return "cash";
};

export const createDefaultFundingAssumption = (fundingSource) => {
  const financingType = inferFinancingType(fundingSource);
  const preset = FINANCING_TYPE_PRESETS[financingType] || FINANCING_TYPE_PRESETS.cash;

  return {
    fundingSourceId: fundingSource?.id ?? null,
    sourceName: fundingSource?.name ?? "Unassigned Funding Source",
    financingType,
    interestRate: preset.interestRate,
    termYears: preset.termYears,
  };
};

export const generateDefaultFundingAssumptions = (fundingSources = []) => {
  return (fundingSources || []).map((source) => createDefaultFundingAssumption(source));
};

const ensureYearEntry = (plan, year) => {
  if (!plan[year]) {
    plan[year] = {
      designSpend: 0,
      constructionSpend: 0,
      programSpend: 0,
      totalSpend: 0,
      byFundingSource: {},
    };
  }
  return plan[year];
};

const addSpend = (plan, year, amount, fundingSourceId, type) => {
  if (!Number.isFinite(year) || !Number.isFinite(amount) || amount <= 0) {
    return;
  }
  const yearEntry = ensureYearEntry(plan, year);
  const fundingKey = fundingSourceId == null ? "unassigned" : String(fundingSourceId);
  yearEntry.totalSpend += amount;
  if (type === "design") {
    yearEntry.designSpend += amount;
  } else if (type === "construction") {
    yearEntry.constructionSpend += amount;
  } else if (type === "program") {
    yearEntry.programSpend += amount;
  }

  yearEntry.byFundingSource[fundingKey] =
    (yearEntry.byFundingSource[fundingKey] || 0) + amount;
};

const allocateEvenMonthlySpend = (startDate, months, budget, fundingSourceId, plan, type) => {
  const amount = sanitizeNumber(budget, 0);
  const duration = Math.max(1, sanitizePositiveInteger(months, 1));
  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }

  const start = startDate instanceof Date ? startDate : new Date(startDate);
  if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
    return;
  }

  const monthlySpend = amount / duration;
  const cursor = new Date(start.getTime());

  for (let i = 0; i < duration; i += 1) {
    const year = cursor.getFullYear();
    addSpend(plan, year, monthlySpend, fundingSourceId, type);
    cursor.setMonth(cursor.getMonth() + 1);
  }
};

const allocateProgramSpend = (project, plan) => {
  const annualBudget = sanitizeNumber(project?.annualBudget, 0);
  if (!annualBudget || annualBudget <= 0) {
    return;
  }

  const start = project?.programStartDate
    ? new Date(project.programStartDate)
    : project?.designStart instanceof Date
    ? project.designStart
    : null;
  const end = project?.programEndDate
    ? new Date(project.programEndDate)
    : project?.constructionEnd instanceof Date
    ? project.constructionEnd
    : null;

  if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) {
    return;
  }

  const monthlySpend = annualBudget / 12;
  const cursor = new Date(start.getTime());
  while (cursor <= end) {
    const year = cursor.getFullYear();
    addSpend(plan, year, monthlySpend, project?.fundingSourceId, "program");
    cursor.setMonth(cursor.getMonth() + 1);
  }
};

export const buildProjectSpendPlan = (projectTimelines = []) => {
  const spendPlan = {};

  (projectTimelines || []).forEach((project) => {
    if (!project) {
      return;
    }

    if (project.type === "program") {
      allocateProgramSpend(project, spendPlan);
      return;
    }

    const designBudget = sanitizeNumber(
      project.designBudget ??
        (project.totalBudget && project.designBudgetPercent
          ? (project.totalBudget * project.designBudgetPercent) / 100
          : 0),
      0
    );
    const constructionBudget = sanitizeNumber(
      project.constructionBudget ??
        (project.totalBudget && project.constructionBudgetPercent
          ? (project.totalBudget * project.constructionBudgetPercent) / 100
          : 0),
      0
    );

    if (designBudget > 0) {
      const designDuration = Math.max(1, sanitizePositiveInteger(project.designDuration, 1));
      const designStart = project.designStart || project.designStartDate;
      allocateEvenMonthlySpend(
        designStart,
        designDuration,
        designBudget,
        project.fundingSourceId,
        spendPlan,
        "design"
      );
    }

    if (constructionBudget > 0) {
      const constructionDuration = Math.max(
        1,
        sanitizePositiveInteger(project.constructionDuration, 1)
      );
      const constructionStart = project.constructionStart || project.constructionStartDate;
      allocateEvenMonthlySpend(
        constructionStart,
        constructionDuration,
        constructionBudget,
        project.fundingSourceId,
        spendPlan,
        "construction"
      );
    }
  });

  return spendPlan;
};

const buildFundingAssumptionMap = (assumptions = []) => {
  const map = new Map();
  (assumptions || []).forEach((assumption) => {
    if (!assumption) {
      return;
    }
    const key = assumption.fundingSourceId == null
      ? "unassigned"
      : String(assumption.fundingSourceId);
    map.set(key, assumption);
  });
  return map;
};

const calculateLevelDebtPayment = (principal, interestRatePercent, termYears) => {
  const principalAmount = sanitizeNumber(principal, 0);
  const term = Math.max(1, sanitizePositiveInteger(termYears, 1));
  const ratePercent = sanitizeNumber(interestRatePercent, 0);
  const rate = ratePercent / 100;

  if (rate <= 0) {
    return principalAmount / term;
  }

  const factor = rate * (1 + rate) ** term;
  return (principalAmount * factor) / ((1 + rate) ** term - 1);
};

export const buildDebtServiceSchedule = (
  spendPlan,
  fundingSourceAssumptions,
  startYear,
  projectionYears
) => {
  const schedule = {};
  const cashUses = {};
  const debtIssuedBySource = {};
  const assumptionMap = buildFundingAssumptionMap(fundingSourceAssumptions);

  const years = Object.keys(spendPlan)
    .map((year) => Number(year))
    .filter((year) => Number.isFinite(year))
    .sort((a, b) => a - b);

  years.forEach((year) => {
    const yearEntry = spendPlan[year];
    if (!yearEntry) {
      return;
    }

    Object.entries(yearEntry.byFundingSource || {}).forEach(([fundingKey, amount]) => {
      const spendAmount = sanitizeNumber(amount, 0);
      if (!(spendAmount > 0)) {
        return;
      }

      const assumption = assumptionMap.get(fundingKey);
      const financingType = assumption?.financingType || "cash";

      if (financingType === "cash" || financingType === "grant") {
        cashUses[year] = (cashUses[year] || 0) + (financingType === "cash" ? spendAmount : 0);
        return;
      }

      const termYears = Math.max(1, sanitizePositiveInteger(assumption?.termYears, 1));
      const payment = calculateLevelDebtPayment(
        spendAmount,
        sanitizeNumber(assumption?.interestRate, 0),
        termYears
      );

      const firstPaymentYear = Number(year) + 1;
      for (let i = 0; i < termYears; i += 1) {
        const paymentYear = firstPaymentYear + i;
        if (
          Number.isFinite(paymentYear) &&
          paymentYear >= startYear &&
          paymentYear < startYear + projectionYears
        ) {
          schedule[paymentYear] = (schedule[paymentYear] || 0) + payment;
        }
      }

      debtIssuedBySource[fundingKey] =
        (debtIssuedBySource[fundingKey] || 0) + spendAmount;
    });
  });

  return {
    debtServiceByYear: schedule,
    cashUsesByYear: cashUses,
    debtIssuedBySource,
  };
};

const safeDivide = (numerator, denominator) => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null;
  }
  return numerator / denominator;
};

export const calculateFinancialForecast = ({
  projectTimelines = [],
  operatingBudget = [],
  financialConfig = {},
  fundingSourceAssumptions = [],
}) => {
  const startYear = sanitizePositiveInteger(
    financialConfig?.startYear,
    new Date().getFullYear()
  );
  const projectionYears = Math.max(1, sanitizePositiveInteger(financialConfig?.projectionYears, 10));
  const startingCash = sanitizeNumber(financialConfig?.startingCashBalance, 0);
  const targetCoverageRatio = sanitizeNumber(financialConfig?.targetCoverageRatio, 1.25);

  const normalizedBudget = ensureBudgetYears(operatingBudget, startYear, projectionYears);
  const budgetMap = new Map(normalizedBudget.map((row) => [row.year, row]));

  const spendPlan = buildProjectSpendPlan(projectTimelines);
  const { debtServiceByYear, cashUsesByYear, debtIssuedBySource } = buildDebtServiceSchedule(
    spendPlan,
    fundingSourceAssumptions,
    startYear,
    projectionYears
  );

  const years = [];
  for (let i = 0; i < projectionYears; i += 1) {
    years.push(startYear + i);
  }

  const forecast = [];
  let runningCash = startingCash;
  let minCoverage = Number.POSITIVE_INFINITY;
  let maxAdditionalRateIncrease = 0;

  years.forEach((year) => {
    const budgetRow = budgetMap.get(year) || cloneBudgetRow(year, null);
    const baseOperatingRevenue = sanitizeNumber(budgetRow.operatingRevenue, 0);
    const plannedRateIncreasePercent = sanitizePercent(budgetRow.rateIncreasePercent, 0);
    const adjustedOperatingRevenue =
      baseOperatingRevenue * (1 + plannedRateIncreasePercent / 100);
    const nonOperatingRevenue = sanitizeNumber(budgetRow.nonOperatingRevenue, 0);
    const omExpenses = sanitizeNumber(budgetRow.omExpenses, 0);
    const salaries = sanitizeNumber(budgetRow.salaries, 0);
    const adminExpenses = sanitizeNumber(budgetRow.adminExpenses, 0);
    const existingDebtService = sanitizeNumber(budgetRow.existingDebtService, 0);

    const totalOperatingExpenses = omExpenses + salaries + adminExpenses;
    const netRevenueBeforeDebt =
      adjustedOperatingRevenue + nonOperatingRevenue - totalOperatingExpenses;

    const newDebtService = sanitizeNumber(debtServiceByYear[year], 0);
    const totalDebtService = existingDebtService + newDebtService;
    const coverageRatio =
      totalDebtService > 0 ? netRevenueBeforeDebt / totalDebtService : null;

    if (coverageRatio !== null && coverageRatio < minCoverage) {
      minCoverage = coverageRatio;
    }

    const requiredNetRevenue =
      totalDebtService > 0 ? targetCoverageRatio * totalDebtService : 0;
    const revenueShortfall = requiredNetRevenue - netRevenueBeforeDebt;
    let additionalRateIncreaseNeeded = 0;
    if (revenueShortfall > 0 && baseOperatingRevenue > 0) {
      additionalRateIncreaseNeeded =
        (revenueShortfall / baseOperatingRevenue) * 100;
    }

    if (additionalRateIncreaseNeeded > maxAdditionalRateIncrease) {
      maxAdditionalRateIncrease = additionalRateIncreaseNeeded;
    }

    const operatingCashFlow = netRevenueBeforeDebt - totalDebtService;
    const cashCapex = sanitizeNumber(cashUsesByYear[year], 0);
    runningCash += operatingCashFlow - cashCapex;

    forecast.push({
      year,
      baseOperatingRevenue,
      adjustedOperatingRevenue,
      plannedRateIncreasePercent,
      nonOperatingRevenue,
      omExpenses,
      salaries,
      adminExpenses,
      totalOperatingExpenses,
      netRevenueBeforeDebt,
      existingDebtService,
      newDebtService,
      totalDebtService,
      coverageRatio,
      additionalRateIncreaseNeeded,
      cashFundedCapex: cashCapex,
      cipSpend: sanitizeNumber(spendPlan[year]?.totalSpend, 0),
      endingCashBalance: runningCash,
    });
  });

  if (!Number.isFinite(minCoverage)) {
    minCoverage = null;
  }

  const totalCapitalSpend = Object.values(spendPlan).reduce(
    (sum, entry) => sum + sanitizeNumber(entry?.totalSpend, 0),
    0
  );
  const totalCashCapex = Object.values(cashUsesByYear).reduce(
    (sum, value) => sum + sanitizeNumber(value, 0),
    0
  );
  const totalDebtIssued = Object.values(debtIssuedBySource).reduce(
    (sum, value) => sum + sanitizeNumber(value, 0),
    0
  );

  return {
    forecast,
    spendPlan,
    debtServiceByYear,
    cashUsesByYear,
    debtIssuedBySource,
    totals: {
      totalCapitalSpend,
      totalCashCapex,
      totalDebtIssued,
      minCoverageRatio: minCoverage,
      endingCashBalance: forecast[forecast.length - 1]?.endingCashBalance ?? startingCash,
      maxAdditionalRateIncrease,
    },
  };
};

export const FINANCING_TYPE_OPTIONS = [
  { value: "cash", label: "Pay-Go Cash" },
  { value: "bond", label: "Revenue Bond" },
  { value: "srf", label: "SRF Loan" },
  { value: "grant", label: "Grant / External" },
];

export const formatCurrency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(numeric);
};

export const formatPercent = (value, options = {}) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }
  return `${numeric.toFixed(options.decimals ?? 1)}%`;
};

