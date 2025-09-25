import React, { useCallback, useMemo } from "react";
import {
  AlertTriangle,
  BarChart3,
  DownloadCloud,
  FileSpreadsheet,
  Users,
} from "lucide-react";
import {
  buildCipEffortReport,
  buildCipReport,
  buildGapAnalysisReport,
  downloadReport,
  formatReportMeta,
} from "../../utils/reports";
import { downloadPdfDocument } from "../../utils/pdf";
import CipReportPdf from "../../reports/CipReportPdf";
import GapAnalysisPdf from "../../reports/GapAnalysisPdf";
import StaffUtilizationPdf from "../../reports/StaffUtilizationPdf";
import { buildStaffUtilizationReportData } from "../../utils/staffAssignments";
import { downloadStaffUtilizationExcel } from "../../utils/excel";

const ReportCard = ({
  title,
  description,
  icon: Icon,
  stats = [],
  actions = [],
}) => (
  <div className="flex flex-col justify-between rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
    <div>
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-blue-50 p-3 text-blue-600">
          <Icon size={20} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="mt-3 text-sm text-gray-600">{description}</p>
    </div>
    <div className="mt-6 space-y-4">
      {stats.length > 0 ? (
        <dl className="grid grid-cols-1 gap-3 text-sm text-gray-600">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center justify-between gap-4 rounded-md bg-gray-50 px-3 py-2"
            >
              <dt className="font-medium text-gray-600">{stat.label}</dt>
              <dd className="font-semibold text-gray-900">{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-gray-500">No summary data available yet.</p>
      )}
      <div className="flex flex-col gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <DownloadCloud size={16} />
            {action.label}
          </button>
        ))}
      </div>
    </div>
  </div>
);

