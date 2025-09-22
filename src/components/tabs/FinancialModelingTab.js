import React, { useMemo } from "react";
import {
  PiggyBank,
  ShieldCheck,
  LineChart,
  TrendingUp,
  CircleDollarSign,
} from "lucide-react";
import {
  calculateFinancialForecast,
  FINANCING_TYPE_OPTIONS,
  formatCurrency,
  formatPercent,
} from "../../utils/financialModeling";

const SummaryCard = ({ title, value, description, icon: Icon, highlight = false }) => (
  <div
    className={`flex items-start justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${
      highlight ? "ring-1 ring-blue-500" : ""
    }`}
  >
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
      {description ? (
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      ) : null}
    </div>
    <div className="rounded-full bg-blue-50 p-2 text-blue-600">
      <Icon size={20} />
    </div>
  </div>
);

const getFinancingTypeLabel = (value) => {
  const option = FINANCING_TYPE_OPTIONS.find((item) => item.value === value);
  return option ? option.label : value;
};

const formatCoverageRatio = (value, decimals = 2) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "—";
  }
  return `${numeric.toFixed(decimals)}x`;
};

const numberInputClasses =
  "w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";

const readOnlyClasses = "bg-slate-100 text-slate-500 cursor-not-allowed";

const SectionTitle = ({ title, description }) => (
  <div className="mb-4">
    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
    {description ? (
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    ) : null}
  </div>
);

const buildFundingLabelMap = (fundingSources, assumptions) => {
  const labelMap = new Map();
  (fundingSources || []).forEach((source) => {
    if (source && source.id !== undefined && source.id !== null) {
      labelMap.set(String(source.id), source.name);
    }
  });
  (assumptions || []).forEach((assumption) => {
    if (!assumption) {
      return;
    }
    const key =
      assumption.fundingSourceId === null || assumption.fundingSourceId === undefined
        ? "unassigned"
        : String(assumption.fundingSourceId);
    if (assumption.sourceName) {
      labelMap.set(key, assumption.sourceName);
    }
  });
  return labelMap;
};

