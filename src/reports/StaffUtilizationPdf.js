import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1f2937",
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4,
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 10,
    color: "#4b5563",
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginVertical: 12,
  },
  summaryCard: {
    width: "32%",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 8,
    marginRight: "2%",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 9,
    color: "#6b7280",
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 4,
    color: "#1f2937",
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6,
    color: "#0f172a",
  },
  table: {
    display: "table",
    width: "auto",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableHeader: {
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableCell: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
    fontSize: 9,
    color: "#1f2937",
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: 700,
    color: "#1f2937",
  },
  tableCellLast: {
    borderRightWidth: 0,
  },
  tableRowAlt: {
    backgroundColor: "#f9fafb",
  },
  projectTable: {
    marginBottom: 10,
  },
  projectHeaderRow: {
    backgroundColor: "#f3f4f6",
  },
  projectHeaderTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#0f172a",
  },
  projectHeaderMetricLabel: {
    fontSize: 8,
    color: "#6b7280",
  },
  projectHeaderMetricValue: {
    fontSize: 10,
    fontWeight: 700,
    color: "#1f2937",
    marginTop: 2,
  },
  projectStaffHeaderRow: {
    backgroundColor: "#f9fafb",
  },
  nestedTableSpacing: {
    marginBottom: 8,
  },
  unfilledProjectTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#0f172a",
  },
  note: {
    fontSize: 9,
    color: "#4b5563",
    marginTop: 4,
  },
});

const formatNumber = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "0";
  }
  return numeric.toLocaleString("en-US", { maximumFractionDigits: 1 });
};

const formatPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "0%";
  }
  return `${numeric.toFixed(0)}%`;
};

const getStatusLabel = (assignment) => {
  if (assignment.overbooked) {
    return "Overbooked";
  }
  const manual = Number(assignment.manual?.totalHours || 0);
  const auto = Number(assignment.auto?.totalHours || 0);
  if (manual > 0 && auto > 0) {
    return "Manual + Auto";
  }
  if (manual > 0) {
    return "Manual";
  }
  if (auto > 0) {
    return "Auto";
  }
  return "Unassigned";
};

const buildSummaryCards = (meta) => {
  return [
    {
      label: "Total Demand",
      value: `${formatNumber(meta.demandHours || 0)} hrs`,
    },
    {
      label: "Assigned Hours",
      value: `${formatNumber(meta.totalAssignedHours || 0)} hrs`,
    },
    {
      label: "Manual Overrides",
      value: `${formatNumber(meta.manualHours || 0)} hrs`,
    },
    {
      label: "Automated Hours",
      value: `${formatNumber(meta.autoHours || 0)} hrs`,
    },
    {
      label: "Unfilled Demand",
      value: `${formatNumber(meta.unfilledHours || 0)} hrs`,
    },
    {
      label: "Coverage",
      value: formatPercent(meta.coverageRate || 0),
    },
  ];
};

