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

const sanitizeFiscalYearStartMonth = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 1;
  }

  const rounded = Math.round(numeric);
  if (rounded < 1) {
    return 1;
  }

  if (rounded > 12) {
    return 12;
  }

  return rounded;
};

const getFiscalYear = (date, fiscalYearStartMonth = 1) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  const sanitizedStartMonth = sanitizeFiscalYearStartMonth(fiscalYearStartMonth);
  const monthIndex = date.getMonth();
  const year = date.getFullYear();

  if (!Number.isFinite(year)) {
    return null;
  }

  if (sanitizedStartMonth <= 1) {
    return year;
  }

  const startIndex = sanitizedStartMonth - 1;
  return monthIndex >= startIndex ? year + 1 : year;
};

const advanceToNextMonth = (cursor) => {
  if (!(cursor instanceof Date) || Number.isNaN(cursor.getTime())) {
    return;
  }

  cursor.setDate(1);
  cursor.setMonth(cursor.getMonth() + 1);
};

const sanitizeLineItemId = (id, label, prefix) => {
  if (id !== undefined && id !== null) {
    const stringId = String(id).trim();
    if (stringId) {
      return stringId;
    }
  }

  if (typeof label === "string") {
    const slug = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    if (slug) {
      return slug;
    }
  }

  const base = prefix || "line";
  return `${base}-${Math.random().toString(36).slice(2, 10)}`;
};

export const DEFAULT_OPERATING_REVENUE_LINE_ITEMS = [
  {
    id: "utilitySales",
    label: "Utility Sales (Water/Electric/Gas/Sewer)",
    description: "Base service sales and volumetric charges.",
    category: "revenue",
    revenueType: "operating",
  },
  {
    id: "sewerCharges",
    label: "Sewer Charges",
    description: "Usage-based sewer fees when applicable.",
    category: "revenue",
    revenueType: "operating",
  },
  {
    id: "customerPenalties",
    label: "Customer Penalties / Late Fees",
    description: "Delinquency and reconnection penalties.",
    category: "revenue",
    revenueType: "operating",
  },
  {
    id: "serviceCharges",
    label: "Service Charges",
    description: "Connection, reconnection, and account service fees.",
    category: "revenue",
    revenueType: "operating",
  },
  {
    id: "tapMeterFees",
    label: "Tap & Meter Fees",
    description: "Tap, meter set, and related installation fees.",
    category: "revenue",
    revenueType: "operating",
  },
  {
    id: "fireProtectionFees",
    label: "Fire Protection / Sprinkler Fees",
    description: "Dedicated fire protection and sprinkler service fees.",
    category: "revenue",
    revenueType: "operating",
  },
  {
    id: "otherServiceFees",
    label: "Other Service Fees",
    description: "Miscellaneous billed service activity.",
    category: "revenue",
    revenueType: "operating",
  },
  {
    id: "otherOperatingRevenue",
    label: "Other Operating Revenues",
    description: "All other recurring operating revenue streams.",
    category: "revenue",
    revenueType: "operating",
  },
  {
    id: "nonOperatingRevenue",
    label: "Non-Operating Revenues",
    description: "Interest income, grants, and other non-operating receipts.",
    category: "revenue",
    revenueType: "nonOperating",
  },
];

