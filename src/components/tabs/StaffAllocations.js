import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Repeat,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { groupProjectsByType } from "../../utils/projectGrouping";

const HOURS_PER_FTE = 4.33 * 40;

const formatMonthlyFTE = (hours, durationMonths) => {
  const numericHours = Number(hours) || 0;
  const numericDuration = Number(durationMonths) || 0;

  if (numericHours <= 0 || numericDuration <= 0) {
    return "0.00";
  }

  const monthlyHours = numericHours / numericDuration;

  return (monthlyHours / HOURS_PER_FTE).toFixed(2);
};

const formatBudgetAmount = (budget) => {
  const numericBudget = Number(budget);

  if (!Number.isFinite(numericBudget) || numericBudget === 0) {
    return "0";
  }

  if (Math.abs(numericBudget) >= 1_000_000) {
    const valueInMillions = numericBudget / 1_000_000;
    const formattedMillions = Number.isInteger(valueInMillions)
      ? valueInMillions.toString()
      : valueInMillions.toFixed(1).replace(/\.0$/, "");
    return `${formattedMillions}M`;
  }

  if (Math.abs(numericBudget) >= 1_000) {
    return `${(numericBudget / 1_000).toFixed(0)}K`;
  }

  return numericBudget.toLocaleString();
};

