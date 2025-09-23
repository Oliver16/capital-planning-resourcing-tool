import React, { useMemo } from "react";
import { formatCurrency } from "../../../utils/financialModeling";

const SettingsView = ({
  financialConfig = {},
  projectTypeSummaries = [],
  utilityOptions = [],
  onUpdateProjectTypeUtility,
  isReadOnly,
}) => {
  const assignmentOptions = useMemo(
    () => [{ value: "", label: "Unassigned" }, ...utilityOptions],
    [utilityOptions]
  );

  const configItems = useMemo(
    () => [
      {
        label: "Start Year",
        value: financialConfig.startYear ? `FY ${financialConfig.startYear}` : "—",
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
        <h3 className="text-lg font-semibold text-slate-900">Model Configuration Overview</h3>
        <p className="mt-1 text-sm text-slate-600">
          Global settings drive the timing window, opening reserves, and coverage targets that power the pro forma. Adjust
          these values from the operating budget view to update the assumptions here.
        </p>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