export const DEFAULT_OPERATING_EXPENSE_LINE_ITEMS = [
  {
    id: "purchasedSupplyProduction",
    label: "Purchased Supply & Production",
    description: "Purchased water/power and production costs.",
    category: "expense",
  },
  {
    id: "purchasedEnergy",
    label: "Purchased Power/Gas/Water",
    description: "Wholesale energy or water purchases.",
    category: "expense",
  },
  {
    id: "plantPayroll",
    label: "Plant Payroll",
    description: "Operations staff wages for treatment plants.",
    category: "expense",
  },
  {
    id: "chemicalsSupplies",
    label: "Chemicals & Supplies",
    description: "Chemicals and consumable supplies.",
    category: "expense",
  },
  {
    id: "testingLabServices",
    label: "Testing & Lab Services",
    description: "Laboratory and regulatory testing services.",
    category: "expense",
  },
  {
    id: "plantUtilities",
    label: "Plant Utilities",
    description: "Utilities for treatment and production facilities.",
    category: "expense",
  },
  {
    id: "operationsMaintenance",
    label: "Operations & Maintenance",
    description: "Field operations, routine maintenance, and supplies.",
    category: "expense",
  },
  {
    id: "distributionPlant",
    label: "Distribution Plant/Mains/Meters",
    description: "Distribution system maintenance and replacements.",
    category: "expense",
  },
  {
    id: "repairsMaintenance",
    label: "Repairs & Maintenance",
    description: "Unplanned repairs and corrective maintenance.",
    category: "expense",
  },
  {
    id: "vehiclesFuel",
    label: "Vehicles & Fuel",
    description: "Fleet and fuel costs.",
    category: "expense",
  },
  {
    id: "toolsUniformsEquipment",
    label: "Tools, Uniforms, Equipment",
    description: "Tools, safety gear, and equipment purchases.",
    category: "expense",
  },
  {
    id: "administrativeSalaries",
    label: "Administrative Salaries",
    description: "Administration and support staff salaries.",
    category: "expense",
  },
  {
    id: "employeeBenefits",
    label: "Employee Benefits",
    description: "Benefits, pensions, and healthcare costs.",
    category: "expense",
  },
  {
    id: "payrollTaxes",
    label: "Payroll Taxes",
    description: "Payroll-related taxes and contributions.",
    category: "expense",
  },
  {
    id: "insurance",
    label: "Insurance",
    description: "Property, liability, and other insurance premiums.",
    category: "expense",
  },
  {
    id: "otherAdministrative",
    label: "Other Administrative",
    description: "Remaining administrative costs not captured above.",
    category: "expense",
  },
];

const buildDefaultDefinitionMaps = (defaults) => {
  const byId = new Map();
  const byLabel = new Map();

  defaults.forEach((definition) => {
    if (!definition) {
      return;
    }

    const sanitizedId = sanitizeLineItemId(
      definition.id,
      definition.label,
      definition.category
    );
    const normalizedDefinition = {
      ...definition,
      id: sanitizedId,
    };

    byId.set(sanitizedId, normalizedDefinition);
    if (definition.label) {
      byLabel.set(definition.label.toLowerCase(), normalizedDefinition);
    }
  });

  return { byId, byLabel };
};

const normalizeLineItemArray = (items, defaults, category) => {
  const normalized = [];
  const seen = new Set();
  const sourceItems = Array.isArray(items) ? items : [];
  const { byId, byLabel } = buildDefaultDefinitionMaps(defaults);

  const appendItem = (definition, override = {}, isCustom = false) => {
    const merged = {
      ...definition,
      ...override,
    };
    const finalId = sanitizeLineItemId(merged.id, merged.label, category);
    const baseDescription =
      override.description !== undefined
        ? override.description
        : definition?.description;

    normalized.push({
      id: finalId,
      label: merged.label || definition?.label || finalId,
      description: baseDescription || (isCustom ? "Custom entry" : ""),
      category,
      revenueType:
        category === "revenue"
          ? merged.revenueType || definition?.revenueType || "operating"
          : null,
      isCustom: merged.isCustom ?? isCustom ?? false,
      amount: sanitizeNumber(merged.amount, 0),
    });

    seen.add(finalId);
  };

  sourceItems.forEach((item) => {
    if (!item) {
      return;
    }

    const lookupId = sanitizeLineItemId(item.id, item.label, category);
    let definition = byId.get(lookupId);

    if (!definition && item.label) {
      definition = byLabel.get(item.label.toLowerCase());
    }

    const finalDefinition = definition
      ? { ...definition }
      : { id: lookupId, category };

    appendItem(finalDefinition, { ...item, id: finalDefinition.id }, !definition);
  });

  defaults.forEach((definition) => {
    if (!definition) {
      return;
    }

    const id = sanitizeLineItemId(definition.id, definition.label, category);
    if (seen.has(id)) {
      return;
    }

    appendItem({ ...definition, id });
  });

  return normalized;
};

