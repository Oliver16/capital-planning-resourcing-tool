import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  PlusCircle,
  Copy,
  RefreshCcw,
  AlertTriangle,
  Sparkles,
  CalendarRange,
  TrendingUp,
  Users,
  GitBranch,
  DollarSign,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  analyzeScenario,
  calculateMonthDifference,
} from "../../utils/calculations";
import { groupProjectsByType } from "../../utils/projectGrouping";

const formatDate = (value) => {
  if (!value) {
    return "TBD";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "TBD";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};

const computeEndDate = (startDate, duration) => {
  if (!startDate || !Number.isFinite(duration)) {
    return null;
  }

  const start = startDate instanceof Date ? startDate : new Date(startDate);
  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const end = new Date(start);
  end.setMonth(end.getMonth() + Math.max(0, duration));
  return end;
};

const formatShiftBadge = (delta) => {
  if (!Number.isFinite(delta) || delta === 0) {
    return {
      text: "On baseline",
      className: "bg-gray-100 text-gray-600",
    };
  }

  const text = `${delta > 0 ? "+" : ""}${delta} mo`;
  return {
    text,
    className:
      delta > 0
        ? "bg-red-100 text-red-700"
        : "bg-green-100 text-green-700",
  };
};

const aggregateMonthlyGaps = (gaps = []) => {
  const map = new Map();
  gaps.forEach((gap) => {
    if (!gap || !gap.month) {
      return;
    }
    const current = map.get(gap.month) || 0;
    map.set(gap.month, current + (gap.gap || 0));
  });
  return map;
};

const findMonthLabel = (forecast = [], monthKey) => {
  const match = forecast.find((month) => month.month === monthKey);
  return match?.monthLabel || monthKey;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const BASELINE_DESIGN_COLOR = "#bfdbfe";
const BASELINE_CONSTRUCTION_COLOR = "#fde68a";
const BASELINE_PROGRAM_COLOR = "#ddd6fe";
const SCENARIO_DESIGN_COLOR = "#2563eb";
const SCENARIO_CONSTRUCTION_COLOR = "#ea580c";
const SCENARIO_PROGRAM_COLOR = "#7c3aed";

const getBaselineSegmentColor = (phase) => {
  if (phase === "construction") {
    return BASELINE_CONSTRUCTION_COLOR;
  }

  if (phase === "program") {
    return BASELINE_PROGRAM_COLOR;
  }

  return BASELINE_DESIGN_COLOR;
};

const getScenarioSegmentColor = (phase) => {
  if (phase === "construction") {
    return SCENARIO_CONSTRUCTION_COLOR;
  }

  if (phase === "program") {
    return SCENARIO_PROGRAM_COLOR;
  }

  return SCENARIO_DESIGN_COLOR;
};

const ScenariosTab = ({
  projects,
  projectTypes,
  staffCategories,
  staffAllocations,
  staffAvailabilityByCategory,
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onCreateScenario,
  onDuplicateScenario,
  onUpdateScenarioMeta,
  onUpdateScenarioAdjustment,
  onResetScenarioProject,
  timeHorizon,
  isReadOnly = false,
}) => {
  const projectTypeMap = useMemo(() => {
    const map = new Map();
    (projectTypes || []).forEach((type) => {
      map.set(type.id, type);
    });
    return map;
  }, [projectTypes]);

  const projectGroups = useMemo(
    () => groupProjectsByType(projects, projectTypes),
    [projects, projectTypes]
  );

  const projectMap = useMemo(() => {
    const map = new Map();
    (projects || []).forEach((project) => {
      if (!project || (!project.id && project.id !== 0)) {
        return;
      }

      map.set(String(project.id), project);
    });

    return map;
  }, [projects]);

  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const previousScenarioIdRef = useRef(null);

  useEffect(() => {
    setSelectedProjectIds((previous) =>
      previous.filter((projectId) => projectMap.has(projectId))
    );
  }, [projectMap]);

  const scenarioAnalyses = useMemo(() => {
    const results = {};
    (scenarios || []).forEach((scenario) => {
      results[scenario.id] = analyzeScenario(
        projects,
        scenario,
        staffAllocations,
        staffCategories,
        staffAvailabilityByCategory,
        timeHorizon
      );
    });
    return results;
  }, [
    scenarios,
    projects,
    staffAllocations,
    staffCategories,
    staffAvailabilityByCategory,
    timeHorizon,
  ]);

  const activeScenario =
    scenarios.find((scenario) => scenario.id === activeScenarioId) ||
    scenarios[0];
  const baselineAnalysis = scenarioAnalyses["baseline"];
  const activeAnalysis =
    (activeScenario && scenarioAnalyses[activeScenario.id]) || baselineAnalysis;

  useEffect(() => {
    const scenarioId = activeScenario?.id
      ? String(activeScenario.id)
      : null;

    if (previousScenarioIdRef.current === scenarioId) {
      return;
    }

    previousScenarioIdRef.current = scenarioId;

    if (!scenarioId) {
      setSelectedProjectIds([]);
      return;
    }

    const adjustmentIds = Object.keys(activeScenario?.adjustments || {});
    const validIds = adjustmentIds
      .map((id) => String(id))
      .filter((id) => projectMap.has(id));

    setSelectedProjectIds(validIds);
  }, [activeScenario, projectMap]);

  const comparisonSeries = useMemo(() => {
    if (!baselineAnalysis || !activeAnalysis) {
      return [];
    }

    const months = Math.min(
      baselineAnalysis.forecast.length,
      activeAnalysis.forecast.length,
      timeHorizon
    );

    return Array.from({ length: months }).map((_, index) => {
      const baselineMonth = baselineAnalysis.forecast[index];
      const scenarioMonth = activeAnalysis.forecast[index];
      const monthLabel =
        scenarioMonth?.monthLabel || baselineMonth?.monthLabel || `Month ${index + 1}`;

      const baselineRequired = staffCategories.reduce(
        (sum, category) =>
          sum + (baselineMonth?.[`${category.name}_required`] || 0),
        0
      );
      const scenarioRequired = staffCategories.reduce(
        (sum, category) =>
          sum + (scenarioMonth?.[`${category.name}_required`] || 0),
        0
      );
      const available = staffCategories.reduce(
        (sum, category) =>
          sum + (baselineMonth?.[`${category.name}_actual`] || 0),
        0
      );

      return {
        monthLabel,
        baselineRequired: Number(baselineRequired.toFixed(2)),
        scenarioRequired: Number(scenarioRequired.toFixed(2)),
        available: Number(available.toFixed(2)),
      };
    });
  }, [baselineAnalysis, activeAnalysis, staffCategories, timeHorizon]);

  const selectedProjects = useMemo(
    () =>
      selectedProjectIds
        .map((projectId) => projectMap.get(projectId))
        .filter(Boolean),
    [projectMap, selectedProjectIds]
  );

  const availableProjectGroups = useMemo(() => {
    const selectedSet = new Set(selectedProjectIds);

    return projectGroups
      .map((group) => {
        const options = [...group.projects, ...group.programs].filter(
          (project) => !selectedSet.has(String(project.id))
        );

        if (options.length === 0) {
          return null;
        }

        return {
          key: group.key,
          label: group.label,
          options,
        };
      })
      .filter(Boolean);
  }, [projectGroups, selectedProjectIds]);

  const hasAvailableProjects = availableProjectGroups.length > 0;

  const gapComparisonRows = useMemo(() => {
    if (!baselineAnalysis || !activeAnalysis) {
      return [];
    }

    const baselineMap = aggregateMonthlyGaps(baselineAnalysis.gaps);
    const scenarioMap = aggregateMonthlyGaps(activeAnalysis.gaps);
    const monthKeys = new Set([
      ...Array.from(baselineMap.keys()),
      ...Array.from(scenarioMap.keys()),
    ]);

    return Array.from(monthKeys)
      .map((monthKey) => {
        const baselineGap = baselineMap.get(monthKey) || 0;
        const scenarioGap = scenarioMap.get(monthKey) || 0;
        const delta = scenarioGap - baselineGap;
        return {
          monthKey,
          monthLabel:
            findMonthLabel(baselineAnalysis.forecast, monthKey) ||
            findMonthLabel(activeAnalysis.forecast, monthKey),
          baselineGap: Number(baselineGap.toFixed(2)),
          scenarioGap: Number(scenarioGap.toFixed(2)),
          delta: Number(delta.toFixed(2)),
        };
      })
      .sort(
        (a, b) => new Date(`${a.monthKey}-01`) - new Date(`${b.monthKey}-01`)
      )
      .slice(0, 12);
  }, [baselineAnalysis, activeAnalysis]);

  const timelineComparison = useMemo(() => {
    if (!baselineAnalysis || !activeAnalysis || selectedProjects.length === 0) {
      return {
        rows: [],
        start: null,
        end: null,
        totalMonths: 0,
        yearMarkers: [],
      };
    }

    const baselineTimelineMap = new Map(
      (baselineAnalysis.timelines || []).map((project) => [project.id, project])
    );
    const scenarioTimelineMap = new Map(
      (activeAnalysis.timelines || []).map((project) => [project.id, project])
    );

    let earliestStartDate = null;
    let latestEndDate = null;

    const trackRange = (value) => {
      if (!value) {
        return;
      }

      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) {
        return;
      }

      if (!earliestStartDate || date.getTime() < earliestStartDate.getTime()) {
        earliestStartDate = new Date(date);
      }

      if (!latestEndDate || date.getTime() > latestEndDate.getTime()) {
        latestEndDate = new Date(date);
      }
    };

    const addSegment = (collection, start, end, phase) => {
      if (!start || !end) {
        return;
      }

      const startDate = start instanceof Date ? start : new Date(start);
      const endDate = end instanceof Date ? end : new Date(end);

      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime()) ||
        endDate.getTime() <= startDate.getTime()
      ) {
        return;
      }

      collection.push({
        phase,
        start: startDate,
        end: endDate,
      });

      trackRange(startDate);
      trackRange(endDate);
    };

    const rows = selectedProjects
      .map((project) => {
        const baselineTimeline = baselineTimelineMap.get(project.id);
        const scenarioTimeline =
          scenarioTimelineMap.get(project.id) || baselineTimeline;
        const isProgram = project.type === "program";

        const baselineSegmentsRaw = [];
        const scenarioSegmentsRaw = [];

        if (baselineTimeline) {
          if (isProgram) {
            addSegment(
              baselineSegmentsRaw,
              baselineTimeline.designStart,
              baselineTimeline.designEnd,
              "program"
            );
          } else {
            addSegment(
              baselineSegmentsRaw,
              baselineTimeline.designStart,
              baselineTimeline.designEnd,
              "design"
            );
            addSegment(
              baselineSegmentsRaw,
              baselineTimeline.constructionStart,
              baselineTimeline.constructionEnd,
              "construction"
            );
          }
        }

        if (scenarioTimeline) {
          if (isProgram) {
            addSegment(
              scenarioSegmentsRaw,
              scenarioTimeline.designStart,
              scenarioTimeline.designEnd,
              "program"
            );
          } else {
            addSegment(
              scenarioSegmentsRaw,
              scenarioTimeline.designStart,
              scenarioTimeline.designEnd,
              "design"
            );
            addSegment(
              scenarioSegmentsRaw,
              scenarioTimeline.constructionStart,
              scenarioTimeline.constructionEnd,
              "construction"
            );
          }
        }

        if (baselineSegmentsRaw.length === 0 && scenarioSegmentsRaw.length === 0) {
          return null;
        }

        const baselineStart =
          baselineTimeline?.designStart || baselineSegmentsRaw[0]?.start || null;
        const baselineEnd =
          (isProgram
            ? baselineTimeline?.designEnd
            : baselineTimeline?.constructionEnd) ||
          baselineSegmentsRaw[baselineSegmentsRaw.length - 1]?.end ||
          null;
        const scenarioStart =
          scenarioTimeline?.designStart ||
          scenarioSegmentsRaw[0]?.start ||
          baselineStart;
        const scenarioEnd =
          (isProgram
            ? scenarioTimeline?.designEnd
            : scenarioTimeline?.constructionEnd) ||
          scenarioSegmentsRaw[scenarioSegmentsRaw.length - 1]?.end ||
          baselineEnd;

        trackRange(baselineStart);
        trackRange(baselineEnd);
        trackRange(scenarioStart);
        trackRange(scenarioEnd);

        const designShift = calculateMonthDifference(
          baselineTimeline?.designStart || baselineStart,
          scenarioTimeline?.designStart || scenarioStart
        );
        const constructionShift = calculateMonthDifference(
          baselineTimeline?.constructionStart || baselineStart,
          scenarioTimeline?.constructionStart || scenarioStart
        );
        const programEndShift = calculateMonthDifference(
          baselineTimeline?.constructionEnd || baselineEnd,
          scenarioTimeline?.constructionEnd || scenarioEnd
        );

        return {
          project,
          projectType: projectTypeMap.get(project.projectTypeId),
          baselineTimeline,
          scenarioTimeline,
          baselineSegmentsRaw,
          scenarioSegmentsRaw,
          baselineStart,
          baselineEnd,
          scenarioStart,
          scenarioEnd,
          designShift,
          constructionShift,
          programEndShift,
          isProgram,
        };
      })
      .filter(Boolean);

    if (rows.length === 0 || !earliestStartDate || !latestEndDate) {
      return {
        rows: [],
        start: null,
        end: null,
        totalMonths: 0,
        yearMarkers: [],
      };
    }

    const normalizedStart = new Date(earliestStartDate);
    normalizedStart.setDate(1);
    normalizedStart.setHours(0, 0, 0, 0);

    const paddedEnd = new Date(latestEndDate);
    paddedEnd.setDate(1);
    paddedEnd.setHours(0, 0, 0, 0);
    paddedEnd.setMonth(paddedEnd.getMonth() + 1);

    const totalMonths = Math.max(
      1,
      calculateMonthDifference(normalizedStart, paddedEnd)
    );

    const yearMarkers = [];
    const totalYears = Math.ceil(totalMonths / 12);
    for (let i = 0; i <= totalYears; i += 1) {
      const markerDate = new Date(normalizedStart);
      markerDate.setMonth(markerDate.getMonth() + i * 12);
      yearMarkers.push({
        label: markerDate.getFullYear(),
        offsetPercent: Math.min(100, (i * 12 * 100) / totalMonths),
      });
    }

    const buildSegments = (segments) =>
      segments
        .map((segment) => {
          const offsetMonths = Math.max(
            0,
            calculateMonthDifference(normalizedStart, segment.start)
          );
          const endOffset = Math.max(
            0,
            calculateMonthDifference(normalizedStart, segment.end)
          );
          const rawDuration = Math.max(0, endOffset - offsetMonths);
          const maxDuration = Math.max(0, totalMonths - offsetMonths);
          const duration = Math.min(Math.max(rawDuration, 0.5), maxDuration);

          if (duration <= 0) {
            return null;
          }

          return {
            ...segment,
            offsetPercent: (offsetMonths / totalMonths) * 100,
            widthPercent: (duration / totalMonths) * 100,
          };
        })
        .filter(Boolean);

    const normalizedRows = rows.map((row) => ({
      ...row,
      baselineSegments: buildSegments(row.baselineSegmentsRaw),
      scenarioSegments: buildSegments(row.scenarioSegmentsRaw),
    }));

    return {
      rows: normalizedRows,
      start: normalizedStart,
      end: paddedEnd,
      totalMonths,
      yearMarkers,
    };
  }, [
    baselineAnalysis,
    activeAnalysis,
    selectedProjects,
    projectTypeMap,
  ]);

  const hasProgramProjects = useMemo(
    () => timelineComparison.rows.some((row) => row.isProgram),
    [timelineComparison.rows]
  );

  const budgetRows = activeAnalysis?.budgetImpacts?.differences || [];
  const conflictCards = useMemo(
    () => (activeAnalysis?.conflictHighlights?.conflicts || []).slice(0, 3),
    [activeAnalysis]
  );
  const recommendations =
    activeAnalysis?.recommendations && activeAnalysis.recommendations.length > 0
      ? activeAnalysis.recommendations
      : [
          "Scenario aligns with baseline staffing capacity. No major conflicts detected.",
        ];

  const gapSummary = activeAnalysis?.gapSummary || {
    totalGap: 0,
    moderateCount: 0,
    criticalCount: 0,
    worstGap: 0,
    worstMonthLabel: "",
    worstCategory: "",
    shortageMonthCount: 0,
    affectedCategories: [],
  };

    const handleScenarioMetaChange = (field, value) => {
      if (!activeScenario || activeScenario.isBaseline || isReadOnly) {
        return;
      }
      onUpdateScenarioMeta(activeScenario.id, { [field]: value });
    };

    const handleProjectDateChange = (projectId, field, value) => {
      if (!activeScenario || activeScenario.isBaseline || isReadOnly) {
        return;
      }
      onUpdateScenarioAdjustment(activeScenario.id, projectId, { [field]: value });
    };

    const handleResetProject = (projectId) => {
      if (!activeScenario || activeScenario.isBaseline || isReadOnly) {
        return;
      }
      onResetScenarioProject(activeScenario.id, projectId);
    };

    const handleProjectSelectionChange = (event) => {
      if (!activeScenario || activeScenario.isBaseline || isReadOnly) {
        event.target.value = "";
        return;
      }

      const selectedValue = event.target.value;
      if (!selectedValue) {
        return;
      }

      setSelectedProjectIds((previous) => {
        if (previous.includes(selectedValue)) {
          return previous;
        }

        return [...previous, selectedValue];
      });

      event.target.value = "";
    };

    const handleRemoveSelectedProject = (projectId) => {
      if (!activeScenario || activeScenario.isBaseline || isReadOnly) {
        return;
      }

      onResetScenarioProject(activeScenario.id, projectId);
      setSelectedProjectIds((previous) =>
        previous.filter((id) => id !== String(projectId))
      );
    };

  return (
    <div className="space-y-6">
      {isReadOnly && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Scenario adjustments are disabled in view-only mode.
        </div>
      )}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <GitBranch className="text-blue-600" size={22} /> Scenario Planning Sandbox
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Explore schedule shifts to understand downstream staffing and budget impacts.
            </p>
          </div>
          <button
            type="button"
            onClick={onCreateScenario}
            disabled={isReadOnly}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-white transition ${
              isReadOnly
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <PlusCircle size={16} /> Create New Scenario
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
          {(scenarios || []).map((scenario) => {
            const analysis = scenarioAnalyses[scenario.id];
            const isActive = activeScenario?.id === scenario.id;
            const totalGap = analysis?.gapSummary?.totalGap || 0;
            const criticalCount = analysis?.gapSummary?.criticalCount || 0;
            const moderateCount = analysis?.gapSummary?.moderateCount || 0;

            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => onSelectScenario(scenario.id)}
                className={`text-left border rounded-lg p-4 transition shadow-sm ${
                  isActive
                    ? "border-blue-500 bg-blue-50/60"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      {scenario.isBaseline ? "Baseline" : "What-if Scenario"}
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900 mt-1">
                      {scenario.name}
                    </h3>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(scenario.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                {scenario.description && (
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                    {scenario.description}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm text-gray-600">
                  <div>
                    <span className="font-semibold text-gray-900">
                      {criticalCount}
                    </span>{" "}
                    critical gaps
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">
                      {moderateCount}
                    </span>{" "}
                    moderate gaps
                  </div>
                  <div className="col-span-2 flex items-center gap-2 text-sm">
                    <TrendingUp className="text-blue-500" size={16} />
                    {totalGap.toFixed(1)} FTE-month shortage
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
                  <span>
                    {analysis?.gapSummary?.shortageMonthCount || 0} months with gaps
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (isReadOnly) {
                        return;
                      }
                      onDuplicateScenario(scenario.id);
                    }}
                    disabled={isReadOnly}
                    className={`inline-flex items-center gap-1 ${
                      isReadOnly
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-blue-600 hover:text-blue-700'
                    }`}
                  >
                    <Copy size={14} /> Duplicate
                  </button>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              Scenario Details
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Update the scenario name and description to keep analyses organized.
            </p>
          </div>
          {!activeScenario?.isBaseline && (
            <button
              type="button"
              onClick={() => onDuplicateScenario(activeScenario.id)}
              disabled={isReadOnly}
              className={`inline-flex items-center gap-2 ${
                isReadOnly
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              <Copy size={16} /> Duplicate Scenario
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Scenario Name</label>
            <input
              type="text"
              value={activeScenario?.name || ""}
              onChange={(event) => handleScenarioMetaChange("name", event.target.value)}
              disabled={activeScenario?.isBaseline || isReadOnly}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Summary</label>
            <textarea
              rows={3}
              value={activeScenario?.description || ""}
              onChange={(event) =>
                handleScenarioMetaChange("description", event.target.value)
              }
              disabled={activeScenario?.isBaseline || isReadOnly}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>
        {activeScenario?.isBaseline && (
          <div className="mt-4 flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-100 px-3 py-2 rounded-lg">
            <AlertTriangle size={16} /> The baseline scenario is read-only. Duplicate it to
            experiment with schedule adjustments.
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
            <CalendarRange className="text-blue-500" size={18} /> Project timeline adjustments
          </h3>
          {!activeScenario?.isBaseline && (
            <p className="text-xs text-gray-500">
              Adjust start dates to test acceleration or delay strategies.
            </p>
          )}
        </div>

        {projectGroups.length === 0 ? (
          <div className="mt-4 text-sm text-gray-500">
            No projects or programs are available for scenario adjustments.
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
              <div className="md:w-80">
                <label className="text-sm font-medium text-gray-700">
                  Add project to scenario
                </label>
                <select
                  defaultValue=""
                  onChange={handleProjectSelectionChange}
                  disabled={
                    !hasAvailableProjects ||
                    !activeScenario ||
                    activeScenario.isBaseline ||
                    isReadOnly
                  }
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="">
                    {activeScenario?.isBaseline
                      ? "Duplicate the baseline scenario to make edits"
                      : hasAvailableProjects
                      ? "Select a project to adjust"
                      : "All projects have been added"}
                  </option>
                  {availableProjectGroups.map((group) => (
                    <optgroup key={group.key} label={group.label}>
                      {group.options.map((projectOption) => (
                        <option key={projectOption.id} value={projectOption.id}>
                          {projectOption.name}
                          {projectOption.type === "program"
                            ? " • Program"
                            : " • Project"}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {!activeScenario?.isBaseline && !isReadOnly && (
                  <p className="mt-2 text-xs text-gray-500">
                    Selecting a project adds it to the list below for schedule adjustments.
                  </p>
                )}
                {(activeScenario?.isBaseline || isReadOnly) && (
                  <p className="mt-2 text-xs text-gray-500">
                    {activeScenario?.isBaseline
                      ? "The baseline scenario is read-only. Duplicate it to experiment with adjustments."
                      : "Scenario editing is disabled in view-only mode."}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {selectedProjects.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
                  {activeScenario?.isBaseline
                    ? "Duplicate the baseline scenario to begin adding projects."
                    : "Use the dropdown above to choose which projects to include in this scenario."}
                </div>
              ) : (
                selectedProjects.map((project) => {
                  const projectKey = String(project.id);
                  const scenarioProject =
                    activeAnalysis?.projects?.find(
                      (item) => String(item.id) === projectKey
                    ) || project;
                  const designShift = calculateMonthDifference(
                    project.designStartDate,
                    scenarioProject.designStartDate
                  );
                  const constructionShift = calculateMonthDifference(
                    project.constructionStartDate,
                    scenarioProject.constructionStartDate
                  );
                  const programStartShift = calculateMonthDifference(
                    project.programStartDate,
                    scenarioProject.programStartDate
                  );
                  const programEndShift = calculateMonthDifference(
                    project.programEndDate,
                    scenarioProject.programEndDate
                  );
                  const projectType = projectTypeMap.get(project.projectTypeId);

                  return (
                    <div
                      key={project.id}
                      className="border border-gray-200 rounded-lg p-4 shadow-sm bg-white"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <h4 className="text-lg font-semibold text-gray-900">
                              {project.name}
                            </h4>
                            {projectType?.name && (
                              <span
                                className="text-xs font-medium px-2 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: `${projectType.color || "#e2e8f0"}1A`,
                                  color: projectType.color || "#1f2937",
                                }}
                              >
                                {projectType.name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs uppercase tracking-wide text-gray-400 mt-1">
                            {project.type === "project"
                              ? "Capital Project"
                              : "Program"}
                          </p>
                        </div>
                        {!activeScenario?.isBaseline && (
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleResetProject(project.id)}
                              disabled={isReadOnly}
                              className={`inline-flex items-center gap-1 text-xs ${
                                isReadOnly
                                  ? "text-gray-400 cursor-not-allowed"
                                  : "text-blue-600 hover:text-blue-700"
                              }`}
                            >
                              <RefreshCcw size={14} /> Reset to baseline
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveSelectedProject(project.id)}
                              disabled={isReadOnly}
                              className={`text-xs ${
                                isReadOnly
                                  ? "text-gray-400 cursor-not-allowed"
                                  : "text-rose-600 hover:text-rose-700"
                              }`}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>

                      {project.type === "project" ? (
                        <div
                          className={`mt-4 space-y-4 ${
                            isReadOnly ? "pointer-events-none opacity-60" : ""
                          }`}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                            <div>
                              <p className="text-xs text-gray-500">Baseline design start</p>
                              <p className="text-sm font-medium text-gray-900">
                                {formatDate(project.designStartDate)}
                              </p>
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-xs text-gray-500">Scenario design start</label>
                              <input
                                type="date"
                                value={scenarioProject.designStartDate || ""}
                                onChange={(event) =>
                                  handleProjectDateChange(
                                    project.id,
                                    "designStartDate",
                                    event.target.value
                                  )
                                }
                                disabled={activeScenario?.isBaseline || isReadOnly}
                                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                              />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Scenario design end</p>
                              <p className="text-sm font-medium text-gray-900">
                                {formatDate(
                                  computeEndDate(
                                    scenarioProject.designStartDate,
                                    scenarioProject.designDuration || project.designDuration
                                  )
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Shift</span>
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${formatShiftBadge(
                                  designShift
                                ).className}`}
                              >
                                {formatShiftBadge(designShift).text}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                            <div>
                              <p className="text-xs text-gray-500">Baseline construction start</p>
                              <p className="text-sm font-medium text-gray-900">
                                {formatDate(project.constructionStartDate)}
                              </p>
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-xs text-gray-500">Scenario construction start</label>
                              <input
                                type="date"
                                value={scenarioProject.constructionStartDate || ""}
                                onChange={(event) =>
                                  handleProjectDateChange(
                                    project.id,
                                    "constructionStartDate",
                                    event.target.value
                                  )
                                }
                                disabled={activeScenario?.isBaseline || isReadOnly}
                                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                              />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Scenario construction end</p>
                              <p className="text-sm font-medium text-gray-900">
                                {formatDate(
                                  computeEndDate(
                                    scenarioProject.constructionStartDate,
                                    scenarioProject.constructionDuration || project.constructionDuration
                                  )
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Shift</span>
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${formatShiftBadge(
                                  constructionShift
                                ).className}`}
                              >
                                {formatShiftBadge(constructionShift).text}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end ${
                            isReadOnly ? "pointer-events-none opacity-60" : ""
                          }`}
                        >
                          <div>
                            <p className="text-xs text-gray-500">Baseline start</p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatDate(project.programStartDate)}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Scenario start</label>
                            <input
                              type="date"
                              value={scenarioProject.programStartDate || ""}
                              onChange={(event) =>
                                handleProjectDateChange(
                                  project.id,
                                  "programStartDate",
                                  event.target.value
                                )
                              }
                              disabled={activeScenario?.isBaseline || isReadOnly}
                              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Scenario end</label>
                            <input
                              type="date"
                              value={scenarioProject.programEndDate || ""}
                              onChange={(event) =>
                                handleProjectDateChange(
                                  project.id,
                                  "programEndDate",
                                  event.target.value
                                )
                              }
                              disabled={activeScenario?.isBaseline || isReadOnly}
                              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <span className="text-xs text-gray-500">Shift</span>
                            <div className="flex gap-2">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${formatShiftBadge(
                                  programStartShift
                                ).className}`}
                              >
                                Start {formatShiftBadge(programStartShift).text}
                              </span>
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${formatShiftBadge(
                                  programEndShift
                                ).className}`}
                              >
                                End {formatShiftBadge(programEndShift).text}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="text-blue-500" size={18} /> Comparison dashboard
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Compare baseline staffing with the active scenario to spot emerging gaps.
        </p>
        <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">FTE utilization</h4>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                  <YAxis width={45} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="baselineRequired"
                    name="Baseline demand"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="scenarioRequired"
                    name="Scenario demand"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="available"
                    name="Available FTE"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Gap comparison</h4>
            <div className="max-h-72 overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500 border-b">
                    <th className="py-2 pr-3">Month</th>
                    <th className="py-2 pr-3">Baseline gap</th>
                    <th className="py-2 pr-3">Scenario gap</th>
                    <th className="py-2">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {gapComparisonRows.length === 0 && (
                    <tr>
                      <td className="py-3 text-gray-500" colSpan={4}>
                        No gap months detected.
                      </td>
                    </tr>
                  )}
                  {gapComparisonRows.map((row) => (
                    <tr key={row.monthKey} className="border-b last:border-none">
                      <td className="py-2 pr-3 text-gray-700">{row.monthLabel}</td>
                      <td className="py-2 pr-3">{row.baselineGap.toFixed(2)} FTE</td>
                      <td className="py-2 pr-3">{row.scenarioGap.toFixed(2)} FTE</td>
                      <td
                        className={`py-2 font-medium ${
                          row.delta > 0
                            ? "text-red-600"
                            : row.delta < 0
                            ? "text-green-600"
                            : "text-gray-600"
                        }`}
                      >
                        {row.delta > 0 ? "+" : ""}
                        {row.delta.toFixed(2)} FTE
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4 mt-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h4 className="font-semibold text-gray-900">Baseline vs scenario schedules</h4>
            {timelineComparison.rows.length > 0 && (
              <span className="text-xs text-gray-500">
                Showing {timelineComparison.rows.length} project
                {timelineComparison.rows.length === 1 ? "" : "s"} added to this scenario.
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Visualize how scenario adjustments shift the delivery windows for each selected project.
          </p>

          {selectedProjects.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
              Add projects to the scenario to compare their schedules.
            </div>
          ) : timelineComparison.rows.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
              Timeline data is unavailable for the selected projects.
            </div>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-6 rounded-full"
                    style={{ backgroundColor: BASELINE_DESIGN_COLOR }}
                  />
                  <span>Baseline design/start</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-6 rounded-full"
                    style={{ backgroundColor: BASELINE_CONSTRUCTION_COLOR }}
                  />
                  <span>
                    Baseline {hasProgramProjects ? "construction/program end" : "construction"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-6 rounded-full"
                    style={{ backgroundColor: SCENARIO_DESIGN_COLOR }}
                  />
                  <span>Scenario design/start</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-6 rounded-full"
                    style={{ backgroundColor: SCENARIO_CONSTRUCTION_COLOR }}
                  />
                  <span>
                    Scenario {hasProgramProjects ? "construction/program end" : "construction"}
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                {timelineComparison.rows.map((row) => {
                  const primaryLabel = row.isProgram
                    ? "Program start shift"
                    : "Design start shift";
                  const secondaryLabel = row.isProgram
                    ? "Program end shift"
                    : "Construction start shift";
                  const primaryBadge = formatShiftBadge(row.designShift);
                  const secondaryValue = row.isProgram
                    ? row.programEndShift
                    : row.constructionShift;
                  const secondaryBadge = formatShiftBadge(secondaryValue);

                  return (
                    <div
                      key={row.project.id}
                      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <h5 className="text-base font-semibold text-gray-900">
                              {row.project.name}
                            </h5>
                            {row.projectType?.name && (
                              <span
                                className="text-xs font-medium px-2 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: `${row.projectType.color || "#e2e8f0"}1A`,
                                  color: row.projectType.color || "#1f2937",
                                }}
                              >
                                {row.projectType.name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs uppercase tracking-wide text-gray-400 mt-1">
                            {row.project.type === "project"
                              ? "Capital Project"
                              : "Program"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                          <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">
                            <span className="font-medium text-gray-700">{primaryLabel}</span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${primaryBadge.className}`}
                            >
                              {primaryBadge.text}
                            </span>
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">
                            <span className="font-medium text-gray-700">{secondaryLabel}</span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${secondaryBadge.className}`}
                            >
                              {secondaryBadge.text}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex justify-between text-[11px] uppercase tracking-wide text-gray-500 mb-1">
                          <span>Baseline (top)</span>
                          <span>Scenario (bottom)</span>
                        </div>
                        <div className="relative h-16 overflow-hidden rounded-md bg-gray-100">
                          {timelineComparison.yearMarkers.map((marker, index) => (
                            <div
                              key={`${marker.label}-${index}`}
                              className="pointer-events-none absolute inset-y-0"
                              style={{ left: `${marker.offsetPercent}%` }}
                            >
                              {index !== 0 && (
                                <div className="absolute inset-y-0 -translate-x-1/2 border-l border-slate-300/60" />
                              )}
                              <div className="absolute bottom-1 -translate-x-1/2 text-[10px] font-medium text-slate-500">
                                {marker.label}
                              </div>
                            </div>
                          ))}
                          {row.baselineSegments.map((segment, index) => (
                            <div
                              key={`baseline-${row.project.id}-${segment.phase}-${index}`}
                              className="absolute top-[22%] h-3 rounded-full shadow-sm"
                              style={{
                                left: `${segment.offsetPercent}%`,
                                width: `${segment.widthPercent}%`,
                                backgroundColor: getBaselineSegmentColor(segment.phase),
                              }}
                              title={`${
                                segment.phase === "program"
                                  ? "Program"
                                  : segment.phase === "construction"
                                  ? "Construction"
                                  : "Design"
                              } • Baseline: ${formatDate(segment.start)} – ${formatDate(segment.end)}`}
                            />
                          ))}
                          {row.scenarioSegments.map((segment, index) => (
                            <div
                              key={`scenario-${row.project.id}-${segment.phase}-${index}`}
                              className="absolute bottom-[22%] h-3 rounded-full shadow-sm"
                              style={{
                                left: `${segment.offsetPercent}%`,
                                width: `${segment.widthPercent}%`,
                                backgroundColor: getScenarioSegmentColor(segment.phase),
                              }}
                              title={`${
                                segment.phase === "program"
                                  ? "Program"
                                  : segment.phase === "construction"
                                  ? "Construction"
                                  : "Design"
                              } • Scenario: ${formatDate(segment.start)} – ${formatDate(segment.end)}`}
                            />
                          ))}
                        </div>
                        <div className="mt-2 grid gap-2 text-[11px] text-gray-600 sm:grid-cols-2">
                          <div>
                            <span className="font-semibold text-gray-700">Baseline</span>
                            <span className="ml-2">
                              {formatDate(row.baselineStart)} – {formatDate(row.baselineEnd)}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">Scenario</span>
                            <span className="ml-2">
                              {formatDate(row.scenarioStart)} – {formatDate(row.scenarioEnd)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={18} /> Impact summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-xs text-red-600 uppercase tracking-wide">Total shortage</p>
              <p className="text-2xl font-semibold text-red-700">
                {gapSummary.totalGap.toFixed(1)} FTE-months
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-xs text-yellow-600 uppercase tracking-wide">
                Moderate gaps
              </p>
              <p className="text-lg font-semibold text-yellow-700">
                {gapSummary.moderateCount} instances
              </p>
            </div>
            <div className="p-4 bg-rose-50 rounded-lg">
              <p className="text-xs text-rose-600 uppercase tracking-wide">Critical gaps</p>
              <p className="text-lg font-semibold text-rose-700">
                {gapSummary.criticalCount} instances
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600 uppercase tracking-wide">Worst month</p>
              <p className="text-lg font-semibold text-blue-700">
                {gapSummary.worstGap > 0
                  ? `${gapSummary.worstMonthLabel} • ${gapSummary.worstGap.toFixed(2)} FTE ${gapSummary.worstCategory}`
                  : "No shortage"}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Top conflicts</h4>
            <div className="space-y-3">
              {conflictCards.length === 0 && (
                <p className="text-sm text-gray-500">No active conflicts detected.</p>
              )}
              {conflictCards.map((conflict) => (
                <div
                  key={`${conflict.monthKey}-${conflict.categoryId}`}
                  className="border border-red-100 bg-rose-50 rounded-lg p-3 text-sm"
                >
                  <p className="font-semibold text-rose-700">
                    {conflict.monthLabel} • {conflict.categoryName}
                  </p>
                  <p className="text-rose-600">
                    {conflict.gap.toFixed(2)} FTE shortfall driven by {" "}
                    {conflict.topProjects.map((project, index) => (
                      <span key={project.projectId}>
                        {project.projectName} ({project.fte.toFixed(2)} FTE)
                        {index < conflict.topProjects.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="text-green-500" size={18} /> Budget timing impacts
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Review how cash flow shifts across fiscal years when the schedule changes.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 border-b">
                  <th className="py-2 pr-3">Year</th>
                  <th className="py-2 pr-3">Baseline</th>
                  <th className="py-2 pr-3">Scenario</th>
                  <th className="py-2">Delta</th>
                </tr>
              </thead>
              <tbody>
                {budgetRows.length === 0 && (
                  <tr>
                    <td className="py-3 text-gray-500" colSpan={4}>
                      Budget distribution unchanged from baseline.
                    </td>
                  </tr>
                )}
                {budgetRows.map((row) => (
                  <tr key={row.year} className="border-b last:border-none">
                    <td className="py-2 pr-3 text-gray-700">{row.year}</td>
                    <td className="py-2 pr-3">
                      {currencyFormatter.format(row.baseline)}
                    </td>
                    <td className="py-2 pr-3">
                      {currencyFormatter.format(row.scenario)}
                    </td>
                    <td
                      className={`py-2 font-medium ${
                        row.delta > 0
                          ? "text-red-600"
                          : row.delta < 0
                          ? "text-green-600"
                          : "text-gray-600"
                      }`}
                    >
                      {row.delta > 0 ? "+" : ""}
                      {currencyFormatter.format(row.delta)}
                      {row.exceededLimit && (
                        <span className="ml-2 text-xs text-red-600 uppercase tracking-wide">
                          over baseline
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Sparkles className="text-purple-500" size={18} /> Actionable recommendations
        </h3>
        <ul className="mt-4 space-y-3 text-sm text-gray-700">
          {recommendations.map((item, index) => (
            <li key={`${item}-${index}`} className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-purple-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ScenariosTab;
