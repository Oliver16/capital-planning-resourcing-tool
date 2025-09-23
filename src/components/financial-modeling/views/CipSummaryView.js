import React, { useMemo } from "react";
import { formatCurrency } from "../../../utils/financialModeling";

const formatDate = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return "—";
  }

  return value.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};

const buildScheduleLines = (entry) => {
  if (entry.type === "program") {
    return [
      {
        label: "Program",
        value: `${formatDate(entry.programStart || entry.designStart)} – ${formatDate(
          entry.programEnd || entry.designEnd
        )}`,
      },
    ];
  }

  return [
    {
      label: "Design",
      value: `${formatDate(entry.designStart)} – ${formatDate(entry.designEnd)}`,
    },
    {
      label: "Construction",
      value: `${formatDate(entry.constructionStart)} – ${formatDate(
        entry.constructionEnd
      )}`,
    },
  ];
};

const CipSummaryView = ({
  projectSpendBreakdown = [],
  years = [],
  fundingSourceMap,
  projectTypeMap,
  activeUtilityLabel,
}) => {
  const totals = useMemo(() => {
    const yearTotals = {};
    let grandTotal = 0;

    projectSpendBreakdown.forEach((entry) => {
      years.forEach((year) => {
        const amount = entry.spendByYear?.[year] || 0;
        if (amount > 0) {
          yearTotals[year] = (yearTotals[year] || 0) + amount;
          grandTotal += amount;
        }
      });
    });

    return { yearTotals, grandTotal };
  }, [projectSpendBreakdown, years]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold text-slate-900">
            Capital Improvement Plan Overview
          </h3>
          <p className="text-sm text-slate-600">
            The table below ties each capital project to its funding source, delivery schedule,
            and expected fiscal year spend. Spending is distributed automatically from the
            project design and construction timelines that power the broader planning suite.
          </p>
          {activeUtilityLabel ? (
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
              Viewing Utility Portfolio: {activeUtilityLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">
                Project / Program
              </th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">
                Type
              </th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">
                Funding Source
              </th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">
                Schedule
              </th>
              {years.map((year) => (
                <th
                  key={year}
                  scope="col"
                  className="px-4 py-3 text-right font-semibold text-slate-600"
                >
                  FY {year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {projectSpendBreakdown.length === 0 ? (
              <tr>
                <td
                  colSpan={4 + years.length}
                  className="px-4 py-6 text-center text-sm text-slate-500"
                >
                  No capital projects are scheduled. Add projects to the CIP plan to populate this
                  view.
                </td>
              </tr>
            ) : (
              projectSpendBreakdown.map((entry) => {
                const scheduleLines = buildScheduleLines(entry);
                return (
                  <tr key={entry.projectId || entry.name} className="align-top">
                    <th scope="row" className="px-4 py-3 text-left font-medium text-slate-900">
                      <div>{entry.name}</div>
                      {entry.deliveryType ? (
                        <div className="text-xs font-normal uppercase tracking-wide text-slate-400">
                          {entry.deliveryType}
                        </div>
                      ) : null}
                    </th>
                    <td className="px-4 py-3 text-slate-600">
                      {projectTypeMap?.get(entry.projectTypeId) ||
                        (entry.type === "program" ? "Program" : "Project")}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {fundingSourceMap?.get(String(entry.fundingSourceId)) || "Unassigned"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="space-y-1">
                        {scheduleLines.map((line) => (
                          <div key={line.label}>
                            <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              {line.label}
                            </span>
                            <span className="text-sm text-slate-600">{line.value}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    {years.map((year) => {
                      const amount = entry.spendByYear?.[year] || 0;
                      return (
                        <td key={year} className="px-4 py-3 text-right text-slate-700">
                          {amount > 0 ? formatCurrency(amount) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
          {projectSpendBreakdown.length > 0 ? (
            <tfoot className="bg-slate-50">
              <tr>
                <th
                  scope="row"
                  className="px-4 py-3 text-left text-sm font-semibold text-slate-700"
                >
                  CIP Total
                </th>
                <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                  {formatCurrency(totals.grandTotal)}
                </td>
                {years.map((year) => (
                  <td key={year} className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                    {formatCurrency(totals.yearTotals[year] || 0)}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
};

export default CipSummaryView;
