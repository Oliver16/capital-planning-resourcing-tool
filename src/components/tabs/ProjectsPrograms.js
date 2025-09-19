import React from "react";
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
  addProject,
  updateProject,
  deleteProject,
  handleImport,
}) => {
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
              onClick={downloadCSVTemplate}
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
                  const projectType = projectTypes.find(
                    (t) => t.id === program.projectTypeId
                  );
                  const fundingSource = fundingSources.find(
                    (f) => f.id === program.fundingSourceId
                  );
                  return (
                    <tr key={program.id} className="border-b border-gray-200">
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
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-600">PM</span>
                            <input
                              type="number"
                              value={program.continuousPmHours || 0}
                              onChange={(e) =>
                                updateProject(
                                  program.id,
                                  "continuousPmHours",
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className="w-16 border border-gray-300 rounded px-1 py-1"
                              placeholder="PM"
                              min="0"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-600">D</span>
                            <input
                              type="number"
                              value={program.continuousDesignHours || 0}
                              onChange={(e) =>
                                updateProject(
                                  program.id,
                                  "continuousDesignHours",
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className="w-16 border border-gray-300 rounded px-1 py-1"
                              placeholder="Design"
                              min="0"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-600">C</span>
                            <input
                              type="number"
                              value={program.continuousConstructionHours || 0}
                              onChange={(e) =>
                                updateProject(
                                  program.id,
                                  "continuousConstructionHours",
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className="w-16 border border-gray-300 rounded px-1 py-1"
                              placeholder="Const"
                              min="0"
                            />
                          </div>
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
            Program End, Continuous PM Hours, Continuous Design Hours,
            Continuous Construction Hours
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
