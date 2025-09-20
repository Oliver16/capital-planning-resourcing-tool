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

  const assignmentColumns = [
    { key: "staff", label: "Staff", flex: 1.6 },
    { key: "project", label: "Project", flex: 1.6 },
    { key: "pm", label: "PM", flex: 0.8 },
    { key: "design", label: "Design", flex: 0.8 },
    { key: "construction", label: "Construction", flex: 0.9 },
    { key: "total", label: "Total", flex: 0.8 },
    { key: "manual", label: "Manual", flex: 0.8 },
    { key: "status", label: "Status", flex: 0.9 },
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
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              {assignmentColumns.map((column, columnIndex) => (
                <View
                  key={column.key}
                  style={{
                    ...styles.tableCell,
                    flex: column.flex,
                    borderRightWidth:
                      columnIndex === assignmentColumns.length - 1 ? 0 : 1,
                  }}
                >
                  <Text style={styles.tableHeaderText}>{column.label}</Text>
                </View>
              ))}
            </View>
            {assignments.length === 0 ? (
              <View style={styles.tableRow}>
                <View style={{ ...styles.tableCell, flex: 8, borderRightWidth: 0 }}>
                  <Text>No assignments available.</Text>
                </View>
              </View>
            ) : (
              assignments.map((assignment, index) => {
                const rowStyles = [styles.tableRow];
                if (index % 2 === 1) {
                  rowStyles.push(styles.tableRowAlt);
                }

                const manualTotal = Number(assignment.manual?.totalHours || 0);
                return (
                  <View key={`${assignment.projectId}-${assignment.staffId}`} style={rowStyles}>
                    <View style={{ ...styles.tableCell, flex: assignmentColumns[0].flex }}>
                      <Text>{assignment.staffName}</Text>
                    </View>
                    <View style={{ ...styles.tableCell, flex: assignmentColumns[1].flex }}>
                      <Text>{assignment.projectName}</Text>
                    </View>
                    <View style={{ ...styles.tableCell, flex: assignmentColumns[2].flex }}>
                      <Text>{formatNumber(assignment.totals?.pmHours || 0)}</Text>
                    </View>
                    <View style={{ ...styles.tableCell, flex: assignmentColumns[3].flex }}>
                      <Text>{formatNumber(assignment.totals?.designHours || 0)}</Text>
                    </View>
                    <View style={{ ...styles.tableCell, flex: assignmentColumns[4].flex }}>
                      <Text>{formatNumber(assignment.totals?.constructionHours || 0)}</Text>
                    </View>
                    <View style={{ ...styles.tableCell, flex: assignmentColumns[5].flex }}>
                      <Text>{formatNumber(assignment.totals?.totalHours || 0)}</Text>
                    </View>
                    <View style={{ ...styles.tableCell, flex: assignmentColumns[6].flex }}>
                      <Text>{formatNumber(manualTotal)}</Text>
                    </View>
                    <View
                      style={{
                        ...styles.tableCell,
                        flex: assignmentColumns[7].flex,
                        borderRightWidth: 0,
                      }}
                    >
                      <Text>{getStatusLabel(assignment)}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
          <Text style={styles.note}>
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
              {["Staff", "Available", "Assigned", "Overbooked"].map(
                (label, index, array) => (
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
                )
              )}
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

        {unfilledRows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Unfilled Demand</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                {["Project", "Category", "Phase", "Hours"].map((label, index, array) => (
                  <View
                    key={label}
                    style={{
                      ...styles.tableCell,
                      flex: index === 0 ? 1.6 : 1,
                      borderRightWidth: index === array.length - 1 ? 0 : 1,
                    }}
                  >
                    <Text style={styles.tableHeaderText}>{label}</Text>
                  </View>
                ))}
              </View>
              {unfilledRows.map((row, index) => (
                <View
                  key={`${row.projectId}-${row.categoryName}-${row.phase}-${index}`}
                  style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
                >
                  <View style={{ ...styles.tableCell, flex: 1.6 }}>
                    <Text>{row.projectName}</Text>
                  </View>
                  <View style={{ ...styles.tableCell, flex: 1 }}>
                    <Text>{row.categoryName}</Text>
                  </View>
                  <View style={{ ...styles.tableCell, flex: 1 }}>
                    <Text>{row.phase}</Text>
                  </View>
                  <View
                    style={{
                      ...styles.tableCell,
                      flex: 1,
                      borderRightWidth: 0,
                    }}
                  >
                    <Text>{formatNumber(row.hours)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default StaffUtilizationPdf;
