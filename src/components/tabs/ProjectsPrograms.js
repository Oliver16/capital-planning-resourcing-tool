import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Upload,
  Trash2,
  Repeat,
  Download,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { downloadCSVTemplate } from "../../utils/dataImport";
import { groupProjectsByType } from "../../utils/projectGrouping";

const deliveryOptions = [
  { value: "self-perform", label: "Self-Perform" },
  { value: "hybrid", label: "Hybrid" },
  { value: "consultant", label: "Consultant" },
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const formatGroupBudget = (value) => {
  const numericValue = Number(value) || 0;

  if (numericValue === 0) {
    return "$0";
  }

  if (Math.abs(numericValue) >= 1_000_000) {
    return `$${(numericValue / 1_000_000)
      .toFixed(1)
      .replace(/\.0$/, "")}M`;
  }

  if (Math.abs(numericValue) >= 1_000) {
    return `$${Math.round(numericValue / 1_000)}K`;
  }

  return currencyFormatter.format(numericValue);
};

const baseInputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100";
const projectInputClass = `${baseInputClass} focus:border-blue-500 focus:ring-blue-200`;
const programInputClass = `${baseInputClass} focus:border-purple-500 focus:ring-purple-200`;

const sanitizeHoursValue = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};

const parseCategoryHoursConfig = (config) => {
  if (!config) {
    return {};
  }

  if (typeof config === "string") {
    try {
      const parsed = JSON.parse(config);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      console.warn("Unable to parse program hours config:", error);
      return {};
    }
  }

  return typeof config === "object" ? config : {};
};

const sanitizeCategoryHoursMap = (config) => {
  const parsed = parseCategoryHoursConfig(config);
  const sanitized = {};

  Object.entries(parsed).forEach(([key, value]) => {
    if (!value || typeof value !== "object") {
      return;
    }

    const pmHours = sanitizeHoursValue(value.pmHours);
    const designHours = sanitizeHoursValue(value.designHours);
    const constructionHours = sanitizeHoursValue(value.constructionHours);

    if (pmHours > 0 || designHours > 0 || constructionHours > 0) {
      sanitized[String(key)] = { pmHours, designHours, constructionHours };
    }
  });

  return sanitized;
};

const getVisibleCategoryHours = (program, staffCategories = []) => {
  const sanitized = sanitizeCategoryHoursMap(program?.continuousHoursByCategory);

  if (!Array.isArray(staffCategories) || staffCategories.length === 0) {
    return sanitized;
  }

  const validCategoryIds = new Set(
    staffCategories
      .filter((category) => category && category.id != null)
      .map((category) => String(category.id))
  );

  return Object.entries(sanitized).reduce((accumulator, [key, value]) => {
    if (validCategoryIds.has(key)) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});
};

const buildModalStateForProgram = (program, staffCategories = []) => {
  const sanitized = sanitizeCategoryHoursMap(program?.continuousHoursByCategory);
  const config = {};
  const extraEntries = {};
  const knownCategoryIds = new Set();

  (staffCategories || []).forEach((category) => {
    if (!category || category.id == null) {
      return;
    }

    const key = String(category.id);
    knownCategoryIds.add(key);
    const entry = sanitized[key];
    config[key] = {
      pmHours: entry ? String(entry.pmHours) : "",
      designHours: entry ? String(entry.designHours) : "",
      constructionHours: entry ? String(entry.constructionHours) : "",
    };
  });

  Object.entries(sanitized).forEach(([key, entry]) => {
    if (!knownCategoryIds.has(key)) {
      extraEntries[key] = entry;
    }
  });

  return {
    config,
    extraEntries,
    hadExistingValues: Object.keys(sanitized).length > 0,
  };
};

