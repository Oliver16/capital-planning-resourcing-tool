import React, { useMemo, useState } from "react";
import {
  calculateFinancialForecast,
  ensureBudgetYears,
  buildProjectSpendBreakdown,
  calculateExistingDebtSchedule,

} from "../../utils/financialModeling";
import CipSummaryView from "./views/CipSummaryView";
import OperatingBudgetView from "./views/OperatingBudgetView";
import ProFormaView from "./views/ProFormaView";
import DebtServiceView from "./views/DebtServiceView";
import SettingsView from "./views/SettingsView";
import { ClipboardList, FileSpreadsheet, LineChart, PiggyBank, Settings2 } from "lucide-react";

const MODULE_VIEWS = [
  {
    id: "cip",
    label: "CIP Plan",
    description: "Summaries of project schedules, funding, and annual spend.",
    icon: ClipboardList,
  },
  {
    id: "budget",
    label: "Operating Budget",
    description: "Enter revenue, expense, and existing debt service assumptions.",
    icon: FileSpreadsheet,
  },
  {
    id: "proForma",
    label: "Pro Forma",
    description: "Utility cash flow, coverage, and reserve projections.",
    icon: LineChart,
  },
  {
    id: "debt",
    label: "Debt Service",
    description: "Financing assumptions and new debt schedules.",
    icon: PiggyBank,
  },
  {
    id: "settings",
    label: "Settings",
    description: "Manage utility mapping and model-wide assumptions.",
    icon: Settings2,
  },
];

const buildFundingLabelMap = (fundingSources = [], assumptions = []) => {
  const map = new Map();
  map.set("unassigned", "Unassigned");

  fundingSources.forEach((source) => {
    if (source && source.id !== undefined && source.id !== null) {
      map.set(String(source.id), source.name);
    }
  });

  assumptions.forEach((assumption) => {
    if (!assumption) {
      return;
    }
    const key =
      assumption.fundingSourceId === null || assumption.fundingSourceId === undefined
        ? "unassigned"
        : String(assumption.fundingSourceId);
    if (assumption.sourceName) {
      map.set(key, assumption.sourceName);
    }
  });

  return map;
};

const buildProjectTypeMap = (projectTypes = []) => {
  const map = new Map();
  projectTypes.forEach((type) => {
    if (type && type.id !== undefined && type.id !== null) {
      map.set(type.id, type.name);
    }
  });
  return map;
};

