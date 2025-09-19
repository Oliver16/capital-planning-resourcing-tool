import React, { useEffect, useMemo, useState } from "react";
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

const ProjectsPrograms = ({
  projects,
  projectTypes,
  fundingSources,
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
      {projectGroups.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center text-sm text-gray-500">
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
            <div key={group.key} className="bg-white rounded-lg shadow-sm">
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center justify-between gap-4 p-5"
              >
                <div className="flex items-center gap-3 text-left">
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
                    <p className="text-xs text-gray-500 mt-1">{summaryText}</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-400">
                  {isExpanded ? "Hide" : "Show"}
                </span>
              </button>

              {isExpanded && (
                <div className="space-y-6 border-t border-gray-200 p-6">
                  {projectCount > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700">
                          Capital Projects
                        </h3>
                        <span className="text-xs text-gray-500">
                          {projectCount} {projectCount === 1 ? "project" : "projects"}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left p-4 min-w-[16rem]">Name</th>
                              <th className="text-left p-4">Type</th>
                              <th className="text-left p-4">Funding</th>
                              <th className="text-left p-4">Delivery</th>
                              <th className="text-left p-4">Total Budget</th>
                              <th className="text-left p-4">Design Start</th>
                              <th className="text-left p-4">Construction Start</th>
                              <th className="text-left p-4">Duration (months)</th>
                              <th className="text-left p-4">Priority</th>
                              <th className="text-left p-4">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.projects.map((project) => (
                                <tr
                                  key={project.id}
                                  className="border-b border-gray-200"
                                >
                                  <td className="p-4 min-w-[16rem]">
                                    <input
                                      type="text"
                                      value={project.name}
                                      onChange={(event) =>
                                        updateProject(
                                          project.id,
                                          "name",
                                          event.target.value
                                        )
                                      }
                                      className="w-full border border-gray-300 rounded px-2 py-1"
                                    />
                                  </td>
                                  <td className="p-4">
                                    <select
                                      value={project.projectTypeId ?? ""}
                                      onChange={(event) => {
                                        const rawValue = event.target.value;
                                        updateProject(
                                          project.id,
                                          "projectTypeId",
                                          rawValue === ""
                                            ? null
                                            : parseInt(rawValue, 10)
                                        );
                                      }}
                                      className="border border-gray-300 rounded px-2 py-1"
                                    >
                                      <option value="">Unassigned</option>
                                      {projectTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                          {type.name}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="p-4">
                                    <select
                                      value={project.fundingSourceId ?? ""}
                                      onChange={(event) => {
                                        const rawValue = event.target.value;
                                        updateProject(
                                          project.id,
                                          "fundingSourceId",
                                          rawValue === ""
                                            ? null
                                            : parseInt(rawValue, 10)
                                        );
                                      }}
                                      className="border border-gray-300 rounded px-2 py-1"
                                    >
                                      <option value="">Select funding</option>
                                      {fundingSources.map((source) => (
                                        <option key={source.id} value={source.id}>
                                          {source.name}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="p-4">
                                    <select
                                      value={project.deliveryType || "self-perform"}
                                      onChange={(event) =>
                                        updateProject(
                                          project.id,
                                          "deliveryType",
                                          event.target.value
                                        )
                                      }
                                      className="border border-gray-300 rounded px-2 py-1"
                                    >
                                      {deliveryOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="p-4">
                                    <input
                                      type="number"
                                      value={project.totalBudget || ""}
                                      onChange={(event) =>
                                        updateProject(
                                          project.id,
                                          "totalBudget",
                                          parseInt(event.target.value, 10) || 0
                                        )
                                      }
                                      className="w-28 border border-gray-300 rounded px-2 py-1"
                                    />
                                  </td>
                                  <td className="p-4">
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
                                      className="border border-gray-300 rounded px-2 py-1"
                                    />
                                  </td>
                                  <td className="p-4">
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
                                      className="border border-gray-300 rounded px-2 py-1"
                                    />
                                  </td>
                                  <td className="p-4">
                                    <div className="flex flex-col gap-2 text-sm">
                                      <label className="flex items-center gap-2">
                                        <span className="text-gray-600">D:</span>
                                        <input
                                          type="number"
                                          min="0"
                                          value={project.designDuration || 0}
                                          onChange={(event) =>
                                            updateProject(
                                              project.id,
                                              "designDuration",
                                              parseInt(event.target.value, 10) || 0
                                            )
                                          }
                                          className="w-20 border border-gray-300 rounded px-2 py-1"
                                        />
                                      </label>
                                      <label className="flex items-center gap-2">
                                        <span className="text-gray-600">C:</span>
                                        <input
                                          type="number"
                                          min="0"
                                          value={project.constructionDuration || 0}
                                          onChange={(event) =>
                                            updateProject(
                                              project.id,
                                              "constructionDuration",
                                              parseInt(event.target.value, 10) || 0
                                            )
                                          }
                                          className="w-20 border border-gray-300 rounded px-2 py-1"
                                        />
                                      </label>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <select
                                      value={project.priority || "Medium"}
                                      onChange={(event) =>
                                        updateProject(
                                          project.id,
                                          "priority",
                                          event.target.value
                                        )
                                      }
                                      className="border border-gray-300 rounded px-2 py-1"
                                    >
                                      <option value="High">High</option>
                                      <option value="Medium">Medium</option>
                                      <option value="Low">Low</option>
                                    </select>
                                  </td>
                                  <td className="p-4">
                                    <button
                                      onClick={() => deleteProject(project.id)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {programCount > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Repeat size={16} className="text-purple-600" />
                          Annual Programs
                        </h3>
                        <span className="text-xs text-gray-500">
                          {programCount} {programCount === 1 ? "program" : "programs"}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left p-4 min-w-[16rem]">Program Name</th>
                              <th className="text-left p-4">Type</th>
                              <th className="text-left p-4">Funding</th>
                              <th className="text-left p-4">Annual Budget</th>
                              <th className="text-left p-4">Design %</th>
                              <th className="text-left p-4">Construction %</th>
                              <th className="text-left p-4">Program Period</th>
                              <th className="text-left p-4">Monthly Hours (PM/D/C)</th>
                              <th className="text-left p-4">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.programs.map((program) => (
                              <tr
                                key={program.id}
                                className="border-b border-gray-200"
                              >
                                <td className="p-4 min-w-[16rem]">
                                  <input
                                    type="text"
                                    value={program.name}
                                    onChange={(event) =>
                                      updateProject(
                                        program.id,
                                        "name",
                                        event.target.value
                                      )
                                    }
                                    className="w-full border border-gray-300 rounded px-2 py-1"
                                  />
                                </td>
                                <td className="p-4">
                                  <select
                                    value={program.projectTypeId ?? ""}
                                    onChange={(event) => {
                                      const rawValue = event.target.value;
                                      updateProject(
                                        program.id,
                                        "projectTypeId",
                                        rawValue === ""
                                          ? null
                                          : parseInt(rawValue, 10)
                                      );
                                    }}
                                    className="border border-gray-300 rounded px-2 py-1"
                                  >
                                    <option value="">Unassigned</option>
                                    {projectTypes.map((type) => (
                                      <option key={type.id} value={type.id}>
                                        {type.name}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-4">
                                  <select
                                    value={program.fundingSourceId ?? ""}
                                    onChange={(event) => {
                                      const rawValue = event.target.value;
                                      updateProject(
                                        program.id,
                                        "fundingSourceId",
                                        rawValue === ""
                                          ? null
                                          : parseInt(rawValue, 10)
                                      );
                                    }}
                                    className="border border-gray-300 rounded px-2 py-1"
                                  >
                                    <option value="">Select funding</option>
                                    {fundingSources.map((source) => (
                                      <option key={source.id} value={source.id}>
                                        {source.name}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-4">
                                  <input
                                    type="number"
                                    value={program.annualBudget || ""}
                                    onChange={(event) =>
                                      updateProject(
                                        program.id,
                                        "annualBudget",
                                        parseInt(event.target.value, 10) || 0
                                      )
                                    }
                                    className="w-28 border border-gray-300 rounded px-2 py-1"
                                  />
                                </td>
                                <td className="p-4">
                                  <input
                                    type="number"
                                    value={program.designBudgetPercent || ""}
                                    onChange={(event) =>
                                      updateProject(
                                        program.id,
                                        "designBudgetPercent",
                                        parseFloat(event.target.value) || 0
                                      )
                                    }
                                    className="w-16 border border-gray-300 rounded px-2 py-1"
                                    min="0"
                                    max="100"
                                  />
                                </td>
                                <td className="p-4">
                                  <input
                                    type="number"
                                    value={program.constructionBudgetPercent || ""}
                                    onChange={(event) =>
                                      updateProject(
                                        program.id,
                                        "constructionBudgetPercent",
                                        parseFloat(event.target.value) || 0
                                      )
                                    }
                                    className="w-16 border border-gray-300 rounded px-2 py-1"
                                    min="0"
                                    max="100"
                                  />
                                </td>
                                <td className="p-4">
                                  <div className="space-y-1">
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
                                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                                    />
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
                                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                                    />
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="space-y-1">
                                    <input
                                      type="number"
                                      value={program.continuousPmHours || ""}
                                      onChange={(event) =>
                                        updateProject(
                                          program.id,
                                          "continuousPmHours",
                                          parseInt(event.target.value, 10) || 0
                                        )
                                      }
                                      className="w-16 border border-gray-300 rounded px-1 py-1 text-xs"
                                      placeholder="PM"
                                      min="0"
                                    />
                                    <input
                                      type="number"
                                      value={program.continuousDesignHours || ""}
                                      onChange={(event) =>
                                        updateProject(
                                          program.id,
                                          "continuousDesignHours",
                                          parseInt(event.target.value, 10) || 0
                                        )
                                      }
                                      className="w-16 border border-gray-300 rounded px-1 py-1 text-xs"
                                      placeholder="Design"
                                      min="0"
                                    />
                                    <input
                                      type="number"
                                      value={program.continuousConstructionHours || ""}
                                      onChange={(event) =>
                                        updateProject(
                                          program.id,
                                          "continuousConstructionHours",
                                          parseInt(event.target.value, 10) || 0
                                        )
                                      }
                                      className="w-16 border border-gray-300 rounded px-1 py-1 text-xs"
                                      placeholder="Const"
                                      min="0"
                                    />
                                  </div>
                                </td>
                                <td className="p-4">
                                  <button
                                    onClick={() => deleteProject(program.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
