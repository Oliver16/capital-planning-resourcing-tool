import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { AlertTriangle, Users } from "lucide-react";

const ResourceForecast = ({
  resourceForecast,
  staffCategories,
  staffingGaps,
  timeHorizon,
  setTimeHorizon,
}) => {
  return (
    <div className="space-y-6">
      {/* Time Horizon Control */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Resource Forecast</h2>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">
              Time Horizon (months):
            </label>
            <input
              type="number"
              value={timeHorizon}
              onChange={(e) => setTimeHorizon(parseInt(e.target.value) || 36)}
              className="w-16 border border-gray-300 rounded px-2 py-1"
              min="12"
              max="60"
            />
          </div>
        </div>
      </div>

      {/* Resource Demand Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4">
          Staff Resource Demand Over Time
        </h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={resourceForecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                label={{
                  value: "FTE Required",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip />
              <Legend />
              {staffCategories.map((category, index) => (
                <Line
                  key={category.id}
                  type="monotone"
                  dataKey={`${category.name}_required`}
                  stroke={`hsl(${index * 60}, 70%, 50%)`}
                  strokeWidth={2}
                  name={category.name}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Capacity vs Demand Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {staffCategories.map((category) => {
          const categoryData = resourceForecast.map((month) => ({
            month: month.monthLabel,
            required: month[`${category.name}_required`],
            capacity: month[`${category.name}_capacity`] / (4.33 * 40),
            gap: Math.max(
              0,
              month[`${category.name}_required`] -
                month[`${category.name}_capacity`] / (4.33 * 40)
            ),
          }));

          return (
            <div
              key={category.id}
              className="bg-white p-6 rounded-lg shadow-sm"
            >
              <h4 className="text-lg font-semibold mb-4">{category.name}</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="capacity"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.3}
                      name="Available Capacity"
                    />
                    <Area
                      type="monotone"
                      dataKey="required"
                      stackId="2"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                      name="Required"
                    />
                    <Area
                      type="monotone"
                      dataKey="gap"
                      stackId="3"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.8}
                      name="Staffing Gap"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      {/* Staffing Gaps Summary */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={20} />
            Detailed Staffing Gaps Analysis
          </h3>
        </div>
        <div className="p-6">
          {staffingGaps.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Month</th>
                    <th className="text-left p-3">Staff Category</th>
                    <th className="text-left p-3">Required (FTE)</th>
                    <th className="text-left p-3">Available (FTE)</th>
                    <th className="text-left p-3">Gap (FTE)</th>
                    <th className="text-left p-3">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {staffingGaps.map((gap, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="p-3">{gap.monthLabel}</td>
                      <td className="p-3 font-medium">{gap.category}</td>
                      <td className="p-3">{gap.required}</td>
                      <td className="p-3">{gap.capacity}</td>
                      <td className="p-3 text-red-600 font-medium">
                        {gap.gap}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            parseFloat(gap.gap) > 1
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {parseFloat(gap.gap) > 1 ? "Critical" : "Moderate"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-green-500 mb-2">
                <Users size={48} className="mx-auto" />
              </div>
              <h4 className="text-lg font-medium text-gray-900">
                No Staffing Gaps Identified
              </h4>
              <p className="text-gray-600">
                Current staff capacity appears sufficient for planned projects.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Items */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Recommended Actions</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {staffingGaps.length > 0 ? (
              <>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Immediate Actions
                  </h4>
                  <ul className="text-blue-800 space-y-1">
                    <li>
                      • Consider hiring additional staff for categories with
                      critical gaps
                    </li>
                    <li>
                      • Evaluate contractor resources to supplement internal
                      capacity
                    </li>
                    <li>
                      • Review project schedules for potential timeline
                      adjustments
                    </li>
                    <li>
                      • Assess if annual programs can be scaled back during peak
                      project periods
                    </li>
                  </ul>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">
                    Strategic Planning
                  </h4>
                  <ul className="text-yellow-800 space-y-1">
                    <li>
                      • Develop cross-training programs to increase staff
                      flexibility
                    </li>
                    <li>
                      • Consider phasing project starts to balance resource
                      demand
                    </li>
                    <li>
                      • Establish partnerships with consulting firms for peak
                      demand periods
                    </li>
                    <li>
                      • Evaluate splitting design and construction timing to
                      optimize resources
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">
                  Optimization Opportunities
                </h4>
                <ul className="text-green-800 space-y-1">
                  <li>• Current capacity appears adequate for planned work</li>
                  <li>
                    • Consider accelerating project timelines if resources allow
                  </li>
                  <li>
                    • Evaluate opportunities for additional projects within
                    capacity
                  </li>
                  <li>
                    • Review annual program funding for potential expansion
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Forecast Summary */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Forecast Summary</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900">
                Peak Resource Demand
              </h4>
              <p className="text-blue-800 text-sm mt-1">
                {resourceForecast.length > 0 && (
                  <>
                    Month:{" "}
                    {
                      resourceForecast.reduce((max, month) => {
                        const totalRequired = staffCategories.reduce(
                          (sum, cat) => sum + month[`${cat.name}_required`],
                          0
                        );
                        const maxRequired = staffCategories.reduce(
                          (sum, cat) => sum + max[`${cat.name}_required`],
                          0
                        );
                        return totalRequired > maxRequired ? month : max;
                      }, resourceForecast[0]).monthLabel
                    }
                  </>
                )}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-medium text-red-900">Critical Periods</h4>
              <p className="text-red-800 text-sm mt-1">
                {staffingGaps.length} gaps identified across{" "}
                {new Set(staffingGaps.map((g) => g.month)).size} months
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900">
                Resource Utilization
              </h4>
              <p className="text-green-800 text-sm mt-1">
                Average utilization varies by category and time period
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceForecast;
