import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const COLUMN_DEFINITIONS = [
  { key: "name", label: "Project / Program", flex: 1.8 },
  { key: "type", label: "Type", flex: 0.6 },
  { key: "projectType", label: "Project Type", flex: 1.1 },
  { key: "fundingSource", label: "Funding Source", flex: 1.1 },
  { key: "deliveryMethod", label: "Delivery Method", flex: 0.9 },
  { key: "designStart", label: "Design Start", flex: 0.8 },
  { key: "constructionStart", label: "Construction Start", flex: 0.9 },
  { key: "constructionEnd", label: "Construction End", flex: 0.9 },
  { key: "totalBudget", label: "Total Budget", flex: 0.9 },
  { key: "annualBudget", label: "Annual Budget", flex: 0.8 },
  { key: "priority", label: "Priority", flex: 0.6 },
];

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: "#1f2937",
  },
  subtitle: {
    fontSize: 12,
    color: "#4b5563",
    marginTop: 6,
  },
  metaRow: {
    flexDirection: "row",
    marginTop: 12,
    flexWrap: "wrap",
  },
  metaItem: {
    marginRight: 16,
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 9,
    color: "#6b7280",
  },
  metaValue: {
    fontSize: 11,
    fontWeight: 600,
    color: "#111827",
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#111827",
    color: "#ffffff",
  },
  headerCell: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 9,
    fontWeight: 600,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    minHeight: 20,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#f9fafb",
  },
  categoryHeaderRow: {
    backgroundColor: "#e5e7eb",
  },
  categoryHeaderCell: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  categoryHeaderText: {
    fontSize: 10,
    fontWeight: 700,
    color: "#111827",
  },
  summaryRow: {
    backgroundColor: "#f3f4f6",
  },
  summaryCell: {
    fontWeight: 600,
  },
  cell: {
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 9,
  },
  pageNumber: {
    position: "absolute",
    fontSize: 9,
    bottom: 24,
    right: 36,
    color: "#6b7280",
  },
});

const formatDateLabel = (value) => {
  if (!value) {
    return "";
  }

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    return value;
  }
};

const getCellStyle = (column) => ({
  flexGrow: column.flex,
  flexShrink: column.flex,
  flexBasis: 0,
});

const parseDateValue = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
};

const getRowStartTimestamp = (row = {}) => {
  const designStart = parseDateValue(row.designStart);
  const constructionStart = parseDateValue(row.constructionStart);

  if (designStart != null && constructionStart != null) {
    return Math.min(designStart, constructionStart);
  }

  if (designStart != null) {
    return designStart;
  }

  if (constructionStart != null) {
    return constructionStart;
  }

  return Number.POSITIVE_INFINITY;
};

const parseCurrencyValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numeric = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatCurrencyTotal = (value) => {
  if (!Number.isFinite(value)) {
    return "";
  }

  if (value === 0) {
    return "$0";
  }

  const absolute = Math.abs(value);
  const formatted = absolute.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return `${value < 0 ? "-$" : "$"}${formatted}`;
};

