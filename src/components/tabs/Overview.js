import React from "react";
import { AlertTriangle, Repeat } from "lucide-react";

const Overview = ({
  projects,
  projectTypes,
  staffingGaps,
  projectTimelines,
  showStaffingGaps = true,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Summary Cards */}
      <div className="space-y-4">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Portfolio Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Projects</p>
              <p className="text-2xl font-bold text-blue-600">
                {projects.filter((p) => p.type === "project").length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Annual Programs</p>
              <p className="text-2xl font-bold text-green-600">
                {projects.filter((p) => p.type === "program").length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Budget</p>
              <p className="text-2xl font-bold text-purple-600">
                $
                {(
                  projects.reduce((sum, p) => {
                    return sum + (p.totalBudget || p.annualBudget || 0);
                  }, 0) / 1000000
                ).toFixed(1)}
                M
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Staffing Gaps</p>
              <p className="text-2xl font-bold text-red-600">
                {staffingGaps.length}
              </p>
            </div>
          </div>
        </div>

        {/* Critical Staffing Gaps */}
        {showStaffingGaps && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={20} />
              Critical Staffing Gaps
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {staffingGaps.slice(0, 10).map((gap, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-2 bg-red-50 rounded"
                >
                  <div>
                    <span className="font-medium">{gap.category}</span>
                    <span className="text-sm text-gray-600 ml-2">
                      ({gap.monthLabel})
                    </span>
                  </div>
                  <span className="text-red-600 font-medium">-{gap.gap} FTE</span>
                </div>
              ))}
              {staffingGaps.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No critical staffing gaps identified
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Project Timeline */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4">
          Projects & Programs Timeline
        </h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {projectTimelines.map((project) => {
            const projectType = projectTypes.find(
              (t) => t.id === project.projectTypeId
            );
            return (
              <div
                key={project.id}
                className="border-l-4 pl-4"
                style={{ borderColor: projectType?.color || "#3b82f6" }}
              >
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{project.name}</h4>
                  {project.type === "program" && (
                    <Repeat size={16} className="text-green-600" />
                  )}
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  {project.type === "project" ? (
                    <>
                      <div>
                        Design: {project.designStart.toLocaleDateString()} -{" "}
                        {project.designEnd.toLocaleDateString()}
                      </div>
                      <div>
                        Construction:{" "}
                        {project.constructionStart.toLocaleDateString()} -{" "}
                        {project.constructionEnd.toLocaleDateString()}
                      </div>
                      <div>
                        Budget: ${(project.totalBudget / 1000000).toFixed(1)}M
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        Program Period:{" "}
                        {project.designStart.toLocaleDateString()} -{" "}
                        {project.constructionEnd.toLocaleDateString()}
                      </div>
                      <div>
                        Annual Budget: $
                        {(project.annualBudget / 1000).toFixed(0)}K
                      </div>
                      <div>Continuous Resource Demand</div>
                    </>
                  )}
                  <div>Type: {projectType?.name || "Unknown"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Overview;