const buildCategoryUpdatesForSave = (
  draftConfig,
  staffCategories = [],
  extraEntries = {}
) => {
  const mergedConfig = {};
  let totalPm = 0;
  let totalDesign = 0;
  let totalConstruction = 0;

  const addEntry = (key, entry) => {
    if (!entry) {
      return;
    }

    const pmHours = sanitizeHoursValue(entry.pmHours);
    const designHours = sanitizeHoursValue(entry.designHours);
    const constructionHours = sanitizeHoursValue(entry.constructionHours);

    if (pmHours > 0 || designHours > 0 || constructionHours > 0) {
      mergedConfig[String(key)] = { pmHours, designHours, constructionHours };
      totalPm += pmHours;
      totalDesign += designHours;
      totalConstruction += constructionHours;
    }
  };

  (staffCategories || []).forEach((category) => {
    if (!category || category.id == null) {
      return;
    }

    const key = String(category.id);
    const entry = draftConfig?.[key];

    if (!entry) {
      return;
    }

    addEntry(key, {
      pmHours: entry.pmHours,
      designHours: entry.designHours,
      constructionHours: entry.constructionHours,
    });
  });

  Object.entries(extraEntries || {}).forEach(([key, entry]) => {
    if (mergedConfig[key]) {
      return;
    }

    addEntry(key, entry);
  });

  const hasValues = Object.keys(mergedConfig).length > 0;

  return {
    sanitizedConfig: hasValues ? mergedConfig : null,
    totals: {
      pm: totalPm,
      design: totalDesign,
      construction: totalConstruction,
    },
  };
};

const formatHoursSummary = (value) => {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }

  if (Number.isInteger(value)) {
    return value.toLocaleString("en-US");
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
};

const Field = ({ label, children, hint }) => (
  <label className="flex flex-col gap-1 text-sm text-gray-600">
    <span className="font-medium text-gray-700">{label}</span>
    {children}
    {hint && <span className="text-xs text-gray-400">{hint}</span>}
  </label>
);

const SummaryChip = ({ children, className = "" }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
  >
    {children}
  </span>
);

const getProjectTypeInfo = (projectTypes = [], projectTypeId) => {
  const match = projectTypes.find((type) => type.id === projectTypeId);
  return {
    label: match?.name || "Unassigned type",
    color: match?.color || "#6b7280",
  };
};

const getDeliveryLabel = (value) => {
  if (!value) {
    return null;
  }

  const match = deliveryOptions.find((option) => option.value === value);
  return match?.label || null;
};

