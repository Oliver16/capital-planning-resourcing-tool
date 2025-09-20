import React, { useMemo } from "react";
import { AlertTriangle, BarChart3, DownloadCloud, FileSpreadsheet } from "lucide-react";
import {
  buildCipEffortReport,
  buildCipReport,
  buildGapAnalysisReport,
  downloadReport,
  formatReportMeta,
} from "../../utils/reports";

const ReportCard = ({
  title,
  description,
  icon: Icon,
  stats = [],
  buttonLabel,
  onDownload,
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
      <button
        type="button"
        onClick={onDownload}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        <DownloadCloud size={16} />
        {buttonLabel}
      </button>
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
}) => {
  const formatCount = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return "0";
    }
    return numeric.toLocaleString("en-US");
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

  const cipMeta = useMemo(() => formatReportMeta(cipReport), [cipReport]);
  const cipEffortMeta = useMemo(
    () => formatReportMeta(cipEffortReport),
    [cipEffortReport]
  );

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
        <ReportCard
          title="Capital Improvement Plan"
          description="Portfolio-level export summarizing each project and program with schedule, budget, and delivery details."
          icon={FileSpreadsheet}
          stats={cipStats}
          buttonLabel="Download CIP CSV"
          onDownload={() => downloadReport(cipReport)}
        />

        <ReportCard
          title="CIP Effort by Category"
          description="Detailed view of planned hours, FTE, and costs for every project-category combination to support resource planning."
          icon={BarChart3}
          stats={cipEffortStats}
          buttonLabel="Download Effort CSV"
          onDownload={() => downloadReport(cipEffortReport)}
        />

        <ReportCard
          title="Staffing Gap Analysis"
          description="Month-by-month shortage report highlighting where demand exceeds available staffing capacity."
          icon={AlertTriangle}
          stats={gapStats}
          buttonLabel="Download Gap PDF"
          onDownload={() => downloadReport(gapReport)}
        />
      </div>
    </div>
  );
};

export default ReportsTab;
