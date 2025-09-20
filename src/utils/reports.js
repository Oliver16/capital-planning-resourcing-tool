const HOURS_PER_FTE_MONTH = 4.33 * 40;

const DELIVERY_LABELS = {
  "self-perform": "Self-Perform",
  hybrid: "Hybrid",
  consultant: "Consultant",
};

const formatDate = (value) => {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().split("T")[0];
};

const formatCurrency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) {
    return numeric === 0 ? "$0" : "";
  }

  return `$${numeric.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
};

const formatCompactCurrency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) {
    return "$0";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(numeric);
};

const formatHours = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || Math.abs(numeric) < 0.0001) {
    return "0";
  }

  return numeric.toFixed(1);
};

const formatFte = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || Math.abs(numeric) < 0.0001) {
    return "0.00";
  }

  return numeric.toFixed(2);
};

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  let stringValue;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return "";
    }
    stringValue = String(value);
  } else {
    stringValue = value.toString();
  }

  if (stringValue.includes("\"")) {
    stringValue = stringValue.replace(/"/g, '""');
  }

  if (stringValue.includes(",") || stringValue.includes("\n")) {
    return `"${stringValue}"`;
  }

  return stringValue;
};

const convertToCsv = (columns, rows) => {
  const header = columns.map((column) => escapeCsvValue(column.header)).join(",");
  const data = (rows || []).map((row) =>
    columns.map((column) => escapeCsvValue(row[column.key])).join(",")
  );

  return [header, ...data].join("\n");
};

const downloadCsv = (fileName, csvContent) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const normalizeProgramCategoryHours = (config) => {
  if (!config) {
    return {};
  }

  if (typeof config === "string") {
    try {
      const parsed = JSON.parse(config);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      console.warn("Unable to parse program hours config:", error);
      return {};
    }
  }

  return typeof config === "object" ? config : {};
};

const getDeliveryLabel = (value) => {
  if (!value) {
    return DELIVERY_LABELS["self-perform"];
  }

  return DELIVERY_LABELS[value] || value;
};

const buildBaseProjectRow = (
  project,
  timeline,
  projectTypeMap,
  fundingSourceMap
) => {
  const designStart = timeline?.designStart || project.designStartDate || project.programStartDate;
  const designEnd = timeline?.designEnd || project.designEndDate || project.programEndDate;
  const constructionStart =
    timeline?.constructionStart || project.constructionStartDate || project.programStartDate;
  const constructionEnd =
    timeline?.constructionEnd || project.constructionEndDate || project.programEndDate;

  const typeLabel = project.type === "program" ? "Program" : "Project";
  const projectType = projectTypeMap.get(project.projectTypeId);
  const fundingSource = fundingSourceMap.get(project.fundingSourceId);

  return {
    id: project.id,
    name: project.name || "",
    type: typeLabel,
    projectType: projectType?.name || "",
    fundingSource: fundingSource?.name || "",
    deliveryMethod: getDeliveryLabel(project.deliveryType || "self-perform"),
    designStart: formatDate(designStart),
    designEnd: formatDate(designEnd),
    constructionStart: formatDate(constructionStart),
    constructionEnd: formatDate(constructionEnd),
    designDuration:
      project.type === "project" && Number.isFinite(Number(project.designDuration))
        ? Number(project.designDuration)
        : "",
    constructionDuration:
      project.type === "project" && Number.isFinite(Number(project.constructionDuration))
        ? Number(project.constructionDuration)
        : "",
    totalBudget: formatCurrency(project.totalBudget),
    designBudget: formatCurrency(project.designBudget),
    constructionBudget: formatCurrency(project.constructionBudget),
    annualBudget:
      project.type === "program" ? formatCurrency(project.annualBudget) : "",
    priority: project.priority || "",
    description: project.description || "",
  };
};

const CIP_COLUMNS = [
  { key: "id", header: "Project ID" },
  { key: "name", header: "Project / Program" },
  { key: "type", header: "Type" },
  { key: "projectType", header: "Project Type" },
  { key: "fundingSource", header: "Funding Source" },
  { key: "deliveryMethod", header: "Delivery Method" },
  { key: "designStart", header: "Design Start" },
  { key: "designEnd", header: "Design End" },
  { key: "constructionStart", header: "Construction Start" },
  { key: "constructionEnd", header: "Construction End" },
  { key: "designDuration", header: "Design Duration (months)" },
  {
    key: "constructionDuration",
    header: "Construction Duration (months)",
  },
  { key: "totalBudget", header: "Total Budget" },
  { key: "designBudget", header: "Design Budget" },
  { key: "constructionBudget", header: "Construction Budget" },
  { key: "annualBudget", header: "Annual Budget" },
  { key: "priority", header: "Priority" },
  { key: "description", header: "Description" },
];

const CIP_EFFORT_COLUMNS = [
  { key: "id", header: "Project ID" },
  { key: "name", header: "Project / Program" },
  { key: "type", header: "Type" },
  { key: "projectType", header: "Project Type" },
  { key: "fundingSource", header: "Funding Source" },
  { key: "deliveryMethod", header: "Delivery Method" },
  { key: "category", header: "Staff Category" },
  { key: "hoursBasis", header: "Hours Basis" },
  { key: "pmHours", header: "PM Hours" },
  { key: "designHours", header: "Design Hours" },
  { key: "constructionHours", header: "Construction Hours" },
  { key: "totalHours", header: "Total Hours" },
  { key: "pmMonthlyFte", header: "PM Monthly FTE" },
  { key: "designMonthlyFte", header: "Design Monthly FTE" },
  {
    key: "constructionMonthlyFte",
    header: "Construction Monthly FTE",
  },
  { key: "totalMonthlyFte", header: "Total Monthly FTE" },
  { key: "hourlyRate", header: "Hourly Rate" },
  { key: "estimatedCost", header: "Estimated Cost" },
  { key: "designStart", header: "Design Start" },
  { key: "designEnd", header: "Design End" },
  { key: "constructionStart", header: "Construction Start" },
  { key: "constructionEnd", header: "Construction End" },
  { key: "totalBudget", header: "Total Budget" },
  { key: "annualBudget", header: "Annual Budget" },
  { key: "priority", header: "Priority" },
];

const GAP_ANALYSIS_COLUMNS = [
  { key: "month", header: "Month (Key)" },
  { key: "monthLabel", header: "Month" },
  { key: "category", header: "Staff Category" },
  { key: "required", header: "Required FTE" },
  { key: "available", header: "Available FTE" },
  { key: "gap", header: "Gap FTE" },
  { key: "severity", header: "Severity" },
];
export const buildCipReport = (
  projects = [],
  projectTypes = [],
  fundingSources = [],
  projectTimelines = []
) => {
  const projectTypeMap = new Map(
    projectTypes.map((type) => [type.id, type])
  );
  const fundingSourceMap = new Map(
    fundingSources.map((source) => [source.id, source])
  );
  const timelineMap = new Map(
    projectTimelines.map((timeline) => [timeline.id, timeline])
  );

  const rows = projects.map((project) =>
    buildBaseProjectRow(
      project,
      timelineMap.get(project.id),
      projectTypeMap,
      fundingSourceMap
    )
  );

  const projectCount = projects.filter((item) => item.type === "project").length;
  const programCount = projects.filter((item) => item.type === "program").length;
  const totalProjectBudget = projects.reduce((sum, item) => {
    if (item.type === "project") {
      const value = Number(item.totalBudget);
      return sum + (Number.isFinite(value) ? value : 0);
    }
    return sum;
  }, 0);
  const totalProgramBudget = projects.reduce((sum, item) => {
    if (item.type === "program") {
      const value = Number(item.annualBudget);
      return sum + (Number.isFinite(value) ? value : 0);
    }
    return sum;
  }, 0);

  return {
    fileName: `capital_improvement_plan_${new Date()
      .toISOString()
      .split("T")[0]}.csv`,
    columns: CIP_COLUMNS,
    rows,
    meta: {
      projectCount,
      programCount,
      totalProjectBudget,
      totalProgramBudget,
    },
  };
};

const calculateProjectFte = (hours, durationMonths) => {
  const numericHours = Number(hours) || 0;
  const numericDuration = Number(durationMonths) || 0;

  if (numericHours <= 0 || numericDuration <= 0) {
    return 0;
  }

  const monthlyHours = numericHours / numericDuration;
  return monthlyHours / HOURS_PER_FTE_MONTH;
};

const calculateProgramFte = (hours) => {
  const numericHours = Number(hours) || 0;

  if (numericHours <= 0) {
    return 0;
  }

  return numericHours / HOURS_PER_FTE_MONTH;
};

const buildProgramCategoryHours = (project) => {
  const normalized = normalizeProgramCategoryHours(
    project?.continuousHoursByCategory
  );

  const result = {};

  Object.entries(normalized).forEach(([key, value]) => {
    if (!value || typeof value !== "object") {
      return;
    }

    const entry = {
      pmHours: Number(value.pmHours) || 0,
      designHours: Number(value.designHours) || 0,
      constructionHours: Number(value.constructionHours) || 0,
    };

    if (entry.pmHours || entry.designHours || entry.constructionHours) {
      result[String(key)] = entry;
    }
  });

  return result;
};
export const buildCipEffortReport = (
  projects = [],
  projectTypes = [],
  fundingSources = [],
  projectTimelines = [],
  staffCategories = [],
  staffAllocations = {}
) => {
  const projectTypeMap = new Map(
    projectTypes.map((type) => [type.id, type])
  );
  const fundingSourceMap = new Map(
    fundingSources.map((source) => [source.id, source])
  );
  const timelineMap = new Map(
    projectTimelines.map((timeline) => [timeline.id, timeline])
  );

  const rows = [];
  let totalHours = 0;
  let totalCost = 0;

  projects.forEach((project) => {
    const baseRow = buildBaseProjectRow(
      project,
      timelineMap.get(project.id),
      projectTypeMap,
      fundingSourceMap
    );

    if (project.type === "project") {
      staffCategories.forEach((category) => {
        const allocation =
          staffAllocations?.[project.id]?.[category.id] || Object.create(null);
        const pmHours = Number(allocation.pmHours) || 0;
        const designHours = Number(allocation.designHours) || 0;
        const constructionHours = Number(allocation.constructionHours) || 0;
        const categoryTotalHours = pmHours + designHours + constructionHours;

        if (categoryTotalHours <= 0) {
          return;
        }

        const totalDuration =
          (Number(project.designDuration) || 0) +
          (Number(project.constructionDuration) || 0);

        const pmMonthlyFte = calculateProjectFte(pmHours, totalDuration);
        const designMonthlyFte = calculateProjectFte(
          designHours,
          project.designDuration
        );
        const constructionMonthlyFte = calculateProjectFte(
          constructionHours,
          project.constructionDuration
        );
        const totalMonthlyFte =
          pmMonthlyFte + designMonthlyFte + constructionMonthlyFte;

        const hourlyRate = Number(category.hourlyRate) || 0;
        const estimatedCost = categoryTotalHours * hourlyRate;
        totalHours += categoryTotalHours;
        totalCost += estimatedCost;

        rows.push({
          ...baseRow,
          category: category.name,
          hoursBasis: "Total Project",
          pmHours: formatHours(pmHours),
          designHours: formatHours(designHours),
          constructionHours: formatHours(constructionHours),
          totalHours: formatHours(categoryTotalHours),
          pmMonthlyFte: formatFte(pmMonthlyFte),
          designMonthlyFte: formatFte(designMonthlyFte),
          constructionMonthlyFte: formatFte(constructionMonthlyFte),
          totalMonthlyFte: formatFte(totalMonthlyFte),
          hourlyRate: hourlyRate
            ? `$${hourlyRate.toLocaleString("en-US")}`
            : "",
          estimatedCost: formatCurrency(estimatedCost),
        });
      });
    } else {
      const categoryHours = buildProgramCategoryHours(project);

      staffCategories.forEach((category) => {
        const categoryConfig =
          categoryHours[String(category.id)] ||
          categoryHours[category.id] ||
          Object.create(null);

        const pmHours = Number(categoryConfig.pmHours) || 0;
        const designHours = Number(categoryConfig.designHours) || 0;
        const constructionHours = Number(categoryConfig.constructionHours) || 0;
        const categoryTotalHours = pmHours + designHours + constructionHours;

        if (categoryTotalHours <= 0) {
          return;
        }

        const pmMonthlyFte = calculateProgramFte(pmHours);
        const designMonthlyFte = calculateProgramFte(designHours);
        const constructionMonthlyFte = calculateProgramFte(constructionHours);
        const totalMonthlyFte =
          pmMonthlyFte + designMonthlyFte + constructionMonthlyFte;

        const hourlyRate = Number(category.hourlyRate) || 0;
        const estimatedCost = categoryTotalHours * hourlyRate;
        totalHours += categoryTotalHours;
        totalCost += estimatedCost;

        rows.push({
          ...baseRow,
          category: category.name,
          hoursBasis: "Monthly",
          pmHours: formatHours(pmHours),
          designHours: formatHours(designHours),
          constructionHours: formatHours(constructionHours),
          totalHours: formatHours(categoryTotalHours),
          pmMonthlyFte: formatFte(pmMonthlyFte),
          designMonthlyFte: formatFte(designMonthlyFte),
          constructionMonthlyFte: formatFte(constructionMonthlyFte),
          totalMonthlyFte: formatFte(totalMonthlyFte),
          hourlyRate: hourlyRate
            ? `$${hourlyRate.toLocaleString("en-US")}`
            : "",
          estimatedCost: formatCurrency(estimatedCost),
        });
      });
    }
  });

  return {
    fileName: `cip_effort_by_category_${new Date()
      .toISOString()
      .split("T")[0]}.csv`,
    columns: CIP_EFFORT_COLUMNS,
    rows,
    meta: {
      rowCount: rows.length,
      projectCount: projects.length,
      categoryCount: staffCategories.length,
      totalHours,
      totalCost,
    },
  };
};

export const buildGapAnalysisReport = (staffingGaps = []) => {
  const rows = staffingGaps.map((gap) => {
    const numericGap = Number(gap.gap) || 0;
    const severity = numericGap > 1 ? "Critical" : "Moderate";

    return {
      month: gap.month,
      monthLabel: gap.monthLabel,
      category: gap.category,
      required: gap.required,
      available: gap.available,
      gap: gap.gap,
      severity,
    };
  });

  const criticalCount = rows.filter((row) => row.severity === "Critical").length;

  return {
    fileName: `staffing_gap_analysis_${new Date()
      .toISOString()
      .split("T")[0]}.csv`,
    columns: GAP_ANALYSIS_COLUMNS,
    rows,
    meta: {
      gapCount: rows.length,
      criticalCount,
    },
  };
};

export const downloadReport = (report) => {
  if (!report || !Array.isArray(report.columns) || report.columns.length === 0) {
    console.warn("Invalid report configuration provided to downloadReport");
    return;
  }

  const csv = convertToCsv(report.columns, report.rows || []);
  downloadCsv(report.fileName || `report_${Date.now()}.csv`, csv);
};

export const formatReportMeta = (report) => {
  if (!report?.meta) {
    return {};
  }

  const { meta } = report;
  const formatted = { ...meta };

  if (typeof meta.totalProjectBudget === "number") {
    formatted.totalProjectBudgetLabel = formatCompactCurrency(
      meta.totalProjectBudget
    );
  }

  if (typeof meta.totalProgramBudget === "number") {
    formatted.totalProgramBudgetLabel = formatCompactCurrency(
      meta.totalProgramBudget
    );
  }

  if (typeof meta.totalCost === "number") {
    formatted.totalCostLabel = formatCurrency(meta.totalCost);
  }

  if (typeof meta.totalHours === "number") {
    formatted.totalHoursLabel = formatHours(meta.totalHours);
  }

  return formatted;
};
