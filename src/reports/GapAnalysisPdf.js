import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  Svg,
  Line,
  Polyline,
  Rect,
  Polygon,
  Text as SvgText,
} from "@react-pdf/renderer";

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
    flexWrap: "wrap",
    marginTop: 12,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#1f2937",
    marginBottom: 12,
  },
  chartCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#ffffff",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginTop: 4,
  },
  legendSwatch: {
    width: 12,
    height: 4,
    marginRight: 6,
  },
  chartGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
  },
  chartWrapper: {
    width: "50%",
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#111827",
    color: "#ffffff",
  },
  tableHeaderCell: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 9,
    fontWeight: 600,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableRowAlt: {
    backgroundColor: "#f9fafb",
  },
  tableCell: {
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 9,
  },
  tableEmpty: {
    padding: 12,
  },
  pageNumber: {
    position: "absolute",
    fontSize: 9,
    bottom: 24,
    right: 36,
    color: "#6b7280",
  },
});

const GAP_COLUMNS = [
  { key: "monthLabel", label: "Month", flex: 1 },
  { key: "category", label: "Staff Category", flex: 1.4 },
  { key: "required", label: "Allocated (FTE)", flex: 1 },
  { key: "available", label: "Actual (FTE)", flex: 1 },
  { key: "gap", label: "Gap (FTE)", flex: 0.9 },
  { key: "severity", label: "Severity", flex: 0.8 },
];

const formatNumber = (value, digits = 1) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "0";
  }
  return numeric.toFixed(digits);
};

const formatPercent = (value, digits = 1) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "0%";
  }
  return `${numeric.toFixed(digits)}%`;
};

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

const Legend = ({ items = [] }) => (
  <View style={styles.legend}>
    {items.map((item) => (
      <View key={item.label} style={styles.legendItem}>
        <View
          style={{
            ...styles.legendSwatch,
            backgroundColor: item.color,
          }}
        />
        <Text>{item.label}</Text>
      </View>
    ))}
  </View>
);

const getXPosition = (index, length, chartWidth, paddingLeft) => {
  if (length <= 1) {
    return paddingLeft + chartWidth / 2;
  }

  return paddingLeft + (index / (length - 1)) * chartWidth;
};

const getYPosition = (value, maxValue, chartHeight, paddingTop) => {
  const safeMax = Math.max(1, maxValue);
  const safeValue = Math.max(0, Number(value) || 0);
  const normalized = safeValue / safeMax;
  return paddingTop + chartHeight - normalized * chartHeight;
};