const ReportsTab = ({
  projects,
  projectTypes,
  fundingSources,
  projectTimelines,
  staffCategories,
  staffAllocations,
  staffingGaps,
  resourceForecast = [],
  staffMembers = [],
  staffAssignmentPlan = null,
  visibleReports = ["cip", "cipEffort", "gap", "utilization"],
}) => {
  const showReport = useCallback(
    (key) => visibleReports.includes(key),
    [visibleReports]
  );

  const formatCount = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return "0";
    }
    return numeric.toLocaleString("en-US");
  };

  const formatHoursValue = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return "0";
    }
    return numeric.toLocaleString("en-US", { maximumFractionDigits: 1 });
  };

  const formatPercentage = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return "0%";
    }
    return `${numeric.toFixed(0)}%`;
  };

  const cipReport = useMemo(
    () => buildCipReport(projects, projectTypes, fundingSources, projectTimelines),
    [projects, projectTypes, fundingSources, projectTimelines]
  );
  const cipEffortReport = useMemo(
    () =>
      buildCipEffortReport(
        projects,
        projectTypes,
        fundingSources,
        projectTimelines,
        staffCategories,
        staffAllocations
      ),
    [
      projects,
      projectTypes,
      fundingSources,
      projectTimelines,
      staffCategories,
      staffAllocations,
    ]
  );
  const gapReport = useMemo(
    () => buildGapAnalysisReport(staffingGaps),
    [staffingGaps]
  );
  const staffUtilizationReport = useMemo(
    () =>
      buildStaffUtilizationReportData({
        plan: staffAssignmentPlan,
        projects,
        staffMembers,
        staffCategories,
      }),
    [staffAssignmentPlan, projects, staffMembers, staffCategories]
  );

  const cipMeta = useMemo(() => formatReportMeta(cipReport), [cipReport]);
  const cipEffortMeta = useMemo(
    () => formatReportMeta(cipEffortReport),
    [cipEffortReport]
  );
  const gapMeta = useMemo(() => formatReportMeta(gapReport), [gapReport]);

  const cipPdfFileName = useMemo(
    () => (cipReport.fileName || `capital_improvement_plan_${Date.now()}.csv`).replace(/\.csv$/i, ".pdf"),
    [cipReport.fileName]
  );
  const gapPdfFileName = useMemo(
    () => (gapReport.fileName || `staffing_gap_analysis_${Date.now()}.csv`).replace(/\.csv$/i, ".pdf"),
    [gapReport.fileName]
  );
  const staffUtilizationPdfFileName = useMemo(() => {
    const baseName = staffUtilizationReport?.fileName || `staff_utilization_${Date.now()}.xlsx`;
    return baseName.replace(/\.xlsx$/i, ".pdf");
  }, [staffUtilizationReport?.fileName]);

  const summarySeries = useMemo(
    () =>
      resourceForecast.map((month) => {
        const totalRequired = staffCategories.reduce(
          (sum, category) => sum + (month[`${category.name}_required`] || 0),
          0
        );
        const totalActual = staffCategories.reduce(
          (sum, category) => sum + (month[`${category.name}_actual`] || 0),
          0
        );

        return {
          month: month.month,
          monthLabel: month.monthLabel,
          totalRequired: Number(totalRequired.toFixed(2)),
          totalActual: Number(totalActual.toFixed(2)),
        };
      }),
    [resourceForecast, staffCategories]
  );

  const categorySeries = useMemo(
    () =>
      staffCategories.map((category) => ({
        id: category.id,
        name: category.name,
        data: resourceForecast.map((month) => {
          const required = Number(month[`${category.name}_required`] || 0);
          const actual = Number(month[`${category.name}_actual`] || 0);
          const gap = Math.max(0, required - actual);

          return {
            month: month.monthLabel,
            required: Number(required.toFixed(2)),
            actual: Number(actual.toFixed(2)),
            gap: Number(gap.toFixed(2)),
          };
        }),
      })),
    [resourceForecast, staffCategories]
  );

  const forecastSummary = useMemo(() => {
    if (summarySeries.length === 0) {
      return {};
    }

    const peakMonth = summarySeries.reduce((max, month) =>
      month.totalRequired > max.totalRequired ? month : max
    );

    let utilizationSum = 0;
    let utilizationSamples = 0;
    summarySeries.forEach((month) => {
      if (month.totalActual > 0) {
        utilizationSum += (month.totalRequired / month.totalActual) * 100;
        utilizationSamples += 1;
      }
    });

    return {
      peakMonth: peakMonth?.monthLabel,
      averageUtilization:
        utilizationSamples > 0 ? utilizationSum / utilizationSamples : 0,
      gapMonths: new Set(staffingGaps.map((gap) => gap.month)).size,
    };
  }, [summarySeries, staffingGaps]);

  const handleCipPdfDownload = useCallback(async () => {
    const documentElement = (
      <CipReportPdf
        rows={cipReport.rows}
        meta={{ ...cipMeta, ...cipReport.meta }}
        generatedOn={new Date()}
      />
    );
    await downloadPdfDocument(documentElement, cipPdfFileName);
  }, [cipReport.rows, cipReport.meta, cipMeta, cipPdfFileName]);

  const handleGapPdfDownload = useCallback(async () => {
    const documentElement = (
      <GapAnalysisPdf
        summarySeries={summarySeries}
        categorySeries={categorySeries}
        gaps={gapReport.rows}
        summary={forecastSummary}
        meta={{ ...gapMeta, ...gapReport.meta }}
        generatedOn={new Date()}
      />
    );
    await downloadPdfDocument(documentElement, gapPdfFileName);
  }, [
    categorySeries,
    gapMeta,
    gapPdfFileName,
    gapReport.rows,
    gapReport.meta,
    forecastSummary,
    summarySeries,
  ]);

  const handleStaffUtilizationExcelDownload = useCallback(() => {
    if (!staffUtilizationReport) {
      return;
    }
    downloadStaffUtilizationExcel(staffUtilizationReport);
  }, [staffUtilizationReport]);

  const handleStaffUtilizationPdfDownload = useCallback(async () => {
    if (!staffUtilizationReport) {
      return;
    }
    const documentElement = (
      <StaffUtilizationPdf report={staffUtilizationReport} />
    );
    await downloadPdfDocument(documentElement, staffUtilizationPdfFileName);
  }, [staffUtilizationReport, staffUtilizationPdfFileName]);

  const cipStats = useMemo(() => {
    const stats = [
      {
        label: "Projects",
        value: formatCount(cipReport.meta?.projectCount),
      },
      {
        label: "Programs",
        value: formatCount(cipReport.meta?.programCount),
      },
      {
        label: "CIP entries",
        value: formatCount(cipReport.rows?.length || 0),
      },
    ];

    if (cipMeta.totalProjectBudgetLabel) {
      stats.push({
        label: "Total project budget",
        value: cipMeta.totalProjectBudgetLabel,
      });
    }

    if (cipMeta.totalProgramBudgetLabel) {
      stats.push({
        label: "Annual program budget",
        value: cipMeta.totalProgramBudgetLabel,
      });
    }

    return stats;
  }, [cipReport, cipMeta]);

  const cipEffortStats = useMemo(() => {
    const stats = [
      {
        label: "Report rows",
        value: formatCount(cipEffortReport.meta?.rowCount),
      },
      {
        label: "Projects",
        value: formatCount(cipEffortReport.meta?.projectCount),
      },
      {
        label: "Staff categories",
        value: formatCount(cipEffortReport.meta?.categoryCount),
      },
    ];

    if (cipEffortMeta.totalHoursLabel && Number(cipEffortReport.meta?.totalHours) > 0) {
      stats.push({
        label: "Hours captured",
        value: `${cipEffortMeta.totalHoursLabel} hrs`,
      });
    }

    if (cipEffortMeta.totalCostLabel && Number(cipEffortReport.meta?.totalCost) > 0) {
      stats.push({
        label: "Estimated cost",
        value: cipEffortMeta.totalCostLabel,
      });
    }

    return stats;
  }, [cipEffortReport, cipEffortMeta]);

  const gapStats = useMemo(() => {
    return [
      {
        label: "Gap entries",
        value: formatCount(gapReport.meta?.gapCount),
      },
      {
        label: "Critical gaps",
        value: formatCount(gapReport.meta?.criticalCount),
      },
    ];
  }, [gapReport]);

  const staffUtilizationStats = useMemo(() => {
    if (!staffUtilizationReport?.meta) {
      return [];
    }

    const meta = staffUtilizationReport.meta;
    const stats = [
      {
        label: "Projects covered",
        value: formatCount(meta.projectsCovered || 0),
      },
      {
        label: "Staff assigned",
        value: formatCount(meta.staffAssignedCount || 0),
      },
      {
        label: "Assigned hours",
        value: `${formatHoursValue(meta.totalAssignedHours || 0)} hrs`,
      },
    ];

    if (Number(meta.manualHours || 0) > 0) {
      stats.push({
        label: "Manual overrides",
        value: `${formatHoursValue(meta.manualHours || 0)} hrs`,
      });
    }

    stats.push({
      label: "Unfilled demand",
      value: `${formatHoursValue(meta.unfilledHours || 0)} hrs`,
    });

    stats.push({
      label: "Coverage",
      value: formatPercentage(meta.coverageRate || 0),
    });

    return stats;
  }, [staffUtilizationReport]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-gray-900">Reports & Exports</h2>
        <p className="mt-2 text-sm text-gray-600">
          Download current CIP, staffing effort, and gap analysis data for offline
          reporting, presentations, or additional analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {showReport("cip") && (
          <ReportCard
          title="Capital Improvement Plan"
          description="Portfolio-level export summarizing each project and program with schedule, budget, and delivery details."
          icon={FileSpreadsheet}
          stats={cipStats}
          actions={[
            {
              label: "Download CIP CSV",
              onClick: () => downloadReport(cipReport),
            },
            {
              label: "Download CIP PDF",
              onClick: handleCipPdfDownload,
            },
          ]}
          />
        )}

        {showReport("cipEffort") && (
          <ReportCard
          title="CIP Effort by Category"
          description="Detailed view of planned hours, FTE, and costs for every project-category combination to support resource planning."
          icon={BarChart3}
          stats={cipEffortStats}
          actions={[
            {
              label: "Download Effort CSV",
              onClick: () => downloadReport(cipEffortReport),
            },
          ]}
          />
        )}

        {showReport("utilization") && (
          <ReportCard
          title="Staff Utilization"
          description="Optimized and manual staff assignments by project and phase, with visibility into overrides and unmet demand."
          icon={Users}
          stats={staffUtilizationStats}
          actions={[
            {
              label: "Download Utilization Excel",
              onClick: handleStaffUtilizationExcelDownload,
            },
            {
              label: "Download Utilization PDF",
              onClick: handleStaffUtilizationPdfDownload,
            },
          ]}
          />
        )}

        {showReport("gap") && (
          <ReportCard
          title="Staffing Gap Analysis"
          description="Month-by-month shortage report highlighting where demand exceeds available staffing capacity."
          icon={AlertTriangle}
          stats={gapStats}
          actions={[
            {
              label: "Download Gap PDF",
              onClick: handleGapPdfDownload,
            },
            {
              label: "Download Gap CSV",
              onClick: () => downloadReport(gapReport),
            },
          ]}
          />
        )}
      </div>
    </div>
  );
};

export default ReportsTab;
