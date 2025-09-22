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
                <th className="px-3 py-2 text-left font-medium text-slate-600">Year</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Operating Revenue</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Rate Increase %</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Non-Operating Revenue</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">O&amp;M Expenses</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Salaries</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Admin</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Existing Debt Service</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {operatingBudget.map((row) => (
                <tr key={row.year} className="odd:bg-white even:bg-slate-50/40">
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">
                    FY {row.year}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={row.operatingRevenue}
                      onChange={handleBudgetChange(row.year, "operatingRevenue")}
                      className={`${numberInputClasses} ${isReadOnly ? readOnlyClasses : ""}`}
                      disabled={isReadOnly}
                      min={0}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.1"
                      value={row.rateIncreasePercent || 0}
                      onChange={handleBudgetChange(row.year, "rateIncreasePercent")}
                      className={`${numberInputClasses} ${isReadOnly ? readOnlyClasses : ""}`}
                      disabled={isReadOnly}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={row.nonOperatingRevenue}
                      onChange={handleBudgetChange(row.year, "nonOperatingRevenue")}
                      className={`${numberInputClasses} ${isReadOnly ? readOnlyClasses : ""}`}
                      disabled={isReadOnly}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={row.omExpenses}
                      onChange={handleBudgetChange(row.year, "omExpenses")}
                      className={`${numberInputClasses} ${isReadOnly ? readOnlyClasses : ""}`}
                      disabled={isReadOnly}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={row.salaries}
                      onChange={handleBudgetChange(row.year, "salaries")}
                      className={`${numberInputClasses} ${isReadOnly ? readOnlyClasses : ""}`}
                      disabled={isReadOnly}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={row.adminExpenses}
                      onChange={handleBudgetChange(row.year, "adminExpenses")}
                      className={`${numberInputClasses} ${isReadOnly ? readOnlyClasses : ""}`}
                      disabled={isReadOnly}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={row.existingDebtService}
                      onChange={handleBudgetChange(row.year, "existingDebtService")}
                      className={`${numberInputClasses} ${isReadOnly ? readOnlyClasses : ""}`}
                      disabled={isReadOnly}
                    />
                  </td>
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
                <th className="px-3 py-2 text-left font-medium text-slate-600">Year</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Operating Revenue</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Operating Expenses</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Non-Operating Revenue</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Net Before Debt</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Debt Service</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Coverage</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">CIP Spend</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Cash-Funded CIP</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Ending Cash</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Rate Increase Need</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {forecast.map((row) => {
                const coverageClass =
                  row.coverageRatio !== null && row.coverageRatio < targetCoverage
                    ? "text-red-600"
                    : "text-slate-900";
                const rateNeeded = row.additionalRateIncreaseNeeded || 0;
                return (
                  <tr key={row.year} className="odd:bg-white even:bg-slate-50/40">
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">
                      FY {row.year}
                    </td>
                    <td className="px-3 py-2">{formatCurrency(row.adjustedOperatingRevenue)}</td>
                    <td className="px-3 py-2">{formatCurrency(row.totalOperatingExpenses)}</td>
                    <td className="px-3 py-2">{formatCurrency(row.nonOperatingRevenue)}</td>
                    <td className="px-3 py-2">{formatCurrency(row.netRevenueBeforeDebt)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col text-slate-900">
                        <span>{formatCurrency(row.totalDebtService)}</span>
                        {row.newDebtService > 0 ? (
                          <span className="text-xs text-slate-500">
                            New: {formatCurrency(row.newDebtService)}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className={`px-3 py-2 font-medium ${coverageClass}`}>
                      {row.coverageRatio !== null
                        ? formatCoverageRatio(row.coverageRatio, 2)
                        : "—"}
                    </td>
                    <td className="px-3 py-2">{formatCurrency(row.cipSpend)}</td>
                    <td className="px-3 py-2">{formatCurrency(row.cashFundedCapex)}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {formatCurrency(row.endingCashBalance)}
                    </td>
                    <td className="px-3 py-2">
                      {rateNeeded > 0
                        ? formatPercent(rateNeeded, { decimals: 1 })
                        : "Met"}
                    </td>
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

export default FinancialModelingTab;