const groupRowsByCategory = (rows = []) => {
  const groups = new Map();

  rows.forEach((row) => {
    const category = row.projectType || "Uncategorized";
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category).push(row);
  });

  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) =>
    String(a || "").localeCompare(String(b || ""))
  );

  return sortedGroups.map(([category, groupRows]) => {
    const sortedRows = [...groupRows].sort((a, b) => {
      const startA = getRowStartTimestamp(a);
      const startB = getRowStartTimestamp(b);

      if (startA !== startB) {
        if (startA === Number.POSITIVE_INFINITY) {
          return 1;
        }
        if (startB === Number.POSITIVE_INFINITY) {
          return -1;
        }
        return startA - startB;
      }

      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    const totalBudgetValue = sortedRows.reduce(
      (sum, row) => sum + parseCurrencyValue(row.totalBudget),
      0
    );
    const annualBudgetValue = sortedRows.reduce(
      (sum, row) => sum + parseCurrencyValue(row.annualBudget),
      0
    );

    return {
      category,
      rows: sortedRows,
      totals: {
        totalBudgetValue,
        annualBudgetValue,
        totalBudgetLabel: formatCurrencyTotal(totalBudgetValue),
        annualBudgetLabel: formatCurrencyTotal(annualBudgetValue),
      },
    };
  });
};

const renderMetaValue = (label, value) => (
  <View key={label} style={styles.metaItem}>
    <Text style={styles.metaLabel}>{label}</Text>
    <Text style={styles.metaValue}>{value}</Text>
  </View>
);

const CipReportPdf = ({ rows = [], meta = {}, generatedOn = new Date() }) => {
  const generatedLabel = formatDateLabel(generatedOn);
  const totalProjects = meta.projectCount || 0;
  const totalPrograms = meta.programCount || 0;
  const groupedRows = React.useMemo(() => groupRowsByCategory(rows), [rows]);
  let zebraIndex = 0;

  return (
    <Document>
      <Page size="TABLOID" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Capital Improvement Plan Report</Text>
          <Text style={styles.subtitle}>
            Comprehensive list of CIP projects and programs with delivery timeline and budget context.
          </Text>
          <View style={styles.metaRow}>
            {renderMetaValue("Generated", generatedLabel)}
            {renderMetaValue("Projects", totalProjects)}
            {renderMetaValue("Programs", totalPrograms)}
            {meta.totalProjectBudgetLabel
              ? renderMetaValue("Total Project Budget", meta.totalProjectBudgetLabel)
              : null}
            {meta.totalProgramBudgetLabel
              ? renderMetaValue("Annual Program Budget", meta.totalProgramBudgetLabel)
              : null}
          </View>
        </View>

        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            {COLUMN_DEFINITIONS.map((column) => (
              <View
                key={column.key}
                style={{ ...getCellStyle(column), ...styles.headerCell }}
              >
                <Text>{column.label}</Text>
              </View>
            ))}
          </View>

          {groupedRows.length > 0 ? (
            groupedRows.map((group) => (
              <React.Fragment key={group.category || "uncategorized"}>
                <View style={[styles.tableRow, styles.categoryHeaderRow]}>
                  <View style={styles.categoryHeaderCell}>
                    <Text style={styles.categoryHeaderText}>
                      {group.category || "Uncategorized"}
                    </Text>
                  </View>
                </View>
                {group.rows.map((row, rowIndex) => {
                  const rowKey =
                    row.id != null
                      ? `row-${row.id}`
                      : `${group.category || "uncategorized"}-${rowIndex}`;
                  const isAltRow = zebraIndex % 2 === 1;
                  zebraIndex += 1;

                  return (
                    <View
                      key={rowKey}
                      style={[
                        styles.tableRow,
                        isAltRow ? styles.tableRowAlt : null,
                      ]}
                    >
                      {COLUMN_DEFINITIONS.map((column) => (
                        <View
                          key={column.key}
                          style={{ ...getCellStyle(column), ...styles.cell }}
                        >
                          <Text>
                            {row[column.key] != null ? String(row[column.key]) : ""}
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                })}
                <View
                  key={`${group.category || "uncategorized"}-summary`}
                  style={[styles.tableRow, styles.summaryRow]}
                >
                  {COLUMN_DEFINITIONS.map((column) => {
                    let value = "";

                    if (column.key === "name") {
                      value = `${group.category || "Uncategorized"} Total`;
                    } else if (column.key === "totalBudget") {
                      value = group.totals.totalBudgetLabel;
                    } else if (column.key === "annualBudget") {
                      value = group.totals.annualBudgetLabel;
                    }

                    return (
                      <View
                        key={column.key}
                        style={{
                          ...getCellStyle(column),
                          ...styles.cell,
                          ...styles.summaryCell,
                        }}
                      >
                        <Text>{value}</Text>
                      </View>
                    );
                  })}
                </View>
              </React.Fragment>
            ))
          ) : (
            <View style={styles.tableRow}>
              <View style={{ flex: 1, padding: 12 }}>
                <Text>No project data available.</Text>
              </View>
            </View>
          )}
        </View>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
};

export default CipReportPdf;
