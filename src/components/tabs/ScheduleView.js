import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { CalendarClock, Filter, Users } from "lucide-react";
import {
  generateResourceForecast,
  calculateStaffingGaps,
} from "../../utils/calculations";

const HORIZON_OPTIONS = [
  { label: "1 Year", value: 12 },
  { label: "3 Years", value: 36 },
  { label: "5 Years", value: 60 },
  { label: "10 Years", value: 120 },
];

const DESIGN_COLOR = "#3b82f6";
const CONSTRUCTION_COLOR = "#f59e0b";
const DEFAULT_TYPE_COLOR = "#6b7280";

const ScheduleLegend = ({ scheduleHorizon, className = "" }) => (
  <div className={`flex flex-wrap items-center gap-4 text-xs text-gray-600 ${className}`}>
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-3 w-3 rounded-full"
        style={{ backgroundColor: DESIGN_COLOR }}
      ></span>
      Design Schedule
    </div>
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-3 w-3 rounded-full"
        style={{ backgroundColor: CONSTRUCTION_COLOR }}
      ></span>
      Construction Schedule
    </div>
    <div className="text-xs text-gray-500">
      Year dividers help visualize the {scheduleHorizon / 12}-year planning window.
    </div>
  </div>
);

const formatDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "TBD";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};

const monthDiff = (start, end) => {
  if (
    !(start instanceof Date) ||
    Number.isNaN(start.getTime()) ||
    !(end instanceof Date) ||
    Number.isNaN(end.getTime())
  ) {
    return 0;
  }

  return (
    end.getFullYear() * 12 + end.getMonth() - (start.getFullYear() * 12 + start.getMonth())
  );
};

