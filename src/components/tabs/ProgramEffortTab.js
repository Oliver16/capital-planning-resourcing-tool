import React, { useCallback, useMemo, useState } from "react";
import { Repeat, Users, CalendarClock } from "lucide-react";
import ProgramStaffingModal from "./ProgramStaffingModal";
import {
  sanitizeHoursValue,
  getVisibleCategoryHours,
  buildModalStateForProgram,
  buildCategoryUpdatesForSave,
} from "../../utils/programStaffing";

const formatHoursSummary = (value) => {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }

  if (Number.isInteger(value)) {
    return value.toLocaleString("en-US");
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
};

const defaultModalState = {
  isOpen: false,
  programId: null,
  programName: "",
  config: {},
  extraEntries: {},
  hadExistingValues: false,
};

const ProgramEffortTab = ({
  programs = [],
  projectTypes = [],
  staffCategories = [],
  updateProject,
  isReadOnly = false,
}) => {
  const [modalState, setModalState] = useState(defaultModalState);

  const typeMap = useMemo(() => {
    const entries = new Map();
    projectTypes.forEach((type) => {
      if (!type || type.id == null) {
        return;
      }
      entries.set(String(type.id), type);
    });
    return entries;
  }, [projectTypes]);

  const programSummaries = useMemo(() => {
    return programs
      .filter((program) => program && program.type === "program")
      .map((program) => {
        const categoryHours = getVisibleCategoryHours(program, staffCategories);
        const categoryCount = Object.keys(categoryHours).length;
        const totals = {
          pm: sanitizeHoursValue(program.continuousPmHours),
          design: sanitizeHoursValue(program.continuousDesignHours),
          construction: sanitizeHoursValue(program.continuousConstructionHours),
        };
        return {
          program,
          categoryCount,
          totals,
          totalHours: totals.pm + totals.design + totals.construction,
        };
      })
      .sort((a, b) => {
        const nameA = (a.program?.name || "").toLowerCase();
        const nameB = (b.program?.name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [programs, staffCategories]);

  const aggregateTotals = useMemo(() => {
    return programSummaries.reduce(
      (accumulator, summary) => {
        accumulator.pm += summary.totals.pm;
        accumulator.design += summary.totals.design;
        accumulator.construction += summary.totals.construction;
        if (summary.categoryCount > 0) {
          accumulator.configuredPrograms += 1;
        }
        return accumulator;
      },
      { pm: 0, design: 0, construction: 0, configuredPrograms: 0 }
    );
  }, [programSummaries]);

  const openModal = useCallback(
    (program) => {
      if (isReadOnly || !program) {
        return;
      }

      const { config, extraEntries, hadExistingValues } =
        buildModalStateForProgram(program, staffCategories);

      setModalState({
        isOpen: true,
        programId: program.id,
        programName: program.name || "Annual program",
        config,
        extraEntries,
        hadExistingValues,
      });
    },
    [isReadOnly, staffCategories]
  );

  const closeModal = useCallback(() => {
    setModalState(defaultModalState);
  }, []);

  const updateModalConfig = useCallback((categoryId, field, value) => {
    setModalState((previous) => {
      if (!previous?.isOpen) {
        return previous;
      }

      const key = String(categoryId);
      const entry = previous.config?.[key] || {
        pmHours: "",
        designHours: "",
        constructionHours: "",
      };

      return {
        ...previous,
        config: {
          ...previous.config,
          [key]: {
            ...entry,
            [field]: value,
          },
        },
      };
    });
  }, []);

  const saveModal = useCallback(() => {
    setModalState((previous) => {
      if (!previous?.isOpen) {
        return previous;
      }

      if (previous.programId == null) {
        return defaultModalState;
      }

      if (isReadOnly) {
        return defaultModalState;
      }

      const { sanitizedConfig, totals } = buildCategoryUpdatesForSave(
        previous.config,
        staffCategories,
        previous.extraEntries
      );

      if (sanitizedConfig) {
        updateProject(previous.programId, {
          continuousHoursByCategory: sanitizedConfig,
          continuousPmHours: totals.pm,
          continuousDesignHours: totals.design,
          continuousConstructionHours: totals.construction,
        });
      } else {
        updateProject(previous.programId, {
          continuousHoursByCategory: null,
          continuousPmHours: 0,
          continuousDesignHours: 0,
          continuousConstructionHours: 0,
        });
      }

      return defaultModalState;
    });
  }, [isReadOnly, staffCategories, updateProject]);

  const clearModal = useCallback(() => {
    setModalState((previous) => {
      if (!previous?.isOpen) {
        return previous;
      }

      if (isReadOnly) {
        return defaultModalState;
      }

      if (previous.programId != null) {
        updateProject(previous.programId, {
          continuousHoursByCategory: null,
          continuousPmHours: 0,
          continuousDesignHours: 0,
          continuousConstructionHours: 0,
        });
      }

      return defaultModalState;
    });
  }, [isReadOnly, updateProject]);

  const totalPrograms = programSummaries.length;
  const configuredPrograms = aggregateTotals.configuredPrograms;
  const totalHours =
    aggregateTotals.pm + aggregateTotals.design + aggregateTotals.construction;

  if (totalPrograms === 0) {
    return (
      <div className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
        No annual programs are available yet. Add programs in the Projects &amp;
        Programs tab to begin managing program-level staffing.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-purple-100 bg-purple-50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Repeat className="text-purple-500" size={20} />
            <div>
              <p className="text-xs font-semibold uppercase text-purple-600">
                Annual programs
              </p>
              <p className="text-2xl font-bold text-purple-900">{totalPrograms}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Users className="text-indigo-500" size={20} />
            <div>
              <p className="text-xs font-semibold uppercase text-indigo-600">
                Programs with staffing
              </p>
              <p className="text-2xl font-bold text-indigo-900">{configuredPrograms}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <CalendarClock className="text-blue-500" size={20} />
            <div>
              <p className="text-xs font-semibold uppercase text-blue-600">
                Total hours/month
              </p>
              <p className="text-2xl font-bold text-blue-900">
                {formatHoursSummary(totalHours)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {programSummaries.map(({ program, totals, categoryCount, totalHours }) => {
          const projectType =
            program.projectTypeId != null
              ? typeMap.get(String(program.projectTypeId))
              : null;
          const scheduleText =
            program.programStartDate && program.programEndDate
              ? `${program.programStartDate} → ${program.programEndDate}`
              : "Program schedule not set";

          return (
            <div key={program.id} className="rounded-xl border border-purple-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {program.name || "Annual program"}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-1 font-medium text-purple-700">
                      <Repeat size={12} /> Annual program
                    </span>
                    {projectType && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: projectType.color || "#7c3aed" }}
                        />
                        {projectType.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{scheduleText}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openModal(program)}
                  disabled={isReadOnly}
                  className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                    isReadOnly
                      ? "cursor-not-allowed bg-gray-200 text-gray-500"
                      : "bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-400"
                  }`}
                >
                  Configure staffing
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-purple-100 bg-purple-50 p-3 text-purple-800">
                  <p className="text-xs font-semibold uppercase text-purple-600">
                    Total hours/mo
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-purple-900">
                    {formatHoursSummary(totalHours)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    PM
                  </p>
                  <p className="mt-1 text-xl font-semibold text-gray-800">
                    {formatHoursSummary(totals.pm)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Design
                  </p>
                  <p className="mt-1 text-xl font-semibold text-gray-800">
                    {formatHoursSummary(totals.design)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Construction
                  </p>
                  <p className="mt-1 text-xl font-semibold text-gray-800">
                    {formatHoursSummary(totals.construction)}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm text-gray-500">
                {categoryCount > 0
                  ? `${categoryCount} ${categoryCount === 1 ? "category" : "categories"} configured`
                  : "No staffing categories configured yet."}
              </p>
            </div>
          );
        })}
      </div>

      <ProgramStaffingModal
        isOpen={modalState.isOpen}
        programName={modalState.programName}
        staffCategories={staffCategories}
        config={modalState.config}
        onChange={updateModalConfig}
        onClose={closeModal}
        onSave={saveModal}
        onClear={clearModal}
        hasExistingConfig={
          modalState.hadExistingValues ||
          Object.values(modalState.config || {}).some((entry) =>
            [entry?.pmHours, entry?.designHours, entry?.constructionHours].some(
              (value) => sanitizeHoursValue(value) > 0
            )
          ) ||
          Object.keys(modalState.extraEntries || {}).length > 0
        }
      />
    </div>
  );
};

export default ProgramEffortTab;
