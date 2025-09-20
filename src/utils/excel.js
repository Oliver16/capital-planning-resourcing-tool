import { utils, writeFile } from "xlsx";

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const ensureWorkbook = () => utils.book_new();

const buildAssignmentsSheet = (report) => {
  const header = [
    "Project",
    "Staff",
    "Category",
    "PM Hours (Manual)",
    "PM Hours (Auto)",
    "PM Hours (Total)",
    "Design Hours (Manual)",
    "Design Hours (Auto)",
    "Design Hours (Total)",
    "Construction Hours (Manual)",
    "Construction Hours (Auto)",
    "Construction Hours (Total)",
    "Total Hours (Manual)",
    "Total Hours (Auto)",
    "Total Hours (Assigned)",
    "Availability (hrs/mo)",
    "Utilization (%)",
    "Overbooked",
  ];

  const rows = (report.assignments || []).map((assignment) => [
    assignment.projectName,
    assignment.staffName,
    assignment.categoryName,
    toNumber(assignment.manual?.pmHours || 0),
    toNumber(assignment.auto?.pmHours || 0),
    toNumber(assignment.totals?.pmHours || 0),
    toNumber(assignment.manual?.designHours || 0),
    toNumber(assignment.auto?.designHours || 0),
    toNumber(assignment.totals?.designHours || 0),
    toNumber(assignment.manual?.constructionHours || 0),
    toNumber(assignment.auto?.constructionHours || 0),
    toNumber(assignment.totals?.constructionHours || 0),
    toNumber(assignment.manual?.totalHours || 0),
    toNumber(assignment.auto?.totalHours || 0),
    toNumber(assignment.totals?.totalHours || 0),
    toNumber(assignment.availability?.totalHours || 0),
    toNumber(assignment.utilizationPercent || 0),
    assignment.overbooked ? "Yes" : "No",
  ]);

  return utils.aoa_to_sheet([header, ...rows]);
};

const buildSummarySheet = (report) => {
  const meta = report.meta || {};
  const summaryRows = [
    ["Metric", "Value"],
    ["Projects covered", toNumber(meta.projectsCovered || 0)],
    ["Staff assigned", toNumber(meta.staffAssignedCount || 0)],
    ["Assigned hours", toNumber(meta.totalAssignedHours || 0)],
    ["Manual override hours", toNumber(meta.manualHours || 0)],
    ["Automated hours", toNumber(meta.autoHours || 0)],
    ["Demand hours", toNumber(meta.demandHours || 0)],
    ["Unfilled hours", toNumber(meta.unfilledHours || 0)],
    ["Overbooked staff", toNumber(meta.overbookedCount || 0)],
    ["Manual override entries", toNumber(meta.manualOverrideCount || 0)],
    ["Coverage %", Number(meta.coverageRate || 0)],
  ];

  if (meta.generatedAt instanceof Date && !Number.isNaN(meta.generatedAt)) {
    summaryRows.push([
      "Generated",
      meta.generatedAt.toLocaleString("en-US"),
    ]);
  }

  return utils.aoa_to_sheet(summaryRows);
};

const buildProjectsSheet = (report) => {
  const header = [
    "Project",
    "Demand Hours",
    "Assigned Hours",
    "Manual Hours",
    "Auto Hours",
    "Unfilled Hours",
  ];

  const rows = (report.projectSummaries || []).map((summary) => [
    summary.projectName,
    toNumber(summary.demand?.totalHours || 0),
    toNumber(summary.assigned?.totalHours || 0),
    toNumber(summary.manual?.totalHours || 0),
    toNumber(summary.auto?.totalHours || 0),
    toNumber(summary.unfilled?.totalHours || 0),
  ]);

  return utils.aoa_to_sheet([header, ...rows]);
};

const buildStaffSheet = (report) => {
  const header = [
    "Staff Member",
    "Available Hours (hrs/mo)",
    "Assigned Hours (hrs/mo)",
    "Overbooked",
  ];

  const rows = (report.staffSummaries || []).map((entry) => [
    entry.staffName,
    toNumber(entry.availability || 0),
    toNumber(entry.assigned || 0),
    entry.overbooked ? "Yes" : "No",
  ]);

  return utils.aoa_to_sheet([header, ...rows]);
};

const buildUnfilledSheet = (report) => {
  if (!report.unfilledDemandRows || report.unfilledDemandRows.length === 0) {
    return null;
  }

  const header = ["Project", "Category", "Phase", "Hours"];
  const rows = report.unfilledDemandRows.map((entry) => [
    entry.projectName,
    entry.categoryName,
    entry.phase,
    toNumber(entry.hours || 0),
  ]);

  return utils.aoa_to_sheet([header, ...rows]);
};

export const downloadStaffUtilizationExcel = (report) => {
  if (!report) {
    console.warn("No staff utilization report data available for export");
    return;
  }

  const workbook = ensureWorkbook();
  const assignmentsSheet = buildAssignmentsSheet(report);
  utils.book_append_sheet(workbook, assignmentsSheet, "Assignments");

  const summarySheet = buildSummarySheet(report);
  utils.book_append_sheet(workbook, summarySheet, "Summary");

  const projectsSheet = buildProjectsSheet(report);
  utils.book_append_sheet(workbook, projectsSheet, "Projects");

  const staffSheet = buildStaffSheet(report);
  utils.book_append_sheet(workbook, staffSheet, "Staff");

  const unfilledSheet = buildUnfilledSheet(report);
  if (unfilledSheet) {
    utils.book_append_sheet(workbook, unfilledSheet, "Unfilled Demand");
  }

  const fileName = report.fileName || `staff_utilization_${Date.now()}.xlsx`;
  writeFile(workbook, fileName);
};
