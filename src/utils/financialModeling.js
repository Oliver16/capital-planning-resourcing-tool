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

const addToYearMap = (target, year, amount) => {
  if (!Number.isFinite(year) || !Number.isFinite(amount)) {
    return;
  }

  if (Math.abs(amount) < 1e-9) {
    return;
  }

  // eslint-disable-next-line no-param-reassign
  target[year] = (target[year] || 0) + amount;
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

const normalizeDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

const allocateProjectSpend = (entry, startDate, months, budget) => {
  const amount = sanitizeNumber(budget, 0);
  const duration = Math.max(1, sanitizePositiveInteger(months, 1));

  if (!(amount > 0)) {
    return;
  }

  const start = normalizeDate(startDate);
  if (!start) {
    return;
  }

  const monthlySpend = amount / duration;
  const cursor = new Date(start.getTime());

  for (let index = 0; index < duration; index += 1) {
    const year = cursor.getFullYear();
    if (Number.isFinite(year)) {
      entry.spendByYear[year] = (entry.spendByYear[year] || 0) + monthlySpend;
      entry.totalSpend += monthlySpend;
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
};

export const buildProjectSpendBreakdown = (projectTimelines = []) => {
  const breakdown = [];

  (projectTimelines || []).forEach((project) => {
    if (!project) {
      return;
    }

    const entry = {
      projectId: project.id ?? null,
      name: project.name || "Unnamed Project",
      type: project.type || "project",
      projectTypeId: project.projectTypeId ?? null,
      fundingSourceId: project.fundingSourceId ?? null,
      deliveryType: project.deliveryType || null,
      designStart: normalizeDate(project.designStart) || normalizeDate(project.designStartDate),
      designEnd: normalizeDate(project.designEnd) || null,
      constructionStart:
        normalizeDate(project.constructionStart) ||
        normalizeDate(project.constructionStartDate),
      constructionEnd: normalizeDate(project.constructionEnd) || null,
      programStart: normalizeDate(project.programStartDate) || null,
      programEnd: normalizeDate(project.programEndDate) || null,
      spendByYear: {},
      totalSpend: 0,
    };

    if (entry.type === "program") {
      const start = entry.programStart || entry.designStart;
      const end = entry.programEnd || entry.designEnd;
      const annualBudget = sanitizeNumber(project.annualBudget, 0);

      if (start && end && annualBudget > 0) {
        const monthlySpend = annualBudget / 12;
        const cursor = new Date(start.getTime());

        while (cursor <= end) {
          const year = cursor.getFullYear();
          if (Number.isFinite(year)) {
            entry.spendByYear[year] =
              (entry.spendByYear[year] || 0) + monthlySpend;
            entry.totalSpend += monthlySpend;
          }
          cursor.setMonth(cursor.getMonth() + 1);
        }
      }

      breakdown.push(entry);
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

    if (!entry.designEnd && entry.designStart && project.designDuration) {
      const designEnd = new Date(entry.designStart.getTime());
      designEnd.setMonth(
        designEnd.getMonth() + Math.max(0, sanitizePositiveInteger(project.designDuration, 0))
      );
      entry.designEnd = designEnd;
    }

    if (
      !entry.constructionEnd &&
      entry.constructionStart &&
      project.constructionDuration
    ) {
      const constructionEnd = new Date(entry.constructionStart.getTime());
      constructionEnd.setMonth(
        constructionEnd.getMonth() +
          Math.max(0, sanitizePositiveInteger(project.constructionDuration, 0))
      );
      entry.constructionEnd = constructionEnd;
    }

    if (designBudget > 0) {
      allocateProjectSpend(
        entry,
        project.designStart || project.designStartDate,
        project.designDuration,
        designBudget
      );
    }

    if (constructionBudget > 0) {
      allocateProjectSpend(
        entry,
        project.constructionStart || project.constructionStartDate,
        project.constructionDuration,
        constructionBudget
      );
    }

    breakdown.push(entry);
  });

  return breakdown.sort((a, b) => {
    const aTime = a.designStart ? a.designStart.getTime() : Number.POSITIVE_INFINITY;
    const bTime = b.designStart ? b.designStart.getTime() : Number.POSITIVE_INFINITY;
    if (aTime === bTime) {
      return (a.name || "").localeCompare(b.name || "");
    }
    return aTime - bTime;
  });
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
  const totalPaymentsByYear = {};
  const interestByYear = {};
  const principalByYear = {};
  const cashUses = {};
  const debtIssuedBySource = {};
  const financingSchedules = [];

  const assumptionMap = buildFundingAssumptionMap(fundingSourceAssumptions);
  const projectionEndYear = startYear + projectionYears;

  const fundingDraws = new Map();

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

      if (financingType === "cash") {
        cashUses[year] = (cashUses[year] || 0) + spendAmount;
        return;
      }

      if (financingType === "grant") {
        return;
      }

      const numericYear = Number(year);
      if (!Number.isFinite(numericYear)) {
        return;
      }

      if (!fundingDraws.has(fundingKey)) {
        fundingDraws.set(fundingKey, {
          assumption,
          draws: new Map(),
        });
      }

      const record = fundingDraws.get(fundingKey);
      record.draws.set(numericYear, (record.draws.get(numericYear) || 0) + spendAmount);
    });
  });

  const pushPayment = (year, payment, interest, principal) => {
    if (Number.isFinite(payment)) {
      addToYearMap(totalPaymentsByYear, year, payment);
    }
    if (Number.isFinite(interest)) {
      addToYearMap(interestByYear, year, interest);
    }
    if (Number.isFinite(principal)) {
      addToYearMap(principalByYear, year, principal);
    }
  };

  const isWithinProjection = (year) =>
    Number.isFinite(year) && year >= startYear && year < projectionEndYear;

  fundingDraws.forEach((record, fundingKey) => {
    const { assumption, draws } = record;
    const financingType = assumption?.financingType || "cash";
    const interestRatePercent = sanitizeNumber(assumption?.interestRate, 0);
    const interestRate = interestRatePercent / 100;
    const termYears = Math.max(1, sanitizePositiveInteger(assumption?.termYears, 1));
    const sourceName =
      assumption?.sourceName ||
      (fundingKey === "unassigned" ? "Unassigned Funding Source" : `Funding Source ${fundingKey}`);

    const drawEntries = Array.from(draws.entries())
      .map(([year, amount]) => ({
        year: Number(year),
        amount: sanitizeNumber(amount, 0),
      }))
      .filter((entry) => Number.isFinite(entry.year) && entry.amount > 0)
      .sort((a, b) => a.year - b.year);

    if (drawEntries.length === 0) {
      return;
    }

    const issuedWithinHorizon = drawEntries.reduce((sum, entry) => {
      if (isWithinProjection(entry.year)) {
        return sum + entry.amount;
      }
      return sum;
    }, 0);

    if (financingType === "srf") {
      const loanDetails = {
        fundingKey,
        sourceName,
        financingType,
        interestRate: interestRatePercent,
        termYears,
        totalIssued: 0,
        interestOnly: [],
        amortization: [],
        amortizationStartYear: null,
        annualPayment: 0,
      };

      const drawMap = new Map();
      drawEntries.forEach((entry) => {
        drawMap.set(entry.year, (drawMap.get(entry.year) || 0) + entry.amount);
      });

      const drawYears = Array.from(drawMap.keys()).sort((a, b) => a - b);
      if (drawYears.length === 0) {
        return;
      }

      const firstDrawYear = drawYears[0];
      const lastDrawYear = drawYears[drawYears.length - 1];
      let outstanding = 0;

      for (let year = firstDrawYear; year <= lastDrawYear; year += 1) {
        const drawAmount = sanitizeNumber(drawMap.get(year) || 0, 0);
        const openingBalance = outstanding;
        outstanding += drawAmount;
        const averageOutstanding = openingBalance + drawAmount / 2;
        const interestPayment = interestRate > 0 ? averageOutstanding * interestRate : 0;

        if (isWithinProjection(year)) {

          pushPayment(year, interestPayment, interestPayment, 0);
          loanDetails.interestOnly.push({
            year,
            drawAmount,
            interestPayment,
            outstandingBalance: outstanding,
          });
        }
      }

      const totalPrincipal = outstanding;
      if (totalPrincipal > 0) {
        loanDetails.totalIssued = totalPrincipal;
        const annualPayment = calculateLevelDebtPayment(totalPrincipal, interestRatePercent, termYears);
        loanDetails.annualPayment = annualPayment;
        loanDetails.amortizationStartYear = lastDrawYear + 1;

        let remainingPrincipal = totalPrincipal;

        for (let i = 0; i < termYears; i += 1) {
          const paymentYear = lastDrawYear + 1 + i;
          const interestPayment = interestRate > 0 ? remainingPrincipal * interestRate : 0;
          let principalPayment = annualPayment - interestPayment;
          if (principalPayment < 0) {
            principalPayment = 0;
          }
          if (principalPayment > remainingPrincipal || i === termYears - 1) {
            principalPayment = remainingPrincipal;
          }
          const paymentAmount = interestPayment + principalPayment;
          remainingPrincipal = Math.max(0, remainingPrincipal - principalPayment);

          if (isWithinProjection(paymentYear)) {

            pushPayment(paymentYear, paymentAmount, interestPayment, principalPayment);
            loanDetails.amortization.push({
              year: paymentYear,
              payment: paymentAmount,
              interestPayment,
              principalPayment,
              remainingBalance: remainingPrincipal,
            });
          }
        }

        if (issuedWithinHorizon > 0) {
          debtIssuedBySource[fundingKey] =
            (debtIssuedBySource[fundingKey] || 0) + issuedWithinHorizon;
        }
      }

      financingSchedules.push(loanDetails);
      return;
    }

    const bondDetails = {
      fundingKey,
      sourceName,
      financingType,
      interestRate: interestRatePercent,
      termYears,
      totalIssued: 0,
      issues: [],
    };

    drawEntries.forEach((entry) => {
      const issueAmount = entry.amount;
      if (!(issueAmount > 0)) {
        return;
      }

      const annualPayment = calculateLevelDebtPayment(issueAmount, interestRatePercent, termYears);
      const paymentStartYear = entry.year + 1;
      const issueDetail = {
        year: entry.year,
        amount: issueAmount,
        paymentStartYear,
        annualPayment,
        firstYearInterest: 0,
        firstYearPrincipal: 0,
        paymentsWithinHorizon: [],
      };

      let remainingPrincipal = issueAmount;

      for (let i = 0; i < termYears; i += 1) {
        const paymentYear = paymentStartYear + i;
        const interestPayment = interestRate > 0 ? remainingPrincipal * interestRate : 0;
        let principalPayment = annualPayment - interestPayment;
        if (principalPayment < 0) {
          principalPayment = 0;
        }
        if (principalPayment > remainingPrincipal || i === termYears - 1) {
          principalPayment = remainingPrincipal;
        }
        const paymentAmount = interestPayment + principalPayment;
        remainingPrincipal = Math.max(0, remainingPrincipal - principalPayment);

        if (i === 0) {
          issueDetail.firstYearInterest = interestPayment;
          issueDetail.firstYearPrincipal = principalPayment;
        }

        if (isWithinProjection(paymentYear)) {

          pushPayment(paymentYear, paymentAmount, interestPayment, principalPayment);
          issueDetail.paymentsWithinHorizon.push({
            year: paymentYear,
            payment: paymentAmount,
            interestPayment,
            principalPayment,
            remainingBalance: remainingPrincipal,
          });
        }
      }

      bondDetails.issues.push(issueDetail);
      bondDetails.totalIssued += issueAmount;
      if (isWithinProjection(entry.year)) {
        debtIssuedBySource[fundingKey] =
          (debtIssuedBySource[fundingKey] || 0) + issueAmount;
      }

    });

    if (bondDetails.totalIssued > 0) {
      financingSchedules.push(bondDetails);
    }
  });

  return {
    debtServiceByYear: totalPaymentsByYear,
    debtServiceInterestByYear: interestByYear,
    debtServicePrincipalByYear: principalByYear,
    cashUsesByYear: cashUses,
    debtIssuedBySource,
    financingSchedules,
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
  const {
    debtServiceByYear,
    debtServiceInterestByYear,
    debtServicePrincipalByYear,
    cashUsesByYear,
    debtIssuedBySource,
    financingSchedules,
  } = buildDebtServiceSchedule(
    spendPlan,
    fundingSourceAssumptions,
    startYear,
    projectionYears
  );

  const years = [];
  for (let i = 0; i < projectionYears; i += 1) {
    years.push(startYear + i);
  }

  const projectionYearKeys = new Set(years.map((year) => String(year)));

  const spendPlanWithinWindow = {};
  Object.entries(spendPlan || {}).forEach(([yearKey, entry]) => {
    if (projectionYearKeys.has(yearKey)) {
      spendPlanWithinWindow[yearKey] = entry;
    }
  });

  const cashUsesWithinWindow = {};
  years.forEach((year) => {
    const value = sanitizeNumber(cashUsesByYear?.[year], 0);
    cashUsesWithinWindow[year] = Math.abs(value) > 1e-9 ? value : 0;
  });

  const filteredDebtIssuedBySource = Object.fromEntries(
    Object.entries(debtIssuedBySource || {})
      .map(([key, amount]) => [key, sanitizeNumber(amount, 0)])
      .filter(([, amount]) => Math.abs(amount) > 1e-9)
  );

  const forecast = [];
  let runningCash = startingCash;
  let minCoverage = Number.POSITIVE_INFINITY;
  let minDaysCashOnHand = Number.POSITIVE_INFINITY;
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
    const cashCapex = sanitizeNumber(cashUsesWithinWindow[year], 0);
    runningCash += operatingCashFlow - cashCapex;

    const daysCashOnHand =
      totalOperatingExpenses > 0
        ? (runningCash / totalOperatingExpenses) * 365
        : null;

    if (daysCashOnHand !== null && daysCashOnHand < minDaysCashOnHand) {
      minDaysCashOnHand = daysCashOnHand;
    }

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
      cipSpend: sanitizeNumber(spendPlanWithinWindow[year]?.totalSpend, 0),
      endingCashBalance: runningCash,
      daysCashOnHand,
    });
  });

  if (!Number.isFinite(minCoverage)) {
    minCoverage = null;
  }

  if (!Number.isFinite(minDaysCashOnHand)) {
    minDaysCashOnHand = null;
  }

  const totalCapitalSpend = years.reduce(
    (sum, year) => sum + sanitizeNumber(spendPlanWithinWindow?.[year]?.totalSpend, 0),
    0
  );
  const totalCashCapex = years.reduce(
    (sum, year) => sum + sanitizeNumber(cashUsesWithinWindow[year], 0),
    0
  );
  const totalDebtIssued = Object.values(filteredDebtIssuedBySource).reduce(
    (sum, value) => sum + sanitizeNumber(value, 0),
    0
  );

  return {
    forecast,
    spendPlan: spendPlanWithinWindow,
    debtServiceByYear,
    debtServiceInterestByYear,
    debtServicePrincipalByYear,
    cashUsesByYear: cashUsesWithinWindow,
    debtIssuedBySource: filteredDebtIssuedBySource,
    financingSchedules,
    totals: {
      totalCapitalSpend,
      totalCashCapex,
      totalDebtIssued,
      minCoverageRatio: minCoverage,
      endingCashBalance: forecast[forecast.length - 1]?.endingCashBalance ?? startingCash,
      maxAdditionalRateIncrease,
      minDaysCashOnHand,
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

export const formatCoverageRatio = (value, decimals = 2) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "—";
  }
  return `${numeric.toFixed(decimals)}x`;
};