export const sumLineItems = (items = [], predicate) =>
  (Array.isArray(items) ? items : []).reduce((sum, item) => {
    if (!item) {
      return sum;
    }
    if (predicate && !predicate(item)) {
      return sum;
    }
    return sum + sanitizeNumber(item.amount, 0);
  }, 0);

const attachBudgetTotals = (row) => {
  const revenueLineItems = normalizeLineItemArray(
    row.revenueLineItems,
    DEFAULT_OPERATING_REVENUE_LINE_ITEMS,
    "revenue"
  ).map((item) => ({ ...item }));

  const expenseLineItems = normalizeLineItemArray(
    row.expenseLineItems,
    DEFAULT_OPERATING_EXPENSE_LINE_ITEMS,
    "expense"
  ).map((item) => ({ ...item }));

  const operatingRevenue = sumLineItems(
    revenueLineItems,
    (item) => item.revenueType !== "nonOperating"
  );
  const nonOperatingRevenue = sumLineItems(
    revenueLineItems,
    (item) => item.revenueType === "nonOperating"
  );
  const totalOperatingExpenses = sumLineItems(expenseLineItems);

  return {
    ...row,
    revenueLineItems,
    expenseLineItems,
    operatingRevenue,
    nonOperatingRevenue,
    totalOperatingExpenses,
  };
};

export const normalizeBudgetRow = (row = {}) => {
  const numericYear = Number(row.year);
  const normalizedYear = Number.isFinite(numericYear)
    ? numericYear
    : sanitizePositiveInteger(row.year, null);

  return attachBudgetTotals({
    year: normalizedYear,
    revenueLineItems: row.revenueLineItems,
    expenseLineItems: row.expenseLineItems,
    rateIncreasePercent: sanitizePercent(row.rateIncreasePercent),
    existingDebtService: sanitizeNumber(row.existingDebtService),
  });
};

const cloneBudgetRow = (year, template) => {
  const normalizedTemplate = template ? normalizeBudgetRow(template) : null;

  return attachBudgetTotals({
    year,
    revenueLineItems: normalizedTemplate
      ? normalizedTemplate.revenueLineItems.map((item) => ({ ...item }))
      : DEFAULT_OPERATING_REVENUE_LINE_ITEMS.map((item) => ({
          ...item,
          amount: 0,
        })),
    expenseLineItems: normalizedTemplate
      ? normalizedTemplate.expenseLineItems.map((item) => ({ ...item }))
      : DEFAULT_OPERATING_EXPENSE_LINE_ITEMS.map((item) => ({
          ...item,
          amount: 0,
        })),
    rateIncreasePercent: normalizedTemplate?.rateIncreasePercent ?? 0,
    existingDebtService: normalizedTemplate?.existingDebtService ?? 0,
  });
};

export const generateDefaultOperatingBudget = (startYear, years = 5) => {
  const baseYear = sanitizePositiveInteger(startYear, new Date().getFullYear());
  const totalYears = Math.max(1, sanitizePositiveInteger(years, 5));
  const rows = [];

  for (let i = 0; i < totalYears; i += 1) {
    rows.push(cloneBudgetRow(baseYear + i));
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
      existingMap.set(Number(row.year), normalizeBudgetRow(row));
    }
  });

  const result = [];
  let lastTemplate = null;

  for (let offset = 0; offset < yearsNeeded; offset += 1) {
    const year = desiredStart + offset;
    if (existingMap.has(year)) {
      const existing = existingMap.get(year);
      result.push(normalizeBudgetRow(existing));
      lastTemplate = existing;
    } else {
      const template = lastTemplate || existingMap.get(year - 1);
      const cloned = cloneBudgetRow(year, template);
      result.push(cloned);
      lastTemplate = cloned;
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

const allocateEvenMonthlySpend = (
  startDate,
  months,
  budget,
  fundingSourceId,
  plan,
  type,
  fiscalYearStartMonth
) => {
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
    const year = getFiscalYear(cursor, fiscalYearStartMonth);
    addSpend(plan, year, monthlySpend, fundingSourceId, type);
    advanceToNextMonth(cursor);
  }
};

const allocateProgramSpend = (project, plan, fiscalYearStartMonth) => {
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
    const year = getFiscalYear(cursor, fiscalYearStartMonth);
    addSpend(plan, year, monthlySpend, project?.fundingSourceId, "program");
    advanceToNextMonth(cursor);
  }
};