const ScheduleView = ({
  projectTimelines,
  projectTypes,
  staffCategories,
  staffAllocations,
  staffAvailabilityByCategory,
  scheduleHorizon,
  setScheduleHorizon,
}) => {
  const typeOptions = useMemo(() => {
    const optionsMap = new Map();

    (projectTimelines || []).forEach((project) => {
      if (!project) return;

      const key =
        project.projectTypeId === null || project.projectTypeId === undefined
          ? "unassigned"
          : String(project.projectTypeId);
      const typeInfo = projectTypes.find((type) => String(type.id) === key);
      const existing = optionsMap.get(key);

      if (existing) {
        existing.count += 1;
      } else {
        optionsMap.set(key, {
          key,
          label: typeInfo?.name || "Unassigned type",
          color: typeInfo?.color || DEFAULT_TYPE_COLOR,
          count: 1,
        });
      }
    });

    const orderedOptions = [];
    projectTypes.forEach((type) => {
      const key = String(type.id);
      if (optionsMap.has(key)) {
        orderedOptions.push(optionsMap.get(key));
        optionsMap.delete(key);
      }
    });

    if (optionsMap.has("unassigned")) {
      orderedOptions.push(optionsMap.get("unassigned"));
      optionsMap.delete("unassigned");
    }

    optionsMap.forEach((option) => {
      orderedOptions.push(option);
    });

    return orderedOptions;
  }, [projectTimelines, projectTypes]);

  const [selectedTypeMap, setSelectedTypeMap] = useState({});
  const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);
  const typeFilterRef = useRef(null);

  useEffect(() => {
    setSelectedTypeMap((previous) => {
      if (typeOptions.length === 0) {
        if (Object.keys(previous).length === 0) {
          return previous;
        }
        return {};
      }

      const next = { ...previous };
      let changed = false;

      typeOptions.forEach((option) => {
        if (next[option.key] === undefined) {
          next[option.key] = true;
          changed = true;
        }
      });

      Object.keys(next).forEach((key) => {
        if (!typeOptions.some((option) => option.key === key)) {
          delete next[key];
          changed = true;
        }
      });

      return changed ? next : previous;
    });
  }, [typeOptions]);

  useEffect(() => {
    if (!isTypeFilterOpen) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (
        typeFilterRef.current &&
        !typeFilterRef.current.contains(event.target)
      ) {
        setIsTypeFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isTypeFilterOpen]);

  const activeTypeKeys = useMemo(() => {
    if (typeOptions.length === 0) {
      return [];
    }

    return typeOptions
      .filter((option) => selectedTypeMap[option.key] !== false)
      .map((option) => option.key);
  }, [typeOptions, selectedTypeMap]);

  const filteredProjectTimelines = useMemo(() => {
    if (activeTypeKeys.length === 0) {
      return [];
    }

    const allowed = new Set(activeTypeKeys);
    return (projectTimelines || []).filter((project) => {
      if (!project) return false;
      const key =
        project.projectTypeId === null || project.projectTypeId === undefined
          ? "unassigned"
          : String(project.projectTypeId);
      return allowed.has(key);
    });
  }, [projectTimelines, activeTypeKeys]);

  const typeSummaryLabel = useMemo(() => {
    if (typeOptions.length === 0) {
      return "All project types";
    }

    if (activeTypeKeys.length === 0) {
      return "No types selected";
    }

    if (activeTypeKeys.length === typeOptions.length) {
      return "All project types";
    }

    return `${activeTypeKeys.length} of ${typeOptions.length} selected`;
  }, [typeOptions, activeTypeKeys]);

  const isFilterActive = useMemo(
    () =>
      typeOptions.length > 0 &&
      activeTypeKeys.length !== typeOptions.length,
    [typeOptions, activeTypeKeys]
  );

  const scheduleStart = useMemo(() => {
    const source =
      filteredProjectTimelines.length > 0
        ? filteredProjectTimelines
        : projectTimelines;
    const validStarts = (source || [])
      .map((project) => project?.designStart)
      .filter((date) => date instanceof Date && !Number.isNaN(date.getTime()));

    const start =
      validStarts.length > 0
        ? new Date(Math.min(...validStarts.map((date) => date.getTime())))
        : new Date();

    start.setDate(1);
    return start;
  }, [filteredProjectTimelines, projectTimelines]);

  const horizonEnd = useMemo(() => {
    const end = new Date(scheduleStart);
    end.setMonth(end.getMonth() + Math.max(1, scheduleHorizon));
    return end;
  }, [scheduleStart, scheduleHorizon]);

  const scheduleForecast = useMemo(
    () =>
      generateResourceForecast(
        filteredProjectTimelines,
        staffAllocations,
        staffCategories,
        Math.max(1, scheduleHorizon),
        staffAvailabilityByCategory
      ),
    [
      filteredProjectTimelines,
      staffAllocations,
      staffCategories,
      scheduleHorizon,
      staffAvailabilityByCategory,
    ]
  );

  const scheduleGaps = useMemo(
    () => calculateStaffingGaps(scheduleForecast, staffCategories),
    [scheduleForecast, staffCategories]
  );

  const aggregatedForecast = useMemo(() => {
    if (!Array.isArray(scheduleForecast) || scheduleForecast.length === 0) {
      return [];
    }

    return scheduleForecast.slice(0, scheduleHorizon).map((month) => {
      const actual = staffCategories.reduce(
        (sum, category) => sum + (month[`${category.name}_actual`] || 0),
        0
      );
      const required = staffCategories.reduce(
        (sum, category) => sum + (month[`${category.name}_required`] || 0),
        0
      );
      const shortage = Math.max(0, required - actual);

      return {
        month: month.month,
        monthLabel: month.monthLabel,
        required: Number(required.toFixed(2)),
        actual: Number(actual.toFixed(2)),
        shortage: Number(shortage.toFixed(2)),
      };
    });
  }, [scheduleForecast, staffCategories, scheduleHorizon]);

  const summary = useMemo(() => {
    if (aggregatedForecast.length === 0) {
      return {
        peakRequired: 0,
        peakShortage: 0,
        shortageMonth: "",
        shortageCount: 0,
        averageUtilization: 0,
      };
    }

    let peakRequired = 0;
    let peakShortage = 0;
    let shortageMonth = "";
    let shortageCount = 0;
    let utilizationSum = 0;
    let utilizationSamples = 0;

    aggregatedForecast.forEach((month) => {
      peakRequired = Math.max(peakRequired, month.required);

      if (month.shortage > peakShortage) {
        peakShortage = month.shortage;
        shortageMonth = month.monthLabel;
      }

      if (month.shortage > 0.01) {
        shortageCount += 1;
      }

      if (month.actual > 0) {
        utilizationSum += (month.required / month.actual) * 100;
        utilizationSamples += 1;
      }
    });

    const averageUtilization =
      utilizationSamples > 0 ? utilizationSum / utilizationSamples : 0;

    return {
      peakRequired,
      peakShortage,
      shortageMonth,
      shortageCount,
      averageUtilization,
    };
  }, [aggregatedForecast]);

  const yearMarkers = useMemo(() => {
    const markers = [];
    const totalMonths = Math.max(1, scheduleHorizon);
    const totalYears = Math.ceil(totalMonths / 12);

    for (let i = 0; i <= totalYears; i += 1) {
      const markerDate = new Date(scheduleStart);
      markerDate.setMonth(markerDate.getMonth() + i * 12);
      markers.push({
        label: markerDate.getFullYear(),
        offsetPercent: Math.min(100, (i * 12 * 100) / totalMonths),
      });
    }

    return markers;
  }, [scheduleStart, scheduleHorizon]);

  const totalMonths = Math.max(1, scheduleHorizon);

  const timelineRows = useMemo(() => {
    const horizonMs = horizonEnd.getTime();

    const computeSegment = (phaseStart, phaseEnd) => {
      if (
        !(phaseStart instanceof Date) ||
        Number.isNaN(phaseStart.getTime()) ||
        !(phaseEnd instanceof Date) ||
        Number.isNaN(phaseEnd.getTime())
      ) {
        return null;
      }

      if (phaseEnd.getTime() <= scheduleStart.getTime() || phaseStart.getTime() >= horizonMs) {
        return null;
      }

      const clampedStart =
        phaseStart.getTime() < scheduleStart.getTime() ? scheduleStart : phaseStart;
      const clampedEnd = phaseEnd.getTime() > horizonMs ? new Date(horizonMs) : phaseEnd;

      const offsetMonths = Math.max(0, monthDiff(scheduleStart, clampedStart));
      const rawDuration = Math.max(0, monthDiff(clampedStart, clampedEnd));
      const maxDuration = Math.max(0, totalMonths - offsetMonths);
      const duration = Math.min(Math.max(rawDuration, 0.5), maxDuration);

      if (duration <= 0) {
        return null;
      }

      return {
        offsetPercent: (offsetMonths / totalMonths) * 100,
        widthPercent: (duration / totalMonths) * 100,
        start: clampedStart,
        end: clampedEnd,
      };
    };

    return filteredProjectTimelines
      .map((project) => {
        const projectType = projectTypes.find((type) => type.id === project.projectTypeId);
        const designSegment = computeSegment(project.designStart, project.designEnd);
        const constructionSegment = computeSegment(
          project.constructionStart,
          project.constructionEnd
        );

        if (!designSegment && !constructionSegment) {
          return null;
        }

        return {
          project,
          projectType,
          designSegment,
          constructionSegment,
        };
      })
      .filter(Boolean);
  }, [
    filteredProjectTimelines,
    projectTypes,
    horizonEnd,
    scheduleStart,
    totalMonths,
  ]);

  const filteredGaps = useMemo(() => {
    if (!Array.isArray(scheduleGaps) || scheduleGaps.length === 0) {
      return [];
    }

    return scheduleGaps.filter((gap) => {
      const gapDate = new Date(`${gap.month}-01`);
      return (
        gapDate instanceof Date &&
        !Number.isNaN(gapDate.getTime()) &&
        gapDate >= scheduleStart &&
        gapDate < horizonEnd
      );
    });
  }, [scheduleGaps, scheduleStart, horizonEnd]);

  const yearGridStyle = useMemo(() => {
    const yearWidth = (12 / totalMonths) * 100;

    if (!Number.isFinite(yearWidth) || yearWidth <= 0) {
      return {};
    }

    return {
      backgroundImage: `repeating-linear-gradient(to right, transparent, transparent calc(${yearWidth}% - 1px), rgba(209, 213, 219, 0.6) calc(${yearWidth}% - 1px), rgba(209, 213, 219, 0.6) calc(${yearWidth}%))`,
    };
  }, [totalMonths]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <CalendarClock size={20} className="text-blue-600" />
              Resource-Loaded Schedule
            </h2>
            <p className="text-sm text-gray-600">
              Toggle between strategic horizons to review project delivery timelines and
              correlated staffing demand.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {typeOptions.length > 0 && (
              <div className="relative" ref={typeFilterRef}>
                <button
                  type="button"
                  onClick={() => setIsTypeFilterOpen((previous) => !previous)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                    isFilterActive
                      ? "border-blue-500 bg-blue-50 text-blue-600"
                      : "border-gray-300 text-gray-600 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  <Filter size={14} />
                  <span>{typeSummaryLabel}</span>
                </button>

                {isTypeFilterOpen && (
                  <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase text-gray-500">
                      <span>Project types</span>
                      <button
                        type="button"
                        onClick={() => setIsTypeFilterOpen(false)}
                        className="text-gray-400 transition hover:text-gray-600"
                      >
                        Close
                      </button>
                    </div>

                    <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                      {typeOptions.map((option) => {
                        const isChecked = selectedTypeMap[option.key] !== false;
                        return (
                          <label
                            key={option.key}
                            className="flex items-center justify-between gap-3 text-sm text-gray-700"
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() =>
                                  setSelectedTypeMap((previous) => ({
                                    ...previous,
                                    [option.key]: !(previous[option.key] !== false),
                                  }))
                                }
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="flex items-center gap-2">
                                <span
                                  className="inline-block h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: option.color || DEFAULT_TYPE_COLOR }}
                                ></span>
                                {option.label}
                              </span>
                            </span>
                            <span className="text-xs text-gray-400">{option.count}</span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-blue-600">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedTypeMap((previous) => {
                            const next = { ...previous };
                            typeOptions.forEach((option) => {
                              next[option.key] = true;
                            });
                            return next;
                          })
                        }
                        className="hover:underline"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedTypeMap((previous) => {
                            const next = { ...previous };
                            typeOptions.forEach((option) => {
                              next[option.key] = false;
                            });
                            return next;
                          })
                        }
                        className="hover:underline"
                      >
                        Clear
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsTypeFilterOpen(false)}
                      className="mt-3 w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition hover:bg-gray-50"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            )}

            {HORIZON_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setScheduleHorizon(option.value)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  scheduleHorizon === option.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-300 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {typeOptions.length > 0 && activeTypeKeys.length === 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No project types are selected. Choose at least one type to update the
            schedule and resource charts.
          </div>
        )}

        <div className="sticky top-4 z-30 mt-6">
          <div className="rounded-lg border border-gray-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
            <ScheduleLegend scheduleHorizon={scheduleHorizon} />
          </div>
        </div>

        <div className="mt-6">
          <div className="relative h-10 mb-8">
            <div className="absolute inset-x-0 top-4 border-t border-gray-300" />
            {yearMarkers.map((marker, index) => (
              <div key={`${marker.label}-${index}`}>
                <div
                  className="absolute top-0 bottom-0 w-px bg-gray-200"
                  style={{ left: `${marker.offsetPercent}%` }}
                />
                <div
                  className="absolute top-5 text-xs text-gray-500 -translate-x-1/2"
                  style={{ left: `${marker.offsetPercent}%` }}
                >
                  {marker.label}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-5">
            {timelineRows.length > 0 ? (
              timelineRows.map((row) => (
                <div
                  key={row.project.id}
                  className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-center"
                >
                  <div className="md:col-span-3">
                    <div className="font-medium text-gray-900">
                      {row.project.name}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: row.projectType?.color || "#3b82f6" }}
                      ></span>
                      {row.project.type === "program" ? "Program" : "Project"}
                      {row.projectType?.name && ` • ${row.projectType.name}`}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatDate(row.project.designStart)} – {formatDate(row.project.constructionEnd)}
                    </div>
                  </div>
                  <div className="md:col-span-9">
                    <div
                      className="relative h-12 rounded-md bg-gray-100 overflow-hidden"
                      style={yearGridStyle}
                    >
                      {row.designSegment && (
                        <div
                          className="absolute top-[18%] h-3 rounded-full"
                          style={{
                            left: `${row.designSegment.offsetPercent}%`,
                            width: `${row.designSegment.widthPercent}%`,
                            backgroundColor: DESIGN_COLOR,
                          }}
                          title={`Design: ${formatDate(row.project.designStart)} – ${formatDate(
                            row.project.designEnd
                          )}`}
                        />
                      )}
                      {row.constructionSegment && (
                        <div
                          className="absolute bottom-[18%] h-3 rounded-full"
                          style={{
                            left: `${row.constructionSegment.offsetPercent}%`,
                            width: `${row.constructionSegment.widthPercent}%`,
                            backgroundColor: CONSTRUCTION_COLOR,
                          }}
                          title={`Construction: ${formatDate(
                            row.project.constructionStart
                          )} – ${formatDate(row.project.constructionEnd)}`}
                        />
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap justify-between text-[11px] text-gray-500">
                      <span>
                        Design: {formatDate(row.project.designStart)} – {formatDate(row.project.designEnd)}
                      </span>
                      <span>
                        Construction: {formatDate(row.project.constructionStart)} – {formatDate(
                          row.project.constructionEnd
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-gray-500">
                {typeOptions.length > 0 && activeTypeKeys.length === 0
                  ? "Select at least one project type to display timelines."
                  : "No projects fall within the selected horizon."}
              </div>
            )}
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Staffing Availability vs Demand</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={aggregatedForecast}>
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
                />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.25}
                  name="Actual Availability"
                />
                <Area
                  type="monotone"
                  dataKey="required"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.35}
                  name="Required FTE"
                />
                <Bar
                  dataKey="shortage"
                  barSize={14}
                  fill="#ef4444"
                  name="Shortage"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-blue-50 text-blue-900 p-4 rounded-lg">
              <div className="font-medium">Peak Demand</div>
              <div className="text-2xl font-semibold">
                {summary.peakRequired.toFixed(2)} FTE
              </div>
              <div className="text-xs mt-1">Highest total FTE requirement</div>
            </div>
            <div className="bg-red-50 text-red-900 p-4 rounded-lg">
              <div className="font-medium">Staffing Gaps</div>
              <div className="text-2xl font-semibold">
                {summary.shortageCount}
              </div>
              <div className="text-xs mt-1">
                Months with shortages{summary.shortageMonth ? ` (peak in ${summary.shortageMonth})` : ""}
              </div>
            </div>
            <div className="bg-green-50 text-green-900 p-4 rounded-lg">
              <div className="font-medium">Avg Utilization</div>
              <div className="text-2xl font-semibold">
                {summary.averageUtilization.toFixed(0)}%
              </div>
              <div className="text-xs mt-1">
                Average allocated vs actual availability
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Users className="text-red-500" size={20} />
            Staffing Pressure Within Horizon
          </h3>
          {filteredGaps.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {filteredGaps.map((gap, index) => {
                const gapValue = parseFloat(gap.gap);
                const severityClass =
                  gapValue > 1 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-800";

                return (
                  <div
                    key={`${gap.month}-${gap.category}-${index}`}
                    className="border border-gray-200 rounded-lg p-3"
                  >
                    <div className="flex justify-between items-center">
                      <div className="font-medium text-gray-900">{gap.category}</div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityClass}`}>
                        {gapValue > 1 ? "Critical" : "Moderate"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{gap.monthLabel}</div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="text-gray-500">Required</div>
                        <div className="font-semibold text-gray-900">{gap.required}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Actual</div>
                        <div className="font-semibold text-gray-900">{gap.available}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Gap</div>
                        <div className="font-semibold text-red-600">-{gap.gap}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-green-600 bg-green-50 rounded-lg">
              Staffing levels meet projected demand within this planning window.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleView;
