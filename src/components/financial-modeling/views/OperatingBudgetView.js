import React from "react";
import {
  formatCurrency,
  formatPercent,
  normalizeBudgetRow,
} from "../../../utils/financialModeling";

const numberInputClasses =
  "w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";
const readOnlyClasses = "bg-slate-100 text-slate-500 cursor-not-allowed";

const OperatingBudgetView = ({
  years = [],
  alignedBudget = [],
  financialConfig,
  onUpdateFinancialConfig,
  onUpdateOperatingBudget,
  budgetEscalations = {},
  onUpdateBudgetEscalation,
  onAddCustomLineItem,
  activeUtilityLabel,
  isReadOnly,
}) => {
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
    } else if (field === "targetCoverageRatio") {
      parsedValue = Number(rawValue);
      if (!Number.isFinite(parsedValue)) {
        parsedValue = financialConfig.targetCoverageRatio || 1;
      }
      parsedValue = Math.max(0, parsedValue);
    }

    onUpdateFinancialConfig({ [field]: parsedValue });
  };

  const handleBudgetChange = (year, field) => (event) => {
    if (isReadOnly) {
      return;
    }
    onUpdateOperatingBudget(year, field, event.target.value);
  };

  const handleEscalationChange = (field) => (event) => {
    if (isReadOnly) {
      return;
    }
    const numeric = Number(event.target.value);
    onUpdateBudgetEscalation?.(field, Number.isFinite(numeric) ? numeric : 0);
  };

  const [newRevenueLabel, setNewRevenueLabel] = React.useState("");
  const [newRevenueType, setNewRevenueType] = React.useState("operating");
  const [newExpenseLabel, setNewExpenseLabel] = React.useState("");

  const handleLineItemChange = React.useCallback(
    (year, categoryKey, id) => (event) => {
      if (isReadOnly) {
        return;
      }
      if (!id) {
        return;
      }
      onUpdateOperatingBudget?.(year, { category: categoryKey, id }, event.target.value);
    },
    [isReadOnly, onUpdateOperatingBudget]
  );

  const handleAddRevenueLine = React.useCallback(() => {
    if (isReadOnly) {
      return;
    }
    const trimmed = newRevenueLabel.trim();
    if (!trimmed) {
      return;
    }
    onAddCustomLineItem?.("revenue", {
      label: trimmed,
      revenueType: newRevenueType,
    });
    setNewRevenueLabel("");
  }, [isReadOnly, newRevenueLabel, newRevenueType, onAddCustomLineItem]);

  const handleAddExpenseLine = React.useCallback(() => {
    if (isReadOnly) {
      return;
    }
    const trimmed = newExpenseLabel.trim();
    if (!trimmed) {
      return;
    }
    onAddCustomLineItem?.("expense", { label: trimmed });
    setNewExpenseLabel("");
  }, [isReadOnly, newExpenseLabel, onAddCustomLineItem]);

  const getLineItemAmount = React.useCallback((row, categoryKey, id) => {
    if (!row || !id) {
      return 0;
    }

    const items =
      categoryKey === "expense" ? row.expenseLineItems : row.revenueLineItems;
    if (!Array.isArray(items)) {
      return 0;
    }

    const match = items.find((item) => item?.id === id);
    const amount = Number(match?.amount);
    return Number.isFinite(amount) ? amount : 0;
  }, []);

  const baseYear = years?.[0];
  const outYears = years.slice(1);
  const baseYearNumber = Number(baseYear);
  const hasBaseYear = Number.isFinite(baseYearNumber);
  const baseYearLabel = hasBaseYear ? `FY ${baseYearNumber}` : "Current FY";

  const budgetByYear = React.useMemo(() => {
    const map = new Map();
    (alignedBudget || []).forEach((row) => {
      if (row && Number.isFinite(row.year)) {
        map.set(Number(row.year), normalizeBudgetRow(row));
      }
    });
    return map;
  }, [alignedBudget]);

  const baseYearRow = hasBaseYear
    ? budgetByYear.get(baseYearNumber) || normalizeBudgetRow({})
    : normalizeBudgetRow({});
  const revenueLineItems = baseYearRow.revenueLineItems || [];
  const operatingRevenueItems = revenueLineItems.filter(
    (item) => item?.revenueType !== "nonOperating"
  );
  const nonOperatingRevenueItems = revenueLineItems.filter(
    (item) => item?.revenueType === "nonOperating"
  );
  const expenseLineItems = baseYearRow.expenseLineItems || [];
  const totalColumnCount = outYears.length + 4;

  const getTotalsForRow = (row) => ({
    operatingRevenue: Number(row?.operatingRevenue) || 0,
    nonOperatingRevenue: Number(row?.nonOperatingRevenue) || 0,
    totalOperatingExpenses: Number(row?.totalOperatingExpenses) || 0,
  });

  const netOperatingIncome = (row) => {
    const totals = getTotalsForRow(row);
    return totals.operatingRevenue + totals.nonOperatingRevenue - totals.totalOperatingExpenses;
  };

  const renderLineRow = (line, categoryKey) => {
    const baseValue = getLineItemAmount(baseYearRow, categoryKey, line.id);
    const escalationValue = budgetEscalations?.[line.id] ?? 0;

    return (
      <tr key={`${categoryKey}-${line.id}`}>
        <th scope="row" className="px-4 py-3 text-left font-medium text-slate-900">
          <div className="flex items-center gap-2">
            <span>{line.label}</span>
            {line.isCustom ? (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase text-slate-600">
                Custom
              </span>
            ) : null}
          </div>
        </th>
        <td className="px-4 py-3 text-slate-500">{line.description || ""}</td>
        <td className="px-4 py-3">
          {hasBaseYear ? (
            isReadOnly ? (
              <span className="block text-right text-slate-700">
                {formatCurrency(baseValue)}
              </span>
            ) : (
              <input
                type="number"
                step={1000}
                value={baseValue || 0}
                onChange={handleLineItemChange(baseYearNumber, categoryKey, line.id)}
                className={`${numberInputClasses} min-w-[12rem] text-right ${isReadOnly ? readOnlyClasses : ""}`}
                disabled={isReadOnly}
              />
            )
          ) : (
            <span className="block text-right text-slate-400">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isReadOnly ? (
            <span className="block text-right text-slate-700">
              {formatPercent(escalationValue, { decimals: 1 })}
            </span>
          ) : (
            <div className="flex min-w-[9rem] items-center justify-end gap-2">
              <input
                type="number"
                step={0.1}
                value={escalationValue}
                onChange={handleEscalationChange(line.id)}
                className={`${numberInputClasses} w-24 text-right ${isReadOnly ? readOnlyClasses : ""}`}
                disabled={isReadOnly}
              />
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">%/yr</span>
            </div>
          )}
        </td>
        {outYears.map((year) => {
          const numericYear = Number(year);
          const row = budgetByYear.get(numericYear);
          const value = getLineItemAmount(row, categoryKey, line.id);
          return (
            <td key={year} className="px-4 py-3 text-right text-slate-700">
              {formatCurrency(value, { compact: true, maximumFractionDigits: 1 })}
            </td>
          );
        })}
      </tr>
    );
  };

  const summaryRows = [
    {
      key: "totalOperatingRevenue",
      label: "Total Operating Revenues",
      description: "Sum of billed operating revenues.",
      compute: (row) => getTotalsForRow(row).operatingRevenue,
      highlight: false,
    },
    {
      key: "totalNonOperatingRevenue",
      label: "Total Non-Operating Revenues",
      description: "Interest income and other non-operating receipts.",
      compute: (row) => getTotalsForRow(row).nonOperatingRevenue,
      highlight: false,
    },
    {
      key: "totalRevenues",
      label: "Total Revenues",
      description: "Operating and non-operating revenues combined.",
      compute: (row) =>
        getTotalsForRow(row).operatingRevenue + getTotalsForRow(row).nonOperatingRevenue,
      highlight: true,
    },
    {
      key: "totalOperatingExpenses",
      label: "Total Operating Expenses",
      description: "All operating expense categories combined.",
      compute: (row) => getTotalsForRow(row).totalOperatingExpenses,
      highlight: true,
    },
    {
      key: "netOperatingIncome",
      label: "Net Operating Income",
      description: "Total revenues less operating expenses.",
      compute: (row) => netOperatingIncome(row),
      highlight: true,
    },
  ];

  const renderSummaryRow = (summary) => {
    const baseValue = summary.compute(baseYearRow);

    return (
      <tr key={summary.key} className="bg-slate-50">
        <th
          scope="row"
          className={`px-4 py-3 text-left ${
            summary.highlight ? "font-semibold text-slate-900" : "font-medium text-slate-900"
          }`}
        >
          {summary.label}
        </th>
        <td className="px-4 py-3 text-slate-500">{summary.description}</td>
        <td className="px-4 py-3 text-right text-slate-900">
          {hasBaseYear ? formatCurrency(baseValue) : "—"}
        </td>
        <td className="px-4 py-3 text-center text-slate-400">—</td>
        {outYears.map((year) => {
          const numericYear = Number(year);
          const row = budgetByYear.get(numericYear);
          const value = summary.compute(row || {});
          return (
            <td key={year} className="px-4 py-3 text-right text-slate-700">
              {formatCurrency(value, { compact: true, maximumFractionDigits: 1 })}
            </td>
          );
        })}
      </tr>
    );
  };

  const renderRateIncreaseRow = () => {
    const baseValue = Number(baseYearRow?.rateIncreasePercent) || 0;

    return (
      <tr key="rateIncreasePercent">
        <th scope="row" className="px-4 py-3 text-left font-medium text-slate-900">
          Planned Rate Adjustment
        </th>
        <td className="px-4 py-3 text-slate-500">
          Enter approved or proposed rate action for the fiscal year.
        </td>
        <td className="px-4 py-3">
          {hasBaseYear ? (
            isReadOnly ? (
              <span className="block text-right text-slate-700">
                {formatPercent(baseValue, { decimals: 1 })}
              </span>
            ) : (
              <input
                type="number"
                step={0.1}
                value={baseValue}
                onChange={handleBudgetChange(baseYearNumber, "rateIncreasePercent")}
                className={`${numberInputClasses} min-w-[8rem] text-right ${
                  isReadOnly ? readOnlyClasses : ""
                }`}
                disabled={isReadOnly}
              />
            )
          ) : (
            <span className="block text-right text-slate-400">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-center text-slate-400">—</td>
        {outYears.map((year) => {
          const numericYear = Number(year);
          const row = budgetByYear.get(numericYear);
          const value = Number(row?.rateIncreasePercent) || 0;
          return isReadOnly ? (
            <td key={year} className="px-4 py-3 text-right text-slate-700">
              {formatPercent(value, { decimals: 1 })}
            </td>
          ) : (
            <td key={year} className="px-4 py-3">
              <input
                type="number"
                step={0.1}
                value={value}
                onChange={handleBudgetChange(numericYear, "rateIncreasePercent")}
                className={`${numberInputClasses} min-w-[8rem] text-right ${
                  isReadOnly ? readOnlyClasses : ""
                }`}
                disabled={isReadOnly}
              />
            </td>
          );
        })}
      </tr>
    );
  };

  const renderExistingDebtRow = () => (
    <tr key="existingDebtService">
      <th scope="row" className="px-4 py-3 text-left font-medium text-slate-900">
        Existing Debt Service
      </th>
      <td className="px-4 py-3 text-slate-500">
        Legacy principal and interest scheduled prior to new CIP financing.
      </td>
      <td className="px-4 py-3 text-right text-slate-700">
        {formatCurrency(Number(baseYearRow?.existingDebtService) || 0)}
      </td>
      <td className="px-4 py-3 text-center text-slate-400">—</td>
      {outYears.map((year) => {
        const numericYear = Number(year);
        const row = budgetByYear.get(numericYear);
        const value = Number(row?.existingDebtService) || 0;
        return (
          <td key={year} className="px-4 py-3 text-right text-slate-700">
            {formatCurrency(value, { compact: true, maximumFractionDigits: 1 })}
          </td>
        );
      })}
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Projection Settings</h3>
          <p className="mt-1 text-sm text-slate-600">
            Anchor the financial model with your fiscal year horizon, cash reserves, and policy targets.
            These settings drive the pro forma and debt service coverage analysis.
          </p>
          {activeUtilityLabel ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-blue-600">
              Configuring: {activeUtilityLabel}
            </p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        {!isReadOnly ? (
          <div className="mt-4 text-right">
            <button
              type="button"
              onClick={() =>
                onUpdateFinancialConfig({
                  projectionYears: (financialConfig.projectionYears || 0) + 1,
                })
              }
              className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              Extend Projection Horizon
            </button>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Operating Budget Inputs</h3>
        <p className="mt-1 text-sm text-slate-600">
          Enter the annual budget that feeds the pro forma statement. Figures can be updated at any time to
          reflect adopted budgets or planned rate scenarios.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Line Item</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Notes</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">{baseYearLabel}</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">
                  Escalation (%/yr)
                </th>
                {outYears.map((year) => (
                  <th key={year} className="px-4 py-3 text-right font-semibold text-slate-600">
                    FY {year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <th
                  colSpan={totalColumnCount}
                  className="bg-slate-100 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Operating Revenues
                </th>
              </tr>
              {operatingRevenueItems.map((line) => renderLineRow(line, "revenue"))}
              {!isReadOnly && onAddCustomLineItem ? (
                <tr>
                  <td colSpan={2} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={newRevenueLabel}
                        onChange={(event) => setNewRevenueLabel(event.target.value)}
                        placeholder="Add custom revenue line"
                        className={`${numberInputClasses} min-w-[14rem]`}
                      />
                      <select
                        value={newRevenueType}
                        onChange={(event) => setNewRevenueType(event.target.value)}
                        className={`${numberInputClasses} w-48`}
                      >
                        <option value="operating">Operating</option>
                        <option value="nonOperating">Non-Operating</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAddRevenueLine}
                        className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                        disabled={!newRevenueLabel.trim()}
                      >
                        Add Revenue Line
                      </button>
                    </div>
                  </td>
                  <td
                    colSpan={totalColumnCount - 2}
                    className="px-4 py-3 text-right text-slate-400"
                  >
                    New revenue lines escalate at 0% until updated.
                  </td>
                </tr>
              ) : null}

              <tr>
                <th
                  colSpan={totalColumnCount}
                  className="bg-slate-100 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Non-Operating Revenues
                </th>
              </tr>
              {nonOperatingRevenueItems.map((line) => renderLineRow(line, "revenue"))}

              <tr>
                <th
                  colSpan={totalColumnCount}
                  className="bg-slate-100 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Operating Expenses
                </th>
              </tr>
              {expenseLineItems.map((line) => renderLineRow(line, "expense"))}
              {!isReadOnly && onAddCustomLineItem ? (
                <tr>
                  <td colSpan={2} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={newExpenseLabel}
                        onChange={(event) => setNewExpenseLabel(event.target.value)}
                        placeholder="Add custom expense line"
                        className={`${numberInputClasses} min-w-[14rem]`}
                      />
                      <button
                        type="button"
                        onClick={handleAddExpenseLine}
                        className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                        disabled={!newExpenseLabel.trim()}
                      >
                        Add Expense Line
                      </button>
                    </div>
                  </td>
                  <td
                    colSpan={totalColumnCount - 2}
                    className="px-4 py-3 text-right text-slate-400"
                  >
                    Custom expense lines escalate at 0% until updated.
                  </td>
                </tr>
              ) : null}

              {summaryRows.map((summary) => renderSummaryRow(summary))}
              {renderRateIncreaseRow()}
              {renderExistingDebtRow()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OperatingBudgetView;
