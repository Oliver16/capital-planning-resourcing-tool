import React, { useMemo } from "react";
import { formatCurrency } from "../../../utils/financialModeling";

const numberInputClasses =
  "w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";
const readOnlyClasses = "bg-slate-100 text-slate-500 cursor-not-allowed";

const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const getMonthLabel = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "—";
  }

  const match = MONTH_OPTIONS.find((option) => option.value === numeric);
  return match ? match.label : "—";
};

const SettingsView = ({
  financialConfig = {},
  projectTypeSummaries = [],
  utilityOptions = [],
  onUpdateProjectTypeUtility,
  onUpdateFinancialConfig,
  isReadOnly,
}) => {
  const assignmentOptions = useMemo(
    () => [{ value: "", label: "Unassigned" }, ...utilityOptions],
    [utilityOptions]
  );

  const handleConfigChange = (field) => (event) => {
    if (isReadOnly) {
      return;
    }

    const rawValue = event.target.value;
    let parsedValue = rawValue;

    if (field === "startYear" || field === "projectionYears") {
      parsedValue = Number(rawValue);
      if (!Number.isFinite(parsedValue)) {
        parsedValue = financialConfig[field] || 0;
      }
      parsedValue = Math.max(field === "projectionYears" ? 1 : 1900, Math.round(parsedValue));
    } else if (field === "startingCashBalance") {
      parsedValue = Number(rawValue);
      if (!Number.isFinite(parsedValue)) {
        parsedValue = financialConfig.startingCashBalance || 0;
      }
      parsedValue = Math.max(0, parsedValue);
    } else if (field === "targetCoverageRatio") {
      parsedValue = Number(rawValue);
      if (!Number.isFinite(parsedValue)) {
        parsedValue = financialConfig.targetCoverageRatio || 1;
      }
      parsedValue = Math.max(0, parsedValue);
    } else if (field === "fiscalYearStartMonth") {
      parsedValue = Number(rawValue);
      if (!Number.isFinite(parsedValue)) {
        parsedValue = financialConfig.fiscalYearStartMonth || 1;
      }
      parsedValue = Math.min(12, Math.max(1, Math.round(parsedValue)));
    }

    onUpdateFinancialConfig?.({ [field]: parsedValue });
  };

  const configItems = useMemo(
    () => [
      {
        label: "Start Year",
        value: financialConfig.startYear ? `FY ${financialConfig.startYear}` : "—",
      },
      {
        label: "Fiscal Year Begins",
        value: getMonthLabel(financialConfig.fiscalYearStartMonth),
      },
      {
        label: "Projection Horizon",
        value:
          financialConfig.projectionYears && Number(financialConfig.projectionYears) > 0
            ? `${financialConfig.projectionYears} Years`
            : "—",
      },
      {
        label: "Starting Cash Balance",
        value: formatCurrency(financialConfig.startingCashBalance || 0),
      },
      {
        label: "Target Coverage Ratio",
        value:
          financialConfig.targetCoverageRatio !== undefined && financialConfig.targetCoverageRatio !== null
            ? `${Number(financialConfig.targetCoverageRatio).toFixed(2)}x`
            : "—",
      },
    ],
    [financialConfig]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Projection Settings</h3>
        <p className="mt-1 text-sm text-slate-600">
          Configure the fiscal window, opening reserves, and policy targets that guide every pro forma scenario.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:[grid-template-columns:repeat(auto-fit,_minmax(340px,_1fr))]">
          <label className="text-sm font-medium text-slate-700">
            <span>Start Fiscal Year</span>
            <input
              type="number"
              value={financialConfig.startYear}
              onChange={handleConfigChange("startYear")}
              className={`${numberInputClasses} mt-1 ${isReadOnly ? readOnlyClasses : ""}`}
              disabled={isReadOnly}
              min={1900}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            <span>Fiscal Year Start Month</span>
            <select
              value={financialConfig.fiscalYearStartMonth || 1}
              onChange={handleConfigChange("fiscalYearStartMonth")}
              className={`${numberInputClasses} mt-1 ${isReadOnly ? readOnlyClasses : ""}`}
              disabled={isReadOnly}
            >
              {MONTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            <span>Projection Years</span>
            <input
              type="number"
              value={financialConfig.projectionYears}
              onChange={handleConfigChange("projectionYears")}
              className={`${numberInputClasses} mt-1 ${isReadOnly ? readOnlyClasses : ""}`}
              disabled={isReadOnly}
              min={1}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            <span>Starting Cash Balance</span>
            <input
              type="number"
              value={financialConfig.startingCashBalance}
              onChange={handleConfigChange("startingCashBalance")}
              className={`${numberInputClasses} mt-1 ${isReadOnly ? readOnlyClasses : ""}`}
              disabled={isReadOnly}
              min={0}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            <span>Target Coverage Ratio</span>
            <input
              type="number"
              step="0.01"
              value={financialConfig.targetCoverageRatio}
              onChange={handleConfigChange("targetCoverageRatio")}
              className={`${numberInputClasses} mt-1 ${isReadOnly ? readOnlyClasses : ""}`}
              disabled={isReadOnly}
              min={0}
            />
          </label>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {configItems.map((item) => (
            <div key={item.label} className="rounded-md bg-slate-50 px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</dt>
              <dd className="mt-1 text-sm font-medium text-slate-800">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Project Type Utility Assignments</h3>
            <p className="mt-1 text-sm text-slate-600">
              Map each project type to the appropriate utility enterprise fund. Assignments control which projects feed the
              CIP, spend plan, and pro forma for each utility portfolio.
            </p>
          </div>
          <div className="text-sm text-slate-500">
            {projectTypeSummaries.length} project types available for assignment
          </div>
        </div>

        {projectTypeSummaries.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No project types are defined yet. Create project categories in the planning workspace to enable utility
            mapping.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Project Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Projects in CIP</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Assigned Utility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {projectTypeSummaries.map((summary) => {
                  const currentValue =
                    summary.assignedUtility === null || summary.assignedUtility === undefined
                      ? ""
                      : summary.assignedUtility;

                  return (
                    <tr key={summary.id}>
                      <th scope="row" className="px-4 py-3 text-left font-medium text-slate-900">
                        {summary.name}
                      </th>
                      <td className="px-4 py-3 text-slate-600">{summary.projectCount}</td>
                      <td className="px-4 py-3">
                        <select
                          value={currentValue}
                          onChange={(event) =>
                            onUpdateProjectTypeUtility?.(
                              summary.id,
                              event.target.value ? event.target.value : null
                            )
                          }
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          disabled={isReadOnly}
                        >
                          {assignmentOptions.map((option) => (
                            <option key={option.value || "none"} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