const StaffUtilizationPdf = ({ report }) => {
  const assignments = report?.assignments || [];
  const meta = report?.meta || {};
  const projectSummaries = report?.projectSummaries || [];
  const staffSummaries = report?.staffSummaries || [];
  const unfilledRows = report?.unfilledDemandRows || [];

  const generationDate = meta.generatedAt instanceof Date
    ? meta.generatedAt
    : new Date();

  const summaryCards = buildSummaryCards(meta);

  const projectPhaseColumns = [
    { key: "pmHours", label: "PM", flex: 0.8 },
    { key: "designHours", label: "Design", flex: 0.8 },
    { key: "constructionHours", label: "Construction", flex: 0.9 },
    { key: "totalHours", label: "Total", flex: 0.9 },
  ];

  const staffDetailColumns = [
    {
      key: "staff",
      label: "Staff",
      flex: 2,
      getValue: (assignment) => assignment.staffName || "Unassigned",
    },
    {
      key: "utilization",
      label: "Utilization",
      flex: 0.9,
      getValue: (assignment) =>
        formatPercent(assignment.utilizationPercent || 0),
      projectMetricLabel: "Coverage",
      getProjectMetricValue: (project) =>
        formatPercent(project.coverage || 0),
    },
    {
      key: "pmMonthly",
      label: "PM (hrs/mo)",
      flex: 0.95,
      getValue: (assignment) =>
        formatNumber(assignment.monthly?.pmHours ?? 0),
      projectMetricLabel: "PM (hrs/mo)",
      getProjectMetricValue: (project) =>
        `${formatNumber(project.monthlyTotals.pmHours || 0)} hrs/mo`,
    },
    {
      key: "pmTotal",
      label: "PM (total hrs)",
      flex: 0.95,
      getValue: (assignment) =>
        formatNumber(assignment.totals?.pmHours || 0),
      projectMetricLabel: "PM (total)",
      getProjectMetricValue: (project) =>
        `${formatNumber(project.totals.pmHours || 0)} hrs`,
    },
    {
      key: "designMonthly",
      label: "Design (hrs/mo)",
      flex: 0.95,
      getValue: (assignment) =>
        formatNumber(assignment.monthly?.designHours ?? 0),
      projectMetricLabel: "Design (hrs/mo)",
      getProjectMetricValue: (project) =>
        `${formatNumber(project.monthlyTotals.designHours || 0)} hrs/mo`,
    },
    {
      key: "designTotal",
      label: "Design (total hrs)",
      flex: 0.95,
      getValue: (assignment) =>
        formatNumber(assignment.totals?.designHours || 0),
      projectMetricLabel: "Design (total)",
      getProjectMetricValue: (project) =>
        `${formatNumber(project.totals.designHours || 0)} hrs`,
    },
    {
      key: "constructionMonthly",
      label: "Construction (hrs/mo)",
      flex: 1,
      getValue: (assignment) =>
        formatNumber(assignment.monthly?.constructionHours ?? 0),
      projectMetricLabel: "Construction (hrs/mo)",
      getProjectMetricValue: (project) =>
        `${formatNumber(project.monthlyTotals.constructionHours || 0)} hrs/mo`,
    },
    {
      key: "constructionTotal",
      label: "Construction (total hrs)",
      flex: 1,
      getValue: (assignment) =>
        formatNumber(assignment.totals?.constructionHours || 0),
      projectMetricLabel: "Construction (total)",
      getProjectMetricValue: (project) =>
        `${formatNumber(project.totals.constructionHours || 0)} hrs`,
    },
    {
      key: "totalMonthly",
      label: "Total (hrs/mo)",
      flex: 0.95,
      getValue: (assignment) =>
        formatNumber(
          assignment.monthly?.totalHours ??
            (assignment.monthly
              ? Number(assignment.monthly.pmHours || 0) +
                Number(assignment.monthly.designHours || 0) +
                Number(assignment.monthly.constructionHours || 0)
              : 0)
        ),
      projectMetricLabel: "Total (hrs/mo)",
      getProjectMetricValue: (project) =>
        `${formatNumber(project.monthlyTotals.totalHours || 0)} hrs/mo`,
    },
    {
      key: "total",
      label: "Total (hrs)",
      flex: 0.95,
      getValue: (assignment) =>
        formatNumber(assignment.totals?.totalHours || 0),
      projectMetricLabel: "Total (hrs)",
      getProjectMetricValue: (project) =>
        `${formatNumber(project.totals.totalHours || 0)} hrs`,
    },
    {
      key: "manual",
      label: "Manual (hrs)",
      flex: 0.95,
      getValue: (assignment) =>
        formatNumber(assignment.manual?.totalHours || 0),
      projectMetricLabel: "Manual (hrs)",
      getProjectMetricValue: (project) =>
        `${formatNumber(project.manualTotal || 0)} hrs`,
    },
    {
      key: "status",
      label: "Status",
      flex: 1,
      getValue: (assignment) => getStatusLabel(assignment),
      projectMetricLabel: "Unfilled (hrs)",
      getProjectMetricValue: (project) =>
        `${formatNumber(project.unfilledTotal || 0)} hrs`,
    },
  ];

  const totalStaffFlex = staffDetailColumns.reduce(
    (sum, column) => sum + column.flex,
    0
  );

  const projectSummaryMap = new Map(
    projectSummaries.map((summary) => [summary.projectId, summary])
  );

  const createEmptyTotals = () => ({
    pmHours: 0,
    designHours: 0,
    constructionHours: 0,
    totalHours: 0,
  });

  const projectEntriesMap = new Map();

  projectSummaries.forEach((summary) => {
    projectEntriesMap.set(summary.projectId, {
      projectId: summary.projectId,
      projectName: summary.projectName,
      staff: [],
      totals: {
        pmHours: Number(summary.assigned?.pmHours || 0),
        designHours: Number(summary.assigned?.designHours || 0),
        constructionHours: Number(summary.assigned?.constructionHours || 0),
        totalHours: Number(summary.assigned?.totalHours || 0),
      },
    });
  });

  assignments.forEach((assignment) => {
    if (!projectEntriesMap.has(assignment.projectId)) {
      projectEntriesMap.set(assignment.projectId, {
        projectId: assignment.projectId,
        projectName: assignment.projectName,
        staff: [],
        totals: createEmptyTotals(),
      });
    }
    projectEntriesMap.get(assignment.projectId).staff.push(assignment);
  });

  const sumStaffHours = (staff, accessor) =>
    staff.reduce((accumulator, entry) => {
      const hours = accessor(entry) || {};
      const pm = Number(hours.pmHours || 0);
      const design = Number(hours.designHours || 0);
      const construction = Number(hours.constructionHours || 0);
      const total =
        hours.totalHours != null
          ? Number(hours.totalHours)
          : pm + design + construction;

      accumulator.pmHours += pm;
      accumulator.designHours += design;
      accumulator.constructionHours += construction;
      accumulator.totalHours += total;
      return accumulator;
    }, createEmptyTotals());

  const sumStaffTotals = (staff) =>
    sumStaffHours(staff, (entry) => entry.totals);

  const sumStaffMonthly = (staff) =>
    sumStaffHours(staff, (entry) => entry.monthly);

  const projectEntries = Array.from(projectEntriesMap.values())
    .map((entry) => {
      const summary = projectSummaryMap.get(entry.projectId);
      const staffTotals = sumStaffTotals(entry.staff);
      const staffMonthlyTotals = sumStaffMonthly(entry.staff);
      const staffManualTotal = entry.staff.reduce(
        (sum, assignment) => sum + Number(assignment.manual?.totalHours || 0),
        0
      );
      const totals = summary
        ? {
            pmHours:
              Number(summary.assigned?.pmHours || 0) || staffTotals.pmHours,
            designHours:
              Number(summary.assigned?.designHours || 0) ||
              staffTotals.designHours,
            constructionHours:
              Number(summary.assigned?.constructionHours || 0) ||
              staffTotals.constructionHours,
            totalHours:
              Number(summary.assigned?.totalHours || 0) ||
              staffTotals.totalHours ||
              Number(summary.assigned?.pmHours || 0) +
                Number(summary.assigned?.designHours || 0) +
                Number(summary.assigned?.constructionHours || 0),
          }
        : staffTotals;

      const demandTotal = Number(summary?.demand?.totalHours || 0);
      const assignedTotal = Number(totals.totalHours || 0);
      const coverage = demandTotal
        ? Math.min(1, assignedTotal / demandTotal) * 100
        : assignedTotal > 0
        ? 100
        : 0;

      const monthlyTotals = {
        pmHours: Number(staffMonthlyTotals.pmHours || 0),
        designHours: Number(staffMonthlyTotals.designHours || 0),
        constructionHours: Number(
          staffMonthlyTotals.constructionHours || 0
        ),
        totalHours: Number(staffMonthlyTotals.totalHours || 0),
      };

      const manualTotal = Number(
        summary?.manual?.totalHours ?? staffManualTotal
      );
      const unfilledTotal = Number(summary?.unfilled?.totalHours || 0);

      return {
        ...entry,
        totals: {
          pmHours: Number(totals.pmHours || 0),
          designHours: Number(totals.designHours || 0),
          constructionHours: Number(totals.constructionHours || 0),
          totalHours: Number(totals.totalHours || 0),
        },
        monthlyTotals,
        coverage,
        manualTotal,
        unfilledTotal,
      };
    })
    .sort((a, b) => a.projectName.localeCompare(b.projectName));

  const phaseKeyMap = {
    pm: "pmHours",
    design: "designHours",
    construction: "constructionHours",
  };

  const groupedUnfilledMap = new Map();
  unfilledRows.forEach((row) => {
    const projectId = row.projectId;
    if (!projectId) {
      return;
    }

    if (!groupedUnfilledMap.has(projectId)) {
      groupedUnfilledMap.set(projectId, {
        projectId,
        projectName: row.projectName,
        totals: createEmptyTotals(),
        categories: new Map(),
      });
    }

    const projectEntry = groupedUnfilledMap.get(projectId);
    const categoryName = row.categoryName || "Uncategorized";

    if (!projectEntry.categories.has(categoryName)) {
      projectEntry.categories.set(categoryName, {
        categoryName,
        phases: createEmptyTotals(),
        totalHours: 0,
      });
    }

    const categoryEntry = projectEntry.categories.get(categoryName);
    const hours = Number(row.hours || 0);
    if (hours <= 0) {
      return;
    }

    const phaseKey = phaseKeyMap[row.phase] || row.phase;
    if (!categoryEntry.phases[phaseKey]) {
      categoryEntry.phases[phaseKey] = 0;
    }
    categoryEntry.phases[phaseKey] += hours;
    categoryEntry.totalHours += hours;

    if (!projectEntry.totals[phaseKey]) {
      projectEntry.totals[phaseKey] = 0;
    }
    projectEntry.totals[phaseKey] += hours;
    projectEntry.totals.totalHours += hours;
  });

  const groupedUnfilled = Array.from(groupedUnfilledMap.values())
    .map((entry) => ({
      ...entry,
      categories: Array.from(entry.categories.values()).sort((a, b) =>
        a.categoryName.localeCompare(b.categoryName)
      ),
    }))
    .sort((a, b) => a.projectName.localeCompare(b.projectName));

  const unfilledColumns = [
    { key: "category", label: "Category", flex: 1.8 },
    ...projectPhaseColumns,
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Staff Utilization Plan</Text>
          <Text style={styles.subtitle}>
            Generated {generationDate.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            {" "}
            at {generationDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          {summaryCards.map((card, index) => (
            <View key={card.label} style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{card.label}</Text>
              <Text style={styles.summaryValue}>{card.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assignments by Project & Staff</Text>
          {projectEntries.length === 0 ? (
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <View
                  style={{ ...styles.tableCell, flex: 1, borderRightWidth: 0 }}
                >
                  <Text>No assignments available.</Text>
                </View>
              </View>
            </View>
          ) : (
            projectEntries.map((project) => {
              return (
                <View
                  key={project.projectId}
                  style={[styles.table, styles.projectTable]}
                >
                  <View style={[styles.tableRow, styles.projectHeaderRow]}>
                    {staffDetailColumns.map((column, index) => {
                      const cellStyle = {
                        ...styles.tableCell,
                        flex: column.flex,
                        borderRightWidth:
                          index === staffDetailColumns.length - 1 ? 0 : 1,
                      };

                      if (column.key === "staff") {
                        return (
                          <View key={column.key} style={cellStyle}>
                            <Text style={styles.projectHeaderTitle}>
                              {project.projectName}
                            </Text>
                          </View>
                        );
                      }

                      const metricLabel = column.projectMetricLabel || column.label;
                      const metricValue = column.getProjectMetricValue
                        ? column.getProjectMetricValue(project)
                        : "";

                      return (
                        <View key={column.key} style={cellStyle}>
                          <Text style={styles.projectHeaderMetricLabel}>
                            {metricLabel}
                          </Text>
                          {metricValue ? (
                            <Text style={styles.projectHeaderMetricValue}>
                              {metricValue}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                  <View style={[styles.tableRow, styles.projectStaffHeaderRow]}>
                    {staffDetailColumns.map((column, index) => (
                      <View
                        key={column.key}
                        style={{
                          ...styles.tableCell,
                          flex: column.flex,
                          borderRightWidth:
                            index === staffDetailColumns.length - 1 ? 0 : 1,
                        }}
                      >
                        <Text style={styles.tableHeaderText}>{column.label}</Text>
                      </View>
                    ))}
                  </View>
                  {project.staff.length === 0 ? (
                    <View style={styles.tableRow}>
                      <View
                        style={{
                          ...styles.tableCell,
                          flex: totalStaffFlex,
                          borderRightWidth: 0,
                        }}
                      >
                        <Text>No staff assigned.</Text>
                      </View>
                    </View>
                  ) : (
                    project.staff.map((assignment, index) => {
                      const rowStyles = [styles.tableRow];
                      if (index % 2 === 1) {
                        rowStyles.push(styles.tableRowAlt);
                      }

                      return (
                        <View
                          key={`${assignment.projectId}-${assignment.staffId}`}
                          style={rowStyles}
                        >
                          {staffDetailColumns.map((column, columnIndex) => {
                            const value = column.getValue
                              ? column.getValue(assignment)
                              : "";

                            return (
                              <View
                                key={`${column.key}-${assignment.staffId}`}
                                style={{
                                  ...styles.tableCell,
                                  flex: column.flex,
                                  borderRightWidth:
                                    columnIndex ===
                                    staffDetailColumns.length - 1
                                      ? 0
                                      : 1,
                                }}
                              >
                                <Text>{value}</Text>
                              </View>
                            );
                          })}
                        </View>
                      );
                    })
                  )}
                </View>
              );
            })
          )}
          <Text style={styles.note}>
            Phase columns show both average monthly hours and total hours across each project.
            Manual column represents hours explicitly assigned by managers; remaining coverage is sourced from the optimization engine.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Coverage Summary</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              {["Project", "Demand", "Assigned", "Manual", "Auto", "Unfilled"].map(
                (label, index, array) => (
                  <View
                    key={label}
                    style={{
                      ...styles.tableCell,
                      flex: index === 0 ? 1.8 : 1,
                      borderRightWidth: index === array.length - 1 ? 0 : 1,
                    }}
                  >
                    <Text style={styles.tableHeaderText}>{label}</Text>
                  </View>
                )
              )}
            </View>
            {projectSummaries.length === 0 ? (
              <View style={styles.tableRow}>
                <View style={{ ...styles.tableCell, flex: 6.8, borderRightWidth: 0 }}>
                  <Text>No project data available.</Text>
                </View>
              </View>
            ) : (
              projectSummaries.map((summary, index) => (
                <View
                  key={summary.projectId}
                  style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
                >
                  <View style={{ ...styles.tableCell, flex: 1.8 }}>
                    <Text>{summary.projectName}</Text>
                  </View>
                  <View style={{ ...styles.tableCell, flex: 1 }}>
                    <Text>{formatNumber(summary.demand?.totalHours || 0)}</Text>
                  </View>
                  <View style={{ ...styles.tableCell, flex: 1 }}>
                    <Text>{formatNumber(summary.assigned?.totalHours || 0)}</Text>
                  </View>
                  <View style={{ ...styles.tableCell, flex: 1 }}>
                    <Text>{formatNumber(summary.manual?.totalHours || 0)}</Text>
                  </View>
                  <View style={{ ...styles.tableCell, flex: 1 }}>
                    <Text>{formatNumber(summary.auto?.totalHours || 0)}</Text>
                  </View>
                  <View
                    style={{
                      ...styles.tableCell,
                      flex: 1,
                      borderRightWidth: 0,
                    }}
                  >
                    <Text>{formatNumber(summary.unfilled?.totalHours || 0)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Staff Utilization Overview</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              {[
                "Staff",
                "Available (hrs/mo)",
                "Assigned (hrs/mo)",
                "Overbooked",
              ].map((label, index, array) => (
                <View
                  key={label}
                  style={{
                    ...styles.tableCell,
                    flex: index === 0 ? 2 : 1,
                    borderRightWidth: index === array.length - 1 ? 0 : 1,
                  }}
                >
                  <Text style={styles.tableHeaderText}>{label}</Text>
                </View>
              ))}
            </View>
            {staffSummaries.length === 0 ? (
              <View style={styles.tableRow}>
                <View style={{ ...styles.tableCell, flex: 5, borderRightWidth: 0 }}>
                  <Text>No staff data available.</Text>
                </View>
              </View>
            ) : (
              staffSummaries.map((entry, index) => (
                <View
                  key={entry.staffName}
                  style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
                >
                  <View style={{ ...styles.tableCell, flex: 2 }}>
                    <Text>{entry.staffName}</Text>
                  </View>
                  <View style={{ ...styles.tableCell, flex: 1 }}>
                    <Text>{formatNumber(entry.availability || 0)}</Text>
                  </View>
                  <View style={{ ...styles.tableCell, flex: 1 }}>
                    <Text>{formatNumber(entry.assigned || 0)}</Text>
                  </View>
                  <View
                    style={{
                      ...styles.tableCell,
                      flex: 1,
                      borderRightWidth: 0,
                    }}
                  >
                    <Text>{entry.overbooked ? "Yes" : "No"}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {groupedUnfilled.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Unfilled Demand</Text>
            {groupedUnfilled.map((project) => (
              <View
                key={project.projectId}
                style={[styles.table, styles.projectTable]}
              >
                <View style={[styles.tableRow, styles.projectHeaderRow]}>
                  <View
                    style={{
                      ...styles.tableCell,
                      flex: unfilledColumns[0].flex,
                    }}
                  >
                    <Text style={styles.unfilledProjectTitle}>
                      {project.projectName}
                    </Text>
                  </View>
                  {projectPhaseColumns.map((column, index) => (
                    <View
                      key={column.key}
                      style={{
                        ...styles.tableCell,
                        flex: unfilledColumns[index + 1].flex,
                        borderRightWidth:
                          index === projectPhaseColumns.length - 1 ? 0 : 1,
                      }}
                    >
                      <Text style={styles.projectHeaderMetricLabel}>
                        {column.label}
                      </Text>
                      <Text style={styles.projectHeaderMetricValue}>
                        {formatNumber(project.totals[column.key] || 0)} hrs
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={[styles.tableRow, styles.projectStaffHeaderRow]}>
                  {unfilledColumns.map((column, index) => (
                    <View
                      key={column.key}
                      style={{
                        ...styles.tableCell,
                        flex: column.flex,
                        borderRightWidth:
                          index === unfilledColumns.length - 1 ? 0 : 1,
                      }}
                    >
                      <Text style={styles.tableHeaderText}>{column.label}</Text>
                    </View>
                  ))}
                </View>
                {project.categories.map((category, index) => (
                  <View
                    key={`${project.projectId}-${category.categoryName}`}
                    style={[
                      styles.tableRow,
                      index % 2 === 1 && styles.tableRowAlt,
                    ]}
                  >
                    <View
                      style={{
                        ...styles.tableCell,
                        flex: unfilledColumns[0].flex,
                      }}
                    >
                      <Text>{category.categoryName}</Text>
                    </View>
                    {projectPhaseColumns.map((column, phaseIndex) => (
                      <View
                        key={`${category.categoryName}-${column.key}`}
                        style={{
                          ...styles.tableCell,
                          flex: unfilledColumns[phaseIndex + 1].flex,
                          borderRightWidth:
                            phaseIndex === projectPhaseColumns.length - 1
                              ? 0
                              : 1,
                        }}
                      >
                        <Text>
                          {formatNumber(
                            column.key === "totalHours"
                              ? category.totalHours
                              : category.phases?.[column.key] || 0
                          )}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
};

export default StaffUtilizationPdf;
