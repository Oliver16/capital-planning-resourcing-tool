import React from "react";
import { Repeat } from "lucide-react";

const StaffAllocations = ({
  projects,
  staffCategories,
  staffAllocations,
  updateStaffAllocation,
}) => {
  return (
    <div className="space-y-6">
      {projects.map((project) => (
        <div key={project.id} className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">{project.name}</h3>
            <p className="text-gray-600">
              Design Budget: ${(project.designBudget / 1000).toFixed(0)}K |
              Construction Budget: $
              {(project.constructionBudget / 1000).toFixed(0)}K
            </p>
            <p className="text-sm text-gray-500">
              Design: {new Date(project.designStartDate).toLocaleDateString()} (
              {project.designDuration} months) | Construction:{" "}
              {new Date(project.constructionStartDate).toLocaleDateString()} (
              {project.constructionDuration} months)
            </p>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Staff Category</th>
                    <th className="text-left p-3">Hourly Rate</th>
                    <th className="text-left p-3">Design Hours</th>
                    <th className="text-left p-3">Design Cost</th>
                    <th className="text-left p-3">Construction Hours</th>
                    <th className="text-left p-3">Construction Cost</th>
                    <th className="text-left p-3">Total Hours</th>
                    <th className="text-left p-3">Total Cost</th>
                    <th className="text-left p-3">Monthly FTE</th>
                  </tr>
                </thead>
                <tbody>
                  {staffCategories.map((category) => {
                    const allocation = staffAllocations[project.id]?.[
                      category.id
                    ] || { designHours: 0, constructionHours: 0 };
                    const designCost =
                      allocation.designHours * category.hourlyRate;
                    const constructionCost =
                      allocation.constructionHours * category.hourlyRate;
                    const totalHours =
                      allocation.designHours + allocation.constructionHours;
                    const totalCost = designCost + constructionCost;

                    // Calculate monthly FTE during active phases
                    const designFTE =
                      project.designDuration > 0
                        ? (
                            allocation.designHours /
                            project.designDuration /
                            (4.33 * 40)
                          ).toFixed(2)
                        : 0;
                    const constructionFTE =
                      project.constructionDuration > 0
                        ? (
                            allocation.constructionHours /
                            project.constructionDuration /
                            (4.33 * 40)
                          ).toFixed(2)
                        : 0;

                    return (
                      <tr
                        key={category.id}
                        className="border-b border-gray-200"
                      >
                        <td className="p-3 font-medium">{category.name}</td>
                        <td className="p-3">${category.hourlyRate}</td>
                        <td className="p-3">
                          <input
                            type="number"
                            value={allocation.designHours}
                            onChange={(e) =>
                              updateStaffAllocation(
                                project.id,
                                category.id,
                                "design",
                                e.target.value
                              )
                            }
                            className="w-20 border border-gray-300 rounded px-2 py-1"
                            min="0"
                          />
                        </td>
                        <td className="p-3">${designCost.toLocaleString()}</td>
                        <td className="p-3">
                          <input
                            type="number"
                            value={allocation.constructionHours}
                            onChange={(e) =>
                              updateStaffAllocation(
                                project.id,
                                category.id,
                                "construction",
                                e.target.value
                              )
                            }
                            className="w-20 border border-gray-300 rounded px-2 py-1"
                            min="0"
                          />
                        </td>
                        <td className="p-3">
                          ${constructionCost.toLocaleString()}
                        </td>
                        <td className="p-3 font-medium">{totalHours}</td>
                        <td className="p-3 font-medium">
                          ${totalCost.toLocaleString()}
                        </td>
                        <td className="p-3">
                          <div className="text-xs">
                            <div>D: {designFTE}</div>
                            <div>C: {constructionFTE}</div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="3" className="p-3 font-semibold">
                      Project Totals:
                    </td>
                    <td className="p-3 font-semibold">
                      $
                      {staffCategories
                        .reduce((sum, cat) => {
                          const allocation = staffAllocations[project.id]?.[
                            cat.id
                          ] || { designHours: 0 };
                          return sum + allocation.designHours * cat.hourlyRate;
                        }, 0)
                        .toLocaleString()}
                    </td>
                    <td className="p-3"></td>
                    <td className="p-3 font-semibold">
                      $
                      {staffCategories
                        .reduce((sum, cat) => {
                          const allocation = staffAllocations[project.id]?.[
                            cat.id
                          ] || { constructionHours: 0 };
                          return (
                            sum + allocation.constructionHours * cat.hourlyRate
                          );
                        }, 0)
                        .toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold">
                      {staffCategories.reduce((sum, cat) => {
                        const allocation = staffAllocations[project.id]?.[
                          cat.id
                        ] || { designHours: 0, constructionHours: 0 };
                        return (
                          sum +
                          allocation.designHours +
                          allocation.constructionHours
                        );
                      }, 0)}
                    </td>
                    <td className="p-3 font-semibold">
                      $
                      {staffCategories
                        .reduce((sum, cat) => {
                          const allocation = staffAllocations[project.id]?.[
                            cat.id
                          ] || { designHours: 0, constructionHours: 0 };
                          return (
                            sum +
                            (allocation.designHours +
                              allocation.constructionHours) *
                              cat.hourlyRate
                          );
                        }, 0)
                        .toLocaleString()}
                    </td>
                    <td className="p-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ))}

      {/* Annual Programs Note */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Repeat size={20} />
          Annual Programs
        </h3>
        <p className="text-blue-800">
          Annual programs use continuous monthly resource demands defined in the
          Projects & Programs tab. These represent ongoing work that doesn't
          require specific project-by-project staff allocation.
        </p>
      </div>

      {/* Allocation Tips */}
      <div className="bg-green-50 p-6 rounded-lg">
        <h4 className="font-medium text-green-900 mb-2">Allocation Tips</h4>
        <div className="text-green-800 text-sm space-y-1">
          <p>
            • <strong>Design Hours:</strong> Include planning, engineering,
            permits, and design review
          </p>
          <p>
            • <strong>Construction Hours:</strong> Include project management,
            inspection, and construction oversight
          </p>
          <p>
            • <strong>Monthly FTE:</strong> Shows the average monthly commitment
            during each phase
          </p>
          <p>
            • Consider project complexity, regulatory requirements, and team
            experience when allocating hours
          </p>
        </div>
      </div>
    </div>
  );
};

export default StaffAllocations;