const SummaryChart = ({ data = [] }) => {
  if (!data.length) {
    return <Text>No forecast data available.</Text>;
  }

  const width = 720;
  const height = 260;
  const paddingLeft = 60;
  const paddingRight = 24;
  const paddingTop = 24;
  const paddingBottom = 36;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxValue = Math.max(
    1,
    ...data.map((point) => Math.max(point.totalRequired || 0, point.totalActual || 0))
  );

  const yTicks = 4;
  const xLabelCount = Math.min(6, data.length);
  const xInterval = Math.max(1, Math.floor(data.length / xLabelCount));

  const buildLinePoints = (key) =>
    data
      .map((point, index) => {
        const x = getXPosition(index, data.length, chartWidth, paddingLeft);
        const y = getYPosition(
          point[key] || 0,
          maxValue,
          chartHeight,
          paddingTop
        );
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <View style={styles.chartCard}>
      <Svg width={width} height={height}>
        {/* Axes */}
        <Line
          x1={paddingLeft}
          y1={paddingTop}
          x2={paddingLeft}
          y2={paddingTop + chartHeight}
          stroke="#9ca3af"
          strokeWidth={1}
        />
        <Line
          x1={paddingLeft}
          y1={paddingTop + chartHeight}
          x2={paddingLeft + chartWidth}
          y2={paddingTop + chartHeight}
          stroke="#9ca3af"
          strokeWidth={1}
        />

        {/* Horizontal grid lines */}
        {Array.from({ length: yTicks + 1 }).map((_, index) => {
          const value = (maxValue / yTicks) * index;
          const y = getYPosition(value, maxValue, chartHeight, paddingTop);
          return (
            <React.Fragment key={`y-${index}`}>
              <Line
                x1={paddingLeft}
                y1={y}
                x2={paddingLeft + chartWidth}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={0.6}
              />
              <SvgText
                x={paddingLeft - 6}
                y={y + 3}
                fontSize={8}
                fill="#6b7280"
                textAnchor="end"
              >
                {formatNumber(value, 0)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* X axis labels */}
        {data.map((point, index) => {
          if (index % xInterval !== 0 && index !== data.length - 1) {
            return null;
          }
          const x = getXPosition(index, data.length, chartWidth, paddingLeft);
          return (
            <SvgText
              key={`x-${index}`}
              x={x}
              y={paddingTop + chartHeight + 16}
              fontSize={8}
              fill="#6b7280"
              textAnchor="middle"
            >
              {point.monthLabel}
            </SvgText>
          );
        })}

        {/* Data lines */}
        <Polyline
          points={buildLinePoints("totalRequired")}
          fill="none"
          stroke="#2563eb"
          strokeWidth={2}
        />
        <Polyline
          points={buildLinePoints("totalActual")}
          fill="none"
          stroke="#10b981"
          strokeWidth={2}
          strokeDasharray="6 3"
        />
      </Svg>
      <Legend
        items={[
          { label: "Allocated (FTE)", color: "#2563eb" },
          { label: "Actual Availability (FTE)", color: "#10b981" },
        ]}
      />
    </View>
  );
};

const CategoryChart = ({ name, data = [] }) => {
  if (!data.length) {
    return (
      <View style={styles.chartCard}>
        <Text>{name}</Text>
        <Text>No forecast data available.</Text>
      </View>
    );
  }

  const width = 520;
  const height = 220;
  const paddingLeft = 46;
  const paddingRight = 18;
  const paddingTop = 20;
  const paddingBottom = 34;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxValue = Math.max(
    1,
    ...data.map((point) => Math.max(point.required || 0, point.actual || 0))
  );

  const xLabelCount = Math.min(4, data.length);
  const xInterval = Math.max(1, Math.floor(data.length / xLabelCount));

  const buildLinePoints = (key) =>
    data
      .map((point, index) => {
        const x = getXPosition(index, data.length, chartWidth, paddingLeft);
        const y = getYPosition(
          point[key] || 0,
          maxValue,
          chartHeight,
          paddingTop
        );
        return `${x},${y}`;
      })
      .join(" ");

  const actualAreaPoints = [
    `${paddingLeft},${paddingTop + chartHeight}`,
    ...data.map((point, index) => {
      const x = getXPosition(index, data.length, chartWidth, paddingLeft);
      const y = getYPosition(
        point.actual || 0,
        maxValue,
        chartHeight,
        paddingTop
      );
      return `${x},${y}`;
    }),
    `${paddingLeft + chartWidth},${paddingTop + chartHeight}`,
  ].join(" ");

  const gapRects = data
    .map((point, index) => {
      const gapValue = Math.max(0, Number(point.gap) || 0);
      if (gapValue <= 0) {
        return null;
      }
      const requiredY = getYPosition(
        Number(point.required) || 0,
        maxValue,
        chartHeight,
        paddingTop
      );
      const actualY = getYPosition(
        (Number(point.required) || 0) - gapValue,
        maxValue,
        chartHeight,
        paddingTop
      );
      if (actualY <= requiredY) {
        return null;
      }
      const columnWidth = chartWidth / Math.max(1, data.length);
      const barWidth = columnWidth * 0.6;
      const barX =
        paddingLeft + index * columnWidth + (columnWidth - barWidth) / 2;
      return {
        x: barX,
        y: requiredY,
        width: barWidth,
        height: actualY - requiredY,
      };
    })
    .filter(Boolean);

  return (
    <View style={styles.chartCard}>
      <Text style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>{name}</Text>
      <Svg width={width} height={height}>
        {/* Axes */}
        <Line
          x1={paddingLeft}
          y1={paddingTop}
          x2={paddingLeft}
          y2={paddingTop + chartHeight}
          stroke="#9ca3af"
          strokeWidth={1}
        />
        <Line
          x1={paddingLeft}
          y1={paddingTop + chartHeight}
          x2={paddingLeft + chartWidth}
          y2={paddingTop + chartHeight}
          stroke="#9ca3af"
          strokeWidth={1}
        />

        {/* Horizontal grid */}
        {Array.from({ length: 4 }).map((_, index) => {
          const value = (maxValue / 3) * index;
          const y = getYPosition(value, maxValue, chartHeight, paddingTop);
          return (
            <React.Fragment key={`cat-y-${index}`}>
              <Line
                x1={paddingLeft}
                y1={y}
                x2={paddingLeft + chartWidth}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={0.6}
              />
              <SvgText
                x={paddingLeft - 6}
                y={y + 3}
                fontSize={8}
                fill="#6b7280"
                textAnchor="end"
              >
                {formatNumber(value, 0)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* X axis labels */}
        {data.map((point, index) => {
          if (index % xInterval !== 0 && index !== data.length - 1) {
            return null;
          }
          const x = getXPosition(index, data.length, chartWidth, paddingLeft);
          return (
            <SvgText
              key={`cat-x-${index}`}
              x={x}
              y={paddingTop + chartHeight + 16}
              fontSize={8}
              fill="#6b7280"
              textAnchor="middle"
            >
              {point.month}
            </SvgText>
          );
        })}

        {/* Actual area */}
        <Polygon
          points={actualAreaPoints}
          fill="#10b981"
          fillOpacity={0.18}
        />

        {/* Gap bars */}
        {gapRects.map((rect, index) => (
          <Rect
            key={`gap-${index}`}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            fill="#ef4444"
            fillOpacity={0.35}
          />
        ))}

        {/* Lines */}
        <Polyline
          points={buildLinePoints("required")}
          fill="none"
          stroke="#2563eb"
          strokeWidth={2}
        />
        <Polyline
          points={buildLinePoints("actual")}
          fill="none"
          stroke="#10b981"
          strokeWidth={2}
        />
      </Svg>
      <Legend
        items={[
          { label: "Allocated (FTE)", color: "#2563eb" },
          { label: "Actual Availability", color: "#10b981" },
          { label: "Gap (FTE)", color: "#ef4444" },
        ]}
      />
    </View>
  );
};

const GapTable = ({ rows = [] }) => (
  <View style={styles.tableContainer}>
    <View style={styles.tableHeaderRow}>
      {GAP_COLUMNS.map((column) => (
        <View
          key={column.key}
          style={{
            flexGrow: column.flex,
            flexShrink: column.flex,
            flexBasis: 0,
            ...styles.tableHeaderCell,
          }}
        >
          <Text>{column.label}</Text>
        </View>
      ))}
    </View>

    {rows.length > 0 ? (
      rows.map((row, index) => (
        <View
          key={`${row.month}-${row.category}-${index}`}
          style={[
            styles.tableRow,
            index % 2 === 1 ? styles.tableRowAlt : null,
          ]}
        >
          {GAP_COLUMNS.map((column) => (
            <View
              key={column.key}
              style={{
                flexGrow: column.flex,
                flexShrink: column.flex,
                flexBasis: 0,
                ...styles.tableCell,
              }}
            >
              <Text>
                {row[column.key] != null ? String(row[column.key]) : ""}
              </Text>
            </View>
          ))}
        </View>
      ))
    ) : (
      <View style={styles.tableRow}>
        <View style={styles.tableEmpty}>
          <Text>No staffing gap entries are currently available.</Text>
        </View>
      </View>
    )}
  </View>
);

const GapAnalysisPdf = ({
  summarySeries = [],
  categorySeries = [],
  gaps = [],
  summary = {},
  meta = {},
  generatedOn = new Date(),
}) => {
  const generatedLabel = formatDateLabel(generatedOn);

  return (
    <Document>
      <Page size="TABLOID" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Staffing Gap Analysis</Text>
          <Text style={styles.subtitle}>
            Resource forecast overview highlighting allocation versus availability and critical staffing gaps.
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Generated</Text>
              <Text style={styles.metaValue}>{generatedLabel}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Gap Entries</Text>
              <Text style={styles.metaValue}>{meta.gapCount || 0}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Critical Gaps</Text>
              <Text style={styles.metaValue}>{meta.criticalCount || 0}</Text>
            </View>
            {summary?.peakMonth ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Peak Demand Month</Text>
                <Text style={styles.metaValue}>{summary.peakMonth}</Text>
              </View>
            ) : null}
            {summary?.averageUtilization ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Avg. Utilization</Text>
                <Text style={styles.metaValue}>
                  {formatPercent(summary.averageUtilization, 1)}
                </Text>
              </View>
            ) : null}
            {summary?.gapMonths ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Months with Gaps</Text>
                <Text style={styles.metaValue}>{summary.gapMonths}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio Staffing Outlook</Text>
          <SummaryChart data={summarySeries} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Detail</Text>
          <View style={styles.chartGrid}>
            {categorySeries.length > 0 ? (
              categorySeries.map((category) => (
                <View key={category.name} style={styles.chartWrapper}>
                  <CategoryChart name={category.name} data={category.data} />
                </View>
              ))
            ) : (
              <Text>No staff categories available.</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detailed Staffing Gap Entries</Text>
          <GapTable rows={gaps} />
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

export default GapAnalysisPdf;
