import React from "react";
import { formatCurrency, formatPercent } from "../../../utils/financialModeling";

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

  const budgetLineItems = [
    {
      key: "operatingRevenue",
      label: "Operating Revenue",
      description: "Base rate revenue before adjustments.",
      supportsEscalation: true,
    },
    {
      key: "rateIncreasePercent",
      label: "Planned Rate Increase",
      description: "Enter approved or proposed rate action for the fiscal year.",
      isPercent: true,
      step: 0.1,
      supportsEscalation: false,
    },
    {
      key: "nonOperatingRevenue",
      label: "Non-Operating Revenue",
      description: "Investment income, connection fees, and other sources.",
      supportsEscalation: true,
    },
    {
      key: "omExpenses",
      label: "Operations & Maintenance",
      description: "Chemical, power, and routine maintenance costs.",
      supportsEscalation: true,
    },
    {
      key: "salaries",
      label: "Salaries & Wages",
      description: "Personnel costs tied to utility operations.",
      supportsEscalation: true,
    },
    {
      key: "adminExpenses",
      label: "Administration",
      description: "General & administrative overhead allocations.",
      supportsEscalation: true,
    },
    {
      key: "existingDebtService",
      label: "Existing Debt Service",
      description: "Legacy principal and interest scheduled prior to new CIP financing.",
      supportsEscalation: true,
    },
  ];

  const baseYear = years?.[0];
  const outYears = years.slice(1);
  const baseYearNumber = Number(baseYear);
  const hasBaseYear = Number.isFinite(baseYearNumber);
  const baseYearLabel = hasBaseYear ? `FY ${baseYearNumber}` : "Current FY";

  const budgetByYear = React.useMemo(() => {
    const map = new Map();
    (alignedBudget || []).forEach((row) => {
      if (row && Number.isFinite(row.year)) {
        map.set(Number(row.year), row);
      }
    });
    return map;
  }, [alignedBudget]);

  const baseYearRow = hasBaseYear ? budgetByYear.get(baseYearNumber) || {} : {};
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
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Escalation</th>
                {outYears.map((year) => (
                  <th key={year} className="px-4 py-3 text-right font-semibold text-slate-600">
                    FY {year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {budgetLineItems.map((line) => {
                const supportsEscalation = line.supportsEscalation !== false;
                const baseValue = baseYearRow[line.key] ?? 0;
                const escalationValue = budgetEscalations?.[line.key] ?? 0;
                const formatDisplay = (value) =>
                  line.isPercent
                    ? formatPercent(value, { decimals: 1 })
                    : formatCurrency(value);

                return (
                  <tr key={line.key}>
                    <th scope="row" className="px-4 py-3 text-left font-medium text-slate-900">
                      {line.label}
                    </th>
                    <td className="px-4 py-3 text-slate-500">{line.description}</td>
                    <td className="px-4 py-3">
                      {hasBaseYear ? (
                        isReadOnly ? (
                          <span className="block text-right text-slate-700">
                            {formatDisplay(baseValue)}
                          </span>
                        ) : (
                          <input
                            type="number"
                            step={line.step ?? (line.isPercent ? 0.01 : 1000)}
                            value={line.isPercent ? baseValue : baseValue || 0}
                            onChange={handleBudgetChange(baseYearNumber, line.key)}
                            className={`${numberInputClasses} text-right ${isReadOnly ? readOnlyClasses : ""}`}
                            disabled={isReadOnly || !hasBaseYear}
                          />
                        )
                      ) : (
                        <span className="block text-right text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {supportsEscalation ? (
                        isReadOnly ? (
                          <span className="block text-right text-slate-700">
                            {formatPercent(escalationValue, { decimals: 1 })}
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              step={0.1}
                              value={escalationValue}
                              onChange={handleEscalationChange(line.key)}
                              className={`${numberInputClasses} w-24 text-right ${isReadOnly ? readOnlyClasses : ""}`}
                              disabled={isReadOnly}
                            />
                            <span className="text-xs font-medium text-slate-500">% / yr</span>
                          </div>
                        )
                      ) : (
                        <span className="block text-center text-slate-400">—</span>
                      )}
                    </td>
                    {outYears.map((year) => {
                      const numericYear = Number(year);
                      const row = budgetByYear.get(numericYear) || {};
                      const value = row[line.key] ?? 0;

                      if (!supportsEscalation && !isReadOnly) {
                        return (
                          <td key={year} className="px-4 py-3">
                            <input
                              type="number"
                              step={line.step ?? (line.isPercent ? 0.01 : 1000)}
                              value={line.isPercent ? value : value || 0}
                              onChange={handleBudgetChange(numericYear, line.key)}
                              className={`${numberInputClasses} text-right ${isReadOnly ? readOnlyClasses : ""}`}
                              disabled={isReadOnly}
                            />
                          </td>
                        );
                      }

                      return (
                        <td key={year} className="px-4 py-3 text-right text-slate-700">
                          {formatDisplay(value)}
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

export default OperatingBudgetView;
