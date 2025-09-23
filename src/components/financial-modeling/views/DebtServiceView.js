import React, { useMemo } from "react";
import {
  FINANCING_TYPE_OPTIONS,
  formatCurrency,
  formatPercent,
  formatCoverageRatio,
} from "../../../utils/financialModeling";

const numberInputClasses =
  "w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";
const readOnlyClasses = "bg-slate-100 text-slate-500 cursor-not-allowed";

const DebtServiceView = ({
  years = [],
  alignedBudget = [],
  forecastResult,
  financialConfig,
  fundingSourceAssumptions = [],
  fundingSourceMap,
  onUpdateOperatingBudget,
  onUpdateFundingSourceAssumption,
  isReadOnly,
}) => {
  const forecast = forecastResult?.forecast || [];
  const debtIssuedBySource = forecastResult?.debtIssuedBySource || {};
  const targetCoverage = financialConfig?.targetCoverageRatio || 0;

  const budgetByYear = useMemo(() => {
    const map = new Map();
    alignedBudget.forEach((row) => {
      if (row && row.year !== undefined && row.year !== null) {
        map.set(row.year, row);
      }
    });
    return map;
  }, [alignedBudget]);

  const forecastByYear = useMemo(() => {
    const map = new Map();
    forecast.forEach((row) => {
      if (row && row.year !== undefined && row.year !== null) {
        map.set(row.year, row);
      }
    });
    return map;
  }, [forecast]);

  const debtSummary = useMemo(() => {
    const entries = Object.entries(debtIssuedBySource).map(([key, amount]) => ({
      key,
      amount,
      label: fundingSourceMap?.get(key) || (key === "unassigned" ? "Unassigned" : key),
    }));
    return entries.sort((a, b) => b.amount - a.amount);
  }, [debtIssuedBySource, fundingSourceMap]);

  const debtBySourceMap = useMemo(() => {
    const map = new Map();
    Object.entries(debtIssuedBySource).forEach(([key, amount]) => {
      map.set(key, amount);
    });
    return map;
  }, [debtIssuedBySource]);

  const handleExistingDebtChange = (year) => (event) => {
    if (isReadOnly) {
      return;
    }
    onUpdateOperatingBudget(year, "existingDebtService", event.target.value);
  };

  const handleAssumptionChange = (fundingSourceId, field) => (event) => {
    if (isReadOnly) {
      return;
    }
    onUpdateFundingSourceAssumption(fundingSourceId, field, event.target.value);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Debt Service Schedule</h3>
        <p className="mt-1 text-sm text-slate-600">
          Review projected debt service by fiscal year. Existing debt can be edited directly while new debt is
          derived from the CIP financing assumptions.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Fiscal Year</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Existing Debt Service</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">New Debt Service</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Total Debt Service</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Coverage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {years.map((year) => {
                const budgetRow = budgetByYear.get(year) || {};
                const yearForecast = forecastByYear.get(year) || {};
                const existingDebt = budgetRow.existingDebtService ?? 0;
                const newDebt = yearForecast.newDebtService ?? 0;
                const totalDebt = yearForecast.totalDebtService ?? existingDebt + newDebt;
                const coverage = yearForecast.coverageRatio;

                let coverageClass = "text-slate-700";
                if (Number.isFinite(coverage) && coverage < targetCoverage) {
                  coverageClass = "text-red-600 font-semibold";
                }

                return (
                  <tr key={year}>
                    <th scope="row" className="px-4 py-3 text-left font-medium text-slate-900">
                      FY {year}
                    </th>
                    <td className="px-4 py-3 text-right">
                      {isReadOnly ? (
                        <span className="text-slate-700">{formatCurrency(existingDebt)}</span>
                      ) : (
                        <input
                          type="number"
                          value={existingDebt}
                          onChange={handleExistingDebtChange(year)}
                          className={`${numberInputClasses} text-right ${isReadOnly ? readOnlyClasses : ""}`}
                          disabled={isReadOnly}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatCurrency(newDebt)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatCurrency(totalDebt)}
                    </td>
                    <td className={`px-4 py-3 text-right ${coverageClass}`}>
                      {coverage !== null && coverage !== undefined
                        ? formatCoverageRatio(coverage, 2)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Financing Assumptions</h3>
            <p className="mt-1 text-sm text-slate-600">
              Set financing types, interest rates, and terms for each funding source. These drive the new debt
              service shown above.
            </p>
          </div>
          <div className="text-sm text-slate-500">
            Total New Debt Issued: {formatCurrency(forecastResult?.totals?.totalDebtIssued || 0)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Funding Source</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Financing Type</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Interest Rate %</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Term (Years)</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">New Debt Issued</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {fundingSourceAssumptions.map((assumption) => {
                const fundingKey =
                  assumption.fundingSourceId === null || assumption.fundingSourceId === undefined
                    ? "unassigned"
                    : String(assumption.fundingSourceId);
                const issuedAmount = debtBySourceMap.get(fundingKey) || 0;
                return (
                  <tr key={fundingKey}>
                    <th scope="row" className="px-4 py-3 text-left font-medium text-slate-900">
                      {assumption.sourceName || fundingSourceMap?.get(fundingKey) || "Funding Source"}
                    </th>
                    <td className="px-4 py-3">
                      <select
                        value={assumption.financingType}
                        onChange={handleAssumptionChange(assumption.fundingSourceId, "financingType")}
                        className={`${numberInputClasses} ${isReadOnly ? readOnlyClasses : ""}`}
                        disabled={isReadOnly}
                      >
                        {FINANCING_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isReadOnly ? (
                        <span className="text-slate-700">
                          {formatPercent(assumption.interestRate || 0, { decimals: 2 })}
                        </span>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          value={assumption.interestRate ?? 0}
                          onChange={handleAssumptionChange(assumption.fundingSourceId, "interestRate")}
                          className={`${numberInputClasses} text-right ${isReadOnly ? readOnlyClasses : ""}`}
                          disabled={isReadOnly}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isReadOnly ? (
                        <span className="text-slate-700">{assumption.termYears}</span>
                      ) : (
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={assumption.termYears ?? 0}
                          onChange={handleAssumptionChange(assumption.fundingSourceId, "termYears")}
                          className={`${numberInputClasses} text-right ${isReadOnly ? readOnlyClasses : ""}`}
                          disabled={isReadOnly}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatCurrency(issuedAmount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {debtSummary.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No new debt is projected under the current funding mix. Adjust financing assumptions or CIP schedules
            to explore different scenarios.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {debtSummary.map((item) => (
              <div key={item.key} className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <div className="font-medium text-slate-700">{item.label}</div>
                <div className="text-slate-500">{formatCurrency(item.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebtServiceView;
