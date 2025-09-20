import React, { useMemo } from "react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";
import { AlertTriangle, Users } from "lucide-react";

const roundForChart = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round(numeric * 10000) / 10000;
};

const formatFteTooltip = (value, name) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return [value, name];
  }
  return [`${numeric.toFixed(2)} FTE`, name];
};

const formatFteTick = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }

  if (Math.abs(numeric) >= 10) {
    return numeric.toFixed(0);
  }
  if (Math.abs(numeric) >= 1) {
    return numeric.toFixed(1);
  }
  return numeric.toFixed(2);
};

const ResourceForecast = ({
  resourceForecast,
  staffCategories,
  staffingGaps,
  timeHorizon,
  setTimeHorizon,
}) => {
  const summarySeries = useMemo(
    () =>
      resourceForecast.map((month) => {
        const totalRequiredRaw = staffCategories.reduce(
          (sum, category) => sum + (month[`${category.name}_required`] || 0),
          0
        );
        const totalActualRaw = staffCategories.reduce(
          (sum, category) => sum + (month[`${category.name}_actual`] || 0),
          0
        );
        const overAllocation = Math.max(
          totalRequiredRaw - totalActualRaw,
          0
        );

        return {
          month: month.month,
          monthLabel: month.monthLabel,
          totalRequired: roundForChart(totalRequiredRaw),
          totalActual: roundForChart(totalActualRaw),
          overAllocation: roundForChart(overAllocation),
        };
      }),
    [resourceForecast, staffCategories]
  );

  const peakMonth = useMemo(() => {
    if (summarySeries.length === 0) {
      return null;
    }
    return summarySeries.reduce((max, month) =>
      month.totalRequired > max.totalRequired ? month : max
    );
  }, [summarySeries]);

  const { averageUtilization, utilizationSamples } = useMemo(() => {
    if (summarySeries.length === 0) {
      return { averageUtilization: 0, utilizationSamples: 0 };
    }

    let sum = 0;
    let samples = 0;

    summarySeries.forEach((month) => {
      if (month.totalActual > 0) {
        sum += (month.totalRequired / month.totalActual) * 100;
        samples += 1;
      }
    });

    return {
      averageUtilization: samples > 0 ? sum / samples : 0,
      utilizationSamples: samples,
    };
  }, [summarySeries]);

  const gapMonthCount = useMemo(
    () => new Set(staffingGaps.map((gap) => gap.month)).size,
    [staffingGaps]
  );

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
              onChange={(e) => setTimeHorizon(parseInt(e.target.value, 10) || 36)}
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
          Allocated vs. Available Staffing (All Categories)
        </h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={summarySeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                label={{
                  value: "FTE",
                  angle: -90,
                  position: "insideLeft",
                }}
                allowDecimals
                tickFormatter={formatFteTick}
              />
              <Tooltip formatter={formatFteTooltip} />
              <Legend />
              <Area
                type="monotone"
                dataKey="totalActual"
                stackId="allocation"
                stroke="none"
                fill="transparent"
                isAnimationActive={false}
                activeDot={false}
                legendType="none"
              />
              <Area
                type="monotone"
                dataKey="overAllocation"
                stackId="allocation"
                stroke="none"
                fill="rgba(248, 113, 113, 0.35)"
                isAnimationActive={false}
                legendType="none"
                name="Over Allocation"
              />
              <Line
                type="monotone"
                dataKey="totalRequired"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                name="Allocated FTEs"
              />
              <Line
                type="monotone"
                dataKey="totalActual"
                stroke="#10b981"
                strokeDasharray="6 4"
                strokeWidth={2}
                dot={false}
                name="Available FTEs"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Capacity vs Demand Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {staffCategories.map((category) => {
          const categoryData = resourceForecast.map((month) => {
            const requiredRaw = month[`${category.name}_required`] || 0;
            const actualRaw = month[`${category.name}_actual`] || 0;
            const overAllocation = Math.max(requiredRaw - actualRaw, 0);

            return {
              month: month.monthLabel,
              required: roundForChart(requiredRaw),
              actual: roundForChart(actualRaw),
              overAllocation: roundForChart(overAllocation),
            };
          });

          return (
            <div
              key={category.id}
              className="bg-white p-6 rounded-lg shadow-sm"
            >
              <h4 className="text-lg font-semibold mb-4">{category.name}</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      allowDecimals
                      tickFormatter={formatFteTick}
                    />
                    <Tooltip formatter={formatFteTooltip} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      stackId="allocation"
                      stroke="none"
                      fill="transparent"
                      isAnimationActive={false}
                      activeDot={false}
                      legendType="none"
                    />
                    <Area
                      type="monotone"
                      dataKey="overAllocation"
                      stackId="allocation"
                      stroke="none"
                      fill="rgba(248, 113, 113, 0.35)"
                      isAnimationActive={false}
                      legendType="none"
                      name="Over Allocation"
                    />
                    <Line
                      type="monotone"
                      dataKey="required"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                      name="Allocated FTEs"
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={false}
                      name="Available FTEs"
                    />
                  </ComposedChart>
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
                    <th className="text-left p-3">Allocated (FTE)</th>
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
                      <td className="p-3">{gap.available}</td>
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
                Current actual availability appears sufficient for planned
                allocations.
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
                      • Prioritize hiring or reallocating staff for categories
                      with critical gaps
                    </li>
                    <li>
                      • Evaluate contractor resources to supplement internal
                      availability
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
                  <li>
                    • Available capacity appears adequate for current
                    allocations
                  </li>
                  <li>
                    • Consider accelerating project timelines if resources
                    allow
                  </li>
                  <li>
                    • Evaluate opportunities for additional projects within
                    available capacity
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
                {peakMonth ? (
                  <>
                    Month: {peakMonth.monthLabel}
                    <br />
                    Allocated: {peakMonth.totalRequired.toFixed(2)} FTE
                    <br />
                    Available: {peakMonth.totalActual.toFixed(2)} FTE
                  </>
                ) : (
                  "No forecast data available"
                )}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-medium text-red-900">Critical Periods</h4>
              <p className="text-red-800 text-sm mt-1">
                {staffingGaps.length} gaps identified across {gapMonthCount} months
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900">
                Resource Utilization
              </h4>
              <p className="text-green-800 text-sm mt-1">
                {utilizationSamples > 0
                  ? `${averageUtilization.toFixed(1)}% average utilization of available capacity`
                  : "Enter people availability data to calculate utilization."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceForecast;
