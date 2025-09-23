import React, { useMemo } from "react";
import {
  formatCurrency,
  formatPercent,
  formatCoverageRatio,
} from "../../../utils/financialModeling";
import { ShieldCheck, CircleDollarSign, PiggyBank, LineChart, Clock } from "lucide-react";

const SummaryCard = ({ title, value, description, icon: Icon, highlight = false }) => (
  <div
    className={`flex items-start justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${
      highlight ? "ring-1 ring-blue-500" : ""
    }`}
  >
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
      {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
    </div>
    <div className="rounded-full bg-blue-50 p-2 text-blue-600">
      <Icon size={20} />
    </div>
  </div>
);

const formatDaysCash = (value) => {
  if (value === null || value === undefined) {
    return "—";
  }
  const rounded = Math.round(value);
  return `${Number.isFinite(rounded) ? rounded.toLocaleString() : "0"} days`;
};

const ProFormaView = ({ forecastResult, financialConfig }) => {
  const { forecast = [], totals = {} } = forecastResult || {};

  const years = useMemo(() => forecast.map((row) => row.year), [forecast]);
  const forecastByYear = useMemo(() => {
    const map = new Map();
    forecast.forEach((row) => {
      if (row && row.year !== undefined && row.year !== null) {
        map.set(row.year, row);
      }
    });
    return map;
  }, [forecast]);

  const summaryCards = useMemo(
    () => [
      {
        title: "Ending Cash Balance",
        value: formatCurrency(totals.endingCashBalance),
        description: "Projected reserve level after capital delivery and debt obligations.",
        icon: ShieldCheck,
      },
      {
        title: "Total Capital Spend",
        value: formatCurrency(totals.totalCapitalSpend),
        description: "CIP investment flowing through the model horizon.",
        icon: CircleDollarSign,
      },
      {
        title: "New Debt Issued",
        value: formatCurrency(totals.totalDebtIssued),
        description: "Principal financed via bonds or loans from the CIP portfolio.",
        icon: PiggyBank,
      },
      {
        title: "Minimum Coverage Ratio",
        value: totals.minCoverageRatio !== null ? formatCoverageRatio(totals.minCoverageRatio, 2) : "No Debt",
        description:
          totals.maxAdditionalRateIncrease > 0
            ? `${formatPercent(totals.maxAdditionalRateIncrease, { decimals: 1 })} additional rate action may be required.`
            : "Coverage targets are satisfied across the horizon.",
        icon: LineChart,
        highlight:
          totals.maxAdditionalRateIncrease > 0 ||
          (Number.isFinite(totals.minCoverageRatio) &&
            totals.minCoverageRatio < financialConfig.targetCoverageRatio),
      },
      {
        title: "Min Days Cash on Hand",
        value: formatDaysCash(totals.minDaysCashOnHand),
        description: "Liquidity cushion calculated from ending cash versus operating expenses.",
        icon: Clock,
        highlight:
          Number.isFinite(totals.minDaysCashOnHand) && totals.minDaysCashOnHand < 180,
      },
    ],
    [totals, financialConfig.targetCoverageRatio]
  );

  const proFormaRows = useMemo(
    () => [
      { type: "section", label: "Operating Revenues" },
      {
        key: "baseOperatingRevenue",
        label: "Base Operating Revenue",
        getValue: (row) => row.baseOperatingRevenue,
        formatter: (value) => formatCurrency(value),
      },
      {
        key: "plannedRateIncreasePercent",
        label: "Planned Rate Adjustment",
        getValue: (row) => row.plannedRateIncreasePercent,
        formatter: (value) => formatPercent(value, { decimals: 1 }),
      },
      {
        key: "adjustedOperatingRevenue",
        label: "Adjusted Operating Revenue",
        getValue: (row) => row.adjustedOperatingRevenue,
        formatter: (value) => formatCurrency(value),
        highlight: true,
      },
      {
        key: "nonOperatingRevenue",
        label: "Non-Operating Revenue",
        getValue: (row) => row.nonOperatingRevenue,
        formatter: (value) => formatCurrency(value),
      },
      {
        key: "totalRevenue",
        label: "Total Revenues",
        getValue: (row) =>
          (row.adjustedOperatingRevenue || 0) + (row.nonOperatingRevenue || 0),
        formatter: (value) => formatCurrency(value),
      },
      { type: "section", label: "Operating Expenses" },
      {
        key: "omExpenses",
        label: "Operations & Maintenance",
        getValue: (row) => row.omExpenses,
        formatter: (value) => formatCurrency(value),
      },
      {
        key: "salaries",
        label: "Salaries & Wages",
        getValue: (row) => row.salaries,
        formatter: (value) => formatCurrency(value),
      },
      {
        key: "adminExpenses",
        label: "Administration",
        getValue: (row) => row.adminExpenses,
        formatter: (value) => formatCurrency(value),
      },
      {
        key: "totalOperatingExpenses",
        label: "Total Operating Expenses",
        getValue: (row) => row.totalOperatingExpenses,
        formatter: (value) => formatCurrency(value),
      },
      { type: "section", label: "Net Position Before Debt" },
      {
        key: "netRevenueBeforeDebt",
        label: "Net Revenue Before Debt",
        getValue: (row) => row.netRevenueBeforeDebt,
        formatter: (value) => formatCurrency(value),
        highlight: true,
      },
      { type: "section", label: "Debt Service" },
      {
        key: "existingDebtService",
        label: "Existing Debt Service",
        getValue: (row) => row.existingDebtService,
        formatter: (value) => formatCurrency(value),
      },
      {
        key: "newDebtService",
        label: "New Debt Service",
        getValue: (row) => row.newDebtService,
        formatter: (value) => formatCurrency(value),
      },
      {
        key: "totalDebtService",
        label: "Total Debt Service",
        getValue: (row) => row.totalDebtService,
        formatter: (value) => formatCurrency(value),
      },
      {
        key: "netAfterDebt",
        label: "Net After Debt Service",
        getValue: (row) =>
          (row.netRevenueBeforeDebt || 0) - (row.totalDebtService || 0),
        formatter: (value) => formatCurrency(value),
        highlight: true,
      },
      { type: "section", label: "Capital & Coverage" },
      {
        key: "cashFundedCapex",
        label: "Cash-Funded CIP",
        getValue: (row) => row.cashFundedCapex,
        formatter: (value) => formatCurrency(value),
      },
      {
        key: "cipSpend",
        label: "Total CIP Spend",
        getValue: (row) => row.cipSpend,
        formatter: (value) => formatCurrency(value),
      },
      {
        key: "endingCashBalance",
        label: "Ending Cash Balance",
        getValue: (row) => row.endingCashBalance,
        formatter: (value) => formatCurrency(value),
        highlight: true,
      },
      {
        key: "daysCashOnHand",
        label: "Days Cash on Hand",
        getValue: (row) => row.daysCashOnHand,
        formatter: (value) => formatDaysCash(value),
        minThreshold: 180,
      },
      {
        key: "coverageRatio",
        label: "Debt Service Coverage",
        getValue: (row) => row.coverageRatio,
        formatter: (value) => formatCoverageRatio(value, 2),
        emphasizeThreshold: financialConfig.targetCoverageRatio,
      },
      {
        key: "additionalRateIncreaseNeeded",
        label: "Additional Rate Increase Needed",
        getValue: (row) => row.additionalRateIncreaseNeeded,
        formatter: (value) =>
          value && value > 0
            ? formatPercent(value, { decimals: 1 })
            : "Met",
      },
    ],
    [financialConfig.targetCoverageRatio]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard key={card.title} {...card} />
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Utility Pro Forma Statement</h3>
            <p className="mt-1 text-sm text-slate-600">
              Statement-style presentation of revenues, expenses, debt service, and ending cash balances across
              the fiscal horizon.
            </p>
          </div>
          <div className="text-sm text-slate-500">
            Projection Window: FY {financialConfig.startYear} – FY
            {" "}
            {financialConfig.startYear + financialConfig.projectionYears - 1}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Metric</th>
                {years.map((year) => (
                  <th key={year} className="px-4 py-3 text-right font-semibold text-slate-600">
                    FY {year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {proFormaRows.map((row) => {
                if (row.type === "section") {
                  return (
                    <tr key={row.label} className="bg-slate-50/60">
                      <th
                        colSpan={1 + years.length}
                        className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {row.label}
                      </th>
                    </tr>
                  );
                }

                return (
                  <tr key={row.key}>
                    <th scope="row" className="px-4 py-3 text-left font-medium text-slate-900">
                      {row.label}
                    </th>
                    {years.map((year) => {
                      const yearData = forecastByYear.get(year) || {};
                      const rawValue = row.getValue ? row.getValue(yearData) : yearData[row.key];
                      const displayValue = row.formatter
                        ? row.formatter(rawValue, yearData)
                        : rawValue;

                      let cellClass = "px-4 py-3 text-right text-slate-700";
                      if (row.highlight) {
                        cellClass = "px-4 py-3 text-right font-semibold text-slate-900";
                      }

                      if (
                        row.key === "coverageRatio" &&
                        row.emphasizeThreshold &&
                        Number.isFinite(rawValue) &&
                        rawValue < row.emphasizeThreshold
                      ) {
                        cellClass = "px-4 py-3 text-right font-semibold text-red-600";
                      } else if (
                        row.key === "additionalRateIncreaseNeeded" &&
                        Number(rawValue) > 0
                      ) {
                        cellClass = "px-4 py-3 text-right font-medium text-amber-600";
                      } else if (
                        row.minThreshold !== undefined &&
                        row.minThreshold !== null &&
                        Number.isFinite(rawValue) &&
                        rawValue < row.minThreshold
                      ) {
                        cellClass = "px-4 py-3 text-right font-semibold text-red-600";
                      }

                      return (
                        <td key={year} className={cellClass}>
                          {displayValue}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProFormaView;
