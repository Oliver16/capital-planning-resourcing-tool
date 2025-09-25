import React, { useMemo, useState } from "react";
import {
  FINANCING_TYPE_OPTIONS,
  formatCurrency,
  formatPercent,
  formatCoverageRatio,
} from "../../../utils/financialModeling";

const numberInputClasses =
  "w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";
const readOnlyClasses = "bg-slate-100 text-slate-500 cursor-not-allowed";

const defaultInstrumentForm = (years = []) => ({
  label: "Existing Debt",
  financingType: "bond",
  outstandingPrincipal: "",
  interestRate: "",
  termYears: "",
  firstPaymentYear: years[0] || new Date().getFullYear(),
  interestOnlyYears: "0",
});

const DebtServiceView = ({
  years = [],
  existingDebtSchedule = {},
  onUpdateExistingDebtManual,
  onAddExistingDebtInstrument,
  onRemoveExistingDebtInstrument,
  forecastResult,
  financialConfig,
  fundingSourceAssumptions = [],
  fundingSourceMap,
  onUpdateFundingSourceAssumption,
  isReadOnly,
}) => {
  const [instrumentForm, setInstrumentForm] = useState(() =>
    defaultInstrumentForm(years)
  );

  const forecast = forecastResult?.forecast || [];
  const debtIssuedBySource = forecastResult?.debtIssuedBySource || {};
  const interestByYear = forecastResult?.debtServiceInterestByYear || {};
  const principalByYear = forecastResult?.debtServicePrincipalByYear || {};
  const financingSchedules = forecastResult?.financingSchedules || [];
  const targetCoverage = financialConfig?.targetCoverageRatio || 0;

  const manualByYear = existingDebtSchedule?.manualByYear || {};
  const existingTotalsByYear = existingDebtSchedule?.totalsByYear || {};
  const existingInstrumentSummaries = existingDebtSchedule?.instrumentSummaries || [];

  const coverageByYear = useMemo(() => {
    const map = new Map();
    forecast.forEach((row) => {
      if (row && row.year !== undefined && row.year !== null) {
        map.set(row.year, row.coverageRatio);
      }
    });
    return map;
  }, [forecast]);

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

  const handleManualChange = (year) => (event) => {
    if (isReadOnly) {
      return;
    }

    onUpdateExistingDebtManual?.(year, event.target.value);
  };

  const handleInstrumentFieldChange = (field) => (event) => {
    const value = event.target.value;
    setInstrumentForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleAddInstrument = (event) => {
    event.preventDefault();
    if (isReadOnly) {
      return;
    }

    const payload = {
      label: instrumentForm.label,
      financingType: instrumentForm.financingType,
      outstandingPrincipal: Number(instrumentForm.outstandingPrincipal),
      interestRate: Number(instrumentForm.interestRate),
      termYears: Number(instrumentForm.termYears),
      firstPaymentYear: Number(instrumentForm.firstPaymentYear),
      interestOnlyYears: Number(instrumentForm.interestOnlyYears),
    };

    onAddExistingDebtInstrument?.(payload);
    setInstrumentForm(defaultInstrumentForm(years));
  };

  const handleRemoveInstrument = (id) => {
    if (isReadOnly) {
      return;
    }

    onRemoveExistingDebtInstrument?.(id);
  };

  const manualRow = {
    key: "manual",
    label: "Existing Debt (Manual Totals)",
    type: "manual",
  };

  const instrumentRows = existingInstrumentSummaries.map((instrument) => ({
    key: instrument.id,
    label: instrument.label,
    type: "instrument",
    financingType: instrument.financingType,
    interestRate: instrument.interestRate,
    termYears: instrument.termYears,
    outstandingPrincipal: instrument.outstandingPrincipal,
    firstPaymentYear: instrument.firstPaymentYear,
    interestOnlyYears: instrument.interestOnlyYears,
    summary: instrument,
  }));

  const metricRows = [manualRow, ...instrumentRows];

  const totalExistingRow = {
    key: "existingTotal",
    label: "Total Existing Debt Service",
    type: "total-existing",
  };

  const newDebtRows = [
    {
      key: "newInterest",
      label: "New Debt Interest",
      type: "new-interest",
    },
    {
      key: "newPrincipal",
      label: "New Debt Principal",
      type: "new-principal",
    },
    {
      key: "newTotal",
      label: "Total New Debt Service",
      type: "new-total",
    },
    {
      key: "totalDebt",
      label: "Total Debt Service",
      type: "total-debt",
    },
    {
      key: "coverage",
      label: "Debt Service Coverage",
      type: "coverage",
    },
  ];

  const rows = [...metricRows, totalExistingRow, ...newDebtRows];

  const formatCompactCurrency = (value) =>
    formatCurrency(value, { compact: true, maximumFractionDigits: 1 });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Debt Service Schedule</h3>
            <p className="mt-1 text-sm text-slate-600">
              Enter manual existing debt totals or define amortizing instruments. New debt service is
              calculated from the CIP financing assumptions.
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
                <th className="w-64 px-4 py-3 text-left font-semibold text-slate-600">Metric</th>
                {years.map((year) => (
                  <th key={year} className="px-4 py-3 text-right font-semibold text-slate-600">
                    FY {year}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const isTotalRow = row.type === "total-existing" || row.type === "total-debt";
                const isCoverageRow = row.type === "coverage";
                const labelClasses = `px-4 py-3 text-sm font-${
                  isTotalRow ? "semibold" : "medium"
                } text-slate-900`;
                let labelContent = row.label;

                if (row.type === "instrument") {
                  const financingLabel =
                    row.financingType === "srf" ? "SRF Loan" : "Revenue Bond";
                  labelContent = (
                    <div className="flex flex-col">
                      <span>{row.label}</span>
                      <span className="text-xs text-slate-500">
                        {financingLabel} · {formatPercent(row.interestRate || 0, { decimals: 2 })} · Term {" "}
                        {row.termYears} yrs · First Pay FY {row.firstPaymentYear}
                      </span>
                    </div>
                  );
                }

                return (
                  <tr key={row.key} className={isTotalRow ? "bg-slate-50/60" : ""}>
                    <th scope="row" className={`${labelClasses} ${isTotalRow ? "border-t border-slate-200" : ""}`}>
                      {labelContent}
                    </th>
                    {years.map((year) => {
                      if (row.type === "manual") {
                        const manualValue = manualByYear?.[year] ?? "";
                        return (
                          <td key={year} className="px-4 py-3">
                            {isReadOnly ? (
                              <span className="block text-right font-mono text-sm text-slate-700">
                                {formatCompactCurrency(manualValue)}
                              </span>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                value={manualValue}
                                onChange={handleManualChange(year)}
                                className={`${numberInputClasses} min-w-[10rem] text-right ${
                                  isReadOnly ? readOnlyClasses : ""
                                }`}
                                disabled={isReadOnly}
                              />
                            )}
                          </td>
                        );
                      }

                      if (row.type === "instrument") {
                        const totalValue = row.summary?.totalsByYear?.[year] ?? 0;
                        return (
                          <td key={year} className="px-4 py-3 text-right font-mono text-sm text-slate-700">
                            {formatCompactCurrency(totalValue)}
                          </td>
                        );
                      }

                      if (row.type === "total-existing") {
                        return (
                          <td key={year} className="px-4 py-3 text-right font-mono text-sm font-semibold text-slate-900">
                            {formatCompactCurrency(existingTotalsByYear?.[year] || 0)}
                          </td>
                        );
                      }

                      if (row.type === "new-interest") {
                        return (
                          <td key={year} className="px-4 py-3 text-right font-mono text-sm text-slate-700">
                            {formatCompactCurrency(interestByYear?.[year] || 0)}
                          </td>
                        );
                      }

                      if (row.type === "new-principal") {
                        return (
                          <td key={year} className="px-4 py-3 text-right font-mono text-sm text-slate-700">
                            {formatCompactCurrency(principalByYear?.[year] || 0)}
                          </td>
                        );
                      }

                      if (row.type === "new-total") {
                        const newDebtTotal =
                          (interestByYear?.[year] || 0) + (principalByYear?.[year] || 0);
                        return (
                          <td key={year} className="px-4 py-3 text-right font-mono text-sm font-semibold text-slate-900">
                            {formatCompactCurrency(newDebtTotal)}
                          </td>
                        );
                      }

                      if (row.type === "total-debt") {
                        const newDebtTotal =
                          (interestByYear?.[year] || 0) + (principalByYear?.[year] || 0);
                        const combinedTotal = (existingTotalsByYear?.[year] || 0) + newDebtTotal;
                        return (
                          <td key={year} className="px-4 py-3 text-right font-mono text-sm font-semibold text-slate-900">
                            {formatCompactCurrency(combinedTotal)}
                          </td>
                        );
                      }

                      if (row.type === "coverage") {
                        const coverage = coverageByYear.get(year);
                        let coverageClass = "px-4 py-3 text-right font-mono text-sm text-slate-700";
                        if (Number.isFinite(coverage) && coverage < targetCoverage) {
                          coverageClass = "px-4 py-3 text-right font-mono text-sm font-semibold text-red-600";
                        }
                        return (
                          <td key={year} className={coverageClass}>
                            {coverage !== null && coverage !== undefined
                              ? formatCoverageRatio(coverage, 2)
                              : "—"}
                          </td>
                        );
                      }

                      return (
                        <td key={year} className="px-4 py-3 text-right text-slate-500">
                          —
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right">
                      {row.type === "instrument" ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveInstrument(row.key)}
                          className="text-xs font-medium text-red-600 hover:text-red-700"
                          disabled={isReadOnly}
                        >
                          Remove
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-6 rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Existing debt totals roll into the operating budget and pro forma automatically. Manual overrides are
          added to any instrument-based schedules defined below.
        </div>

        <div className="mt-8">
          <h4 className="text-base font-semibold text-slate-900">Add Existing Debt Instrument</h4>
          <p className="mt-1 text-sm text-slate-600">
            Define an outstanding loan or bond to generate an interest and principal schedule within the
            projection window.
          </p>

          <form
            className="mt-4 grid grid-cols-1 gap-4 sm:[grid-template-columns:repeat(auto-fit,_minmax(340px,_1fr))]"
            onSubmit={handleAddInstrument}
          >
            <label className="text-sm font-medium text-slate-700">
              <span>Label</span>
              <input
                type="text"
                value={instrumentForm.label}
                onChange={handleInstrumentFieldChange("label")}
                className={`${numberInputClasses} mt-1 ${isReadOnly ? readOnlyClasses : ""}`}
                disabled={isReadOnly}
                placeholder="e.g., 2018 Revenue Bonds"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              <span>Financing Type</span>
              <select
                value={instrumentForm.financingType}
                onChange={handleInstrumentFieldChange("financingType")}
                className={`${numberInputClasses} mt-1 ${isReadOnly ? readOnlyClasses : ""}`}
                disabled={isReadOnly}
              >
                {FINANCING_TYPE_OPTIONS.filter((option) => option.value === "bond" || option.value === "srf").map(
                  (option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              <span>Outstanding Principal</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={instrumentForm.outstandingPrincipal}
                onChange={handleInstrumentFieldChange("outstandingPrincipal")}
                className={`${numberInputClasses} mt-1 ${isReadOnly ? readOnlyClasses : ""}`}
                disabled={isReadOnly}
                placeholder="1,000,000"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              <span>Interest Rate (%)</span>
              <input
                type="number"
                step="0.01"
                value={instrumentForm.interestRate}
                onChange={handleInstrumentFieldChange("interestRate")}
                className={`${numberInputClasses} mt-1 ${isReadOnly ? readOnlyClasses : ""}`}
                disabled={isReadOnly}
                placeholder="3.75"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              <span>Term Remaining (Years)</span>
              <input
                type="number"
                step="1"
                min="1"
                value={instrumentForm.termYears}
                onChange={handleInstrumentFieldChange("termYears")}
                className={`${numberInputClasses} mt-1 ${isReadOnly ? readOnlyClasses : ""}`}
                disabled={isReadOnly}
                placeholder="20"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              <span>First Payment FY</span>
              <input
                type="number"
                value={instrumentForm.firstPaymentYear}
                onChange={handleInstrumentFieldChange("firstPaymentYear")}
                className={`${numberInputClasses} mt-1 ${isReadOnly ? readOnlyClasses : ""}`}
                disabled={isReadOnly}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              <span>Interest-Only Years</span>
              <input
                type="number"
                step="1"
                min="0"
                value={instrumentForm.interestOnlyYears}
                onChange={handleInstrumentFieldChange("interestOnlyYears")}
                className={`${numberInputClasses} mt-1 ${isReadOnly ? readOnlyClasses : ""}`}
                disabled={isReadOnly || instrumentForm.financingType !== "srf"}
              />
            </label>

            <div className="flex items-end">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                disabled={isReadOnly}
              >
                Add Instrument
              </button>
            </div>
          </form>
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
                        onChange={(event) =>
                          onUpdateFundingSourceAssumption?.(
                            assumption.fundingSourceId,
                            "financingType",
                            event.target.value
                          )
                        }
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
                          onChange={(event) =>
                            onUpdateFundingSourceAssumption?.(
                              assumption.fundingSourceId,
                              "interestRate",
                              event.target.value
                            )
                          }
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
                          onChange={(event) =>
                            onUpdateFundingSourceAssumption?.(
                              assumption.fundingSourceId,
                              "termYears",
                              event.target.value
                            )
                          }

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
                          Rate {formatPercent(schedule.interestRate || 0, { decimals: 2 })} · Term {schedule.termYears} yrs

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
                      <p className="mt-3 text-xs text-slate-500">No bond issues fall within the projection horizon.</p>

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
                        Rate {formatPercent(loan.interestRate || 0, { decimals: 2 })} · Term {loan.termYears} yrs

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
                    {loan.loans?.length
                      ? `Each annual SRF loan accrues interest-only payments for ${loan.interestOnlyYears ?? 0} years before amortizing over ${loan.termYears} years${
                          loan.amortizationStartYear
                            ? `, beginning in FY ${loan.amortizationStartYear}.`
                            : "."
                        }`
                      : loan.amortizationStartYear
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
