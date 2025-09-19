import React, { useMemo, useState } from "react";
import { Plus, Upload, Trash2, Repeat, Download } from "lucide-react";
import { downloadCSVTemplate } from "../../utils/dataImport";

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
  const categories = useMemo(
    () => (Array.isArray(staffCategories) ? staffCategories : []),
    [staffCategories]
  );

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
              {projects
                .filter((p) => p.type === "project")
                .map((project) => {
                  const projectType = projectTypes.find(
                    (t) => t.id === project.projectTypeId
                  );
                  const fundingSource = fundingSources.find(
                    (f) => f.id === project.fundingSourceId
                  );
                  return (
                    <tr key={project.id} className="border-b border-gray-200">
                      <td className="p-4 min-w-[16rem]">
                        <input
                          type="text"
                          value={project.name}
                          onChange={(e) =>
                            updateProject(project.id, "name", e.target.value)
                          }
                          className="w-full border border-gray-300 rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-4">
                        <select
                          value={project.projectTypeId}
                          onChange={(e) =>
                            updateProject(
                              project.id,
                              "projectTypeId",
                              parseInt(e.target.value)
                            )
                          }
                          className="border border-gray-300 rounded px-2 py-1"
                        >
                          {projectTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4">
                        <select
                          value={project.fundingSourceId}
                          onChange={(e) =>
                            updateProject(
                              project.id,
                              "fundingSourceId",
                              parseInt(e.target.value)
                            )
                          }
                          className="border border-gray-300 rounded px-2 py-1"
                        >
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
                          onChange={(e) =>
                            updateProject(
                              project.id,
                              "deliveryType",
                              e.target.value
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
                          value={project.totalBudget}
                          onChange={(e) =>
                            updateProject(
                              project.id,
                              "totalBudget",
                              parseInt(e.target.value)
                            )
                          }
                          className="w-28 border border-gray-300 rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-4">
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
                          className="border border-gray-300 rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-4">
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
                              onChange={(e) =>
                                updateProject(
                                  project.id,
                                  "designDuration",
                                  parseInt(e.target.value, 10) || 0
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
                              onChange={(e) =>
                                updateProject(
                                  project.id,
                                  "constructionDuration",
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className="w-20 border border-gray-300 rounded px-2 py-1"
                            />
                          </label>
                        </div>
                      </td>
                      <td className="p-4">
                        <select
                          value={project.priority}
                          onChange={(e) =>
                            updateProject(
                              project.id,
                              "priority",
                              e.target.value
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
                  );
                })}
            </tbody>
          </table>
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
              {projects
                .filter((p) => p.type === "program")
                .map((program) => {
                  const totals = getProgramTotals(program);
                  const categoryConfig = parseContinuousCategoryConfig(
                    program.continuousHoursByCategory
                  );
                  const isExpanded = expandedPrograms.includes(program.id);
                  return (
                    <React.Fragment key={program.id}>
                      <tr className="border-b border-gray-200">
                        <td className="p-4 min-w-[16rem]">
                          <input
                            type="text"
                            value={program.name}
                            onChange={(e) =>
                              updateProject(program.id, "name", e.target.value)
                            }
                            className="w-full border border-gray-300 rounded px-2 py-1"
                          />
                        </td>
                        <td className="p-4">
                          <select
                            value={program.projectTypeId}
                            onChange={(e) =>
                              updateProject(
                                program.id,
                                "projectTypeId",
                                parseInt(e.target.value)
                              )
                            }
                            className="border border-gray-300 rounded px-2 py-1"
                          >
                            {projectTypes.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4">
                          <select
                            value={program.fundingSourceId}
                            onChange={(e) =>
                              updateProject(
                                program.id,
                                "fundingSourceId",
                                parseInt(e.target.value)
                              )
                            }
                            className="border border-gray-300 rounded px-2 py-1"
                          >
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
                            value={program.annualBudget}
                            onChange={(e) =>
                              updateProject(
                                program.id,
                                "annualBudget",
                                parseInt(e.target.value)
                              )
                            }
                            className="w-28 border border-gray-300 rounded px-2 py-1"
                          />
                        </td>
                        <td className="p-4">
                          <input
                            type="number"
                            value={program.designBudgetPercent}
                            onChange={(e) =>
                              updateProject(
                                program.id,
                                "designBudgetPercent",
                                parseFloat(e.target.value)
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
                            value={program.constructionBudgetPercent}
                            onChange={(e) =>
                              updateProject(
                                program.id,
                                "constructionBudgetPercent",
                                parseFloat(e.target.value)
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
                              value={program.programStartDate}
                              onChange={(e) =>
                                updateProject(
                                  program.id,
                                  "programStartDate",
                                  e.target.value
                                )
                              }
                              className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                            />
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
                              className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                            />
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 font-medium">PM</span>
                              <span className="font-semibold">
                                {formatHours(totals.pm)} hrs/mo
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 font-medium">Design</span>
                              <span className="font-semibold">
                                {formatHours(totals.design)} hrs/mo
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 font-medium">Construction</span>
                              <span className="font-semibold">
                                {formatHours(totals.construction)} hrs/mo
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleProgramExpansion(program.id)}
                              className="text-purple-600 hover:text-purple-800 font-medium"
                            >
                              {isExpanded ? "Hide Category Hours" : "Edit Category Hours"}
                            </button>
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
                      {isExpanded && (
                        <tr className="bg-purple-50">
                          <td colSpan={9} className="p-4">
                            <div className="space-y-3">
                              <p className="text-xs text-purple-900">
                                Assign monthly hours for each staff category. Totals
                                update automatically and feed resource forecasts.
                              </p>
                              {categories.length === 0 ? (
                                <p className="text-xs text-purple-800">
                                  Add staff categories in the Staff tab to
                                  configure per-category program hours.
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
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
            </tbody>
          </table>
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
