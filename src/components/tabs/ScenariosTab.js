import React, { useEffect, useMemo, useState } from "react";
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
  ChevronDown,
  ChevronRight,
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
  ComposedChart,
  Bar,
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

  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    setExpandedGroups((previous) => {
      const nextState = { ...previous };
      projectGroups.forEach((group) => {
        if (nextState[group.key] === undefined) {
          nextState[group.key] = true;
        }
      });
      return nextState;
    });
  }, [projectGroups]);

  const toggleGroup = (key) => {
    setExpandedGroups((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

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

  const earliestStart = useMemo(() => {
    const dates = [];
    if (baselineAnalysis?.startDate) {
      const date =
        baselineAnalysis.startDate instanceof Date
          ? baselineAnalysis.startDate
          : new Date(baselineAnalysis.startDate);
      if (!Number.isNaN(date.getTime())) {
        dates.push(date.getTime());
      }
    }
    if (activeAnalysis?.startDate) {
      const date =
        activeAnalysis.startDate instanceof Date
          ? activeAnalysis.startDate
          : new Date(activeAnalysis.startDate);
      if (!Number.isNaN(date.getTime())) {
        dates.push(date.getTime());
      }
    }

    if (dates.length === 0) {
      const fallback = new Date();
      fallback.setDate(1);
      return fallback;
    }

    const earliest = new Date(Math.min(...dates));
    earliest.setDate(1);
    return earliest;
  }, [baselineAnalysis, activeAnalysis]);

  const ganttData = useMemo(() => {
    if (!baselineAnalysis || !activeAnalysis) {
      return [];
    }

    const baselineTimelineMap = new Map(
      (baselineAnalysis.timelines || []).map((project) => [project.id, project])
    );
    const scenarioTimelineMap = new Map(
      (activeAnalysis.timelines || []).map((project) => [project.id, project])
    );
    const scenarioProjectsMap = new Map(
      (activeAnalysis.projects || []).map((project) => [project.id, project])
    );

    return (projects || [])
      .filter((project) => project.type === "project")
      .map((project) => {
        const baselineTimeline = baselineTimelineMap.get(project.id);
        const scenarioTimeline = scenarioTimelineMap.get(project.id) || baselineTimeline;
        const scenarioProject = scenarioProjectsMap.get(project.id) || project;

        const baselineStart = baselineTimeline?.designStart;
        const scenarioStart = scenarioTimeline?.designStart || baselineStart;
        const totalBaselineDuration =
          (project.designDuration || 0) + (project.constructionDuration || 0);
        const totalScenarioDuration =
          (scenarioProject.designDuration || 0) +
          (scenarioProject.constructionDuration || 0);

        return {
          projectId: project.id,
          name: project.name,
          baselineOffset: baselineStart
            ? calculateMonthDifference(earliestStart, baselineStart)
            : 0,
          baselineDuration: Math.max(0, totalBaselineDuration),
          scenarioOffset: scenarioStart
            ? calculateMonthDifference(earliestStart, scenarioStart)
            : 0,
          scenarioDuration: Math.max(0, totalScenarioDuration),
        };
      })
      .filter((row) => Number.isFinite(row.baselineOffset));
  }, [projects, baselineAnalysis, activeAnalysis, earliestStart]);

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
    if (!activeScenario || activeScenario.isBaseline) {
      return;
    }
    onUpdateScenarioMeta(activeScenario.id, { [field]: value });
  };

  const handleProjectDateChange = (projectId, field, value) => {
    if (!activeScenario || activeScenario.isBaseline) {
      return;
    }
    onUpdateScenarioAdjustment(activeScenario.id, projectId, { [field]: value });
  };

  const handleResetProject = (projectId) => {
    if (!activeScenario || activeScenario.isBaseline) {
      return;
    }
    onResetScenarioProject(activeScenario.id, projectId);
  };

  return (
    <div className="space-y-6">
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
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
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
                      onDuplicateScenario(scenario.id);
                    }}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
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
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
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
              disabled={activeScenario?.isBaseline}
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
              disabled={activeScenario?.isBaseline}
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

        <div className="space-y-5">
          {projectGroups.length === 0 ? (
            <div className="text-sm text-gray-500">
              No projects or programs are available for scenario adjustments.
            </div>
          ) : (
            projectGroups.map((group) => {
              const capitalCount = group.projects.length;
              const programCount = group.programs.length;
              const summaryParts = [];
              if (capitalCount > 0) {
                summaryParts.push(`${capitalCount} ${capitalCount === 1 ? "Project" : "Projects"}`);
              }
              if (programCount > 0) {
                summaryParts.push(`${programCount} ${programCount === 1 ? "Program" : "Programs"}`);
              }
              const summaryText = summaryParts.join(" • ");
              const isExpanded = Boolean(expandedGroups[group.key]);

              return (
                <div key={group.key} className="border border-gray-200 rounded-lg">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex items-center justify-between gap-4 px-4 py-3 md:px-5 md:py-4"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <span className="text-gray-500">
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: group.color }}
                          ></span>
                          <span className="text-base font-semibold text-gray-900">
                            {group.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {summaryText || "No items assigned yet"}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-400">
                      {isExpanded ? "Hide" : "Show"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="space-y-5 border-t border-gray-200 p-4 md:p-5">
                      {[...group.projects, ...group.programs].map((project) => {
                        const scenarioProject =
                          activeAnalysis?.projects?.find((item) => item.id === project.id) ||
                          project;
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
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
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
                                  {project.type === "project" ? "Capital Project" : "Program"}
                                </p>
                              </div>
                              {!activeScenario?.isBaseline && (
                                <button
                                  type="button"
                                  onClick={() => handleResetProject(project.id)}
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                                >
                                  <RefreshCcw size={14} /> Reset to baseline
                                </button>
                              )}
                            </div>

                            {project.type === "project" ? (
                              <div className="mt-4 space-y-4">
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
                                      disabled={activeScenario?.isBaseline}
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
                                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${formatShiftBadge(designShift).className}`}
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
                                      disabled={activeScenario?.isBaseline}
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
                                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${formatShiftBadge(constructionShift).className}`}
                                    >
                                      {formatShiftBadge(constructionShift).text}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
                                    disabled={activeScenario?.isBaseline}
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
                                    disabled={activeScenario?.isBaseline}
                                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                  />
                                </div>
                                <div className="flex flex-col gap-2">
                                  <span className="text-xs text-gray-500">Shift</span>
                                  <div className="flex gap-2">
                                    <span
                                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${formatShiftBadge(programStartShift).className}`}
                                    >
                                      Start {formatShiftBadge(programStartShift).text}
                                    </span>
                                    <span
                                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${formatShiftBadge(programEndShift).className}`}
                                    >
                                      End {formatShiftBadge(programEndShift).text}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
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
          <h4 className="font-semibold text-gray-900 mb-2">Baseline vs scenario timelines</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={ganttData}
                layout="vertical"
                margin={{ top: 20, right: 20, left: 40, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, "dataMax + 6"]} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="baselineOffset"
                  stackId="baseline"
                  fill="transparent"
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="baselineDuration"
                  name="Baseline"
                  stackId="baseline"
                  fill="#93c5fd"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="scenarioOffset"
                  stackId="scenario"
                  fill="transparent"
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="scenarioDuration"
                  name="Scenario"
                  stackId="scenario"
                  fill="#fca5a5"
                  radius={[0, 0, 0, 0]}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
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
