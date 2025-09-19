import React from "react";
import { Repeat, AlertTriangle, Info } from "lucide-react";

const StaffAllocations = ({
  projects,
  staffCategories,
  staffAllocations,
  updateStaffAllocation,
  fundingSources = [],
}) => {
  const deliveryGuidance = {
    "self-perform": {
      title: "Self-Perform Delivery",
      details: [
        "Utility staff complete design tasks and provide day-to-day construction oversight.",
        "Confirm LoE includes engineering, inspection, and project controls coverage from internal teams.",
      ],
      container: "bg-blue-50 border-blue-400 text-blue-900",
      iconClass: "text-blue-500",
      Icon: Info,
    },
    hybrid: {
      title: "Hybrid Delivery",
      details: [
        "Design and construction oversight are shared between utility and consultant resources.",
        "Clarify which scope items the utility is covering so LoE reflects only in-house responsibilities.",
      ],
      container: "bg-amber-50 border-amber-400 text-amber-900",
      iconClass: "text-amber-500",
      Icon: AlertTriangle,
    },
    consultant: {
      title: "Consultant Delivery",
      details: [
        "Utility role is focused on owner-side PM, design reviews, bidding coordination, and limited construction administration.",
        "Allocate LoE toward oversight touchpoints; consultant hours are managed outside of the internal staffing plan.",
      ],
      container: "bg-purple-50 border-purple-400 text-purple-900",
      iconClass: "text-purple-500",
      Icon: AlertTriangle,
    },
  };

  const deliveryLabels = {
    "self-perform": "Self-Perform",
    hybrid: "Hybrid",
    consultant: "Consultant-Led",
  };

  const deliveryBadgeStyles = {
    "self-perform": "bg-blue-100 text-blue-800",
    hybrid: "bg-amber-100 text-amber-800",
    consultant: "bg-purple-100 text-purple-800",
  };

  const requiresExternalCoordination = (fundingSource) => {
    if (!fundingSource || !fundingSource.name) return true;
    const name = fundingSource.name.toLowerCase();
    const description = (fundingSource.description || "").toLowerCase();

    const isCash =
      name.includes("cash") ||
      name.includes("general fund") ||
      description.includes("cash") ||
      description.includes("general fund");
    const isRevenueBond =
      name.includes("revenue bond") || description.includes("revenue bond");

    return !(isCash || isRevenueBond);
  };

  return (
    <div className="space-y-6">
      {projects.map((project) => (
        <div key={project.id} className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
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
              <div className="flex flex-col items-start gap-2 md:items-end">
                {(() => {
                  const key = project.deliveryType || "self-perform";
                  const label = deliveryLabels[key] || "Delivery";
                  const badgeClass =
                    deliveryBadgeStyles[key] || "bg-gray-100 text-gray-700";
                  return (
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
                    >
                      {label} Delivery
                    </span>
                  );
                })()}
                <p className="text-xs text-gray-500">
                  Funding: {
                    fundingSources.find(
                      (source) => source.id === project.fundingSourceId
                    )?.name || "Unassigned"
                  }
                </p>
              </div>
            </div>

            {(() => {
              const key = project.deliveryType || "self-perform";
              const guidance = deliveryGuidance[key];
              if (!guidance) return null;
              const GuidanceIcon = guidance.Icon;
              return (
                <div
                  className={`mt-4 rounded-md border-l-4 p-4 ${guidance.container}`}
                >
                  <div className="flex items-start gap-3">
                    <GuidanceIcon
                      size={20}
                      className={`${guidance.iconClass} mt-0.5 flex-shrink-0`}
                    />
                    <div className="space-y-1 text-sm leading-snug">
                      <p className="font-semibold">{guidance.title}</p>
                      {guidance.details.map((detail, index) => (
                        <p key={index}>{detail}</p>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {(() => {
              const fundingSource = fundingSources.find(
                (source) => source.id === project.fundingSourceId
              );
              if (!requiresExternalCoordination(fundingSource)) {
                return null;
              }
              return (
                <div className="mt-3 rounded-md border-l-4 border-orange-500 bg-orange-50 p-4 text-orange-900">
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      size={20}
                      className="mt-0.5 flex-shrink-0 text-orange-500"
                    />
                    <div className="space-y-1 text-sm leading-snug">
                      <p className="font-semibold">External Coordination Needed</p>
                      <p>
                        This project is funded through {" "}
                        <strong>{fundingSource?.name || "external sources"}</strong>
                        , so align LoE planning with state or partner agency
                        requirements before finalizing allocations.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
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