const ProjectCard = ({
  project,
  projectTypes,
  fundingSources,
  updateProject,
  deleteProject,
  isReadOnly = false,
}) => {
  const { label: typeLabel, color: typeColor } = getProjectTypeInfo(
    projectTypes,
    project.projectTypeId
  );

  const deliveryLabel = getDeliveryLabel(project.deliveryType || "self-perform");

  const handleNumberChange = (field) => (event) => {
    if (isReadOnly) {
      return;
    }
    const parsed = parseInt(event.target.value, 10);
    updateProject(project.id, field, Number.isNaN(parsed) ? 0 : parsed);
  };

  const handleSelectOption = (field, options = []) => (event) => {
    if (isReadOnly) {
      return;
    }
    const rawValue = event.target.value;
    if (rawValue === "") {
      updateProject(project.id, field, null);
      return;
    }

    const matchingOption = options.find((option) => {
      if (!option) {
        return false;
      }
      const optionId = option.id;
      if (optionId === undefined || optionId === null) {
        return false;
      }
      return String(optionId) === rawValue;
    });

    const normalizedValue =
      matchingOption && matchingOption.id !== undefined
        ? matchingOption.id
        : rawValue;

    updateProject(project.id, field, normalizedValue);
  };

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 p-4">
        <div className="flex min-w-[240px] flex-1 flex-col gap-2">
          <input
            type="text"
            value={project.name || ""}
            onChange={(event) => {
              if (isReadOnly) {
                return;
              }
              updateProject(project.id, "name", event.target.value);
            }}
            placeholder="Project name"
            className={projectInputClass}
            disabled={isReadOnly}
          />
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <SummaryChip className="bg-gray-100 text-gray-700">
              <span className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: typeColor }}
                ></span>
                {typeLabel}
              </span>
            </SummaryChip>
            {project.priority && (
              <SummaryChip className="bg-amber-50 text-amber-700">
                Priority: {project.priority}
              </SummaryChip>
            )}
            {deliveryLabel && (
              <SummaryChip className="bg-blue-50 text-blue-700">
                Delivery: {deliveryLabel}
              </SummaryChip>
            )}
            {Number(project.totalBudget) > 0 && (
              <SummaryChip className="bg-purple-50 text-purple-700">
                Budget {formatGroupBudget(project.totalBudget)}
              </SummaryChip>
            )}
            {isReadOnly && (
              <SummaryChip className="bg-amber-50 text-amber-700">
                View only
              </SummaryChip>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (isReadOnly) {
              return;
            }
            deleteProject(project.id);
          }}
          disabled={isReadOnly}
          className={`rounded-full p-2 transition ${
            isReadOnly
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
          }`}
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2">
        <Field label="Project type">
          <select
            value={project.projectTypeId ?? ""}
            onChange={handleSelectOption("projectTypeId", projectTypes)}
            className={projectInputClass}
            disabled={isReadOnly}
          >
            <option value="">Unassigned</option>
            {projectTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Funding source">
          <select
            value={project.fundingSourceId ?? ""}
            onChange={handleSelectOption("fundingSourceId", fundingSources)}
            className={projectInputClass}
            disabled={isReadOnly}
          >
            <option value="">Select funding</option>
            {fundingSources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Delivery method">
          <select
            value={project.deliveryType || "self-perform"}
            onChange={(event) => {
              if (isReadOnly) {
                return;
              }
              updateProject(project.id, "deliveryType", event.target.value);
            }}
            className={projectInputClass}
            disabled={isReadOnly}
          >
            {deliveryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Priority">
          <select
            value={project.priority || "Medium"}
            onChange={(event) => {
              if (isReadOnly) {
                return;
              }
              updateProject(project.id, "priority", event.target.value);
            }}
            className={projectInputClass}
            disabled={isReadOnly}
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </Field>

        <Field label="Total budget (USD)">
          <input
            type="number"
            min="0"
            value={project.totalBudget || ""}
            onChange={handleNumberChange("totalBudget")}
            className={projectInputClass}
            disabled={isReadOnly}
          />
        </Field>

        <Field label="Design start">
          <input
            type="date"
            value={project.designStartDate || ""}
            onChange={(event) => {
              if (isReadOnly) {
                return;
              }
              updateProject(
                project.id,
                "designStartDate",
                event.target.value
              );
            }}
            className={projectInputClass}
            disabled={isReadOnly}
          />
        </Field>

        <Field label="Construction start">
          <input
            type="date"
            value={project.constructionStartDate || ""}
            onChange={(event) => {
              if (isReadOnly) {
                return;
              }
              updateProject(
                project.id,
                "constructionStartDate",
                event.target.value
              );
            }}
            className={projectInputClass}
            disabled={isReadOnly}
          />
        </Field>

        <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
          <Field label="Design duration (months)">
            <input
              type="number"
              min="0"
              value={Number(project.designDuration) || 0}
              onChange={handleNumberChange("designDuration")}
              className={projectInputClass}
              disabled={isReadOnly}
            />
          </Field>
          <Field label="Construction duration (months)">
            <input
              type="number"
              min="0"
              value={Number(project.constructionDuration) || 0}
              onChange={handleNumberChange("constructionDuration")}
              className={projectInputClass}
              disabled={isReadOnly}
            />
          </Field>
        </div>
      </div>
    </div>
  );
};

const ProgramCard = ({
  program,
  projectTypes,
  fundingSources,
  staffCategories,
  updateProject,
  deleteProject,
  onConfigureCategoryHours,
  isReadOnly = false,
}) => {
  const { label: typeLabel, color: typeColor } = getProjectTypeInfo(
    projectTypes,
    program.projectTypeId
  );

  const handleNumberChange = (field) => (event) => {
    if (isReadOnly) {
      return;
    }
    const parsed = parseInt(event.target.value, 10);
    updateProject(program.id, field, Number.isNaN(parsed) ? 0 : parsed);
  };

  const handleFloatChange = (field) => (event) => {
    if (isReadOnly) {
      return;
    }
    const parsed = parseFloat(event.target.value);
    updateProject(program.id, field, Number.isNaN(parsed) ? 0 : parsed);
  };

  const handleSelectOption = (field, options = []) => (event) => {
    if (isReadOnly) {
      return;
    }
    const rawValue = event.target.value;
    if (rawValue === "") {
      updateProject(program.id, field, null);
      return;
    }

    const matchingOption = options.find((option) => {
      if (!option) {
        return false;
      }
      const optionId = option.id;
      if (optionId === undefined || optionId === null) {
        return false;
      }
      return String(optionId) === rawValue;
    });

    const normalizedValue =
      matchingOption && matchingOption.id !== undefined
        ? matchingOption.id
        : rawValue;

    updateProject(program.id, field, normalizedValue);
  };

  const categoryHours = getVisibleCategoryHours(program, staffCategories);
  const categoryCount = Object.keys(categoryHours).length;
  const totalCategoryHours = Object.values(categoryHours).reduce(
    (sum, entry) =>
      sum + (entry.pmHours || 0) + (entry.designHours || 0) + (entry.constructionHours || 0),
    0
  );
  const pmHours = sanitizeHoursValue(program.continuousPmHours);
  const designHours = sanitizeHoursValue(program.continuousDesignHours);
  const constructionHours = sanitizeHoursValue(
    program.continuousConstructionHours
  );
  const combinedContinuousHours = pmHours + designHours + constructionHours;
  const hoursBreakdown = [
    { key: "pm", label: "PM", value: pmHours },
    { key: "design", label: "Design", value: designHours },
    { key: "construction", label: "Construction", value: constructionHours },
  ];

  return (
    <div className="w-full rounded-xl border border-purple-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-purple-100 p-4">
        <div className="flex min-w-[240px] flex-1 flex-col gap-2">
          <input
            type="text"
            value={program.name || ""}
            onChange={(event) => {
              if (isReadOnly) {
                return;
              }
              updateProject(program.id, "name", event.target.value);
            }}
            placeholder="Program name"
            className={programInputClass}
            disabled={isReadOnly}
          />
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <SummaryChip className="bg-purple-50 text-purple-700">
              <span className="flex items-center gap-2">
                <Repeat size={12} />
                Annual program
              </span>
            </SummaryChip>
            <SummaryChip className="bg-gray-100 text-gray-700">
              <span className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: typeColor }}
                ></span>
                {typeLabel}
              </span>
            </SummaryChip>
            {Number(program.annualBudget) > 0 && (
              <SummaryChip className="bg-green-50 text-green-700">
                {formatGroupBudget(program.annualBudget)}/yr
              </SummaryChip>
            )}
            {program.programStartDate && program.programEndDate && (
              <SummaryChip className="bg-blue-50 text-blue-700">
                {program.programStartDate} → {program.programEndDate}
              </SummaryChip>
            )}
            {isReadOnly && (
              <SummaryChip className="bg-amber-50 text-amber-700">
                View only
              </SummaryChip>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (isReadOnly) {
              return;
            }
            deleteProject(program.id);
          }}
          disabled={isReadOnly}
          className={`rounded-full p-2 transition ${
            isReadOnly
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
          }`}
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2">
        <Field label="Program type">
          <select
            value={program.projectTypeId ?? ""}
            onChange={handleSelectOption("projectTypeId", projectTypes)}
            className={programInputClass}
            disabled={isReadOnly}
          >
            <option value="">Unassigned</option>
            {projectTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Funding source">
          <select
            value={program.fundingSourceId ?? ""}
            onChange={handleSelectOption("fundingSourceId", fundingSources)}
            className={programInputClass}
            disabled={isReadOnly}
          >
            <option value="">Select funding</option>
            {fundingSources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Annual budget (USD)">
          <input
            type="number"
            min="0"
            value={program.annualBudget || ""}
            onChange={handleNumberChange("annualBudget")}
            className={programInputClass}
            disabled={isReadOnly}
          />
        </Field>

        <Field label="Design budget (%)">
          <input
            type="number"
            min="0"
            max="100"
            value={program.designBudgetPercent || ""}
            onChange={handleFloatChange("designBudgetPercent")}
            className={programInputClass}
            disabled={isReadOnly}
          />
        </Field>

        <Field label="Construction budget (%)">
          <input
            type="number"
            min="0"
            max="100"
            value={program.constructionBudgetPercent || ""}
            onChange={handleFloatChange("constructionBudgetPercent")}
            className={programInputClass}
            disabled={isReadOnly}
          />
        </Field>

        <Field label="Program start">
          <input
            type="date"
            value={program.programStartDate || ""}
            onChange={(event) => {
              if (isReadOnly) {
                return;
              }
              updateProject(
                program.id,
                "programStartDate",
                event.target.value
              );
            }}
            className={programInputClass}
            disabled={isReadOnly}
          />
        </Field>

        <Field label="Program end">
          <input
            type="date"
            value={program.programEndDate || ""}
            onChange={(event) => {
              if (isReadOnly) {
                return;
              }
              updateProject(
                program.id,
                "programEndDate",
                event.target.value
              );
            }}
            className={programInputClass}
            disabled={isReadOnly}
          />
        </Field>

        <div className="md:col-span-2">
          <Field
            label="Continuous staffing (hrs per month)"
            hint={
              categoryCount > 0
                ? `Detailed staffing defined for ${categoryCount} ${
                    categoryCount === 1 ? "category" : "categories"
                  } • ${formatHoursSummary(totalCategoryHours)} hrs/month total`
                : "Configure by staff category to define monthly PM, design, and construction hours."
            }
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 shadow-sm">
                  <span>Total hours/month</span>
                  <span className="flex items-baseline gap-1 text-lg font-semibold text-purple-900">
                    {formatHoursSummary(combinedContinuousHours)}
                    <span className="text-xs font-medium uppercase text-purple-500">
                      hrs/mo
                    </span>
                  </span>
                </div>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {hoursBreakdown.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-lg border border-purple-100 bg-white p-3 shadow-sm"
                    >
                      <dt className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                        {item.label}
                      </dt>
                      <dd className="mt-1 flex items-baseline gap-2 text-2xl font-semibold text-purple-900">
                        {formatHoursSummary(item.value)}
                        <span className="text-xs font-medium uppercase text-purple-500">
                          hrs/mo
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="sm:pl-4 sm:pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (isReadOnly) {
                      return;
                    }
                    onConfigureCategoryHours?.(program);
                  }}
                  disabled={isReadOnly}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 sm:w-auto ${
                    isReadOnly
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-purple-600 text-white transition hover:bg-purple-700 focus:ring-purple-400"
                  }`}
                >
                  <SlidersHorizontal size={16} className="text-purple-100" />
                  Configure by staff category
                </button>
              </div>
            </div>
          </Field>
        </div>
      </div>
    </div>
  );
};

const defaultCategoryModalState = {
  isOpen: false,
  programId: null,
  programName: "",
  config: {},
  extraEntries: {},
  hadExistingValues: false,
};

const CategoryHoursModal = ({
  isOpen,
  programName,
  staffCategories,
  config,
  onChange,
  onClose,
  onSave,
  onClear,
  hasExistingConfig,
}) => {
  React.useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const sortedCategories = (staffCategories || [])
    .filter((category) => category && category.id != null)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  const totals = sortedCategories.reduce(
    (accumulator, category) => {
      const entry = config?.[String(category.id)];
      if (!entry) {
        return accumulator;
      }

      const pm = sanitizeHoursValue(entry.pmHours);
      const design = sanitizeHoursValue(entry.designHours);
      const construction = sanitizeHoursValue(entry.constructionHours);

      if (pm > 0 || design > 0 || construction > 0) {
        accumulator.categories += 1;
      }

      accumulator.pm += pm;
      accumulator.design += design;
      accumulator.construction += construction;
      accumulator.total += pm + design + construction;
      return accumulator;
    },
    { pm: 0, design: 0, construction: 0, total: 0, categories: 0 }
  );

  const hasCategories = sortedCategories.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900">
              Configure staffing by category
            </h2>
            <p className="text-sm text-gray-500">
              Assign monthly PM, design, and construction hours for each staff
              category supporting
              {" "}
              <span className="font-medium text-gray-700">
                {programName || "this program"}
              </span>
              .
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gray-100 p-2 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6 pt-4">
          {hasCategories ? (
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">Staff category</th>
                  <th className="px-3 py-2">PM hours</th>
                  <th className="px-3 py-2">Design hours</th>
                  <th className="px-3 py-2">Construction hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedCategories.map((category) => {
                  const key = String(category.id);
                  const entry = config?.[key] || {
                    pmHours: "",
                    designHours: "",
                    constructionHours: "",
                  };

                  return (
                    <tr key={category.id} className="text-gray-700">
                      <td className="px-3 py-3 font-medium text-gray-800">
                        {category.name}
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={entry.pmHours}
                          onChange={(event) =>
                            onChange(category.id, "pmHours", event.target.value)
                          }
                          className={`${programInputClass} w-full`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={entry.designHours}
                          onChange={(event) =>
                            onChange(
                              category.id,
                              "designHours",
                              event.target.value
                            )
                          }
                          className={`${programInputClass} w-full`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={entry.constructionHours}
                          onChange={(event) =>
                            onChange(
                              category.id,
                              "constructionHours",
                              event.target.value
                            )
                          }
                          className={`${programInputClass} w-full`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              No staff categories are available yet. Add categories in the
              People tab to configure detailed program staffing.
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-gray-100 p-6">
          {hasCategories && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                  {totals.categories} {totals.categories === 1 ? "category" : "categories"}
                  {" "}
                  configured
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  Total {formatHoursSummary(totals.total)} hrs/month
                </span>
                <span className="hidden rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 md:inline">
                  PM {formatHoursSummary(totals.pm)} • Design {formatHoursSummary(totals.design)} • Construction {formatHoursSummary(totals.construction)}
                </span>
              </div>
              {hasExistingConfig && (
                <button
                  type="button"
                  onClick={onClear}
                  className="text-xs font-medium text-red-600 transition hover:text-red-700"
                >
                  Clear custom hours
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
              disabled={!hasCategories}
            >
              <SlidersHorizontal size={16} className="text-purple-100" />
              Save configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProjectsPrograms = ({
  projects,
  projectTypes,
  fundingSources,
  staffCategories,
  addProject,
  updateProject,
  deleteProject,
  handleImport,
  isReadOnly = false,
}) => {
  const projectGroups = useMemo(
    () => groupProjectsByType(projects, projectTypes),
    [projects, projectTypes]
  );

  const [expandedGroups, setExpandedGroups] = useState({});
  const [categoryModalState, setCategoryModalState] = useState(
    defaultCategoryModalState
  );

  useEffect(() => {
    setExpandedGroups((previous) => {
      const nextState = { ...previous };
      projectGroups.forEach((group) => {
        if (nextState[group.key] === undefined) {
          nextState[group.key] = true;
        }
      });
      return nextState;
    });
  }, [projectGroups]);

  const openCategoryModal = useCallback(
    (program) => {
      if (!program) {
        return;
      }

      const { config, extraEntries, hadExistingValues } =
        buildModalStateForProgram(program, staffCategories);

      setCategoryModalState({
        isOpen: true,
        programId: program.id,
        programName: program.name || "Annual program",
        config,
        extraEntries,
        hadExistingValues,
      });
    },
    [staffCategories]
  );

  const closeCategoryModal = useCallback(() => {
    setCategoryModalState(defaultCategoryModalState);
  }, []);

  const updateModalConfig = useCallback((categoryId, field, value) => {
    setCategoryModalState((previous) => {
      if (!previous?.isOpen) {
        return previous;
      }

      const key = String(categoryId);
      const existingEntry = previous.config?.[key] || {
        pmHours: "",
        designHours: "",
        constructionHours: "",
      };

      return {
        ...previous,
        config: {
          ...previous.config,
          [key]: {
            ...existingEntry,
            [field]: value,
          },
        },
      };
    });
  }, []);

  const saveCategoryModal = useCallback(() => {
    setCategoryModalState((previous) => {
      if (!previous?.isOpen) {
        return previous;
      }

      const { sanitizedConfig, totals } = buildCategoryUpdatesForSave(
        previous.config,
        staffCategories,
        previous.extraEntries
      );

      if (previous.programId != null) {
        if (sanitizedConfig) {
          updateProject(previous.programId, {
            continuousHoursByCategory: sanitizedConfig,
            continuousPmHours: totals.pm,
            continuousDesignHours: totals.design,
            continuousConstructionHours: totals.construction,
          });
        } else {
          updateProject(previous.programId, {
            continuousHoursByCategory: null,
          });
        }
      }

      return defaultCategoryModalState;
    });
  }, [staffCategories, updateProject]);

  const clearCategoryModal = useCallback(() => {
    setCategoryModalState((previous) => {
      if (!previous?.isOpen) {
        return previous;
      }

      if (previous.programId != null) {
        updateProject(previous.programId, {
          continuousHoursByCategory: null,
        });
      }

      return defaultCategoryModalState;
    });
  }, [updateProject]);

  const toggleGroup = (key) => {
    setExpandedGroups((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  const handleDownloadTemplate = useCallback(() => {
    const categories = Array.isArray(staffCategories)
      ? staffCategories
      : [];
    downloadCSVTemplate(categories);
  }, [staffCategories]);

  return (
    <div className="space-y-6">
      {isReadOnly && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You have view-only access. Editing controls are disabled.
        </div>
      )}
      {/* Import/Export Controls */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-semibold">
            Projects &amp; Programs Management
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700"
            >
              <Download size={16} />
              Download CSV Template
            </button>
            <label
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                isReadOnly
                  ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                  : 'cursor-pointer bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <Upload size={16} />
              Import CSV
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(event) => {
                  if (isReadOnly) {
                    event.target.value = "";
                    return;
                  }

                  const file = event.target.files?.[0];
                  if (file) handleImport(file);
                  event.target.value = "";
                }}
                disabled={isReadOnly}
              />
            </label>
            <button
              onClick={() => addProject("project")}
              disabled={isReadOnly}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                isReadOnly
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Plus size={16} />
              Add Project
            </button>
            <button
              onClick={() => addProject("program")}
              disabled={isReadOnly}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                isReadOnly
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              <Repeat size={16} />
              Add Program
            </button>
          </div>
        </div>
      </div>

      {projectGroups.length === 0 ? (
        <div className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
          No projects or programs have been added yet. Use the controls above to
          start building your portfolio.
        </div>
      ) : (
        projectGroups.map((group) => {
          const projectCount = group.projects.length;
          const programCount = group.programs.length;
          const totalProjectBudget = group.projects.reduce(
            (sum, project) => sum + (Number(project.totalBudget) || 0),
            0
          );
          const totalProgramBudget = group.programs.reduce(
            (sum, program) => sum + (Number(program.annualBudget) || 0),
            0
          );

          const summaryParts = [];
          if (projectCount > 0) {
            summaryParts.push(
              `${projectCount} ${projectCount === 1 ? "Project" : "Projects"}`
            );
          }
          if (programCount > 0) {
            summaryParts.push(
              `${programCount} ${programCount === 1 ? "Program" : "Programs"}`
            );
          }
          if (totalProjectBudget > 0) {
            summaryParts.push(`Capital ${formatGroupBudget(totalProjectBudget)}`);
          }
          if (totalProgramBudget > 0) {
            summaryParts.push(
              `Programs ${formatGroupBudget(totalProgramBudget)}/yr`
            );
          }

          const summaryText =
            summaryParts.join(" • ") || "No projects or programs assigned yet";
          const isExpanded = Boolean(expandedGroups[group.key]);

          return (
            <div key={group.key} className="overflow-hidden rounded-xl bg-white shadow-sm">
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="flex w-full items-center justify-between gap-4 border-b border-gray-200 p-5 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: group.color }}
                      ></span>
                      <span className="text-lg font-semibold text-gray-900">
                        {group.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{summaryText}</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-400">
                  {isExpanded ? "Hide" : "Show"}
                </span>
              </button>

              {isExpanded && (
                <div
                  className={`space-y-6 p-6 ${
                    isReadOnly ? "opacity-70" : ""
                  }`}
                >
                  {projectCount > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700">
                          Capital Projects
                        </h3>
                        <span className="text-xs text-gray-500">
                          {projectCount} {projectCount === 1 ? "project" : "projects"}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-8">
                        {group.projects.map((project) => (
                            <ProjectCard
                              key={project.id}
                              project={project}
                              projectTypes={projectTypes}
                              fundingSources={fundingSources}
                              updateProject={updateProject}
                              deleteProject={deleteProject}
                              isReadOnly={isReadOnly}
                            />
                        ))}
                      </div>
                    </div>
                  )}

                  {programCount > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                          <Repeat size={16} className="text-purple-600" />
                          Annual Programs
                        </h3>
                        <span className="text-xs text-gray-500">
                          {programCount} {programCount === 1 ? "program" : "programs"}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-8">
                        {group.programs.map((program) => (
                            <ProgramCard
                              key={program.id}
                              program={program}
                              projectTypes={projectTypes}
                              fundingSources={fundingSources}
                              staffCategories={staffCategories}
                              updateProject={updateProject}
                              deleteProject={deleteProject}
                              onConfigureCategoryHours={openCategoryModal}
                              isReadOnly={isReadOnly}
                            />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* CSV Import Instructions */}
      <div className="rounded-lg bg-blue-50 p-4">
        <h4 className="mb-2 font-medium text-blue-900">
          CSV Import Instructions
        </h4>
        <div className="space-y-1 text-sm text-blue-800">
          <p>
            <strong>Required columns for Projects:</strong> Project Name, Type
            (project/program), Total Budget, Design Budget, Construction Budget,
            Design Duration, Construction Duration, Design Start, Construction
            Start
          </p>
          <p>
            <strong>Required columns for Programs:</strong> Project Name, Type
            (program), Annual Budget, Design %, Construction %, Program Start,
            Program End. Include optional PM, design, and construction monthly
            hours to pre-populate staffing needs.
          </p>
          <p>
            <strong>Optional columns:</strong> Priority, Description
          </p>
          <p>
            Download the CSV template above to see the exact format required.
          </p>
        </div>
      </div>

      <CategoryHoursModal
        isOpen={categoryModalState.isOpen}
        programName={categoryModalState.programName}
        staffCategories={staffCategories}
        config={categoryModalState.config}
        onChange={updateModalConfig}
        onClose={closeCategoryModal}
        onSave={saveCategoryModal}
        onClear={clearCategoryModal}
        hasExistingConfig={
          categoryModalState.hadExistingValues ||
          Object.values(categoryModalState.config || {}).some((entry) =>
            [entry?.pmHours, entry?.designHours, entry?.constructionHours].some(
              (value) => sanitizeHoursValue(value) > 0
            )
          ) ||
          Object.keys(categoryModalState.extraEntries || {}).length > 0
        }
      />
    </div>
  );
};

export default ProjectsPrograms;