const FinancialModelingTab = ({
  projectTimelines,
  fundingSources,
  operatingBudget,
  onUpdateOperatingBudget,
  onExtendProjection,
  financialConfig,
  onUpdateFinancialConfig,
  fundingSourceAssumptions,
  onUpdateFundingSourceAssumption,
  isReadOnly,
}) => {
  const forecastResult = useMemo(
    () =>
      calculateFinancialForecast({
        projectTimelines,
        operatingBudget,
        financialConfig,
        fundingSourceAssumptions,
      }),
    [projectTimelines, operatingBudget, financialConfig, fundingSourceAssumptions]
  );

  const { forecast, totals, spendPlan, debtIssuedBySource } = forecastResult;

  const fundingLabelMap = useMemo(
    () => buildFundingLabelMap(fundingSources, fundingSourceAssumptions),
    [fundingSources, fundingSourceAssumptions]
  );

  const capitalBySource = useMemo(() => {
    const aggregate = new Map();
    Object.values(spendPlan || {}).forEach((entry) => {
      Object.entries(entry.byFundingSource || {}).forEach(([key, amount]) => {
        const current = aggregate.get(key) || 0;
        aggregate.set(key, current + (Number(amount) || 0));
      });
    });

    return Array.from(aggregate.entries())
      .map(([key, amount]) => {
        const assumption = (fundingSourceAssumptions || []).find((item) => {
          if (!item) {
            return false;
          }
          if (key === "unassigned") {
            return item.fundingSourceId === null || item.fundingSourceId === undefined;
          }
          return String(item.fundingSourceId) === key;
        });
        return {
          key,
          label: fundingLabelMap.get(key) || "Unassigned",
          financingType: assumption?.financingType || "cash",
          capital: amount,
          debtIssued: debtIssuedBySource?.[key] || 0,
        };
      })
      .sort((a, b) => b.capital - a.capital);
  }, [spendPlan, fundingSourceAssumptions, fundingLabelMap, debtIssuedBySource]);

  const summaryCards = [
    {
      title: "Capital Program Spend",
      value: formatCurrency(totals.totalCapitalSpend),
      description: "Total design, construction, and program investment within the horizon.",
      icon: CircleDollarSign,
    },
    {
      title: "New Debt Issuance",
      value: formatCurrency(totals.totalDebtIssued),
      description: "Principal assumed for bond or loan financing from the CIP portfolio.",
      icon: PiggyBank,
    },
    {
      title: "Ending Cash Balance",
      value: formatCurrency(totals.endingCashBalance),
      description: "Projected reserve balance after capital and debt service commitments.",
      icon: ShieldCheck,
    },
    {
      title: "Coverage & Rate Pressure",
      value:
        totals.minCoverageRatio !== null
          ? formatCoverageRatio(totals.minCoverageRatio, 2)
          : "No Debt",
      description:
        totals.maxAdditionalRateIncrease > 0
          ? `${formatPercent(totals.maxAdditionalRateIncrease, { decimals: 1 })} additional rate action may be required.`
          : "Coverage goals are met across the projection window.",
      icon: LineChart,
      highlight: totals.maxAdditionalRateIncrease > 0 ||
        (Number.isFinite(totals.minCoverageRatio) &&
          totals.minCoverageRatio < financialConfig.targetCoverageRatio),
    },
  ];

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

  const handleAssumptionChange = (fundingSourceId, field) => (event) => {
    if (isReadOnly) {
      return;
    }
    onUpdateFundingSourceAssumption(
      fundingSourceId,
      field,
      field === "financingType" ? event.target.value : event.target.value
    );
  };

  const targetCoverage = financialConfig?.targetCoverageRatio || 0;

  const budgetLineItems = [
    { key: "operatingRevenue", label: "Operating Revenue", min: 0 },
    { key: "rateIncreasePercent", label: "Rate Increase %", step: 0.1 },
    { key: "nonOperatingRevenue", label: "Non-Operating Revenue" },
    { key: "omExpenses", label: "O&M Expenses" },
    { key: "salaries", label: "Salaries" },
    { key: "adminExpenses", label: "Admin" },
    { key: "existingDebtService", label: "Existing Debt Service", min: 0 },
  ];

  const forecastLineItems = [
    {
      key: "operatingRevenue",
      label: "Operating Revenue",
      renderCell: (row) => formatCurrency(row.adjustedOperatingRevenue),
    },
    {
      key: "operatingExpenses",
      label: "Operating Expenses",
      renderCell: (row) => formatCurrency(row.totalOperatingExpenses),
    },
    {
      key: "nonOperatingRevenue",
      label: "Non-Operating Revenue",
      renderCell: (row) => formatCurrency(row.nonOperatingRevenue),
    },
    {
      key: "netBeforeDebt",
      label: "Net Before Debt",
      renderCell: (row) => formatCurrency(row.netRevenueBeforeDebt),
    },
    {
      key: "debtService",
      label: "Total Debt Service",
      renderCell: (row) => (
        <div className="flex flex-col items-end text-slate-900">
          <span>{formatCurrency(row.totalDebtService)}</span>
          {row.newDebtService > 0 ? (
            <span className="text-xs text-slate-500">
              New: {formatCurrency(row.newDebtService)}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "coverage",
      label: "Debt Service Coverage",
      renderCell: (row) => {
        if (row.coverageRatio === null) {
          return <span className="text-slate-400">—</span>;
        }
        const coverageClass =
          row.coverageRatio < targetCoverage ? "text-red-600" : "text-slate-900";
        return (
          <span className={`font-medium ${coverageClass}`}>
            {formatCoverageRatio(row.coverageRatio, 2)}
          </span>
        );
      },
    },
    {
      key: "cipSpend",
      label: "CIP Spend",
      renderCell: (row) => formatCurrency(row.cipSpend),
    },
    {
      key: "cashFundedCapex",
      label: "Cash-Funded CIP",
      renderCell: (row) => formatCurrency(row.cashFundedCapex),
    },
    {
      key: "endingCash",
      label: "Ending Cash Balance",
      renderCell: (row) => (
        <span className="font-medium text-slate-900">
          {formatCurrency(row.endingCashBalance)}
        </span>
      ),
    },
    {
      key: "rateIncreaseNeed",
      label: "Rate Increase Need",
      renderCell: (row) => {
        const rateNeeded = row.additionalRateIncreaseNeeded || 0;
        if (rateNeeded > 0) {
          return (
            <span className="text-amber-600">
              {formatPercent(rateNeeded, { decimals: 1 })}
            </span>
          );
        }
        return <span className="text-slate-500">Met</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">
              Financial Modeling & Utility Pro Forma
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Use the live CIP schedule, funding sources, and utility budget to forecast cash flow,
              debt service coverage, and rate strategies for capital delivery. Update assumptions
              below to test rate increases, new debt, and pay-go funding mixes.
            </p>
          </div>
          <div className="text-sm text-slate-600">
            Projection Window: {financialConfig.startYear} –
            {" "}
            {financialConfig.startYear + financialConfig.projectionYears - 1}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            title="Projection Settings"
            description="Anchor the analysis with fiscal year assumptions and policy targets."
          />
          <div className="grid gap-4 sm:grid-cols-2">
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
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            title="Funding Mix Snapshot"
            description="Understand how the CIP portfolio is financed across sources and instruments."
          />
          <div className="space-y-4">
            {capitalBySource.length === 0 ? (
              <p className="text-sm text-slate-500">
                Assign funding sources to projects to see the capital delivery mix and expected debt
                issuances.
              </p>
            ) : (
              capitalBySource.map((item) => (
                <div
                  key={item.key}
                  className="flex items-start justify-between rounded-md border border-slate-100 bg-slate-50 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-500">
                      {getFinancingTypeLabel(item.financingType)}
                      {item.debtIssued > 0
                        ? ` • ${formatCurrency(item.debtIssued)} financed`
                        : ""}
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {formatCurrency(item.capital)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle
            title="Operating Budget Baseline"
            description="Enter the adopted budget by fiscal year. Rate adjustments apply to operating revenue only."
          />
          <button
            type="button"
            onClick={onExtendProjection}
            disabled={isReadOnly}
            className={`inline-flex items-center gap-2 rounded-md border border-blue-500 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 ${
              isReadOnly ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            <TrendingUp size={16} /> Extend Horizon
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Line Item</th>
                {operatingBudget.map((row) => (
                  <th
                    key={row.year}
                    className="px-3 py-2 text-right font-medium text-slate-600"
                  >
                    FY {row.year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {budgetLineItems.map((item) => (
                <tr key={item.key} className="odd:bg-white even:bg-slate-50/40">
                  <td className="px-3 py-2 font-medium text-slate-700">{item.label}</td>
                  {operatingBudget.map((row) => {
                    const rawValue = row?.[item.key];
                    const displayValue =
                      rawValue === undefined || rawValue === null || rawValue === ""
                        ? 0
                        : rawValue;
                    return (
                      <td key={`${item.key}-${row.year}`} className="px-3 py-2">
                        <input
                          type="number"
                          step={item.step ?? undefined}
                          value={displayValue}
                          onChange={handleBudgetChange(row.year, item.key)}
                          className={`${numberInputClasses} text-right ${
                            isReadOnly ? readOnlyClasses : ""
                          }`}
                          disabled={isReadOnly}
                          min={item.min ?? undefined}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <SectionTitle
          title="Funding Source Financing Assumptions"
          description="Define how each funding source is deployed when capital is spent."
        />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Funding Source</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Financing Type</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Interest Rate %</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Term (Years)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fundingSourceAssumptions.map((assumption) => {
                const disableTerms =
                  assumption.financingType === "cash" || assumption.financingType === "grant";
                return (
                  <tr key={assumption.fundingSourceId ?? "unassigned"}>
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {assumption.sourceName || "Unassigned"}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={assumption.financingType || "cash"}
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
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={assumption.interestRate ?? 0}
                        onChange={handleAssumptionChange(assumption.fundingSourceId, "interestRate")}
                        className={`${numberInputClasses} ${
                          isReadOnly || disableTerms ? readOnlyClasses : ""
                        }`}
                        disabled={isReadOnly || disableTerms}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={assumption.termYears ?? 0}
                        onChange={handleAssumptionChange(assumption.fundingSourceId, "termYears")}
                        className={`${numberInputClasses} ${
                          isReadOnly || disableTerms ? readOnlyClasses : ""
                        }`}
                        disabled={isReadOnly || disableTerms}
                        min={0}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <SectionTitle
          title="Projection Results"
          description="Annual pro forma cash flow with coverage, capital spending, and cash position."
        />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Line Item</th>
                {forecast.map((row) => (
                  <th
                    key={row.year}
                    className="px-3 py-2 text-right font-medium text-slate-600"
                  >
                    FY {row.year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {forecastLineItems.map((item) => (
                <tr key={item.key} className="odd:bg-white even:bg-slate-50/40">
                  <td className="px-3 py-2 font-medium text-slate-700">{item.label}</td>
                  {forecast.map((row) => (
                    <td
                      key={`${item.key}-${row.year}`}
                      className="px-3 py-2 text-right align-top"
                    >
                      {item.renderCell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinancialModelingTab;

