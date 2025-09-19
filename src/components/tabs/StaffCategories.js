import React from "react";
import { Plus, Trash2 } from "lucide-react";

const StaffCategories = ({
  staffCategories,
  addStaffCategory,
  updateStaffCategory,
  deleteStaffCategory,
  capacityWarnings = {},
  maxMonthlyFteHours = 2080 / 12,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Staff Categories</h2>
        <button
          onClick={addStaffCategory}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={16} />
          Add Category
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4 min-w-[14rem]">Category Name</th>
              <th className="text-left p-4">Hourly Rate ($)</th>
              <th className="text-left p-4">PM Capacity (hrs/month)</th>
              <th className="text-left p-4">Design Capacity (hrs/month)</th>
              <th className="text-left p-4">
                Construction Capacity (hrs/month)
              </th>
              <th className="text-left p-4">Total Capacity (FTE)</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staffCategories.map((category) => {
              const totalHours =
                (category.pmCapacity || 0) +
                (category.designCapacity || 0) +
                (category.constructionCapacity || 0);
              const totalFTE = (totalHours / maxMonthlyFteHours).toFixed(2);

              return (
                <React.Fragment key={category.id}>
                  <tr className="border-b border-gray-200">
                    <td className="p-4 min-w-[14rem]">
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) =>
                          updateStaffCategory(
                            category.id,
                            "name",
                            e.target.value
                          )
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1"
                      />
                    </td>
                    <td className="p-4">
                      <input
                        type="number"
                        value={category.hourlyRate}
                        onChange={(e) =>
                          updateStaffCategory(
                            category.id,
                            "hourlyRate",
                            parseFloat(e.target.value)
                          )
                        }
                        className="w-24 border border-gray-300 rounded px-2 py-1"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td className="p-4">
                      <input
                        type="number"
                        value={category.pmCapacity || 0}
                        onChange={(e) =>
                          updateStaffCategory(
                            category.id,
                            "pmCapacity",
                            parseFloat(e.target.value)
                          )
                        }
                        className="w-24 border border-gray-300 rounded px-2 py-1"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td className="p-4">
                      <input
                        type="number"
                        value={category.designCapacity || 0}
                        onChange={(e) =>
                          updateStaffCategory(
                            category.id,
                            "designCapacity",
                            parseFloat(e.target.value)
                          )
                        }
                        className="w-24 border border-gray-300 rounded px-2 py-1"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td className="p-4">
                      <input
                        type="number"
                        value={category.constructionCapacity || 0}
                        onChange={(e) =>
                          updateStaffCategory(
                            category.id,
                            "constructionCapacity",
                            parseFloat(e.target.value)
                          )
                        }
                        className="w-24 border border-gray-300 rounded px-2 py-1"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td className="p-4">
                      <span
                        className={`font-medium ${
                          parseFloat(totalFTE) >= 1
                            ? "text-red-600"
                            : "text-blue-600"
                        }`}
                      >
                        {totalFTE}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => deleteStaffCategory(category.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                  {capacityWarnings[category.id] && (
                    <tr className="bg-red-50">
                      <td
                        colSpan="7"
                        className="p-4 text-sm text-red-700 border-b border-gray-200"
                      >
                        {capacityWarnings[category.id]}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Capacity Information */}
      <div className="p-6 bg-blue-50">
        <h4 className="font-medium text-blue-900 mb-2">
          Three-Phase Resource Planning
        </h4>
        <div className="text-blue-800 text-sm space-y-1">
          <p>
            • <strong>PM Capacity:</strong> Project management hours available
            (runs entire project duration)
          </p>
          <p>
            • <strong>Design Capacity:</strong> Monthly hours available for
            design work (concentrated during design phase)
          </p>
          <p>
            • <strong>Construction Capacity:</strong> Monthly hours available
            for construction oversight (concentrated during construction phase)
          </p>
          <p>
            • <strong>FTE Calculation:</strong> 1 FTE = 173.33 hours/month (2080
            hours/year ÷ 12 months)
          </p>
          <p>
            • <strong>Capacity Limit:</strong> The combined PM, design, and
            construction capacity for a role cannot exceed 1 FTE per month.
          </p>
          <p>
            • Staff can have capacity across multiple phases based on their role
            and skills
          </p>
        </div>
      </div>
    </div>
  );
};

export default StaffCategories;