const HoursInput = ({ value, onValueChange, durationMonths, label }) => {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [monthlyHours, setMonthlyHours] = useState("");
  const [draftValue, setDraftValue] = useState("");
  const containerRef = useRef(null);

  const hasDuration = Boolean(durationMonths && durationMonths > 0);
  const sanitizedValue =
    value === null ||
    value === undefined ||
    value === "" ||
    Number(value) === 0
      ? ""
      : value.toString();

  const durationMessage = hasDuration
    ? `Phase duration: ${durationMonths} month${
        durationMonths === 1 ? "" : "s"
      }`
    : "Phase duration not available for this phase.";

  const helperMessage = hasDuration
    ? `We’ll multiply by ${durationMonths} to update total hours.`
    : "Add the phase duration to enable automatic calculations.";

  useEffect(() => {
    if (!isCalculatorOpen) {
      setDraftValue(sanitizedValue);
    }
  }, [sanitizedValue, isCalculatorOpen]);

  useEffect(() => {
    if (!isCalculatorOpen) return;

    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsCalculatorOpen(false);
        setMonthlyHours("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCalculatorOpen]);

  const openCalculator = () => {
    setDraftValue(sanitizedValue);
    setIsCalculatorOpen(true);

    if (!hasDuration) {
      setMonthlyHours("");
      return;
    }

    const numericTotal = parseFloat(sanitizedValue);
    if (!Number.isNaN(numericTotal) && numericTotal > 0) {
      const perMonth = numericTotal / durationMonths;
      setMonthlyHours((Math.round(perMonth * 100) / 100).toString());
    } else {
      setMonthlyHours("");
    }
  };

  const handleManualChange = (event) => {
    const rawValue = event.target.value;
    if (/^\d*(\.\d*)?$/.test(rawValue)) {
      setDraftValue(rawValue);
      onValueChange(rawValue);
    }
  };

  const handleMonthlyChange = (event) => {
    const rawValue = event.target.value;
    if (/^\d*(\.\d*)?$/.test(rawValue)) {
      setMonthlyHours(rawValue);
    }
  };

  const closeCalculator = () => {
    setIsCalculatorOpen(false);
    setMonthlyHours("");
  };

  const applyMonthlyHours = () => {
    const parsedMonthly = parseFloat(monthlyHours);
    if (!hasDuration || Number.isNaN(parsedMonthly)) {
      closeCalculator();
      return;
    }

    const totalHours =
      Math.round(parsedMonthly * durationMonths * 100) / 100;
    const totalString = totalHours.toString();

    setDraftValue(totalString);
    onValueChange(totalString);
    closeCalculator();
  };

  const isApplyDisabled =
    !hasDuration ||
    monthlyHours.trim() === "" ||
    Number.isNaN(parseFloat(monthlyHours));

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        inputMode="decimal"
        value={isCalculatorOpen ? draftValue : sanitizedValue}
        placeholder="Hours"
        onFocus={openCalculator}
        onClick={openCalculator}
        onChange={handleManualChange}
        className="w-24 rounded border border-gray-300 px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      {isCalculatorOpen && (
        <div className="absolute left-0 z-20 mt-2 w-60 rounded-md border border-gray-200 bg-white p-3 text-sm shadow-lg">
          <div className="flex items-start justify-between text-xs text-gray-500">
            <span>{label}</span>
            <button
              type="button"
              onClick={closeCalculator}
              className="text-gray-400 transition hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <div className="mt-2 space-y-2">
            <p className="text-xs text-gray-500">{durationMessage}</p>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Hours per month
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={monthlyHours}
                onChange={handleMonthlyChange}
                placeholder="e.g. 40"
                className="w-full rounded border border-gray-300 px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <p className="text-xs text-gray-500">{helperMessage}</p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeCalculator}
                className="rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyMonthlyHours}
                disabled={isApplyDisabled}
                className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StaffAllocations = ({
  projects,
  projectTypes = [],
  staffCategories,
  staffAllocations,
  updateStaffAllocation,
  fundingSources = [],
}) => {
  const deliveryGuidance = {
    "self-perform": {
      title: "Self-Perform Delivery",
      details: [
        "Utility staff complete design tasks and provide day-to-day construction oversight.",
        "Confirm LoE includes engineering, inspection, and project controls coverage from internal teams.",
      ],
      container: "bg-blue-50 border-blue-400 text-blue-900",
      iconClass: "text-blue-500",
      Icon: Info,
    },
    hybrid: {
      title: "Hybrid Delivery",
      details: [
        "Design and construction oversight are shared between utility and consultant resources.",
        "Clarify which scope items the utility is covering so LoE reflects only in-house responsibilities.",
      ],
      container: "bg-amber-50 border-amber-400 text-amber-900",
      iconClass: "text-amber-500",
      Icon: AlertTriangle,
    },
    consultant: {
      title: "Consultant Delivery",
      details: [
        "Utility role is focused on owner-side PM, design reviews, bidding coordination, and limited construction administration.",
        "Allocate LoE toward oversight touchpoints; consultant hours are managed outside of the internal staffing plan.",
      ],
      container: "bg-purple-50 border-purple-400 text-purple-900",
      iconClass: "text-purple-500",
      Icon: AlertTriangle,
    },
  };

  const deliveryLabels = {
    "self-perform": "Self-Perform",
    hybrid: "Hybrid",
    consultant: "Consultant-Led",
  };

  const deliveryBadgeStyles = {
    "self-perform": "bg-blue-100 text-blue-800",
    hybrid: "bg-amber-100 text-amber-800",
    consultant: "bg-purple-100 text-purple-800",
  };

  const requiresExternalCoordination = (fundingSource) => {
    if (!fundingSource || !fundingSource.name) return true;
    const name = fundingSource.name.toLowerCase();
    const description = (fundingSource.description || "").toLowerCase();

    const isCash =
      name.includes("cash") ||
      name.includes("general fund") ||
      description.includes("cash") ||
      description.includes("general fund");
    const isRevenueBond =
      name.includes("revenue bond") || description.includes("revenue bond");

    return !(isCash || isRevenueBond);
  };

  const projectGroups = useMemo(
    () => groupProjectsByType(projects, projectTypes),
    [projects, projectTypes]
  );

  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});

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

  useEffect(() => {
    setExpandedProjects((previous) => {
      const nextState = {};
      projectGroups.forEach((group) => {
        group.projects.forEach((project) => {
          const key = String(project.id);
          nextState[key] = previous[key] ?? true;
        });
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

  const toggleProject = (projectId) => {
    setExpandedProjects((previous) => {
      const currentValue = previous[projectId];
      return {
        ...previous,
        [projectId]: currentValue === undefined ? false : !currentValue,
      };
    });
  };

  return (
    <div className="space-y-6">
      {projectGroups.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center text-sm text-gray-500">
          No capital projects require allocations yet. Assign project types in
          the Projects & Programs tab to start planning staffing coverage.
        </div>
      ) : (
        projectGroups.map((group) => {
          const projectCount = group.projects.length;
          const designBudgetTotal = group.projects.reduce(
            (sum, project) => sum + (Number(project.designBudget) || 0),
            0
          );
          const constructionBudgetTotal = group.projects.reduce(
            (sum, project) => sum + (Number(project.constructionBudget) || 0),
            0
          );
          const summaryParts = [
            `${projectCount} ${projectCount === 1 ? "Project" : "Projects"}`,
          ];
          if (designBudgetTotal > 0) {
            summaryParts.push(`Design ${formatBudgetAmount(designBudgetTotal)}`);
          }
          if (constructionBudgetTotal > 0) {
            summaryParts.push(
              `Construction ${formatBudgetAmount(constructionBudgetTotal)}`
            );
          }
          const summaryText = summaryParts.join(" • ");
          const isExpanded = Boolean(expandedGroups[group.key]);

          return (
            <div key={group.key} className="bg-white rounded-lg shadow-sm">
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center justify-between gap-4 p-5"
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
                      <span className="text-lg font-semibold text-gray-900">
                        {group.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{summaryText}</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-400">
                  {isExpanded ? "Hide" : "Show"}
                </span>
              </button>

              {isExpanded && (
                <div className="divide-y divide-gray-200 border-t border-gray-200">
                  {group.projects.map((project) => {
                    const fundingSource = fundingSources.find(
                      (source) => source.id === project.fundingSourceId
                    );

                    const projectKey = String(project.id);
                    const isProjectExpanded =
                      expandedProjects[projectKey] ?? true;
                    const projectAllocations =
                      staffAllocations[project.id] || {};
                    const projectTotals = staffCategories.reduce(
                      (accumulator, category) => {
                        const allocation =
                          projectAllocations[category.id] || {};
                        const pmHours = Number(allocation.pmHours) || 0;
                        const designHours = Number(allocation.designHours) || 0;
                        const constructionHours =
                          Number(allocation.constructionHours) || 0;
                        const hourlyRate = Number(category.hourlyRate) || 0;

                        accumulator.pmHours += pmHours;
                        accumulator.designHours += designHours;
                        accumulator.constructionHours += constructionHours;
                        accumulator.pmCost += pmHours * hourlyRate;
                        accumulator.designCost += designHours * hourlyRate;
                        accumulator.constructionCost +=
                          constructionHours * hourlyRate;

                        return accumulator;
                      },
                      {
                        pmHours: 0,
                        designHours: 0,
                        constructionHours: 0,
                        pmCost: 0,
                        designCost: 0,
                        constructionCost: 0,
                      }
                    );
                    const totalHours =
                      projectTotals.pmHours +
                      projectTotals.designHours +
                      projectTotals.constructionHours;
                    const totalCost =
                      projectTotals.pmCost +
                      projectTotals.designCost +
                      projectTotals.constructionCost;

                    return (
                      <div key={project.id} className="p-6">
                        <div className="space-y-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="md:flex-1">
                              <button
                                type="button"
                                onClick={() => toggleProject(projectKey)}
                                aria-expanded={isProjectExpanded}
                                className="flex w-full items-start justify-between gap-4 bg-transparent text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                              >
                                <div className="flex items-start gap-3">
                                  <span className="mt-1 text-gray-500">
                                    {isProjectExpanded ? (
                                      <ChevronDown size={18} />
                                    ) : (
                                      <ChevronRight size={18} />
                                    )}
                                  </span>
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="text-lg font-semibold">
                                        {project.name}
                                      </h3>
                                      <span
                                        className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                                        style={{
                                          backgroundColor: `${group.color}1a`,
                                          color: group.color,
                                        }}
                                      >
                                        {group.label}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                                      <span>
                                        Design Budget: $
                                        {formatBudgetAmount(
                                          project.designBudget
                                        )}
                                      </span>
                                      <span>
                                        Construction Budget: $
                                        {formatBudgetAmount(
                                          project.constructionBudget
                                        )}
                                      </span>
                                      <span
                                        className="hidden h-4 w-px bg-gray-300 sm:block"
                                        aria-hidden="true"
                                      ></span>
                                      <span>
                                        PM Hours: {" "}
                                        {projectTotals.pmHours.toLocaleString()}
                                      </span>
                                      <span>
                                        Design Hours: {" "}
                                        {projectTotals.designHours.toLocaleString()}
                                      </span>
                                      <span>
                                        Construction Hours: {" "}
                                        {projectTotals.constructionHours.toLocaleString()}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                      Design: {" "}
                                      {new Date(
                                        project.designStartDate
                                      ).toLocaleDateString()} {" "}
                                      ({project.designDuration} months) |
                                      Construction: {" "}
                                      {new Date(
                                        project.constructionStartDate
                                      ).toLocaleDateString()} {" "}
                                      ({project.constructionDuration} months)
                                    </p>
                                  </div>
                                </div>
                                <span className="hidden text-xs font-medium text-gray-400 sm:inline">
                                  {isProjectExpanded
                                    ? "Hide details"
                                    : "Show details"}
                                </span>
                              </button>
                            </div>
                            <div className="flex flex-col items-start gap-2 md:items-end">
                              {(() => {
                                const deliveryKey =
                                  project.deliveryType || "self-perform";
                                const label =
                                  deliveryLabels[deliveryKey] || "Delivery";
                                const badgeClass =
                                  deliveryBadgeStyles[deliveryKey] ||
                                  "bg-gray-100 text-gray-700";
                                return (
                                  <span
                                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
                                  >
                                    {label} Delivery
                                  </span>
                                );
                              })()}
                              <p className="text-xs text-gray-500">
                                Funding: {fundingSource?.name || "Unassigned"}
                              </p>
                            </div>
                          </div>

                          {isProjectExpanded && (
                            <div className="space-y-4">
                              {(() => {
                                const key = project.deliveryType || "self-perform";
                                const guidance = deliveryGuidance[key];
                                if (!guidance) return null;
                                const GuidanceIcon = guidance.Icon;
                                return (
                                  <div
                                    className={`rounded-md border-l-4 p-4 ${guidance.container}`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <GuidanceIcon
                                        size={20}
                                        className={`${guidance.iconClass} mt-0.5 flex-shrink-0`}
                                      />
                                      <div className="space-y-1 text-sm leading-snug">
                                        <p className="font-semibold">{guidance.title}</p>
                                        {guidance.details.map((detail, index) => (
                                          <p key={index}>{detail}</p>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {requiresExternalCoordination(fundingSource) && (
                                <div className="rounded-md border-l-4 border-orange-500 bg-orange-50 p-4 text-orange-900">
                                  <div className="flex items-start gap-3">
                                    <AlertTriangle
                                      size={20}
                                      className="mt-0.5 flex-shrink-0 text-orange-500"
                                    />
                                    <div className="space-y-1 text-sm leading-snug">
                                      <p className="font-semibold">
                                        External Coordination Needed
                                      </p>
                                      <p>
                                        This project is funded through {" "}
                                        <strong>
                                          {fundingSource?.name || "external sources"}
                                        </strong>
                                        , so align LoE planning with state or partner agency
                                        requirements before finalizing allocations.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="text-left p-3">Staff Category</th>
                                      <th className="text-left p-3">Hourly Rate</th>
                                      <th className="text-left p-3">PM Hours</th>
                                      <th className="text-left p-3">PM Cost</th>
                                      <th className="text-left p-3">Design Hours</th>
                                      <th className="text-left p-3">Design Cost</th>
                                      <th className="text-left p-3">Construction Hours</th>
                                      <th className="text-left p-3">Construction Cost</th>
                                      <th className="text-left p-3">Total Hours</th>
                                      <th className="text-left p-3">Total Cost</th>
                                      <th className="text-left p-3">Monthly FTE</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {staffCategories.map((category) => {
                                      const allocation =
                                        staffAllocations[project.id]?.[category.id] || {
                                          pmHours: 0,
                                          designHours: 0,
                                          constructionHours: 0,
                                        };
                                      const pmCost =
                                        (allocation.pmHours || 0) * category.hourlyRate;
                                      const designCost =
                                        (allocation.designHours || 0) * category.hourlyRate;
                                      const constructionCost =
                                        (allocation.constructionHours || 0) *
                                        category.hourlyRate;
                                      const allocationTotalHours =
                                        (allocation.pmHours || 0) +
                                        (allocation.designHours || 0) +
                                        (allocation.constructionHours || 0);
                                      const allocationTotalCost =
                                        pmCost + designCost + constructionCost;

                                      const designFTE = formatMonthlyFTE(
                                        allocation.designHours,
                                        project.designDuration
                                      );
                                      const constructionFTE = formatMonthlyFTE(
                                        allocation.constructionHours,
                                        project.constructionDuration
                                      );
                                      const totalDuration =
                                        (project.designDuration || 0) +
                                        (project.constructionDuration || 0);
                                      const pmFTE = formatMonthlyFTE(
                                        allocation.pmHours,
                                        totalDuration
                                      );

                                      return (
                                        <tr
                                          key={category.id}
                                          className="border-b border-gray-200"
                                        >
                                          <td className="p-3 font-medium">
                                            {category.name}
                                          </td>
                                          <td className="p-3">
                                            ${category.hourlyRate}
                                          </td>
                                          <td className="p-3">
                                            <HoursInput
                                              value={allocation.pmHours}
                                              onValueChange={(newValue) =>
                                                updateStaffAllocation(
                                                  project.id,
                                                  category.id,
                                                  "pm",
                                                  newValue
                                                )
                                              }
                                              durationMonths={totalDuration}
                                              label="PM Hours"
                                            />
                                          </td>
                                          <td className="p-3">
                                            ${pmCost.toLocaleString()}
                                          </td>
                                          <td className="p-3">
                                            <HoursInput
                                              value={allocation.designHours}
                                              onValueChange={(newValue) =>
                                                updateStaffAllocation(
                                                  project.id,
                                                  category.id,
                                                  "design",
                                                  newValue
                                                )
                                              }
                                              durationMonths={project.designDuration}
                                              label="Design Hours"
                                            />
                                          </td>
                                          <td className="p-3">
                                            ${designCost.toLocaleString()}
                                          </td>
                                          <td className="p-3">
                                            <HoursInput
                                              value={allocation.constructionHours}
                                              onValueChange={(newValue) =>
                                                updateStaffAllocation(
                                                  project.id,
                                                  category.id,
                                                  "construction",
                                                  newValue
                                                )
                                              }
                                              durationMonths={project.constructionDuration}
                                              label="Construction Hours"
                                            />
                                          </td>
                                          <td className="p-3">
                                            ${constructionCost.toLocaleString()}
                                          </td>
                                          <td className="p-3">
                                            {allocationTotalHours.toLocaleString()}
                                          </td>
                                          <td className="p-3">
                                            ${allocationTotalCost.toLocaleString()}
                                          </td>
                                          <td className="p-3">
                                            <div className="space-y-1">
                                              <div className="text-xs text-gray-500">
                                                Design: {designFTE} FTE
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                Construction: {constructionFTE} FTE
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                PM: {pmFTE} FTE
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot className="bg-gray-50 font-medium">
                                    <tr>
                                      <td className="p-3">Total</td>
                                      <td className="p-3"></td>
                                      <td className="p-3 font-semibold">
                                        {projectTotals.pmHours.toLocaleString()}
                                      </td>
                                      <td className="p-3 font-semibold">
                                        ${projectTotals.pmCost.toLocaleString()}
                                      </td>
                                      <td className="p-3 font-semibold">
                                        {projectTotals.designHours.toLocaleString()}
                                      </td>
                                      <td className="p-3 font-semibold">
                                        ${projectTotals.designCost.toLocaleString()}
                                      </td>
                                      <td className="p-3 font-semibold">
                                        {projectTotals.constructionHours.toLocaleString()}
                                      </td>
                                      <td className="p-3 font-semibold">
                                        ${projectTotals.constructionCost.toLocaleString()}
                                      </td>
                                      <td className="p-3 font-semibold">
                                        {totalHours.toLocaleString()}
                                      </td>
                                      <td className="p-3 font-semibold">
                                        ${totalCost.toLocaleString()}
                                      </td>
                                      <td className="p-3"></td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );

            })}
          </div>
        )}
      </div>
    );
  })
)}

      {/* Annual Programs Note */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Repeat size={20} />
          Annual Programs
        </h3>
        <p className="text-blue-800">
          Annual programs use continuous monthly resource demands defined in the
          Projects & Programs tab. These represent ongoing work that doesn't
          require specific project-by-project staff allocation.
        </p>
      </div>

      {/* Allocation Tips */}
      <div className="bg-green-50 p-6 rounded-lg">
        <h4 className="font-medium text-green-900 mb-2">Allocation Tips</h4>
        <div className="text-green-800 text-sm space-y-1">
          <p>
            • <strong>PM Hours:</strong> Capture project management oversight
            that spans both design and construction phases
          </p>
          <p>
            • <strong>Design Hours:</strong> Include planning, engineering,
            permits, and design review
          </p>
          <p>
            • <strong>Construction Hours:</strong> Include project management,
            inspection, and construction oversight
          </p>
          <p>
            • <strong>Monthly FTE:</strong> Shows the average monthly commitment
            during each phase
          </p>
          <p>
            • Consider project complexity, regulatory requirements, and team
            experience when allocating hours
          </p>
        </div>
      </div>
    </div>
  );
};

export default StaffAllocations;
