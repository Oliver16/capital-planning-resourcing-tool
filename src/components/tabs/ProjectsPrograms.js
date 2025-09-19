import React, { useMemo, useState } from "react";
import { Plus, Upload, Trash2, Repeat, Download } from "lucide-react";
import { downloadCSVTemplate } from "../../utils/dataImport";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCurrency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "$0.00";
  }
  return currencyFormatter.format(numeric);
};

const parseCurrency = (value) => {
  if (typeof value !== "string") {
    return 0;
  }
  const sanitized = value.replace(/[^0-9.-]/g, "");
  if (sanitized.trim() === "") {
    return 0;
  }
  const parsed = Number.parseFloat(sanitized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const deliveryOptions = [
  { value: "self-perform", label: "Self-Perform" },
  { value: "hybrid", label: "Hybrid" },
  { value: "consultant", label: "Consultant" },
];

const ProjectsPrograms = ({
  projects,
  projectTypes,
  fundingSources,
  staffCategories = [],
  addProject,
  updateProject,
  deleteProject,
  handleImport,
}) => {
  const [expandedPrograms, setExpandedPrograms] = useState([]);
  const [currencyDrafts, setCurrencyDrafts] = useState({});
  const categories = useMemo(
    () => (Array.isArray(staffCategories) ? staffCategories : []),
    [staffCategories]
  );
  const capitalProjects = useMemo(
    () => (Array.isArray(projects) ? projects.filter((p) => p.type === "project") : []),
    [projects]
  );
  const annualPrograms = useMemo(
    () => (Array.isArray(projects) ? projects.filter((p) => p.type === "program") : []),
    [projects]
  );

  const getCurrencyInputProps = (
    entityType,
    entityId,
    field,
    value,
    onCommit
  ) => {
    const fieldId = `${entityType}-${entityId}-${field}`;
    const hasDraft = Object.prototype.hasOwnProperty.call(
      currencyDrafts,
      fieldId
    );

    return {
      value: hasDraft ? currencyDrafts[fieldId] : formatCurrency(value),
      onFocus: () => {
        setCurrencyDrafts((prev) => ({
          ...prev,
          [fieldId]:
            value === null || value === undefined || Number.isNaN(value)
              ? ""
              : String(value),
        }));
      },
      onChange: (event) => {
        const nextValue = event.target.value;
        setCurrencyDrafts((prev) => ({
          ...prev,
          [fieldId]: nextValue,
        }));
      },
      onBlur: (event) => {
        const parsedValue = parseCurrency(event.target.value);
        onCommit(parsedValue);
        setCurrencyDrafts((prev) => {
          const nextDrafts = { ...prev };
          delete nextDrafts[fieldId];
          return nextDrafts;
        });
      },
      placeholder: "$0.00",
    };
  };

  const handleDownloadTemplate = () => {
    downloadCSVTemplate(categories);
  };

  const parseContinuousCategoryConfig = (config) => {
    if (!config) return {};
    if (typeof config === "string") {
      try {
        const parsed = JSON.parse(config);
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch (error) {
        console.warn("Unable to parse continuous hours config", error);
        return {};
      }
    }
    if (typeof config === "object") {
      return config;
    }
    return {};
  };

  const computeTotalsFromConfig = (config) => {
    const normalized = parseContinuousCategoryConfig(config);
    return Object.values(normalized).reduce(
      (
        totals,
        entry = { pmHours: 0, designHours: 0, constructionHours: 0 }
      ) => {
        const pm = Number(entry.pmHours);
        const design = Number(entry.designHours);
        const construction = Number(entry.constructionHours);

        totals.pm += Number.isFinite(pm) ? pm : 0;
        totals.design += Number.isFinite(design) ? design : 0;
        totals.construction += Number.isFinite(construction)
          ? construction
          : 0;

        return totals;
      },
      { pm: 0, design: 0, construction: 0 }
    );
  };

  const getProgramTotals = (program) => {
    const totalsFromConfig = computeTotalsFromConfig(
      program.continuousHoursByCategory
    );
    const hasConfiguredValues =
      totalsFromConfig.pm > 0 ||
      totalsFromConfig.design > 0 ||
      totalsFromConfig.construction > 0;

    if (hasConfiguredValues) {
      return totalsFromConfig;
    }

    return {
      pm: Number(program.continuousPmHours) || 0,
      design: Number(program.continuousDesignHours) || 0,
      construction: Number(program.continuousConstructionHours) || 0,
    };
  };

  const toggleProgramExpansion = (programId) => {
    setExpandedPrograms((prev) =>
      prev.includes(programId)
        ? prev.filter((id) => id !== programId)
        : [...prev, programId]
    );
  };

  const formatHours = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || Math.abs(numeric) < 0.05) {
      return "0.0";
    }
    return numeric.toFixed(1);
  };

  const handleCategoryHoursChange = (program, categoryId, field, rawValue) => {
    const parsedValue = parseFloat(rawValue);
    const sanitizedValue = Number.isFinite(parsedValue)
      ? Math.max(0, Math.round(parsedValue * 10) / 10)
      : 0;

    const normalizedConfig = parseContinuousCategoryConfig(
      program.continuousHoursByCategory
    );
    const key = String(categoryId);
    const existingEntry = normalizedConfig[key] || {
      pmHours: 0,
      designHours: 0,
      constructionHours: 0,
    };

    const nextEntry = {
      ...existingEntry,
      [field]: sanitizedValue,
    };

    const updatedConfig = { ...normalizedConfig };
    if (
      (nextEntry.pmHours || 0) > 0 ||
      (nextEntry.designHours || 0) > 0 ||
      (nextEntry.constructionHours || 0) > 0
    ) {
      updatedConfig[key] = nextEntry;
    } else {
      delete updatedConfig[key];
    }

    const totals = computeTotalsFromConfig(updatedConfig);

    updateProject(program.id, {
      continuousHoursByCategory: updatedConfig,
      continuousPmHours: totals.pm,
      continuousDesignHours: totals.design,
      continuousConstructionHours: totals.construction,
    });
  };

  return (
    <div className="space-y-6">
      {/* Import/Export Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Projects & Programs Management
          </h2>
          <div className="flex gap-4">
            <button
              onClick={handleDownloadTemplate}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Download size={16} />
              Download CSV Template
            </button>
            <label className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 cursor-pointer">
              <Upload size={16} />
              Import CSV
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) handleImport(file);
                }}
              />
            </label>
            <button
              onClick={() => addProject("project")}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={16} />
              Add Project
            </button>
            <button
              onClick={() => addProject("program")}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Repeat size={16} />
              Add Program
            </button>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Capital Projects</h3>
        </div>
        <div className="p-6 space-y-4">
          {capitalProjects.length === 0 ? (
            <p className="text-sm text-gray-500">
              No capital projects added yet. Use the Add Project button above to
              create one.
            </p>
          ) : (
            capitalProjects.map((project) => {
              const projectType = projectTypes.find(
                (type) => type.id === project.projectTypeId
              );
              const fundingSource = fundingSources.find(
                (source) => source.id === project.fundingSourceId
              );
              const totalBudgetInputProps = getCurrencyInputProps(
                "project",
                project.id,
                "totalBudget",
                project.totalBudget,
                (nextValue) =>
                  updateProject(project.id, "totalBudget", nextValue)
              );

              return (
                <div
                  key={project.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Project
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        {project.name || "Untitled Project"}
                      </p>
                      <div className="text-xs text-gray-500 space-x-2">
                        {projectType && <span>{projectType.name}</span>}
                        {fundingSource && (
                          <span className="before:content-['•'] before:mx-2 before:text-gray-300">
                            {fundingSource.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="text-red-600 hover:text-red-800 flex items-center gap-2 text-sm font-medium"
                    >
                      <Trash2 size={16} /> Remove
                    </button>
                  </div>
                  <div className="p-4 space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          Project Name
                        </label>
                        <input
                          type="text"
                          value={project.name}
                          onChange={(e) =>
                            updateProject(project.id, "name", e.target.value)
                          }
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                          placeholder="Enter project name"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          Project Type
                        </label>
                        <select
                          value={project.projectTypeId}
                          onChange={(e) =>
                            updateProject(
                              project.id,
                              "projectTypeId",
                              parseInt(e.target.value, 10)
                            )
                          }
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        >
                          {projectTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          Funding Source
                        </label>
                        <select
                          value={project.fundingSourceId}
                          onChange={(e) =>
                            updateProject(
                              project.id,
                              "fundingSourceId",
                              parseInt(e.target.value, 10)
                            )
                          }
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        >
                          {fundingSources.map((source) => (
                            <option key={source.id} value={source.id}>
                              {source.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          Delivery Method
                        </label>
                        <select
                          value={project.deliveryType || "self-perform"}
                          onChange={(e) =>
                            updateProject(
                              project.id,
                              "deliveryType",
                              e.target.value
                            )
                          }
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        >
                          {deliveryOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          Total Budget
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          {...totalBudgetInputProps}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                          aria-label="Total Budget"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          Priority
                        </label>
                        <select
                          value={project.priority}
                          onChange={(e) =>
                            updateProject(
                              project.id,
                              "priority",
                              e.target.value
                            )
                          }
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        >
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          Design Start
                        </label>
                        <input
                          type="date"
                          value={project.designStartDate}
                          onChange={(e) =>
                            updateProject(
                              project.id,
                              "designStartDate",
                              e.target.value
                            )
                          }
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          Construction Start
                        </label>
                        <input
                          type="date"
                          value={project.constructionStartDate}
                          onChange={(e) =>
                            updateProject(
                              project.id,
                              "constructionStartDate",
                              e.target.value
                            )
                          }
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          Durations (months)
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Design
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={project.designDuration || 0}
                              onChange={(e) =>
                                updateProject(
                                  project.id,
                                  "designDuration",
                                  Number.parseInt(e.target.value, 10) || 0
                                )
                              }
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Construction
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={project.constructionDuration || 0}
                              onChange={(e) =>
                                updateProject(
                                  project.id,
                                  "constructionDuration",
                                  Number.parseInt(e.target.value, 10) || 0
                                )
                              }
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Annual Programs Table */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Repeat size={20} className="text-purple-600" />
            Annual Programs
          </h3>
        </div>
        <div className="p-6 space-y-4">
          {annualPrograms.length === 0 ? (
            <p className="text-sm text-purple-700">
              No annual programs added yet. Use the Add Program button above to
              start planning recurring work.
            </p>
          ) : (
            annualPrograms.map((program) => {
              const totals = getProgramTotals(program);
              const categoryConfig = parseContinuousCategoryConfig(
                program.continuousHoursByCategory
              );
              const isExpanded = expandedPrograms.includes(program.id);
              const programType = projectTypes.find(
                (type) => type.id === program.projectTypeId
              );
              const fundingSource = fundingSources.find(
                (source) => source.id === program.fundingSourceId
              );
              const annualBudgetInputProps = getCurrencyInputProps(
                "program",
                program.id,
                "annualBudget",
                program.annualBudget,
                (nextValue) =>
                  updateProject(program.id, "annualBudget", nextValue)
              );

              return (
                <div
                  key={program.id}
                  className="border border-purple-200 rounded-lg overflow-hidden"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-3 bg-purple-50 border-b border-purple-200">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                        Program
                      </p>
                      <p className="text-base font-semibold text-purple-900">
                        {program.name || "Untitled Program"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-purple-700">
                        {programType && <span>{programType.name}</span>}
                        {programType && fundingSource && <span>•</span>}
                        {fundingSource && <span>{fundingSource.name}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteProject(program.id)}
                      className="text-red-600 hover:text-red-800 flex items-center gap-2 text-sm font-medium"
                    >
                      <Trash2 size={16} /> Remove
                    </button>
                  </div>
                  <div className="p-4 space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-purple-800">
                          Program Name
                        </label>
                        <input
                          type="text"
                          value={program.name}
                          onChange={(e) =>
                            updateProject(program.id, "name", e.target.value)
                          }
                          className="w-full border border-purple-200 rounded px-3 py-2 text-sm"
                          placeholder="Enter program name"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-purple-800">
                          Program Type
                        </label>
                        <select
                          value={program.projectTypeId}
                          onChange={(e) =>
                            updateProject(
                              program.id,
                              "projectTypeId",
                              parseInt(e.target.value, 10)
                            )
                          }
                          className="w-full border border-purple-200 rounded px-3 py-2 text-sm"
                        >
                          {projectTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-purple-800">
                          Funding Source
                        </label>
                        <select
                          value={program.fundingSourceId}
                          onChange={(e) =>
                            updateProject(
                              program.id,
                              "fundingSourceId",
                              parseInt(e.target.value, 10)
                            )
                          }
                          className="w-full border border-purple-200 rounded px-3 py-2 text-sm"
                        >
                          {fundingSources.map((source) => (
                            <option key={source.id} value={source.id}>
                              {source.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-purple-800">
                          Annual Budget
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          {...annualBudgetInputProps}
                          className="w-full border border-purple-200 rounded px-3 py-2 text-sm font-mono"
                          aria-label="Annual Budget"
                        />
                      </div>
                      <div className="space-y-1 xl:col-span-2">
                        <label className="text-sm font-medium text-purple-800">
                          Budget Allocation
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                              Design %
                            </span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={program.designBudgetPercent || 0}
                              onChange={(e) =>
                                updateProject(
                                  program.id,
                                  "designBudgetPercent",
                                  Number.parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full border border-purple-200 rounded px-3 py-2 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                              Construction %
                            </span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={program.constructionBudgetPercent || 0}
                              onChange={(e) =>
                                updateProject(
                                  program.id,
                                  "constructionBudgetPercent",
                                  Number.parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full border border-purple-200 rounded px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1 xl:col-span-2">
                        <label className="text-sm font-medium text-purple-800">
                          Program Period
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                              Start
                            </span>
                            <input
                              type="date"
                              value={program.programStartDate}
                              onChange={(e) =>
                                updateProject(
                                  program.id,
                                  "programStartDate",
                                  e.target.value
                                )
                              }
                              className="w-full border border-purple-200 rounded px-3 py-2 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                              End
                            </span>
                            <input
                              type="date"
                              value={program.programEndDate}
                              onChange={(e) =>
                                updateProject(
                                  program.id,
                                  "programEndDate",
                                  e.target.value
                                )
                              }
                              className="w-full border border-purple-200 rounded px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 md:col-span-2 xl:col-span-4">
                        <label className="text-sm font-medium text-purple-800">
                          Staff Category Hours
                        </label>
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleProgramExpansion(program.id)}
                            className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                          >
                            {isExpanded
                              ? "Hide Category Hours"
                              : "Edit Category Hours"}
                          </button>
                          <p className="text-xs text-purple-700">
                            Open the editor to manage monthly hours by staff
                            category.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-purple-200 bg-purple-50 px-4 py-4 space-y-4">
                      <div className="flex flex-wrap gap-4 text-sm font-medium text-purple-900">
                        <span>PM: {formatHours(totals.pm)} hrs/mo</span>
                        <span>Design: {formatHours(totals.design)} hrs/mo</span>
                        <span>Construction: {formatHours(totals.construction)} hrs/mo</span>
                      </div>
                      <p className="text-xs text-purple-800">
                        Assign monthly hours for each staff category. Totals
                        update automatically and feed resource forecasts.
                      </p>
                      {categories.length === 0 ? (
                        <p className="text-xs text-purple-700">
                          Add staff categories in the Staff tab to configure
                          per-category program hours.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-purple-900">
                                <th className="p-2">Staff Category</th>
                                <th className="p-2">PM Hours / Month</th>
                                <th className="p-2">Design Hours / Month</th>
                                <th className="p-2">Construction Hours / Month</th>
                              </tr>
                            </thead>
                            <tbody>
                              {categories.map((category) => {
                                const entry =
                                  categoryConfig[String(category.id)] || {};
                                return (
                                  <tr
                                    key={category.id}
                                    className="border-t border-purple-100"
                                  >
                                    <td className="p-2 font-medium text-purple-900">
                                      {category.name}
                                    </td>
                                    <td className="p-2">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={Number(entry.pmHours || 0)}
                                        onChange={(e) =>
                                          handleCategoryHoursChange(
                                            program,
                                            category.id,
                                            "pmHours",
                                            e.target.value
                                          )
                                        }
                                        className="w-24 border border-purple-200 rounded px-2 py-1"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={Number(entry.designHours || 0)}
                                        onChange={(e) =>
                                          handleCategoryHoursChange(
                                            program,
                                            category.id,
                                            "designHours",
                                            e.target.value
                                          )
                                        }
                                        className="w-24 border border-purple-200 rounded px-2 py-1"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={Number(
                                          entry.constructionHours || 0
                                        )}
                                        onChange={(e) =>
                                          handleCategoryHoursChange(
                                            program,
                                            category.id,
                                            "constructionHours",
                                            e.target.value
                                          )
                                        }
                                        className="w-24 border border-purple-200 rounded px-2 py-1"
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CSV Import Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">
          CSV Import Instructions
        </h4>
        <div className="text-blue-800 text-sm space-y-1">
          <p>
            <strong>Required columns for Projects:</strong> Project Name, Type
            (project/program), Total Budget, Design Budget, Construction Budget,
            Design Duration, Construction Duration, Design Start, Construction
            Start
          </p>
          <p>
            <strong>Required columns for Programs:</strong> Project Name, Type
            (program), Annual Budget, Design %, Construction %, Program Start,
            Program End. Use <em>PM/Design/Construction Hours - Category</em>
            columns to define monthly effort for each staff category.
          </p>
          <p>
            <strong>Optional columns:</strong> Priority, Description
          </p>

          <p>
            Download the CSV template above to see the exact format required.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProjectsPrograms;
