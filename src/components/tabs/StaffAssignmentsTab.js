import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Info,
  RefreshCw,
} from "lucide-react";
import {
  getProjectTypeDisplayLabel,
  isProjectOrProgram,
} from "../../utils/projectTypes.js";

const formatHours = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) {
    return "0";
  }
  return numeric.toLocaleString("en-US", { maximumFractionDigits: 1 });
};

const formatPercentage = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) {
    return "0%";
  }
  return `${numeric.toFixed(0)}%`;
};

const phaseKeys = [
  { key: "pm", label: "PM" },
  { key: "design", label: "Design" },
  { key: "construction", label: "Construction" },
];

const toIdKey = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const key = String(value).trim();
  return key ? key : null;
};

const StaffAssignmentsTab = ({
  projects = [],
  staffMembers = [],
  staffCategories = [],
  staffAllocations = {},
  assignmentOverrides = {},
  assignmentPlan = {},
  onUpdateAssignment,
  onResetProjectAssignments,
  staffAvailabilityByCategory = {},
  isReadOnly = false,
}) => {
  const [expandedProjects, setExpandedProjects] = useState({});

  const staffById = useMemo(() => {
    const map = new Map();
    staffMembers.forEach((member) => {
      const key = toIdKey(member?.id);
      if (!key) {
        return;
      }

      map.set(key, member);
    });
    return map;
  }, [staffMembers]);

  const staffByCategory = useMemo(() => {
    const map = new Map();
    staffMembers.forEach((member) => {
      const categoryKey = toIdKey(member?.categoryId);
      const staffKey = toIdKey(member?.id);
      if (!categoryKey || !staffKey) {
        return;
      }
      if (!map.has(categoryKey)) {
        map.set(categoryKey, []);
      }
      map.get(categoryKey).push(staffKey);
    });
    return map;
  }, [staffMembers]);

  const categoriesById = useMemo(() => {
    const map = new Map();
    staffCategories.forEach((category) => {
      const key = toIdKey(category?.id);
      if (!key) {
        return;
      }

      map.set(key, category);
    });
    return map;
  }, [staffCategories]);

  const projectAssignments = useMemo(() => {
    const assignmentsByProject = assignmentPlan.assignmentsByProject || {};
    const autoAssignmentsByProject = assignmentPlan.autoAssignmentsByProject || {};
    const manualAssignmentsByProject = assignmentOverrides || {};
    const projectSummaries = assignmentPlan.projectSummaries || {};
    const staffUtilization = assignmentPlan.staffUtilization || {};
    const unfilledDemand = assignmentPlan.unfilledDemand || {};
    const demandByProjectCategory =
      assignmentPlan.demandByProjectCategory || {};
    const monthlyDemandByProjectCategory =
      assignmentPlan.monthlyDemandByProjectCategory || {};

    return projects
      .filter((project) => project && isProjectOrProgram(project))
      .map((project) => {
        const projectId = toIdKey(project?.id);
        if (!projectId) {
          return null;
        }

        const projectAllocations = staffAllocations?.[projectId] || {};
        const manualAssignments = manualAssignmentsByProject[projectId] || {};
        const projectDemandTotals = demandByProjectCategory[projectId] || {};
        const projectMonthlyDemand =
          monthlyDemandByProjectCategory[projectId] || {};

        const relevantCategoryIds = new Set();

        Object.entries(projectAllocations).forEach(([categoryId, hours]) => {
          const categoryKey = toIdKey(categoryId);
          if (!categoryKey) {
            return;
          }

          const hasDemand =
            Number(hours?.pmHours) > 0 ||
            Number(hours?.designHours) > 0 ||
            Number(hours?.constructionHours) > 0;
          if (hasDemand) {
            relevantCategoryIds.add(categoryKey);
          }
        });

        Object.entries(projectDemandTotals).forEach(([categoryId, hours]) => {
          const categoryKey = toIdKey(categoryId);
          if (!categoryKey) {
            return;
          }

          const totalHours =
            Number(hours?.pmHours || 0) +
            Number(hours?.designHours || 0) +
            Number(hours?.constructionHours || 0);

          if (totalHours > 0) {
            relevantCategoryIds.add(categoryKey);
          }
        });

        Object.keys(manualAssignments).forEach((staffKey) => {
          const staff = staffById.get(staffKey);
          const categoryKey = toIdKey(staff?.categoryId);
          if (categoryKey) {
            relevantCategoryIds.add(categoryKey);
          }
        });

        const categoryDetails = Array.from(relevantCategoryIds).map(
          (categoryId) => {
            const category = categoriesById.get(categoryId);
            const staffIds = staffByCategory.get(categoryId) || [];
            const staffRows = staffIds.map((staffId) => {
              const staff = staffById.get(staffId);
              const manualEntry = manualAssignments[staffId] || {
                pmHours: 0,
                designHours: 0,
                constructionHours: 0,
              };
              const finalEntry =
                assignmentsByProject?.[projectId]?.[staffId] || {
                  pmHours: 0,
                  designHours: 0,
                  constructionHours: 0,
                };
              const autoEntry =
                autoAssignmentsByProject?.[projectId]?.[staffId] || {
                  pmHours: 0,
                  designHours: 0,
                  constructionHours: 0,
                };

              const utilization = staffUtilization[staffId];
              const manualTotal =
                Number(manualEntry.pmHours || 0) +
                Number(manualEntry.designHours || 0) +
                Number(manualEntry.constructionHours || 0);
              const autoTotal =
                Number(autoEntry.pmHours || 0) +
                Number(autoEntry.designHours || 0) +
                Number(autoEntry.constructionHours || 0);
              const finalTotal =
                Number(finalEntry.pmHours || 0) +
                Number(finalEntry.designHours || 0) +
                Number(finalEntry.constructionHours || 0);

              return {
                staffId,
                staffName: staff?.name || "Unassigned",
                manual: manualEntry,
                auto: autoEntry,
                final: finalEntry,
                manualTotal,
                autoTotal,
                finalTotal,
                availability: utilization?.availability || {
                  pmHours: Number(staff?.pmAvailability) || 0,
                  designHours: Number(staff?.designAvailability) || 0,
                  constructionHours: Number(staff?.constructionAvailability) || 0,
                  totalHours:
                    (Number(staff?.pmAvailability) || 0) +
                    (Number(staff?.designAvailability) || 0) +
                    (Number(staff?.constructionAvailability) || 0),
                },
                remaining: utilization?.remaining || {
                  pmHours: Math.max(
                    0,
                    (Number(staff?.pmAvailability) || 0) -
                      Number(finalEntry.pmHours || 0)
                  ),
                  designHours: Math.max(
                    0,
                    (Number(staff?.designAvailability) || 0) -
                      Number(finalEntry.designHours || 0)
                  ),
                  constructionHours: Math.max(
                    0,
                    (Number(staff?.constructionAvailability) || 0) -
                      Number(finalEntry.constructionHours || 0)
                  ),
                  totalHours: Math.max(
                    0,
                    ((Number(staff?.pmAvailability) || 0) +
                      (Number(staff?.designAvailability) || 0) +
                      (Number(staff?.constructionAvailability) || 0)) -
                      finalTotal
                  ),
                },
                overbooked: Boolean(utilization?.overbooked),
              };
            });

            staffRows.sort((a, b) => a.staffName.localeCompare(b.staffName));

            const demandTotals = projectDemandTotals[categoryId] || {};
            const demandTotalHours =
              Number(demandTotals.pmHours || 0) +
              Number(demandTotals.designHours || 0) +
              Number(demandTotals.constructionHours || 0);

            const monthlyDemandEntry = projectMonthlyDemand[categoryId] || {};
            const monthlyDemandHours =
              Number(monthlyDemandEntry.pmHours || 0) +
              Number(monthlyDemandEntry.designHours || 0) +
              Number(monthlyDemandEntry.constructionHours || 0);

            return {
              categoryId,
              categoryName: category?.name || "Uncategorized",
              staffRows,
              hasStaff: staffRows.length > 0,
              demand: demandTotalHours,
              monthlyDemand: monthlyDemandHours,
            };
          }
        );

        const totalRows = categoryDetails.reduce(
          (accumulator, category) => accumulator + category.staffRows.length,
          0
        );

        const summary = projectSummaries[projectId] || {
          demand: { totalHours: 0 },
          manual: { totalHours: 0 },
          auto: { totalHours: 0 },
          assigned: { totalHours: 0 },
          unfilled: { totalHours: 0 },
        };

        const projectMonthlyDemandTotal = Object.values(
          projectMonthlyDemand
        ).reduce((sum, value) => {
          if (!value) {
            return sum;
          }

          return (
            sum +
            Number(value.pmHours || 0) +
            Number(value.designHours || 0) +
            Number(value.constructionHours || 0)
          );
        }, 0);

        const projectUnfilledEntries = [];
        const unfilledByCategory = unfilledDemand[projectId] || {};
        Object.entries(unfilledByCategory).forEach(([categoryId, hours]) => {
        const category = categoriesById.get(toIdKey(categoryId));
          phaseKeys.forEach((phase) => {
            const key = `${phase.key}Hours`;
            const value = Number(hours?.[key]) || 0;
            if (value > 0) {
              projectUnfilledEntries.push({
                categoryName: category?.name || "Uncategorized",
                phase: phase.label,
                hours: value,
              });
            }
          });
        });

        return {
          project,
          projectId,
          categories: categoryDetails,
          totalRows,
          summary,
          unfilledEntries: projectUnfilledEntries,
          monthlyDemandTotal: projectMonthlyDemandTotal,
        };
      })
      .filter(Boolean)
      .filter((entry) => entry.categories.length > 0);
  }, [
    projects,
    staffAllocations,
    assignmentOverrides,
    assignmentPlan,
    staffById,
    staffByCategory,
    categoriesById,
  ]);

  const totals = assignmentPlan?.totals || {};
  const demandTotal = Number(totals?.demand?.totalHours || 0);
  const assignedTotal = Number(totals?.assigned?.totalHours || 0);
  const coveragePercent =
    demandTotal > 0
      ? Math.min(100, (assignedTotal / demandTotal) * 100)
      : assignedTotal > 0
      ? 100
      : 0;
  const columnCount = 2 + phaseKeys.length * 2 + 4;

  const toggleProject = (projectId) => {
    setExpandedProjects((previous) => ({
      ...previous,
      [projectId]: !(previous[projectId] ?? true),
    }));
  };

  const handleManualChange = (projectId, staffId, phase) => (event) => {
    if (!onUpdateAssignment || isReadOnly) {
      return;
    }
    onUpdateAssignment(projectId, staffId, phase, event.target.value);
  };

  const handleClearOverride = (projectId, staffId) => {
    if (!onUpdateAssignment || isReadOnly) {
      return;
    }
    phaseKeys.forEach((phase) => {
      onUpdateAssignment(projectId, staffId, phase.key, 0);
    });
  };

  const summaryCards = [
    {
      label: "Total Demand",
      value: formatHours(totals?.demand?.totalHours || 0),
      description: "Hours requested across all projects",
    },
    {
      label: "Assigned Hours",
      value: formatHours(totals?.assigned?.totalHours || 0),
      description: "Hours covered by staff",
    },
    {
      label: "Manual Overrides",
      value: formatHours(totals?.manual?.totalHours || 0),
      description: "Manager-directed assignments",
    },
    {
      label: "Automated Allocation",
      value: formatHours(totals?.auto?.totalHours || 0),
      description: "Hours filled automatically",
    },
    {
      label: "Unfilled Demand",
      value: formatHours(totals?.unfilled?.totalHours || 0),
      description: "Hours still uncovered",
      highlight: Number(totals?.unfilled?.totalHours || 0) > 0,
    },
    {
      label: "Coverage",
      value: formatPercentage(coveragePercent),
      description: "Share of demand satisfied",
    },
  ];

  return (
    <div className="space-y-6">
      {isReadOnly && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          View-only mode: assignment overrides are locked.
        </div>
      )}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              Staff Assignment Planner
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Review and adjust individual staff assignments to satisfy project
              phase demands. Overrides will be prioritized before the
              optimization engine distributes remaining hours.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className={`rounded-lg border px-4 py-3 text-sm ${
                  card.highlight
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-gray-200 bg-gray-50 text-gray-700"
                }`}
              >
                <div className="font-semibold text-gray-900">{card.label}</div>
                <div className="text-xl font-bold text-blue-600">
                  {card.value}
                </div>
                <div className="text-xs text-gray-500">{card.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {projectAssignments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          <p className="text-sm">
            No staffing demand has been defined yet. Add effort projections on
            the Effort Projections tab to begin assigning individual staff.
          </p>
        </div>
      ) : (
        projectAssignments.map((entry) => {
          const isExpanded = expandedProjects[entry.projectId] ?? true;
          const summary = entry.summary || {};
          const hasUnfilled = Number(summary?.unfilled?.totalHours || 0) > 0;
          const projectTypeLabel = getProjectTypeDisplayLabel(entry.project);
          const projectMonthlyDemand = Number(entry.monthlyDemandTotal || 0);

          return (
            <div key={entry.projectId} className="rounded-lg bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-gray-200 p-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <button
                    type="button"
                    className="flex items-center gap-2 text-left text-lg font-semibold text-gray-900"
                    onClick={() => toggleProject(entry.projectId)}
                  >
                    {isExpanded ? (
                      <ChevronDown size={18} className="text-gray-500" />
                    ) : (
                      <ChevronRight size={18} className="text-gray-500" />
                    )}
                    <span>{entry.project.name}</span>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-indigo-700">
                      {projectTypeLabel}
                    </span>
                  </button>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
                    <span>
                      Demand: {formatHours(summary?.demand?.totalHours || 0)} hrs total
                      {projectMonthlyDemand > 0
                        ? ` (${formatHours(projectMonthlyDemand)} hrs/mo)`
                        : ""}
                    </span>
                    <span>
                      Assigned: {formatHours(summary?.assigned?.totalHours || 0)} hrs
                    </span>
                    <span>
                      Manual: {formatHours(summary?.manual?.totalHours || 0)} hrs
                    </span>
                    <span>
                      Automated: {formatHours(summary?.auto?.totalHours || 0)} hrs
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                        hasUnfilled
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {hasUnfilled
                        ? `${formatHours(
                            summary?.unfilled?.totalHours || 0
                          )} hrs unfilled`
                        : "Fully covered"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {hasUnfilled && (
                    <div className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                      <AlertTriangle size={16} />
                      Unassigned demand remains
                    </div>
                  )}
                  <button
                    type="button"
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      isReadOnly
                        ? "border-gray-200 text-gray-400 cursor-not-allowed"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      if (isReadOnly) {
                        return;
                      }
                      onResetProjectAssignments?.(entry.projectId);
                    }}
                    disabled={isReadOnly}
                  >
                    <RefreshCw size={16} />
                    Reset overrides
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="space-y-6 p-6">
                  {entry.unfilledEntries.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      <div className="flex items-start gap-2">
                        <Info size={16} className="mt-0.5" />
                        <div>
                          <p className="font-semibold">Remaining demand</p>
                          <ul className="mt-1 list-disc pl-5">
                            {entry.unfilledEntries.map((item, index) => (
                              <li key={`${item.categoryName}-${item.phase}-${index}`}>
                                {item.categoryName} · {item.phase}: {formatHours(item.hours)} hrs
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    className={`overflow-x-auto ${
                      isReadOnly ? "pointer-events-none opacity-60" : ""
                    }`}
                  >
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-3 py-2">Staff member</th>
                          <th className="px-3 py-2">Category</th>
                          {phaseKeys.map((phase) => (
                            <th key={`${phase.key}-manual`} className="px-3 py-2 text-center">
                              {phase.label} (Manual hrs/mo)
                            </th>
                          ))}
                          {phaseKeys.map((phase) => (
                            <th key={`${phase.key}-auto`} className="px-3 py-2 text-center">
                              {phase.label} (Auto hrs/mo)
                            </th>
                          ))}
                          <th className="px-3 py-2 text-center">Total Assigned</th>
                          <th className="px-3 py-2 text-center">Remaining Availability</th>
                          <th className="px-3 py-2 text-center">Status</th>
                          <th className="px-3 py-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {entry.categories.map((category) => (
                          <React.Fragment key={category.categoryId}>
                            <tr className="bg-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
                              <td className="px-3 py-2" colSpan={columnCount}>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-gray-700">
                                      {category.categoryName}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      Demand: {formatHours(category.demand)} hrs total
                                      {category.monthlyDemand > 0 && (
                                        <>
                                          {" · "}
                                          {formatHours(category.monthlyDemand)} hrs/mo
                                        </>
                                      )}
                                    </span>
                                  </div>
                                  <span className="text-gray-500">
                                    Available: {formatHours(
                                      staffAvailabilityByCategory?.[category.categoryId]?.total || 0
                                    )} hrs/mo
                                  </span>
                                </div>
                              </td>
                            </tr>
                            {category.hasStaff ? (
                              category.staffRows.map((row) => {
                                const manualEntry = assignmentOverrides?.[entry.projectId]?.[row.staffId] || {
                                  pmHours: 0,
                                  designHours: 0,
                                  constructionHours: 0,
                                };
                                const isManual = row.manualTotal > 0;
                                return (
                                  <tr key={`${entry.projectId}-${row.staffId}`} className="bg-white">
                                    <td className="px-3 py-2 align-top text-gray-900">
                                      <div className="font-medium">{row.staffName}</div>
                                      <div className="text-xs text-gray-500">
                                        Available: {formatHours(row.availability.totalHours)} hrs/mo
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 align-top text-gray-600">
                                      {category.categoryName}
                                    </td>
                                    {phaseKeys.map((phase) => (
                                      <td key={`${row.staffId}-${phase.key}-manual`} className="px-3 py-2 text-center">
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.1"
                                          value={Number(manualEntry?.[`${phase.key}Hours`] || 0)}
                                          onChange={handleManualChange(
                                            entry.projectId,
                                            row.staffId,
                                            phase.key
                                          )}
                                          disabled={isReadOnly}
                                          className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                                        />
                                      </td>
                                    ))}
                                    {phaseKeys.map((phase) => (
                                      <td key={`${row.staffId}-${phase.key}-auto`} className="px-3 py-2 text-center text-gray-600">
                                        {formatHours(row.auto?.[`${phase.key}Hours`] || 0)}
                                      </td>
                                    ))}
                                    <td className="px-3 py-2 text-center font-medium text-gray-900">
                                      {formatHours(row.finalTotal)}
                                    </td>
                                    <td className="px-3 py-2 text-center text-gray-600">
                                      {formatHours(row.remaining.totalHours)}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <span
                                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                          row.overbooked
                                            ? "bg-red-100 text-red-700"
                                            : isManual
                                            ? "bg-blue-100 text-blue-700"
                                            : row.autoTotal > 0
                                            ? "bg-green-100 text-green-700"
                                            : "bg-gray-100 text-gray-600"
                                        }`}
                                      >
                                        {row.overbooked
                                          ? "Overbooked"
                                          : isManual
                                          ? "Manual"
                                          : row.autoTotal > 0
                                          ? "Auto"
                                          : "Unassigned"}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleClearOverride(entry.projectId, row.staffId)}
                                        className={`text-xs font-medium ${
                                          isManual && !isReadOnly
                                            ? "text-blue-600 hover:text-blue-700"
                                            : "text-gray-400 cursor-not-allowed"
                                        }`}
                                        disabled={!isManual || isReadOnly}
                                      >
                                        Clear
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td
                                  colSpan={2 + phaseKeys.length * 2 + 4}
                                  className="px-3 py-4 text-center text-sm text-gray-500"
                                >
                                  No staff available in this category. Consider
                                  hiring, reallocating, or adding a manual override.
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default StaffAssignmentsTab;