const FinancialModelingModule = ({
  projectTimelines,
  projectTypes,
  fundingSources,
  operatingBudget,
  onUpdateOperatingBudget,
  financialConfig,
  onUpdateFinancialConfig,
  fundingSourceAssumptions,
  onUpdateFundingSourceAssumption,
  isReadOnly,
  activeUtility,
  onChangeUtility,
  utilityOptions = [],
  projectTypeUtilities = {},
  onUpdateProjectTypeUtility,
  budgetEscalations = {},
  onUpdateBudgetEscalation,
  existingDebtManualTotals = {},
  existingDebtInstruments = [],
  onUpdateExistingDebtManual,
  onAddExistingDebtInstrument,
  onRemoveExistingDebtInstrument,

}) => {
  const [activeView, setActiveView] = useState("cip");

  const activeUtilityOption = useMemo(
    () => utilityOptions.find((option) => option.value === activeUtility),
    [utilityOptions, activeUtility]
  );

  const filteredProjectTimelines = useMemo(() => {
    if (!Array.isArray(projectTimelines)) {
      return [];
    }

    return projectTimelines.filter((project) => {
      const typeKey =
        project?.projectTypeId === undefined || project?.projectTypeId === null
          ? null
          : String(project.projectTypeId);
      if (!typeKey) {
        return false;
      }
      const assignedUtility = projectTypeUtilities[typeKey];
      return assignedUtility === activeUtility;
    });
  }, [projectTimelines, projectTypeUtilities, activeUtility]);

  const forecastResult = useMemo(
    () =>
      calculateFinancialForecast({
        projectTimelines: filteredProjectTimelines,
        operatingBudget,
        financialConfig,
        fundingSourceAssumptions,
      }),
    [
      filteredProjectTimelines,
      operatingBudget,
      financialConfig,
      fundingSourceAssumptions,
    ]
  );

  const alignedBudget = useMemo(
    () => ensureBudgetYears(operatingBudget, financialConfig.startYear, financialConfig.projectionYears),
    [operatingBudget, financialConfig.startYear, financialConfig.projectionYears]
  );

  const projectSpendBreakdown = useMemo(
    () => buildProjectSpendBreakdown(filteredProjectTimelines),
    [filteredProjectTimelines]
  );

  const projectTypeSummaries = useMemo(() => {
    const projectCounts = new Map();

    (projectTimelines || []).forEach((project) => {
      const typeKey =
        project?.projectTypeId === undefined || project?.projectTypeId === null
          ? null
          : String(project.projectTypeId);
      if (!typeKey) {
        return;
      }
      projectCounts.set(typeKey, (projectCounts.get(typeKey) || 0) + 1);
    });

    return (projectTypes || [])
      .map((type) => {
        if (type?.id === undefined || type?.id === null) {
          return null;
        }

        const key = String(type.id);
        return {
          id: type.id,
          name: type.name,
          projectCount: projectCounts.get(key) || 0,
          assignedUtility: projectTypeUtilities[key] || null,
        };
      })
      .filter(Boolean);
  }, [projectTimelines, projectTypes, projectTypeUtilities]);

  const years = useMemo(() => {
    const start = Number(financialConfig.startYear) || new Date().getFullYear();
    const totalYears = Math.max(1, Number(financialConfig.projectionYears) || 1);
    return Array.from({ length: totalYears }, (_, index) => start + index);
  }, [financialConfig.startYear, financialConfig.projectionYears]);

  const fundingLabelMap = useMemo(
    () => buildFundingLabelMap(fundingSources, fundingSourceAssumptions),
    [fundingSources, fundingSourceAssumptions]
  );

  const projectTypeMap = useMemo(
    () => buildProjectTypeMap(projectTypes),
    [projectTypes]
  );

  const existingDebtSchedule = useMemo(
    () =>
      calculateExistingDebtSchedule({
        manualTotals: existingDebtManualTotals,
        instruments: existingDebtInstruments,
        startYear: financialConfig.startYear,
        projectionYears: financialConfig.projectionYears,
      }),
    [
      existingDebtManualTotals,
      existingDebtInstruments,
      financialConfig.startYear,
      financialConfig.projectionYears,
    ]
  );


  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Financial Modeling Suite</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-700">
              Build a utility pro forma directly from the live CIP, operating budget, and financing strategy. Navigate
              between views to review capital schedules, update budget drivers, evaluate pro forma results, and
              refine debt assumptions.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <div className="text-right">
              <label className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Utility Portfolio
              </label>
              <select
                value={activeUtility}
                onChange={(event) => onChangeUtility?.(event.target.value)}
                className="mt-1 w-52 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {utilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-md border border-blue-200 bg-white px-4 py-2 text-sm text-blue-700">
              Projection Window: FY {financialConfig.startYear} – FY
              {" "}
              {financialConfig.startYear + financialConfig.projectionYears - 1}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {MODULE_VIEWS.map((view) => {
          const Icon = view.icon;
          const isActive = activeView === view.id;
          return (
            <button
              type="button"
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`flex h-full w-full items-start gap-3 rounded-lg border px-4 py-3 text-left shadow-sm transition ${
                isActive
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
              }`}
            >
              <span
                className={`rounded-full border p-2 ${
                  isActive ? "border-blue-400 bg-blue-100 text-blue-600" : "border-slate-200 bg-slate-100 text-slate-500"
                }`}
              >
                <Icon size={18} />
              </span>
              <span>
                <span className="block text-sm font-semibold">{view.label}</span>
                <span className="mt-1 block text-xs text-inherit">{view.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      {activeView === "cip" ? (
        <CipSummaryView
          projectSpendBreakdown={projectSpendBreakdown}
          years={years}
          fundingSourceMap={fundingLabelMap}
          projectTypeMap={projectTypeMap}
          activeUtilityLabel={activeUtilityOption?.label}
        />
      ) : null}

      {activeView === "budget" ? (
        <OperatingBudgetView
          years={years}
          alignedBudget={alignedBudget}
          financialConfig={financialConfig}
          onUpdateFinancialConfig={onUpdateFinancialConfig}
          onUpdateOperatingBudget={onUpdateOperatingBudget}
          budgetEscalations={budgetEscalations}
          onUpdateBudgetEscalation={onUpdateBudgetEscalation}
          activeUtilityLabel={activeUtilityOption?.label}
          isReadOnly={isReadOnly}
        />
      ) : null}

      {activeView === "proForma" ? (
        <ProFormaView forecastResult={forecastResult} financialConfig={financialConfig} />
      ) : null}

      {activeView === "debt" ? (
        <DebtServiceView
          years={years}
          forecastResult={forecastResult}
          financialConfig={financialConfig}
          fundingSourceAssumptions={fundingSourceAssumptions}
          fundingSourceMap={fundingLabelMap}
          onUpdateFundingSourceAssumption={onUpdateFundingSourceAssumption}
          existingDebtSchedule={existingDebtSchedule}
          onUpdateExistingDebtManual={(year, value) =>
            onUpdateExistingDebtManual?.(year, value)
          }
          onAddExistingDebtInstrument={onAddExistingDebtInstrument}
          onRemoveExistingDebtInstrument={onRemoveExistingDebtInstrument}
          isReadOnly={isReadOnly}
        />
      ) : null}

      {activeView === "settings" ? (
        <SettingsView
          financialConfig={financialConfig}
          projectTypeSummaries={projectTypeSummaries}
          utilityOptions={utilityOptions}
          onUpdateProjectTypeUtility={onUpdateProjectTypeUtility}
          onUpdateFinancialConfig={onUpdateFinancialConfig}

          isReadOnly={isReadOnly}
        />
      ) : null}
    </div>
  );
};

export default FinancialModelingModule;