export const buildProjectSpendPlan = (projectTimelines = [], options = {}) => {
  const spendPlan = {};
  const fiscalYearStartMonth = sanitizeFiscalYearStartMonth(
    options?.fiscalYearStartMonth
  );

  (projectTimelines || []).forEach((project) => {
    if (!project) {
      return;
    }

    if (project.type === "program") {
      allocateProgramSpend(project, spendPlan, fiscalYearStartMonth);
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
        "design",
        fiscalYearStartMonth
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
        "construction",
        fiscalYearStartMonth
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

const allocateProjectSpend = (
  entry,
  startDate,
  months,
  budget,
  fiscalYearStartMonth
) => {
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
    const year = getFiscalYear(cursor, fiscalYearStartMonth);
    if (Number.isFinite(year)) {
      entry.spendByYear[year] = (entry.spendByYear[year] || 0) + monthlySpend;
      entry.totalSpend += monthlySpend;
    }
    advanceToNextMonth(cursor);
  }
};

export const buildProjectSpendBreakdown = (projectTimelines = [], options = {}) => {
  const breakdown = [];
  const fiscalYearStartMonth = sanitizeFiscalYearStartMonth(
    options?.fiscalYearStartMonth
  );

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
          const year = getFiscalYear(cursor, fiscalYearStartMonth);
          if (Number.isFinite(year)) {
            entry.spendByYear[year] =
              (entry.spendByYear[year] || 0) + monthlySpend;
            entry.totalSpend += monthlySpend;
          }
          advanceToNextMonth(cursor);
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
        designBudget,
        fiscalYearStartMonth
      );
    }

    if (constructionBudget > 0) {
      allocateProjectSpend(
        entry,
        project.constructionStart || project.constructionStartDate,
        project.constructionDuration,
        constructionBudget,
        fiscalYearStartMonth
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

export const sanitizeExistingDebtManualTotals = (manualTotals = {}) => {
  const sanitized = {};

  if (!manualTotals || typeof manualTotals !== "object") {
    return sanitized;
  }

  Object.entries(manualTotals).forEach(([yearKey, rawValue]) => {
    const year = Number(yearKey);
    const amount = sanitizeNumber(rawValue, 0);
    if (Number.isFinite(year) && Number.isFinite(amount)) {
      sanitized[year] = amount;
    }
  });

  return sanitized;
};

export const sanitizeExistingDebtInstrument = (instrument = {}) => {
  if (!instrument || typeof instrument !== "object") {
    return null;
  }

  const fallbackId =
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `existing-debt-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const id = instrument.id || fallbackId;
  const label =
    typeof instrument.label === "string" && instrument.label.trim()
      ? instrument.label.trim()
      : "Existing Debt";

  const financingType =
    instrument.financingType === "bond" || instrument.financingType === "srf"
      ? instrument.financingType
      : "bond";

  const outstandingPrincipal = Math.max(0, sanitizeNumber(instrument.outstandingPrincipal, 0));
  const interestRate = Math.max(0, sanitizeNumber(instrument.interestRate, 0));
  const termYears = Math.max(1, sanitizePositiveInteger(instrument.termYears, 1));
  const firstPaymentYear = sanitizePositiveInteger(instrument.firstPaymentYear, new Date().getFullYear());
  const interestOnlyYears = Math.max(0, sanitizePositiveInteger(instrument.interestOnlyYears, 0));

  return {
    id,
    label,
    financingType,
    outstandingPrincipal,
    interestRate,
    termYears,
    firstPaymentYear,
    interestOnlyYears,
  };
};

export const sanitizeExistingDebtInstrumentList = (instruments = []) => {
  if (!Array.isArray(instruments)) {
    return [];
  }

  return instruments
    .map((instrument) => sanitizeExistingDebtInstrument(instrument))
    .filter(Boolean);
};

const buildExistingDebtInstrumentSchedule = (
  instrument,
  startYear,
  projectionYears
) => {
  const horizonStart = sanitizePositiveInteger(
    startYear,
    new Date().getFullYear()
  );
  const totalYears = Math.max(1, sanitizePositiveInteger(projectionYears, 1));
  const horizonEnd = horizonStart + totalYears - 1;

  const sanitizedInstrument = sanitizeExistingDebtInstrument(instrument);
  if (!sanitizedInstrument) {
    return null;
  }

  const {
    id,
    label,
    financingType,
    outstandingPrincipal,
    interestRate,
    termYears,
    firstPaymentYear,
    interestOnlyYears,
  } = sanitizedInstrument;

  if (!(outstandingPrincipal > 0)) {
    return {
      id,
      label,
      financingType,
      outstandingPrincipal,
      interestRate,
      termYears,
      firstPaymentYear,
      interestOnlyYears,
      totalsByYear: {},
      interestByYear: {},
      principalByYear: {},
    };
  }

  const paymentStartYear = Number.isFinite(firstPaymentYear)
    ? firstPaymentYear
    : horizonStart;
  const rate = interestRate / 100;
  const totalsByYear = {};
  const interestByYear = {};
  const principalByYear = {};

  let remainingPrincipal = outstandingPrincipal;
  const interestOnlyWindow = Math.min(interestOnlyYears, termYears);
  const amortizationYears = Math.max(0, termYears - interestOnlyWindow);

  for (let offset = 0; offset < interestOnlyWindow; offset += 1) {
    const year = paymentStartYear + offset;
    const interestPayment = rate > 0 ? remainingPrincipal * rate : 0;
    if (year >= horizonStart && year <= horizonEnd) {
      totalsByYear[year] = (totalsByYear[year] || 0) + interestPayment;
      interestByYear[year] = (interestByYear[year] || 0) + interestPayment;
      principalByYear[year] = principalByYear[year] || 0;
    }
  }

  if (amortizationYears <= 0) {
    return {
      id,
      label,
      financingType,
      outstandingPrincipal,
      interestRate,
      termYears,
      firstPaymentYear,
      interestOnlyYears,
      totalsByYear,
      interestByYear,
      principalByYear,
    };
  }

  const amortizationStartYear = paymentStartYear + interestOnlyWindow;
  const annualPayment = calculateLevelDebtPayment(
    remainingPrincipal,
    interestRate,
    amortizationYears
  );

  for (let i = 0; i < amortizationYears; i += 1) {
    const year = amortizationStartYear + i;
    const interestPayment = rate > 0 ? remainingPrincipal * rate : 0;
    let principalPayment = annualPayment - interestPayment;

    if (principalPayment < 0) {
      principalPayment = 0;
    }

    if (principalPayment > remainingPrincipal || i === amortizationYears - 1) {
      principalPayment = remainingPrincipal;
    }

    const paymentAmount = interestPayment + principalPayment;
    remainingPrincipal = Math.max(0, remainingPrincipal - principalPayment);

    if (year >= horizonStart && year <= horizonEnd) {
      totalsByYear[year] = (totalsByYear[year] || 0) + paymentAmount;
      interestByYear[year] = (interestByYear[year] || 0) + interestPayment;
      principalByYear[year] = (principalByYear[year] || 0) + principalPayment;
    }
  }

  return {
    id,
    label,
    financingType,
    outstandingPrincipal,
    interestRate,
    termYears,
    firstPaymentYear,
    interestOnlyYears,
    totalsByYear,
    interestByYear,
    principalByYear,
  };
};

export const calculateExistingDebtSchedule = ({
  manualTotals = {},
  instruments = [],
  startYear,
  projectionYears,
}) => {
  const sanitizedManual = sanitizeExistingDebtManualTotals(manualTotals);
  const sanitizedStartYear = sanitizePositiveInteger(
    startYear,
    new Date().getFullYear()
  );
  const totalYears = Math.max(1, sanitizePositiveInteger(projectionYears, 1));
  const horizonEnd = sanitizedStartYear + totalYears - 1;

  const manualByYear = {};
  const totalsByYear = {};
  const interestByYear = {};
  const principalByYear = {};

  Object.entries(sanitizedManual).forEach(([yearKey, amount]) => {
    const year = Number(yearKey);
    if (!Number.isFinite(year)) {
      return;
    }
    if (year < sanitizedStartYear || year > horizonEnd) {
      return;
    }
    manualByYear[year] = amount;
    totalsByYear[year] = (totalsByYear[year] || 0) + amount;
  });

  const instrumentSummaries = [];

  sanitizeExistingDebtInstrumentList(instruments).forEach((instrument) => {
    const summary = buildExistingDebtInstrumentSchedule(
      instrument,
      sanitizedStartYear,
      totalYears
    );
    if (!summary) {
      return;
    }

    instrumentSummaries.push(summary);

    Object.entries(summary.totalsByYear).forEach(([yearKey, amount]) => {
      const year = Number(yearKey);
      if (!Number.isFinite(year)) {
        return;
      }
      totalsByYear[year] = (totalsByYear[year] || 0) + amount;
    });

    Object.entries(summary.interestByYear).forEach(([yearKey, amount]) => {
      const year = Number(yearKey);
      if (!Number.isFinite(year)) {
        return;
      }
      interestByYear[year] = (interestByYear[year] || 0) + amount;
    });

    Object.entries(summary.principalByYear).forEach(([yearKey, amount]) => {
      const year = Number(yearKey);
      if (!Number.isFinite(year)) {
        return;
      }
      principalByYear[year] = (principalByYear[year] || 0) + amount;
    });
  });

  return {
    manualByYear,
    totalsByYear,
    interestByYear,
    principalByYear,
    instrumentSummaries,
    startYear: sanitizedStartYear,
    projectionYears: totalYears,
  };
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
      const interestOnlyYears = 5;
      const loanDetails = {
        fundingKey,
        sourceName,
        financingType,
        interestRate: interestRatePercent,
        termYears,
        interestOnlyYears,
        totalIssued: 0,
        interestOnly: [],
        amortization: [],
        amortizationStartYear: null,
        annualPayment: null,
        loans: [],
      };

      const interestOnlyByYear = new Map();
      const outstandingByYear = new Map();
      const amortizationByYear = new Map();

      let earliestAmortizationStart = null;
      let totalPrincipal = 0;

      drawEntries.forEach((entry) => {
        const drawYear = entry.year;
        const principal = sanitizeNumber(entry.amount, 0);
        if (!(principal > 0)) {
          return;
        }

        totalPrincipal += principal;

        const loanAnnualPayment = calculateLevelDebtPayment(
          principal,
          interestRatePercent,
          termYears
        );
        const amortizationStartYear = drawYear + interestOnlyYears;

        loanDetails.loans.push({
          drawYear,
          principal,
          interestOnlyYears,
          amortizationStartYear,
          annualPayment: loanAnnualPayment,
        });

        for (let offset = 0; offset < interestOnlyYears; offset += 1) {
          const year = drawYear + offset;
          const interestPayment = interestRate > 0 ? principal * interestRate : 0;

          if (isWithinProjection(year)) {
            pushPayment(year, interestPayment, interestPayment, 0);
          }

          if (!interestOnlyByYear.has(year)) {
            interestOnlyByYear.set(year, {
              year,
              drawAmount: 0,
              interestPayment: 0,
            });
          }

          const summary = interestOnlyByYear.get(year);
          if (offset === 0) {
            summary.drawAmount += principal;
          }
          summary.interestPayment += interestPayment;

          outstandingByYear.set(year, (outstandingByYear.get(year) || 0) + principal);
        }

        if (
          earliestAmortizationStart == null ||
          amortizationStartYear < earliestAmortizationStart
        ) {
          earliestAmortizationStart = amortizationStartYear;
        }

        let remainingPrincipal = principal;

        for (let i = 0; i < termYears; i += 1) {
          const paymentYear = amortizationStartYear + i;
          const interestPayment = interestRate > 0 ? remainingPrincipal * interestRate : 0;
          let principalPayment = loanAnnualPayment - interestPayment;
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
          }

          if (!amortizationByYear.has(paymentYear)) {
            amortizationByYear.set(paymentYear, {
              year: paymentYear,
              payment: 0,
              interestPayment: 0,
              principalPayment: 0,
              remainingBalance: 0,
            });
          }

          const amortSummary = amortizationByYear.get(paymentYear);
          amortSummary.payment += paymentAmount;
          amortSummary.interestPayment += interestPayment;
          amortSummary.principalPayment += principalPayment;
          amortSummary.remainingBalance += remainingPrincipal;
        }
      });

      if (totalPrincipal > 0) {
        loanDetails.totalIssued = totalPrincipal;
        loanDetails.amortizationStartYear = earliestAmortizationStart;
        loanDetails.interestOnly = Array.from(interestOnlyByYear.values())
          .filter((entry) => isWithinProjection(entry.year))
          .sort((a, b) => a.year - b.year)
          .map((entry) => ({
            ...entry,
            outstandingBalance: outstandingByYear.get(entry.year) || 0,
          }));

        loanDetails.amortization = Array.from(amortizationByYear.values())
          .filter((entry) => isWithinProjection(entry.year))
          .sort((a, b) => a.year - b.year);

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

  const normalizedBudget = ensureBudgetYears(
    operatingBudget,
    startYear,
    projectionYears
  );
  const budgetMap = new Map(
    normalizedBudget.map((row) => [row.year, normalizeBudgetRow(row)])
  );

  const spendPlan = buildProjectSpendPlan(projectTimelines, {
    fiscalYearStartMonth: financialConfig?.fiscalYearStartMonth,
  });
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

  const forecast = [];
  let runningCash = startingCash;
  let minCoverage = Number.POSITIVE_INFINITY;
  let minDaysCashOnHand = Number.POSITIVE_INFINITY;
  let maxAdditionalRateIncrease = 0;

  years.forEach((year) => {
    const budgetRow = normalizeBudgetRow(
      budgetMap.get(year) || { year }
    );
    const plannedRateIncreasePercent = sanitizePercent(
      budgetRow.rateIncreasePercent,
      0
    );
    const operatingRevenueLineItems = budgetRow.revenueLineItems
      .filter((item) => item.revenueType !== "nonOperating")
      .map((item) => ({ ...item }));
    const nonOperatingRevenueLineItems = budgetRow.revenueLineItems
      .filter((item) => item.revenueType === "nonOperating")
      .map((item) => ({ ...item }));
    const expenseLineItems = budgetRow.expenseLineItems.map((item) => ({
      ...item,
    }));

    const baseOperatingRevenue = sumLineItems(operatingRevenueLineItems);
    const nonOperatingRevenue = sumLineItems(nonOperatingRevenueLineItems);
    const adjustedOperatingRevenue =
      baseOperatingRevenue * (1 + plannedRateIncreasePercent / 100);
    const totalOperatingExpenses = sumLineItems(expenseLineItems);
    const existingDebtService = sanitizeNumber(
      budgetRow.existingDebtService,
      0
    );

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
      operatingRevenueLineItems,
      nonOperatingRevenueLineItems,
      expenseLineItems,
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
    (sum, year) => sum + sanitizeNumber(spendPlan?.[year]?.totalSpend, 0),
    0
  );
  const totalCashCapex = years.reduce(
    (sum, year) => sum + sanitizeNumber(cashUsesByYear?.[year], 0),
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
    debtServiceInterestByYear,
    debtServicePrincipalByYear,
    cashUsesByYear,
    debtIssuedBySource,
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

export const formatCurrency = (value, options = {}) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return options.fallback ?? "-";
  }

  const compact = Boolean(options.compact);
  const formatOptions = {
    style: "currency",
    currency: options.currency || "USD",
    minimumFractionDigits:
      options.minimumFractionDigits ?? (compact ? 0 : 0),
    maximumFractionDigits:
      options.maximumFractionDigits ?? (compact ? 1 : 0),
  };

  if (compact) {
    formatOptions.notation = "compact";
    formatOptions.compactDisplay = options.compactDisplay || "short";
  }

  return new Intl.NumberFormat("en-US", formatOptions).format(numeric);
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

