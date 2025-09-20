import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Upload,
  Trash2,
  Repeat,
  Download,
  ChevronDown,
  ChevronRight,
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
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2";
const projectInputClass = `${baseInputClass} focus:border-blue-500 focus:ring-blue-200`;
const programInputClass = `${baseInputClass} focus:border-purple-500 focus:ring-purple-200`;

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
}) => {
  const { label: typeLabel, color: typeColor } = getProjectTypeInfo(
    projectTypes,
    project.projectTypeId
  );

  const deliveryLabel = getDeliveryLabel(project.deliveryType || "self-perform");

  const handleNumberChange = (field) => (event) => {
    const parsed = parseInt(event.target.value, 10);
    updateProject(project.id, field, Number.isNaN(parsed) ? 0 : parsed);
  };

  const handleSelectNumber = (field) => (event) => {
    const rawValue = event.target.value;
    if (rawValue === "") {
      updateProject(project.id, field, null);
      return;
    }

    const parsed = parseInt(rawValue, 10);
    updateProject(project.id, field, Number.isNaN(parsed) ? null : parsed);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 p-4">
        <div className="flex min-w-[240px] flex-1 flex-col gap-2">
          <input
            type="text"
            value={project.name || ""}
            onChange={(event) =>
              updateProject(project.id, "name", event.target.value)
            }
            placeholder="Project name"
            className={projectInputClass}
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
          </div>
        </div>
        <button
          type="button"
          onClick={() => deleteProject(project.id)}
          className="rounded-full bg-red-50 p-2 text-red-600 transition hover:bg-red-100 hover:text-red-700"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2">
        <Field label="Project type">
          <select
            value={project.projectTypeId ?? ""}
            onChange={handleSelectNumber("projectTypeId")}
            className={projectInputClass}
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
            onChange={handleSelectNumber("fundingSourceId")}
            className={projectInputClass}
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
            onChange={(event) =>
              updateProject(project.id, "deliveryType", event.target.value)
            }
            className={projectInputClass}
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
            onChange={(event) =>
              updateProject(project.id, "priority", event.target.value)
            }
            className={projectInputClass}
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
          />
        </Field>

        <Field label="Design start">
          <input
            type="date"
            value={project.designStartDate || ""}
            onChange={(event) =>
              updateProject(
                project.id,
                "designStartDate",
                event.target.value
              )
            }
            className={projectInputClass}
          />
        </Field>

        <Field label="Construction start">
          <input
            type="date"
            value={project.constructionStartDate || ""}
            onChange={(event) =>
              updateProject(
                project.id,
                "constructionStartDate",
                event.target.value
              )
            }
            className={projectInputClass}
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
            />
          </Field>
          <Field label="Construction duration (months)">
            <input
              type="number"
              min="0"
              value={Number(project.constructionDuration) || 0}
              onChange={handleNumberChange("constructionDuration")}
              className={projectInputClass}
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
  updateProject,
  deleteProject,
}) => {
  const { label: typeLabel, color: typeColor } = getProjectTypeInfo(
    projectTypes,
    program.projectTypeId
  );

  const handleNumberChange = (field) => (event) => {
    const parsed = parseInt(event.target.value, 10);
    updateProject(program.id, field, Number.isNaN(parsed) ? 0 : parsed);
  };

  const handleFloatChange = (field) => (event) => {
    const parsed = parseFloat(event.target.value);
    updateProject(program.id, field, Number.isNaN(parsed) ? 0 : parsed);
  };

  const handleSelectNumber = (field) => (event) => {
    const rawValue = event.target.value;
    if (rawValue === "") {
      updateProject(program.id, field, null);
      return;
    }

    const parsed = parseInt(rawValue, 10);
    updateProject(program.id, field, Number.isNaN(parsed) ? null : parsed);
  };

  return (
    <div className="rounded-xl border border-purple-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-purple-100 p-4">
        <div className="flex min-w-[240px] flex-1 flex-col gap-2">
          <input
            type="text"
            value={program.name || ""}
            onChange={(event) =>
              updateProject(program.id, "name", event.target.value)
            }
            placeholder="Program name"
            className={programInputClass}
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
          </div>
        </div>
        <button
          type="button"
          onClick={() => deleteProject(program.id)}
          className="rounded-full bg-red-50 p-2 text-red-600 transition hover:bg-red-100 hover:text-red-700"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2">
        <Field label="Program type">
          <select
            value={program.projectTypeId ?? ""}
            onChange={handleSelectNumber("projectTypeId")}
            className={programInputClass}
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
            onChange={handleSelectNumber("fundingSourceId")}
            className={programInputClass}
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
          />
        </Field>

        <Field label="Program start">
          <input
            type="date"
            value={program.programStartDate || ""}
            onChange={(event) =>
              updateProject(
                program.id,
                "programStartDate",
                event.target.value
              )
            }
            className={programInputClass}
          />
        </Field>

        <Field label="Program end">
          <input
            type="date"
            value={program.programEndDate || ""}
            onChange={(event) =>
              updateProject(
                program.id,
                "programEndDate",
                event.target.value
              )
            }
            className={programInputClass}
          />
        </Field>

        <div className="md:col-span-2">
          <Field label="Continuous staffing (hrs per month)">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="number"
                min="0"
                value={program.continuousPmHours || ""}
                onChange={handleNumberChange("continuousPmHours")}
                placeholder="PM"
                className={`${programInputClass} sm:w-28`}
              />
              <input
                type="number"
                min="0"
                value={program.continuousDesignHours || ""}
                onChange={handleNumberChange("continuousDesignHours")}
                placeholder="Design"
                className={`${programInputClass} sm:w-28`}
              />
              <input
                type="number"
                min="0"
                value={program.continuousConstructionHours || ""}
                onChange={handleNumberChange("continuousConstructionHours")}
                placeholder="Construction"
                className={`${programInputClass} sm:w-32`}
              />
            </div>
          </Field>
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
}) => {
  const projectGroups = useMemo(
    () => groupProjectsByType(projects, projectTypes),
    [projects, projectTypes]
  );

  const [expandedGroups, setExpandedGroups] = useState({});

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
            <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700">
              <Upload size={16} />
              Import CSV
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleImport(file);
                  event.target.value = "";
                }}
              />
            </label>
            <button
              onClick={() => addProject("project")}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Plus size={16} />
              Add Project
            </button>
            <button
              onClick={() => addProject("program")}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700"
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
                <div className="space-y-6 p-6">
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
                      <div className="grid grid-cols-1 gap-8 sm:[grid-template-columns:repeat(auto-fit,minmax(22rem,1fr))]">
                        {group.projects.map((project) => (
                          <ProjectCard
                            key={project.id}
                            project={project}
                            projectTypes={projectTypes}
                            fundingSources={fundingSources}
                            updateProject={updateProject}
                            deleteProject={deleteProject}
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
                      <div className="grid grid-cols-1 gap-8 sm:[grid-template-columns:repeat(auto-fit,minmax(22rem,1fr))]">
                        {group.programs.map((program) => (
                          <ProgramCard
                            key={program.id}
                            program={program}
                            projectTypes={projectTypes}
                            fundingSources={fundingSources}
                            updateProject={updateProject}
                            deleteProject={deleteProject}
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
    </div>
  );
};

export default ProjectsPrograms;
