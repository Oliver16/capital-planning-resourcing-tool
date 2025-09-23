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
const numberDisplayClasses = "px-4 py-3 text-right font-mono text-sm text-slate-700";
const numberEmphasisClasses = "px-4 py-3 text-right font-mono text-sm font-semibold text-slate-900";

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
  const interestByYear = forecastResult?.debtServiceInterestByYear || {};
  const principalByYear = forecastResult?.debtServicePrincipalByYear || {};
  const financingSchedules = forecastResult?.financingSchedules || [];

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

  const bondSchedules = useMemo(
    () =>
      financingSchedules.filter(
        (schedule) => schedule.financingType === "bond" && schedule.totalIssued > 0
      ),
    [financingSchedules]
  );

  const loanSchedules = useMemo(
    () =>
      financingSchedules.filter(
        (schedule) => schedule.financingType === "srf" && schedule.totalIssued > 0
      ),
    [financingSchedules]
  );

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
                <th className="px-4 py-3 text-right font-semibold text-slate-600">New Debt Interest</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">New Debt Principal</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Total New Debt Service</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Total Debt Service</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Coverage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {years.map((year) => {
                const budgetRow = budgetByYear.get(year) || {};
                const yearForecast = forecastByYear.get(year) || {};
                const existingDebtRaw = budgetRow.existingDebtService ?? 0;
                const existingDebt = Number(existingDebtRaw) || 0;
                const interestPayment = Math.max(0, Number(interestByYear?.[year] ?? 0));
                const principalPayment = Math.max(0, Number(principalByYear?.[year] ?? 0));
                const computedNewDebt = interestPayment + principalPayment;
                const hasComputedNewDebt = Math.abs(computedNewDebt) > 1e-6;
                const fallbackNewDebt = Number(yearForecast.newDebtService ?? 0);
                const newDebt = hasComputedNewDebt ? computedNewDebt : fallbackNewDebt;
                const totalDebt = Number.isFinite(Number(yearForecast.totalDebtService))
                  ? Number(yearForecast.totalDebtService)
                  : existingDebt + newDebt;
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
                        <span className="font-mono text-sm text-slate-700">{formatCurrency(existingDebt)}</span>
                      ) : (
                        <input
                          type="number"
                          value={existingDebtRaw}
                          onChange={handleExistingDebtChange(year)}
                          className={`${numberInputClasses} text-right ${isReadOnly ? readOnlyClasses : ""}`}
                          disabled={isReadOnly}
                        />
                      )}
                    </td>
                    <td className={numberDisplayClasses}>{formatCurrency(interestPayment)}</td>
                    <td className={numberDisplayClasses}>{formatCurrency(principalPayment)}</td>
                    <td className={numberEmphasisClasses}>{formatCurrency(newDebt)}</td>
                    <td className={numberEmphasisClasses}>{formatCurrency(totalDebt)}</td>
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

      {bondSchedules.length > 0 || loanSchedules.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold text-slate-900">Financing Timelines</h3>
            <p className="text-sm text-slate-600">
              Bond issuances and loan drawdowns are modeled from the CIP spend plan. Interest-only periods and
              amortization start years reflect the selected financing structure.
            </p>
          </div>

          {bondSchedules.length > 0 ? (
            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Revenue Bond Issues
              </h4>
              {bondSchedules.map((schedule) => {
                let cumulative = 0;
                return (
                  <div
                    key={schedule.fundingKey || schedule.sourceName}
                    className="rounded-md border border-slate-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{schedule.sourceName}</div>
                        <div className="text-xs text-slate-500">
                          Rate {formatPercent(schedule.interestRate || 0, { decimals: 2 })} · Term {schedule.termYears}
                          {" "}yrs
                        </div>
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Total Issued: {formatCurrency(schedule.totalIssued || 0)}
                      </div>
                    </div>

                    {schedule.issues?.length ? (
                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">Issue Year</th>
                              <th className="px-3 py-2 text-right font-semibold text-slate-600">Issue Amount</th>
                              <th className="px-3 py-2 text-right font-semibold text-slate-600">Payment Start</th>
                              <th className="px-3 py-2 text-right font-semibold text-slate-600">1st Yr Interest</th>
                              <th className="px-3 py-2 text-right font-semibold text-slate-600">1st Yr Principal</th>
                              <th className="px-3 py-2 text-right font-semibold text-slate-600">Level Debt Service</th>
                              <th className="px-3 py-2 text-right font-semibold text-slate-600">Cumulative Issued</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {schedule.issues.map((issue) => {
                              cumulative += issue.amount || 0;
                              return (
                                <tr key={`${schedule.fundingKey || schedule.sourceName}-${issue.year}`}>
                                  <th scope="row" className="px-3 py-2 text-left font-medium text-slate-700">
                                    FY {issue.year}
                                  </th>
                                  <td className="px-3 py-2 text-right font-mono text-slate-600">
                                    {formatCurrency(issue.amount)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono text-slate-600">
                                    FY {issue.paymentStartYear}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono text-slate-600">
                                    {formatCurrency(issue.firstYearInterest)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono text-slate-600">
                                    {formatCurrency(issue.firstYearPrincipal)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono text-slate-700">
                                    {formatCurrency(issue.annualPayment)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono text-slate-700">
                                    {formatCurrency(cumulative)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-slate-500">
                        No bond issues fall within the projection horizon.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}

          {loanSchedules.length > 0 ? (
            <div className="mt-8 space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Loan Draws & Amortization
              </h4>
              {loanSchedules.map((loan) => (
                <div
                  key={loan.fundingKey || loan.sourceName}
                  className="rounded-md border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{loan.sourceName}</div>
                      <div className="text-xs text-slate-500">
                        Rate {formatPercent(loan.interestRate || 0, { decimals: 2 })} · Term {loan.termYears}{" "}
                        yrs
                      </div>
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total Financed: {formatCurrency(loan.totalIssued || 0)}
                    </div>
                  </div>

                  {loan.interestOnly?.length ? (
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-slate-600">FY</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-600">Draw</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-600">Interest-Only Payment</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-600">Balance End</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {loan.interestOnly.map((entry) => (
                            <tr key={`interest-${loan.fundingKey || loan.sourceName}-${entry.year}`}>
                              <th scope="row" className="px-3 py-2 text-left font-medium text-slate-700">
                                FY {entry.year}
                              </th>
                              <td className="px-3 py-2 text-right font-mono text-slate-600">
                                {formatCurrency(entry.drawAmount)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-slate-600">
                                {formatCurrency(entry.interestPayment)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-slate-600">
                                {formatCurrency(entry.outstandingBalance)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">
                      Interest-only activity falls outside the projection horizon.
                    </p>
                  )}

                  <div className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    {loan.amortizationStartYear
                      ? `Amortization begins FY ${loan.amortizationStartYear} with level payment ${formatCurrency(
                          loan.annualPayment || 0
                        )} for ${loan.termYears} years.`
                      : "No amortization is scheduled."}
                  </div>

                  {loan.amortization?.length ? (
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-slate-600">FY</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-600">Payment</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-600">Interest</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-600">Principal</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-600">Ending Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {loan.amortization.map((entry) => (
                            <tr key={`amort-${loan.fundingKey || loan.sourceName}-${entry.year}`}>
                              <th scope="row" className="px-3 py-2 text-left font-medium text-slate-700">
                                FY {entry.year}
                              </th>
                              <td className="px-3 py-2 text-right font-mono text-slate-600">
                                {formatCurrency(entry.payment)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-slate-600">
                                {formatCurrency(entry.interestPayment)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-slate-600">
                                {formatCurrency(entry.principalPayment)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-slate-600">
                                {formatCurrency(entry.remainingBalance)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">
                      Amortization years fall outside the projection horizon.
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default DebtServiceView;
