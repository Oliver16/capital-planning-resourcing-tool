import React from "react";
import { Plus, Trash2, Palette, CreditCard } from "lucide-react";

const SettingsTab = ({
  projectTypes,
  fundingSources,
  addProjectType,
  updateProjectType,
  deleteProjectType,
  addFundingSource,
  updateFundingSource,
  deleteFundingSource,
}) => {
  return (
    <div className="space-y-6">
      {/* Project Types Management */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Palette className="text-blue-600" size={24} />
            <h3 className="text-lg font-semibold">Project Types</h3>
          </div>
          <button
            onClick={addProjectType}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={16} />
            Add Type
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectTypes.map((type) => (
              <div
                key={type.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-gray-300"
                    style={{ backgroundColor: type.color }}
                    title="Project color"
                  ></div>
                  <button
                    onClick={() => deleteProjectType(type.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Delete project type"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={type.name}
                    onChange={(e) =>
                      updateProjectType(type.id, "name", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 font-medium"
                    placeholder="Type name"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 min-w-0">
                      Color:
                    </label>
                    <input
                      type="color"
                      value={type.color}
                      onChange={(e) =>
                        updateProjectType(type.id, "color", e.target.value)
                      }
                      className="w-full h-10 border border-gray-300 rounded cursor-pointer"
                      title="Choose project color"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Project Types Help */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              Project Types Usage
            </h4>
            <div className="text-blue-800 text-sm space-y-1">
              <p>
                • Project types help categorize and organize your capital
                improvement projects
              </p>
              <p>
                • Colors are used in timelines and charts for visual
                identification
              </p>
              <p>
                • Common types: Water Treatment, Distribution System, Pump
                Stations, Storage, Collection System
              </p>
              <p>
                • You can customize types to match your organization's project
                categories
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Funding Sources Management */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CreditCard className="text-green-600" size={24} />
            <h3 className="text-lg font-semibold">Funding Sources</h3>
          </div>
          <button
            onClick={addFundingSource}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Plus size={16} />
            Add Source
          </button>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-900">
                    Funding Source Name
                  </th>
                  <th className="text-left p-4 font-medium text-gray-900">
                    Description
                  </th>
                  <th className="text-left p-4 font-medium text-gray-900">
                    Projects Using
                  </th>
                  <th className="text-left p-4 font-medium text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {fundingSources.map((source, index) => (
                  <tr
                    key={source.id}
                    className={`border-b border-gray-200 ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <td className="p-4">
                      <input
                        type="text"
                        value={source.name}
                        onChange={(e) =>
                          updateFundingSource(source.id, "name", e.target.value)
                        }
                        className="w-full border border-gray-300 rounded px-3 py-2 font-medium"
                        placeholder="Enter funding source name"
                      />
                    </td>
                    <td className="p-4">
                      <input
                        type="text"
                        value={source.description}
                        onChange={(e) =>
                          updateFundingSource(
                            source.id,
                            "description",
                            e.target.value
                          )
                        }
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        placeholder="Enter description (optional)"
                      />
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        In use
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => deleteFundingSource(source.id)}
                        className="text-red-600 hover:text-red-800 p-2"
                        title="Delete funding source"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Funding Sources Help */}
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">
              Funding Sources Usage
            </h4>
            <div className="text-green-800 text-sm space-y-1">
              <p>
                • Track different funding mechanisms for your capital projects
              </p>
              <p>• Helps with financial reporting and budget planning</p>
              <p>
                • Common sources: General Fund, Revenue Bonds, State/Federal
                Grants, Developer Fees
              </p>
              <p>
                • Use descriptions to add details about terms, restrictions, or
                requirements
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* System Configuration */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">System Configuration</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Calculation Settings */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                Calculation Settings
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium">
                    Hours per FTE (monthly)
                  </span>
                  <span className="text-sm text-gray-600">173.2 hrs</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Weeks per month</span>
                  <span className="text-sm text-gray-600">4.33 weeks</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium">
                    Standard work week
                  </span>
                  <span className="text-sm text-gray-600">40 hours</span>
                </div>
              </div>
            </div>

            {/* Display Settings */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Display Settings</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium">
                    Default time horizon
                  </span>
                  <span className="text-sm text-gray-600">36 months</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Currency format</span>
                  <span className="text-sm text-gray-600">USD ($)</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Date format</span>
                  <span className="text-sm text-gray-600">MM/DD/YYYY</span>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Help */}
          <div className="mt-6 p-4 bg-purple-50 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-2">
              Configuration Notes
            </h4>
            <div className="text-purple-800 text-sm space-y-1">
              <p>
                • These settings affect how resource calculations are performed
              </p>
              <p>• FTE calculations assume standard 40-hour work weeks</p>
              <p>
                • Modify project types and funding sources to match your
                organization
              </p>
              <p>
                • Changes to calculation settings will update all forecasting
                immediately
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Management Summary */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Data Summary</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {projectTypes.length}
              </div>
              <div className="text-sm text-blue-800">Project Types</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {fundingSources.length}
              </div>
              <div className="text-sm text-green-800">Funding Sources</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">Active</div>
              <div className="text-sm text-purple-800">System Status</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">v1.0</div>
              <div className="text-sm text-yellow-800">Version</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
