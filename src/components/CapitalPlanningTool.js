import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar,
  Users,
  DollarSign,
  AlertTriangle,
  Settings,
  FolderOpen,
  Edit3,
  Download,
  Upload,
  CalendarClock,
  UserCircle,
  GitBranch,
  FileSpreadsheet,
  ChevronDown,
  LayoutDashboard,
} from "lucide-react";

// Import components
import Overview from "./tabs/Overview";
import ProjectsPrograms from "./tabs/ProjectsPrograms";
import StaffCategories from "./tabs/StaffCategories";
import StaffAllocations from "./tabs/StaffAllocations";
import ResourceForecast from "./tabs/ResourceForecast";
import ScheduleView from "./tabs/ScheduleView";
import SettingsTab from "./tabs/SettingsTab";
import PeopleTab from "./tabs/PeopleTab";
import ScenariosTab from "./tabs/ScenariosTab";
import ReportsTab from "./tabs/ReportsTab";
import StaffAssignmentsTab from "./tabs/StaffAssignmentsTab";
import FinancialModelingModule from "./financial-modeling/FinancialModelingModule";
import { isProjectOrProgram } from "../utils/projectTypes.js";

// Import data and utilities
import {
  defaultStaffCategories,
  defaultProjectTypes,
  defaultFundingSources,
  defaultProjects,
  defaultStaffMembers,
  defaultStaffAssignments,
  defaultProjectEffortTemplates,
} from "../data/defaultData";
import {
  calculateTimelines,
  generateResourceForecast,
  calculateStaffingGaps,
} from "../utils/calculations";
import { handleCSVImport } from "../utils/dataImport";
import { useDatabase } from "../hooks/useDatabase";
import { useAuth } from "../context/AuthContext";
import { buildStaffAssignmentPlan } from "../utils/staffAssignments";
import { normalizeProjectBudgetBreakdown } from "../utils/projectBudgets";
import { normalizeEffortTemplate } from "../utils/effortTemplates";
import {
  generateDefaultOperatingBudget,
  ensureBudgetYears,
  generateDefaultFundingAssumptions,
  createDefaultFundingAssumption,
  calculateExistingDebtSchedule,
  sanitizeExistingDebtInstrument,
  sanitizeExistingDebtInstrumentList,
  sanitizeExistingDebtManualTotals,

} from "../utils/financialModeling";

const MAX_MONTHLY_FTE_HOURS = 2080 / 12;
const CAPACITY_FIELDS = [
  "pmCapacity",
  "designCapacity",
  "constructionCapacity",
];
const AVAILABILITY_FIELDS = [
  "pmAvailability",
  "designAvailability",
  "constructionAvailability",
];

const getNumericValue = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toIdKey = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const key = String(value).trim();
  return key ? key : null;
};

const normalizeStorageId = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : trimmed;
  }

  return null;
};

const UTILITY_OPTIONS = [
  { value: "water", label: "Water Utility" },
  { value: "sewer", label: "Sewer Utility" },
  { value: "power", label: "Electric Utility" },
  { value: "gas", label: "Gas Utility" },
  { value: "stormwater", label: "Stormwater Utility" },
];

if (
  typeof globalThis !== "undefined" &&
  typeof globalThis.normalizeEffortTemplate !== "function"
) {
  globalThis.normalizeEffortTemplate = normalizeEffortTemplate;
}

const createDefaultBudgetEscalations = () => ({
  operatingRevenue: 0,
  nonOperatingRevenue: 0,
  omExpenses: 0,
  salaries: 0,
  adminExpenses: 0,
  existingDebtService: 0,
});

const ESCALATION_FIELDS = [
  "operatingRevenue",
  "nonOperatingRevenue",
  "omExpenses",
  "salaries",
  "adminExpenses",
];

const recalculateOperatingBudget = (budgetRows = [], budgetEscalations = {}) => {
  if (!Array.isArray(budgetRows) || budgetRows.length === 0) {
    return [];
  }

  const sortedRows = [...budgetRows].sort(
    (a, b) => (Number(a?.year) || 0) - (Number(b?.year) || 0)
  );
  const recalculated = [];

  sortedRows.forEach((row, index) => {
    const normalizedRow = {
      ...row,
      year: Number(row?.year) || 0,
      rateIncreasePercent: getNumericValue(row?.rateIncreasePercent),
    };

    if (index === 0) {
      ESCALATION_FIELDS.forEach((field) => {
        normalizedRow[field] = getNumericValue(row?.[field]);
      });
    } else {
      const previousRow = recalculated[index - 1];
      ESCALATION_FIELDS.forEach((field) => {
        const rate = Number(budgetEscalations?.[field]) || 0;
        const priorValue = getNumericValue(previousRow?.[field]);
        normalizedRow[field] = priorValue * (1 + rate / 100);
      });
    }

    recalculated.push(normalizedRow);
  });

  return recalculated;
};

const createDefaultFinancialConfig = (startYear) => ({
  startYear,
  projectionYears: 10,
  startingCashBalance: 2500000,
  targetCoverageRatio: 1.5,
});

const createDefaultUtilityProfile = (startYear) => ({
  financialConfig: createDefaultFinancialConfig(startYear),
  operatingBudget: generateDefaultOperatingBudget(startYear, 10),
  budgetEscalations: createDefaultBudgetEscalations(),
  existingDebtManualTotals: {},
  existingDebtInstruments: [],
});

const applyExistingDebtToBudget = (profile, budgetOverride) => {
  const sanitizedManual = sanitizeExistingDebtManualTotals(
    profile.existingDebtManualTotals
  );
  const sanitizedInstruments = sanitizeExistingDebtInstrumentList(
    profile.existingDebtInstruments
  );

  const schedule = calculateExistingDebtSchedule({
    manualTotals: sanitizedManual,
    instruments: sanitizedInstruments,
    startYear: profile.financialConfig.startYear,
    projectionYears: profile.financialConfig.projectionYears,
  });

  const alignedBudget = ensureBudgetYears(
    budgetOverride || profile.operatingBudget,
    profile.financialConfig.startYear,
    profile.financialConfig.projectionYears
  );

  const budgetWithDebt = alignedBudget.map((row) => ({
    ...row,
    existingDebtService: schedule.totalsByYear[row.year] || 0,
  }));

  return {
    profile: {
      ...profile,
      operatingBudget: budgetWithDebt,
      existingDebtManualTotals: sanitizedManual,
      existingDebtInstruments: sanitizedInstruments,
    },
    schedule,
  };
};

const CapitalPlanningTool = () => {
  const { canEditActiveOrg } = useAuth();
  const isReadOnly = !canEditActiveOrg;

  // Database hook with fixed default data
  const defaultData = useMemo(
    () => ({
      projects: defaultProjects.map(normalizeProjectBudgetBreakdown),
      staffCategories: defaultStaffCategories,
      projectTypes: defaultProjectTypes,
      fundingSources: defaultFundingSources,
      staffAllocations: {},
      staffMembers: defaultStaffMembers,
      staffAssignments: defaultStaffAssignments,
      effortTemplates: [],
    }),
    []
  );

  const {
    isLoading: dbLoading,
    isInitialized: dbInitialized,
    error: dbError,
    clearError,
    saveProject,
    getProjects,
    deleteProject: dbDeleteProject,
    saveStaffCategory,
    getStaffCategories,
    deleteStaffCategory: dbDeleteStaffCategory,
    saveProjectType,
    getProjectTypes,
    deleteProjectType: dbDeleteProjectType,
    saveFundingSource,
    getFundingSources,
    deleteFundingSource: dbDeleteFundingSource,
    saveStaffAllocation,
    getStaffAllocations,
    saveStaffMember,
    getStaffMembers,
    deleteStaffMember: dbDeleteStaffMember,
    saveProjectEffortTemplate: dbSaveProjectEffortTemplate,
    getProjectEffortTemplates,
    deleteProjectEffortTemplate: dbDeleteProjectEffortTemplate,
    saveStaffAssignment,
    getStaffAssignments,
    deleteStaffAssignment: dbDeleteStaffAssignment,
    exportDatabase,
    getUtilityProfiles,
    saveUtilityProfile,
    getUtilityOperatingBudgets,
    upsertUtilityOperatingBudgetRows,
    deleteUtilityOperatingBudgetsNotIn,
    getProjectTypeUtilities,
    saveProjectTypeUtility,
    getFundingSourceAssumptions,
    saveFundingSourceAssumption,
  } = useDatabase(defaultData);

  // Core data states
  const [staffCategories, setStaffCategories] = useState(
    defaultStaffCategories
  );
  const [projectTypes, setProjectTypes] = useState(defaultProjectTypes);
  const [fundingSources, setFundingSources] = useState(defaultFundingSources);
  const [projects, setProjects] = useState(() =>
    defaultProjects.map(normalizeProjectBudgetBreakdown)
  );
  const [projectEffortTemplates, setProjectEffortTemplates] = useState(() =>
    defaultProjectEffortTemplates.map(normalizeEffortTemplate)
  );
  const [staffAllocations, setStaffAllocations] = useState({});
  const [staffMembers, setStaffMembers] = useState(defaultStaffMembers);
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [utilityProfiles, setUtilityProfiles] = useState(() => {
    const profiles = {};
    UTILITY_OPTIONS.forEach((option) => {
      profiles[option.value] = createDefaultUtilityProfile(currentYear);
    });
    return profiles;
  });
  const [activeUtility, setActiveUtility] = useState(
    UTILITY_OPTIONS[0]?.value || "water"
  );
  const [projectTypeUtilities, setProjectTypeUtilities] = useState({});
  const [fundingSourceAssumptions, setFundingSourceAssumptions] = useState(() =>
    generateDefaultFundingAssumptions(defaultFundingSources)
  );
  const [staffAssignmentOverrides, setStaffAssignmentOverrides] = useState({});
  const [activeTab, setActiveTab] = useState("overview");
  const [activeModule, setActiveModule] = useState("planning");
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRefs = useRef({});
  const [timeHorizon, setTimeHorizon] = useState(60);
  const [scheduleHorizon, setScheduleHorizon] = useState(36);
  const [isSaving, setIsSaving] = useState(false);
  const [categoryCapacityWarnings, setCategoryCapacityWarnings] = useState({});
  const [scenarios, setScenarios] = useState(() => [
    {
      id: "baseline",
      name: "Baseline",
      description: "Current approved schedule and staffing plan.",
      isBaseline: true,
      adjustments: {},
      createdAt: new Date().toISOString(),
    },
  ]);
  const [activeScenarioId, setActiveScenarioId] = useState("baseline");

  useEffect(() => {
    if (!Array.isArray(projectTypes)) {
      return;
    }

    setProjectTypeUtilities((previous) => {
      const nextAssignments = { ...previous };
      let changed = false;

      projectTypes.forEach((type) => {
        const key = toIdKey(type?.id);
        if (!key) {
          return;
        }
        if (nextAssignments[key] === undefined) {
          nextAssignments[key] = UTILITY_OPTIONS[0]?.value || null;
          changed = true;
        }
      });

      Object.keys(nextAssignments).forEach((key) => {
        const stillExists = projectTypes.some(
          (type) => String(type?.id) === key
        );
        if (!stillExists) {
          delete nextAssignments[key];
          changed = true;
        }
      });

      return changed ? nextAssignments : previous;
    });
  }, [projectTypes]);

  // Load data from database only once when initialized
  useEffect(() => {
    const loadData = async () => {
      if (dbInitialized) {
        try {
          const [
            projectsData,
            staffCategoriesData,
            projectTypesData,
            fundingSourcesData,
            projectEffortTemplatesData,
            allocationsData,
            staffMembersData,
            staffAssignmentsData,
            utilityProfilesData,
            utilityBudgetMap,
            projectTypeUtilityAssignments,
            fundingAssumptionsData,
          ] = await Promise.all([
            getProjects(),
            getStaffCategories(),
            getProjectTypes(),
            getFundingSources(),
            getProjectEffortTemplates(),
            getStaffAllocations(),
            getStaffMembers(),
            getStaffAssignments(),
            getUtilityProfiles(),
            getUtilityOperatingBudgets(),
            getProjectTypeUtilities(),
            getFundingSourceAssumptions(),
          ]);

          // Only update if we got actual data
          if (projectsData && projectsData.length > 0) {
            setProjects(
              projectsData.map((project) =>
                normalizeProjectBudgetBreakdown({
                  ...project,
                  deliveryType: project.deliveryType || "self-perform",
                })
              )
            );
          }
          if (staffCategoriesData && staffCategoriesData.length > 0) {
            setStaffCategories(staffCategoriesData);
          }
          if (projectTypesData && projectTypesData.length > 0) {
            setProjectTypes(projectTypesData);
          }
          if (fundingSourcesData && fundingSourcesData.length > 0) {
            setFundingSources(fundingSourcesData);
          }

          if (
            projectEffortTemplatesData &&
            projectEffortTemplatesData.length > 0
          ) {
            setProjectEffortTemplates(
              projectEffortTemplatesData.map(normalizeEffortTemplate)
            );
          }

          if (staffMembersData && staffMembersData.length > 0) {
            setStaffMembers(staffMembersData);
          }

          if (staffAssignmentsData && staffAssignmentsData.length > 0) {
            const assignmentObject = {};
            staffAssignmentsData.forEach((assignment) => {
              if (!assignmentObject[assignment.projectId]) {
                assignmentObject[assignment.projectId] = {};
              }

              assignmentObject[assignment.projectId][assignment.staffId] = {
                pmHours: Number(assignment.pmHours) || 0,
                designHours: Number(assignment.designHours) || 0,
                constructionHours: Number(assignment.constructionHours) || 0,
              };
            });

            setStaffAssignmentOverrides(assignmentObject);
          }

          // Convert allocations array to object format
          if (allocationsData && allocationsData.length > 0) {
            const allocationsObject = {};
            allocationsData.forEach((allocation) => {
              if (!allocationsObject[allocation.projectId]) {
                allocationsObject[allocation.projectId] = {};
              }
              allocationsObject[allocation.projectId][allocation.categoryId] = {
                pmHours: allocation.pmHours || 0,
                designHours: allocation.designHours || 0,
                constructionHours: allocation.constructionHours || 0,
              };
            });
            setStaffAllocations(allocationsObject);
          }

          const hasUtilityProfileData =
            utilityProfilesData && Object.keys(utilityProfilesData).length > 0;
          const hasUtilityBudgetData = utilityBudgetMap && utilityBudgetMap.size > 0;

          if (hasUtilityProfileData || hasUtilityBudgetData) {
            setUtilityProfiles((previous) => {
              const nextProfiles = { ...previous };

              UTILITY_OPTIONS.forEach((option) => {
                const key = option.value;
                const existingProfile = previous[key] || createDefaultUtilityProfile(currentYear);
                const dbProfile = utilityProfilesData?.[key];
                const mergedConfig = dbProfile?.financialConfig
                  ? { ...existingProfile.financialConfig, ...dbProfile.financialConfig }
                  : { ...existingProfile.financialConfig };
                const mergedEscalations = dbProfile?.budgetEscalations
                  ? { ...existingProfile.budgetEscalations, ...dbProfile.budgetEscalations }
                  : { ...existingProfile.budgetEscalations };
                const budgetRows = utilityBudgetMap?.get(key) || existingProfile.operatingBudget;

                const alignedBudget = ensureBudgetYears(
                  budgetRows,
                  mergedConfig.startYear,
                  mergedConfig.projectionYears
                );

                const recalculatedBudget = recalculateOperatingBudget(
                  alignedBudget,
                  mergedEscalations
                );

                const manualTotals = dbProfile?.existingDebtManualTotals
                  ? sanitizeExistingDebtManualTotals(dbProfile.existingDebtManualTotals)
                  : sanitizeExistingDebtManualTotals(
                      existingProfile.existingDebtManualTotals
                    );

                const instrumentList = dbProfile?.existingDebtInstruments
                  ? sanitizeExistingDebtInstrumentList(dbProfile.existingDebtInstruments)
                  : sanitizeExistingDebtInstrumentList(
                      existingProfile.existingDebtInstruments
                    );

                const { profile: profileWithDebt } = applyExistingDebtToBudget(
                  {
                    financialConfig: mergedConfig,
                    budgetEscalations: mergedEscalations,
                    operatingBudget: recalculatedBudget,
                    existingDebtManualTotals: manualTotals,
                    existingDebtInstruments: instrumentList,
                  },
                  recalculatedBudget
                );

                nextProfiles[key] = profileWithDebt;

              });

              return nextProfiles;
            });
          }

          if (
            projectTypeUtilityAssignments &&
            Object.keys(projectTypeUtilityAssignments).length > 0
          ) {
            setProjectTypeUtilities(projectTypeUtilityAssignments);
          }

          if (fundingAssumptionsData && fundingAssumptionsData.length > 0) {
            setFundingSourceAssumptions((previous) => {
              const existingById = new Map();
              (previous || []).forEach((assumption) => {
                if (!assumption) {
                  return;
                }
                const key =
                  assumption.fundingSourceId === null || assumption.fundingSourceId === undefined
                    ? null
                    : String(assumption.fundingSourceId);
                if (key !== null) {
                  existingById.set(key, assumption);
                }
              });

              const merged = fundingAssumptionsData.map((assumption) => {
                if (!assumption || assumption.fundingSourceId === undefined || assumption.fundingSourceId === null) {
                  return null;
                }
                const key = String(assumption.fundingSourceId);
                const existing = existingById.get(key);
                if (existing) {
                  return {
                    ...existing,
                    financingType: assumption.financingType,
                    interestRate: assumption.interestRate,
                    termYears: assumption.termYears,
                    sourceName: assumption.sourceName || existing.sourceName,
                  };
                }
                return {
                  fundingSourceId: assumption.fundingSourceId,
                  sourceName: assumption.sourceName || '',
                  financingType: assumption.financingType || 'cash',
                  interestRate: assumption.interestRate || 0,
                  termYears: assumption.termYears || 0,
                };
              });

              return merged.filter(Boolean);
            });
          }
        } catch (error) {
          console.error("Error loading data from database:", error);
        }
      }
    };

    loadData();
  }, [
    dbInitialized,
    getProjects,
    getStaffCategories,
    getProjectTypes,
    getFundingSources,
    getProjectEffortTemplates,
    getStaffAllocations,
    getStaffMembers,
    getStaffAssignments,
    getUtilityProfiles,
    getUtilityOperatingBudgets,
    getProjectTypeUtilities,
    getFundingSourceAssumptions,
  ]);

  useEffect(() => {
    setFundingSourceAssumptions((previous) => {
      const existingMap = new Map();

      (previous || []).forEach((assumption) => {
        if (!assumption) {
          return;
        }
        const key =
          assumption.fundingSourceId === null ||
          assumption.fundingSourceId === undefined
            ? "unassigned"
            : String(assumption.fundingSourceId);
        existingMap.set(key, assumption);
      });

      return fundingSources.map((source) => {
        const key =
          source.id === null || source.id === undefined
            ? "unassigned"
            : String(source.id);
        const existing = existingMap.get(key);
        if (existing) {
          return {
            ...existing,
            fundingSourceId: source.id,
            sourceName: source.name,
          };
        }
        return createDefaultFundingAssumption(source);
      });
    });
  }, [fundingSources]);

  useEffect(() => {
    if (!activeDropdown) {
      return;
    }

    const handleClickOutside = (event) => {
      const currentDropdown = dropdownRefs.current[activeDropdown];
      if (currentDropdown && !currentDropdown.contains(event.target)) {
        setActiveDropdown(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeDropdown]);

  const staffAvailabilityByCategory = useMemo(() => {
    const availability = {};

    staffMembers.forEach((member) => {
      if (!member) {
        return;
      }

      const { categoryId } = member;

      if (categoryId === undefined || categoryId === null || categoryId === "") {
        return;
      }

      const categoryKey = String(categoryId);

      if (!availability[categoryKey]) {
        availability[categoryKey] = {
          pm: 0,
          design: 0,
          construction: 0,
          total: 0,
        };
      }

      const pm = getNumericValue(member.pmAvailability);
      const design = getNumericValue(member.designAvailability);
      const construction = getNumericValue(member.constructionAvailability);

      availability[categoryKey].pm += pm;
      availability[categoryKey].design += design;
      availability[categoryKey].construction += construction;
      availability[categoryKey].total += pm + design + construction;
    });

    return availability;
  }, [staffMembers]);

  const staffAssignmentPlan = useMemo(
    () =>
      buildStaffAssignmentPlan({
        projects,
        staffAllocations,
        staffMembers,
        staffCategories,
        assignmentOverrides: staffAssignmentOverrides,
      }),
    [
      projects,
      staffAllocations,
      staffMembers,
      staffCategories,
      staffAssignmentOverrides,
    ]
  );

  // Initialize staff allocations when projects or staff categories change
  useEffect(() => {
    const allocations = { ...staffAllocations };
    projects.forEach((project) => {
      if (project.type === "project") {
        if (!allocations[project.id]) {
          allocations[project.id] = {};
        }
        staffCategories.forEach((category) => {
          if (!allocations[project.id][category.id]) {
            allocations[project.id][category.id] = {
              pmHours: 0,
              designHours: 0,
              constructionHours: 0,
            };
          }
        });
      }
    });
    setStaffAllocations(allocations);
  }, [projects, staffCategories]);

  useEffect(() => {
    setScenarios((prevScenarios) => {
      const validProjectIds = new Set(
        projects
          .map((project) => toIdKey(project?.id))
          .filter((key) => key !== null)
      );
      let hasChanges = false;

      const cleanedScenarios = prevScenarios.map((scenario) => {
        if (
          !scenario.adjustments ||
          Object.keys(scenario.adjustments).length === 0
        ) {
          return scenario;
        }

        const nextAdjustments = {};
        let scenarioChanged = false;

        Object.entries(scenario.adjustments).forEach(
          ([projectId, adjustment]) => {
            const key = toIdKey(projectId);
            if (key && validProjectIds.has(key)) {
              nextAdjustments[key] = adjustment;
            } else {
              scenarioChanged = true;
            }
          }
        );

        if (!scenarioChanged) {
          const originalKeys = Object.keys(scenario.adjustments).length;
          const nextKeys = Object.keys(nextAdjustments).length;
          if (originalKeys === nextKeys) {
            return scenario;
          }
        }

        hasChanges = true;
        return {
          ...scenario,
          adjustments: nextAdjustments,
        };
      });

      return hasChanges ? cleanedScenarios : prevScenarios;
    });
  }, [projects]);

  // Calculate project timelines
  const projectTimelines = useMemo(
    () => calculateTimelines(projects),
    [projects]
  );

  const activeUtilityProfile = useMemo(
    () =>
      utilityProfiles[activeUtility] || createDefaultUtilityProfile(currentYear),
    [utilityProfiles, activeUtility, currentYear]
  );

  // Generate monthly resource forecast
  const resourceForecast = useMemo(
    () =>
      generateResourceForecast(
        projectTimelines,
        staffAllocations,
        staffCategories,
        timeHorizon,
        staffAvailabilityByCategory
      ),
    [
      projectTimelines,
      staffAllocations,
      staffCategories,
      timeHorizon,
      staffAvailabilityByCategory,
    ]
  );

  // Calculate gaps
  const staffingGaps = useMemo(
    () =>
      calculateStaffingGaps(
        resourceForecast,
        staffCategories,
        staffAvailabilityByCategory
      ),
    [resourceForecast, staffCategories, staffAvailabilityByCategory]
  );

  const moduleOptions = [
    {
      id: "planning",
      label: "Capital Planning Workspace",
      description: "Projects, people, scheduling, and reporting.",
      icon: LayoutDashboard,
    },
    {
      id: "financial",
      label: "Financial Modeling Suite",
      description: "CIP spend plans, pro forma, and debt coverage analysis.",
      icon: DollarSign,
    },
  ];

  const handleSelectModule = (moduleId) => {
    setActiveDropdown(null);
    setActiveModule(moduleId);
    if (moduleId === "planning" && activeTab === "finance") {
      setActiveTab("overview");
    }
  };

  const updateFinancialConfiguration = async (utilityKey, updates) => {
    if (isReadOnly) {
      return;
    }

    const targetUtility = utilityKey || activeUtility;
    const existingProfile =
      utilityProfiles[targetUtility] || createDefaultUtilityProfile(currentYear);

    const nextConfig = {
      ...existingProfile.financialConfig,
      ...updates,
    };

    const nextBudget = ensureBudgetYears(
      existingProfile.operatingBudget,
      nextConfig.startYear,
      nextConfig.projectionYears
    );

    const recalculatedBudget = recalculateOperatingBudget(
      nextBudget,
      existingProfile.budgetEscalations
    );

    const { profile: updatedProfile } = applyExistingDebtToBudget(
      {
        ...existingProfile,
        financialConfig: nextConfig,
        operatingBudget: recalculatedBudget,
      },
      recalculatedBudget
    );


    setUtilityProfiles((previous) => ({
      ...previous,
      [targetUtility]: updatedProfile,
    }));

    try {
      await Promise.all([
        saveUtilityProfile(targetUtility, {
          financialConfig: nextConfig,
          budgetEscalations: updatedProfile.budgetEscalations,
          existingDebtManualTotals: updatedProfile.existingDebtManualTotals,
          existingDebtInstruments: updatedProfile.existingDebtInstruments,
        }),
        upsertUtilityOperatingBudgetRows(targetUtility, updatedProfile.operatingBudget),
        deleteUtilityOperatingBudgetsNotIn(
          targetUtility,
          updatedProfile.operatingBudget.map((row) => row.year)

        ),
      ]);
    } catch (error) {
      console.error("Failed to update financial configuration:", error);
    }
  };

  const updateOperatingBudgetValue = async (utilityKey, year, field, value) => {
    if (isReadOnly) {
      return;
    }

    const targetUtility = utilityKey || activeUtility;
    const existingProfile =
      utilityProfiles[targetUtility] || createDefaultUtilityProfile(currentYear);

    const normalizedBudget = ensureBudgetYears(
      existingProfile.operatingBudget,
      existingProfile.financialConfig.startYear,
      existingProfile.financialConfig.projectionYears
    );

    const updatedBudget = normalizedBudget.map((row) => {
      if (!row || row.year !== year) {
        return row;
      }

      let nextValue = value;
      if (field === "rateIncreasePercent") {
        nextValue = Number(value) || 0;
      } else {
        nextValue = getNumericValue(value);
      }

      return {
        ...row,
        [field]: nextValue,
      };
    });

    const recalculatedBudget = recalculateOperatingBudget(
      updatedBudget,
      existingProfile.budgetEscalations
    );

    const { profile: updatedProfile } = applyExistingDebtToBudget(
      {
        ...existingProfile,
        operatingBudget: recalculatedBudget,
      },
      recalculatedBudget
    );


    setUtilityProfiles((previous) => ({
      ...previous,
      [targetUtility]: updatedProfile,
    }));

    try {
      await upsertUtilityOperatingBudgetRows(targetUtility, updatedProfile.operatingBudget);
      await deleteUtilityOperatingBudgetsNotIn(
        targetUtility,
        updatedProfile.operatingBudget.map((row) => row.year)

      );
    } catch (error) {
      console.error("Failed to update operating budget row:", error);
    }
  };

  const updateBudgetEscalation = async (utilityKey, field, value) => {
    if (isReadOnly) {
      return;
    }

    const targetUtility = utilityKey || activeUtility;
    const existingProfile =
      utilityProfiles[targetUtility] || createDefaultUtilityProfile(currentYear);
    const numericValue = Number(value);

    const updatedEscalations = {
      ...existingProfile.budgetEscalations,
      [field]: Number.isFinite(numericValue) ? numericValue : 0,
    };

    const normalizedBudget = ensureBudgetYears(
      existingProfile.operatingBudget,
      existingProfile.financialConfig.startYear,
      existingProfile.financialConfig.projectionYears
    );

    const recalculatedBudget = recalculateOperatingBudget(
      normalizedBudget,
      updatedEscalations
    );

    const { profile: updatedProfile } = applyExistingDebtToBudget(
      {
        ...existingProfile,
        budgetEscalations: updatedEscalations,
        operatingBudget: recalculatedBudget,
      },
      recalculatedBudget
    );

    setUtilityProfiles((previous) => ({
      ...previous,
      [targetUtility]: updatedProfile,
    }));

    try {
      await Promise.all([
        saveUtilityProfile(targetUtility, {
          financialConfig: updatedProfile.financialConfig,
          budgetEscalations: updatedEscalations,
          existingDebtManualTotals: updatedProfile.existingDebtManualTotals,
          existingDebtInstruments: updatedProfile.existingDebtInstruments,
        }),
        upsertUtilityOperatingBudgetRows(targetUtility, updatedProfile.operatingBudget),
        deleteUtilityOperatingBudgetsNotIn(
          targetUtility,
          updatedProfile.operatingBudget.map((row) => row.year)

        ),
      ]);
    } catch (error) {
      console.error("Failed to update budget escalation:", error);
    }
  };

  const updateExistingDebtManualValue = async (utilityKey, year, value) => {
    if (isReadOnly) {
      return;
    }

    const targetUtility = utilityKey || activeUtility;
    const existingProfile =
      utilityProfiles[targetUtility] || createDefaultUtilityProfile(currentYear);

    const numericYear = Number(year);
    if (!Number.isFinite(numericYear)) {
      return;
    }

    const manualTotals = {
      ...sanitizeExistingDebtManualTotals(existingProfile.existingDebtManualTotals),
    };

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      delete manualTotals[numericYear];
    } else {
      manualTotals[numericYear] = numericValue;
    }

    const { profile: updatedProfile } = applyExistingDebtToBudget(
      {
        ...existingProfile,
        existingDebtManualTotals: manualTotals,
      },
      existingProfile.operatingBudget
    );

    setUtilityProfiles((previous) => ({
      ...previous,
      [targetUtility]: updatedProfile,
    }));

    try {
      await Promise.all([
        saveUtilityProfile(targetUtility, {
          financialConfig: updatedProfile.financialConfig,
          budgetEscalations: updatedProfile.budgetEscalations,
          existingDebtManualTotals: updatedProfile.existingDebtManualTotals,
          existingDebtInstruments: updatedProfile.existingDebtInstruments,
        }),
        upsertUtilityOperatingBudgetRows(targetUtility, updatedProfile.operatingBudget),
        deleteUtilityOperatingBudgetsNotIn(
          targetUtility,
          updatedProfile.operatingBudget.map((row) => row.year)
        ),
      ]);
    } catch (error) {
      console.error("Failed to update existing debt schedule:", error);
    }
  };

  const addExistingDebtInstrument = async (utilityKey, instrumentInput) => {
    if (isReadOnly) {
      return;
    }

    const targetUtility = utilityKey || activeUtility;
    const existingProfile =
      utilityProfiles[targetUtility] || createDefaultUtilityProfile(currentYear);

    const sanitizedInstrument = sanitizeExistingDebtInstrument(instrumentInput);
    if (!sanitizedInstrument || !(sanitizedInstrument.outstandingPrincipal > 0)) {
      return;
    }

    const instrumentList = [
      ...sanitizeExistingDebtInstrumentList(existingProfile.existingDebtInstruments),
      sanitizedInstrument,
    ];

    const { profile: updatedProfile } = applyExistingDebtToBudget(
      {
        ...existingProfile,
        existingDebtInstruments: instrumentList,
      },
      existingProfile.operatingBudget
    );

    setUtilityProfiles((previous) => ({
      ...previous,
      [targetUtility]: updatedProfile,
    }));

    try {
      await Promise.all([
        saveUtilityProfile(targetUtility, {
          financialConfig: updatedProfile.financialConfig,
          budgetEscalations: updatedProfile.budgetEscalations,
          existingDebtManualTotals: updatedProfile.existingDebtManualTotals,
          existingDebtInstruments: updatedProfile.existingDebtInstruments,
        }),
        upsertUtilityOperatingBudgetRows(targetUtility, updatedProfile.operatingBudget),
        deleteUtilityOperatingBudgetsNotIn(
          targetUtility,
          updatedProfile.operatingBudget.map((row) => row.year)
        ),
      ]);
    } catch (error) {
      console.error("Failed to add existing debt instrument:", error);
    }
  };

  const removeExistingDebtInstrument = async (utilityKey, instrumentId) => {
    if (isReadOnly) {
      return;
    }

    const targetUtility = utilityKey || activeUtility;
    const existingProfile =
      utilityProfiles[targetUtility] || createDefaultUtilityProfile(currentYear);

    const instrumentList = sanitizeExistingDebtInstrumentList(
      existingProfile.existingDebtInstruments
    ).filter((instrument) => instrument.id !== instrumentId);

    const { profile: updatedProfile } = applyExistingDebtToBudget(
      {
        ...existingProfile,
        existingDebtInstruments: instrumentList,
      },
      existingProfile.operatingBudget
    );

    setUtilityProfiles((previous) => ({
      ...previous,
      [targetUtility]: updatedProfile,
    }));

    try {
      await Promise.all([
        saveUtilityProfile(targetUtility, {
          financialConfig: updatedProfile.financialConfig,
          budgetEscalations: updatedProfile.budgetEscalations,
          existingDebtManualTotals: updatedProfile.existingDebtManualTotals,
          existingDebtInstruments: updatedProfile.existingDebtInstruments,
        }),
        upsertUtilityOperatingBudgetRows(targetUtility, updatedProfile.operatingBudget),
        deleteUtilityOperatingBudgetsNotIn(
          targetUtility,
          updatedProfile.operatingBudget.map((row) => row.year)
        ),
      ]);
    } catch (error) {
      console.error("Failed to remove existing debt instrument:", error);
    }
  };
  const handleUpdateProjectTypeUtility = async (typeId, utilityValue) => {
    if (isReadOnly) {
      return;
    }

    const key = toIdKey(typeId);
    if (!key) {
      return;
    }

    const normalizedUtility =
      utilityValue && UTILITY_OPTIONS.some((option) => option.value === utilityValue)
        ? utilityValue
        : null;

    setProjectTypeUtilities((previous) => {
      if (previous[key] === normalizedUtility) {
        return previous;
      }

      return {
        ...previous,
        [key]: normalizedUtility,
      };
    });

    try {
      await saveProjectTypeUtility(typeId, normalizedUtility);
    } catch (error) {
      console.error("Failed to update project type utility assignment:", error);
    }
  };

  const updateFundingSourceAssumption = async (fundingSourceId, field, value) => {
    if (isReadOnly) {
      return;
    }

    let updatedRecord = null;

    setFundingSourceAssumptions((previous) =>
      previous.map((assumption) => {
        if (!assumption) {
          return assumption;
        }

        const matches =
          assumption.fundingSourceId === fundingSourceId ||
          String(assumption.fundingSourceId) === String(fundingSourceId);

        if (!matches) {
          return assumption;
        }

        let nextValue = value;
        if (field === "interestRate" || field === "termYears") {
          nextValue = getNumericValue(value);
        }

        let nextAssumption = { ...assumption };

        if (field === "financingType") {
          nextAssumption.financingType = value;
        } else if (field === "interestRate") {
          nextAssumption.interestRate = getNumericValue(value);
        } else if (field === "termYears") {
          const numeric = Math.max(0, Math.round(getNumericValue(value)));
          nextAssumption.termYears = numeric;
        } else {
          nextAssumption = {
            ...assumption,
            [field]: nextValue,
          };
        }

        updatedRecord = nextAssumption;
        return nextAssumption;
      })
    );

    if (updatedRecord) {
      try {
        await saveFundingSourceAssumption(updatedRecord);
      } catch (error) {
        console.error("Failed to update funding source assumption:", error);
      }
    }
  };

  // Project management functions
  const addProject = async (type = "project") => {
    if (isReadOnly) {
      return;
    }
    const newProject =
      type === "project"
        ? {
            name: "New Project",
            type: "project",
            projectTypeId: projectTypes[0]?.id || 1,
            fundingSourceId: fundingSources[0]?.id || 1,
            deliveryType: "self-perform",
            sizeCategory: "Medium",
            totalBudget: 1000000,
            designBudgetPercent: 15,
            constructionBudgetPercent: 85,
            designDuration: 3,
            constructionDuration: 12,
            designStartDate: "2025-01-01",
            constructionStartDate: "2025-06-01",
            priority: "Medium",
            description: "",
          }
        : {
            name: "New Annual Program",
            type: "program",
            projectTypeId: projectTypes[0]?.id || 1,
            fundingSourceId: fundingSources[0]?.id || 1,
            deliveryType: "self-perform",
            sizeCategory: "Program",
            annualBudget: 500000,
            designBudgetPercent: 15,
            constructionBudgetPercent: 85,
            continuousPmHours: 0,
            continuousDesignHours: 0,
            continuousConstructionHours: 0,
            description: "",
          };

    const normalizedProject = normalizeProjectBudgetBreakdown(newProject);

    try {
      const savedProjectId = await saveProject(normalizedProject);
      const projectWithId = { ...normalizedProject, id: savedProjectId };
      setProjects((prev) => [...prev, projectWithId]);
    } catch (error) {
      console.error("Error adding project:", error);
    }
  };

  const updateProject = async (id, fieldOrUpdates, value) => {
    if (isReadOnly) {
      return;
    }
    const normalizeDeliveryType = (input) =>
      ["self-perform", "hybrid", "consultant"].includes(input)
        ? input
        : "self-perform";

    const updates =
      fieldOrUpdates && typeof fieldOrUpdates === "object"
        ? Object.entries(fieldOrUpdates).reduce((acc, [key, val]) => {
            acc[key] = key === "deliveryType" ? normalizeDeliveryType(val) : val;
            return acc;
          }, {})
        : {
            [fieldOrUpdates]:
              fieldOrUpdates === "deliveryType"
                ? normalizeDeliveryType(value)
                : value,
          };

    const updatedProjects = projects.map((p) =>
      p.id === id
        ? normalizeProjectBudgetBreakdown({ ...p, ...updates })
        : p
    );
    setProjects(updatedProjects);

    // Save to database
    const updatedProject = updatedProjects.find((p) => p.id === id);
    if (updatedProject) {
      try {
        await saveProject(updatedProject);
      } catch (error) {
        console.error("Error updating project:", error);
      }
    }
  };

  const deleteProject = async (id) => {
    if (isReadOnly) {
      return;
    }
    try {
      await dbDeleteProject(id);
      setProjects(projects.filter((p) => p.id !== id));
      setStaffAllocations((previous) => {
        if (!previous || !previous[id]) {
          return previous;
        }
        const next = { ...previous };
        delete next[id];
        return next;
      });
      setStaffAssignmentOverrides((previous) => {
        if (!previous || !previous[id]) {
          return previous;
        }
        const next = { ...previous };
        delete next[id];
        return next;
      });
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  // Staff management functions
  const updateStaffAllocation = async (projectId, categoryId, phase, hours) => {
    if (isReadOnly) {
      return;
    }
    const existingAllocation =
      staffAllocations[projectId]?.[categoryId] || {
        pmHours: 0,
        designHours: 0,
        constructionHours: 0,
      };

    const newAllocations = {
      ...staffAllocations,
      [projectId]: {
        ...staffAllocations[projectId],
        [categoryId]: {
          ...existingAllocation,
          [`${phase}Hours`]: parseFloat(hours) || 0,
        },
      },
    };
    setStaffAllocations(newAllocations);

    // Save to database
    try {
      const storageProjectId = normalizeStorageId(projectId);
      const storageCategoryId = normalizeStorageId(categoryId);

      await saveStaffAllocation({
        projectId: storageProjectId ?? projectId,
        categoryId: storageCategoryId ?? categoryId,
        pmHours: newAllocations[projectId][categoryId].pmHours || 0,
        designHours: newAllocations[projectId][categoryId].designHours || 0,
        constructionHours:
          newAllocations[projectId][categoryId].constructionHours || 0,
      });
    } catch (error) {
      console.error("Error saving staff allocation:", error);
    }
  };

  const upsertProjectEffortTemplate = async (template) => {
    if (isReadOnly) {
      return null;
    }

    const normalizedTemplate = normalizeEffortTemplate(template);
    const payload = {
      ...normalizedTemplate,
      id: template?.id ?? normalizedTemplate.id,
    };

    try {
      const savedId = await dbSaveProjectEffortTemplate(payload);
      const templateId = savedId || payload.id;

      const templateWithId = {
        ...normalizedTemplate,
        id: templateId,
      };

      setProjectEffortTemplates((previous) => {
        const existingIndex = previous.findIndex(
          (entry) => entry.id && templateId && String(entry.id) === String(templateId)
        );

        if (existingIndex >= 0) {
          const next = [...previous];
          next[existingIndex] = templateWithId;
          return next;
        }

        return [...previous, templateWithId];
      });

      return templateId;
    } catch (error) {
      console.error("Error saving project effort template:", error);
      return null;
    }
  };

  const removeProjectEffortTemplate = async (templateId) => {
    if (isReadOnly) {
      return;
    }

    if (!templateId) {
      return;
    }

    try {
      await dbDeleteProjectEffortTemplate(templateId);
      setProjectEffortTemplates((previous) =>
        previous.filter((template) => String(template.id) !== String(templateId))
      );
    } catch (error) {
      console.error("Error deleting project effort template:", error);
    }
  };

  const applyProjectEffortTemplate = async (template, targetProjectIds = []) => {
    if (isReadOnly) {
      return;
    }

    if (!template) {
      return;
    }

    const storedTemplate = template.id
      ? projectEffortTemplates.find(
          (entry) => entry.id && String(entry.id) === String(template.id)
        )
      : null;

    const normalizedTemplate = storedTemplate || normalizeEffortTemplate(template);
    const sanitizedHours = normalizedTemplate.hoursByCategory || {};

    const categoryMap = new Map(
      staffCategories
        .filter((category) => category && category.id !== undefined && category.id !== null)
        .map((category) => [String(category.id), category.id])
    );

    const validProjectIds = Array.from(
      new Set(
        (targetProjectIds || []).filter(
          (projectId) => projectId !== undefined && projectId !== null
        )
      )
    );

    if (!validProjectIds.length || !Object.keys(sanitizedHours).length) {
      return;
    }

    setStaffAllocations((previous) => {
      const next = { ...previous };

      validProjectIds.forEach((projectId) => {
        const projectKey = projectId;
        const existingProjectAllocations = {
          ...(next[projectKey] || {}),
        };

        Object.entries(sanitizedHours).forEach(([categoryKey, hours]) => {
          const resolvedCategoryId = categoryMap.get(String(categoryKey));
          if (!resolvedCategoryId) {
            return;
          }

          existingProjectAllocations[resolvedCategoryId] = {
            pmHours: Number(hours.pmHours) || 0,
            designHours: Number(hours.designHours) || 0,
            constructionHours: Number(hours.constructionHours) || 0,
          };
        });

        next[projectKey] = existingProjectAllocations;
      });

      return next;
    });

    try {
      const tasks = [];

      validProjectIds.forEach((projectId) => {
        Object.entries(sanitizedHours).forEach(([categoryKey, hours]) => {
          const resolvedCategoryId = categoryMap.get(String(categoryKey));
          if (!resolvedCategoryId) {
            return;
          }

          const storageProjectId = normalizeStorageId(projectId) ?? projectId;
          const storageCategoryId =
            normalizeStorageId(resolvedCategoryId) ?? resolvedCategoryId;

          tasks.push(
            saveStaffAllocation({
              projectId: storageProjectId,
              categoryId: storageCategoryId,
              pmHours: Number(hours.pmHours) || 0,
              designHours: Number(hours.designHours) || 0,
              constructionHours: Number(hours.constructionHours) || 0,
            })
          );
        });
      });

      await Promise.all(tasks);
    } catch (error) {
      console.error("Error applying project effort template:", error);
    }
  };

  const updateStaffAssignmentOverride = async (
    projectId,
    staffId,
    phase,
    value
  ) => {
    if (isReadOnly) {
      return;
    }
    const projectKey = toIdKey(projectId);
    const staffKey = toIdKey(staffId);

    if (!projectKey || !staffKey) {
      return;
    }

    const phaseKeyMap = {
      pm: "pmHours",
      design: "designHours",
      construction: "constructionHours",
    };

    const assignmentKey = phaseKeyMap[phase];
    if (!assignmentKey) {
      return;
    }

    const sanitizedHours = Math.max(0, Number(value) || 0);

    const existingProjectAssignments =
      staffAssignmentOverrides[projectKey] || {};
    const existingAssignment = existingProjectAssignments[staffKey] || {
      pmHours: 0,
      designHours: 0,
      constructionHours: 0,
    };

    const updatedAssignment = {
      ...existingAssignment,
      [assignmentKey]: sanitizedHours,
    };

    const isEmptyAssignment =
      updatedAssignment.pmHours <= 0 &&
      updatedAssignment.designHours <= 0 &&
      updatedAssignment.constructionHours <= 0;

    setStaffAssignmentOverrides((previous) => {
      const next = { ...previous };
      const projectAssignments = { ...(next[projectKey] || {}) };

      if (isEmptyAssignment) {
        delete projectAssignments[staffKey];
      } else {
        projectAssignments[staffKey] = updatedAssignment;
      }

      if (Object.keys(projectAssignments).length === 0) {
        delete next[projectKey];
      } else {
        next[projectKey] = projectAssignments;
      }

      return next;
    });

    try {
      const storageProjectId = normalizeStorageId(projectId);
      const storageStaffId = normalizeStorageId(staffId);

      if (isEmptyAssignment) {
        await dbDeleteStaffAssignment(
          storageProjectId ?? projectId,
          storageStaffId ?? staffId
        );
      } else {
        await saveStaffAssignment({
          projectId: storageProjectId ?? projectId,
          staffId: storageStaffId ?? staffId,
          pmHours: updatedAssignment.pmHours || 0,
          designHours: updatedAssignment.designHours || 0,
          constructionHours: updatedAssignment.constructionHours || 0,
        });
      }
    } catch (error) {
      console.error("Error saving staff assignment override:", error);
    }
  };

  const resetProjectAssignments = async (projectId) => {
    const projectKey = toIdKey(projectId);
    if (!projectKey) {
      return;
    }

    const existingAssignments = staffAssignmentOverrides[projectKey];
    if (!existingAssignments) {
      return;
    }

    setStaffAssignmentOverrides((previous) => {
      const next = { ...previous };
      delete next[projectKey];
      return next;
    });

    try {
      const storageProjectId = normalizeStorageId(projectId) ?? projectId;

      await Promise.all(
        Object.keys(existingAssignments).map((staffKey) =>
          dbDeleteStaffAssignment(
            storageProjectId,
            normalizeStorageId(staffKey) ?? staffKey
          )
        )
      );
    } catch (error) {
      console.error("Error clearing staff assignments:", error);
    }
  };

  const addStaffCategory = async () => {
    if (isReadOnly) {
      return;
    }
    const newCategory = {
      name: "New Category",
      hourlyRate: 65,
      pmCapacity: 0,
      designCapacity: 40,
      constructionCapacity: 40,
    };

    try {
      const savedCategoryId = await saveStaffCategory(newCategory);
      const categoryWithId = { ...newCategory, id: savedCategoryId };
      setStaffCategories((prev) => [...prev, categoryWithId]);
    } catch (error) {
      console.error("Error adding staff category:", error);
    }
  };

  const updateStaffCategory = async (id, field, value) => {
    if (isReadOnly) {
      return;
    }
    const currentCategory = staffCategories.find((category) => category.id === id);

    if (!currentCategory) {
      return;
    }

    const isCapacityField = CAPACITY_FIELDS.includes(field);
    let sanitizedValue;

    if (field === "hourlyRate") {
      sanitizedValue = Math.max(0, getNumericValue(value));
    } else if (isCapacityField) {
      sanitizedValue = Math.max(0, getNumericValue(value));
    } else {
      sanitizedValue = value;
    }

    const updatedCategory = {
      ...currentCategory,
      [field]: sanitizedValue,
    };

    updatedCategory.hourlyRate = getNumericValue(updatedCategory.hourlyRate);
    CAPACITY_FIELDS.forEach((capacityField) => {
      updatedCategory[capacityField] = getNumericValue(
        updatedCategory[capacityField]
      );
    });

    const finalTotalHours = CAPACITY_FIELDS.reduce(
      (sum, capacityField) => sum + updatedCategory[capacityField],
      0
    );
    const remainingCapacity = Math.max(
      0,
      MAX_MONTHLY_FTE_HOURS -
        CAPACITY_FIELDS.reduce((sum, capacityField) => {
          if (capacityField === field) {
            return sum;
          }
          return sum + getNumericValue(currentCategory[capacityField]);
        }, 0)
    );

    if (isCapacityField && finalTotalHours > MAX_MONTHLY_FTE_HOURS) {
      const fieldLabels = {
        pmCapacity: "project management",
        designCapacity: "design",
        constructionCapacity: "construction",
      };

      setCategoryCapacityWarnings((prev) => ({
        ...prev,
        [id]: `Exceeds the 1 FTE (${MAX_MONTHLY_FTE_HOURS.toFixed(
          2
        )} hrs) limit. Only ${remainingCapacity.toFixed(2)} hrs remain for ${
          fieldLabels[field]
        } capacity. Reduce other phases or lower this value.`,
      }));
      return;
    }

    setStaffCategories((prev) =>
      prev.map((category) => (category.id === id ? updatedCategory : category))
    );

    setCategoryCapacityWarnings((prev) => {
      const nextWarnings = { ...prev };
      delete nextWarnings[id];
      return nextWarnings;
    });

    try {
      await saveStaffCategory(updatedCategory);
    } catch (error) {
      console.error("Error updating staff category:", error);
    }
  };

  const deleteStaffCategory = async (id) => {
    if (isReadOnly) {
      return;
    }
    try {
      await dbDeleteStaffCategory(id);
      setStaffCategories(staffCategories.filter((c) => c.id !== id));
      setCategoryCapacityWarnings((prev) => {
        const nextWarnings = { ...prev };
        delete nextWarnings[id];
        return nextWarnings;
      });
    } catch (error) {
      console.error("Error deleting staff category:", error);
    }
  };

  // Staff Members Management
  const addStaffMember = async () => {
    if (isReadOnly) {
      return;
    }
    const defaultCategoryId = staffCategories[0]?.id ?? null;
    const newMember = {
      name: "New Team Member",
      categoryId: defaultCategoryId,
      pmAvailability: 0,
      designAvailability: 0,
      constructionAvailability: 0,
    };

    try {
      const savedMemberId = await saveStaffMember(newMember);
      const memberWithId = { ...newMember, id: savedMemberId };
      setStaffMembers((prev) => [...prev, memberWithId]);
    } catch (error) {
      console.error("Error adding staff member:", error);
    }
  };

  const updateStaffMember = async (id, field, value) => {
    if (isReadOnly) {
      return;
    }
    const existingMember = staffMembers.find((member) => member.id === id);

    if (!existingMember) {
      return;
    }

    let sanitizedValue = value;

    if (field === "categoryId") {
      if (value === "" || value === null || value === undefined) {
        sanitizedValue = null;
      } else {
        const matchingCategory = staffCategories.find((category) => {
          if (!category) {
            return false;
          }

          const categoryId = category.id;
          if (categoryId === undefined || categoryId === null) {
            return false;
          }

          return String(categoryId) === String(value);
        });

        if (matchingCategory && matchingCategory.id !== undefined) {
          sanitizedValue = matchingCategory.id;
        } else {
          sanitizedValue = value;
        }
      }
    } else if (AVAILABILITY_FIELDS.includes(field)) {
      sanitizedValue = Math.max(0, getNumericValue(value));
    }

    const updatedMember = {
      ...existingMember,
      [field]: sanitizedValue,
    };

    setStaffMembers((prev) =>
      prev.map((member) => (member.id === id ? updatedMember : member))
    );

    try {
      await saveStaffMember(updatedMember);
    } catch (error) {
      console.error("Error updating staff member:", error);
    }
  };

  const deleteStaffMember = async (id) => {
    if (isReadOnly) {
      return;
    }
    try {
      await dbDeleteStaffMember(id);
      setStaffMembers((prev) => prev.filter((member) => member.id !== id));
      setStaffAssignmentOverrides((previous) => {
        if (!previous || Object.keys(previous).length === 0) {
          return previous;
        }

        const targetKey = toIdKey(id);
        if (!targetKey) {
          return previous;
        }
        let hasChanges = false;
        const next = {};

        Object.entries(previous).forEach(([projectKey, staffMap]) => {
          if (!staffMap) {
            return;
          }

          const filteredEntries = Object.entries(staffMap).filter(
            ([staffKey]) => staffKey !== targetKey
          );

          if (filteredEntries.length === 0) {
            if (Object.keys(staffMap).length > 0) {
              hasChanges = true;
            }
            return;
          }

          if (filteredEntries.length !== Object.keys(staffMap).length) {
            hasChanges = true;
          }

          next[projectKey] = Object.fromEntries(filteredEntries);
        });

        return hasChanges ? next : previous;
      });
    } catch (error) {
      console.error("Error deleting staff member:", error);
    }
  };

  // Project Types Management
  const addProjectType = async () => {
    if (isReadOnly) {
      return;
    }
    const colors = [
      "#3b82f6",
      "#10b981",
      "#f59e0b",
      "#8b5cf6",
      "#ef4444",
      "#06b6d4",
      "#84cc16",
      "#f97316",
    ];
    const newType = {
      name: "New Type",
      color: colors[projectTypes.length % colors.length],
    };

    try {
      const savedTypeId = await saveProjectType(newType);
      const typeWithId = { ...newType, id: savedTypeId };
      setProjectTypes((prev) => [...prev, typeWithId]);
    } catch (error) {
      console.error("Error adding project type:", error);
    }
  };

  const updateProjectType = async (id, field, value) => {
    if (isReadOnly) {
      return;
    }
    const updatedTypes = projectTypes.map((t) =>
      t.id === id ? { ...t, [field]: value } : t
    );
    setProjectTypes(updatedTypes);

    // Save to database
    const updatedType = updatedTypes.find((t) => t.id === id);
    if (updatedType) {
      try {
        await saveProjectType(updatedType);
      } catch (error) {
        console.error("Error updating project type:", error);
      }
    }
  };

  const deleteProjectType = async (id) => {
    if (isReadOnly) {
      return;
    }
    try {
      await dbDeleteProjectType(id);
      setProjectTypes(projectTypes.filter((t) => t.id !== id));
    } catch (error) {
      console.error("Error deleting project type:", error);
    }
  };

  // Funding Sources Management
  const addFundingSource = async () => {
    if (isReadOnly) {
      return;
    }
    const newSource = {
      name: "New Funding Source",
      description: "",
    };

    try {
      const savedSourceId = await saveFundingSource(newSource);
      const sourceWithId = { ...newSource, id: savedSourceId };
      setFundingSources((prev) => [...prev, sourceWithId]);
    } catch (error) {
      console.error("Error adding funding source:", error);
    }
  };

  const updateFundingSource = async (id, field, value) => {
    if (isReadOnly) {
      return;
    }
    const updatedSources = fundingSources.map((f) =>
      f.id === id ? { ...f, [field]: value } : f
    );
    setFundingSources(updatedSources);

    // Save to database
    const updatedSource = updatedSources.find((f) => f.id === id);
    if (updatedSource) {
      try {
        await saveFundingSource(updatedSource);
      } catch (error) {
        console.error("Error updating funding source:", error);
      }
    }
  };

  const deleteFundingSource = async (id) => {
    if (isReadOnly) {
      return;
    }
    try {
      await dbDeleteFundingSource(id);
      setFundingSources(fundingSources.filter((f) => f.id !== id));
    } catch (error) {
      console.error("Error deleting funding source:", error);
    }
  };

  // Scenario planning helpers
  const createScenario = () => {
    if (isReadOnly) {
      return;
    }
    const timestamp = Date.now();
    const newScenario = {
      id: `scenario-${timestamp}`,
      name: `Scenario ${scenarios.length}`,
      description: "Describe the goal for this scenario.",
      adjustments: {},
      createdAt: new Date().toISOString(),
    };
    setScenarios((prev) => [...prev, newScenario]);
    setActiveScenarioId(newScenario.id);
  };

  const duplicateScenario = (scenarioId) => {
    if (isReadOnly) {
      return;
    }
    const sourceScenario = scenarios.find((scenario) => scenario.id === scenarioId);
    if (!sourceScenario) {
      return;
    }

    const timestamp = Date.now();
    const clonedScenario = {
      id: `scenario-${timestamp}`,
      name: `${sourceScenario.name} Copy`,
      description: sourceScenario.description,
      adjustments: JSON.parse(JSON.stringify(sourceScenario.adjustments || {})),
      createdAt: new Date().toISOString(),
    };

    setScenarios((prev) => [...prev, clonedScenario]);
    setActiveScenarioId(clonedScenario.id);
  };

  const updateScenarioMeta = (scenarioId, updates) => {
    if (isReadOnly) {
      return;
    }
    setScenarios((prev) =>
      prev.map((scenario) =>
        scenario.id === scenarioId && !scenario.isBaseline
          ? { ...scenario, ...updates }
          : scenario
      )
    );
  };

  const updateScenarioAdjustment = (scenarioId, projectId, fields) => {
    if (isReadOnly) {
      return;
    }
    setScenarios((prev) =>
      prev.map((scenario) => {
        if (scenario.id !== scenarioId || scenario.isBaseline) {
          return scenario;
        }

        const projectKey = toIdKey(projectId);
        if (!projectKey) {
          return scenario;
        }

        const nextAdjustments = { ...(scenario.adjustments || {}) };
        const currentAdjustment = { ...(nextAdjustments[projectKey] || {}) };

        Object.entries(fields).forEach(([key, value]) => {
          if (!value) {
            delete currentAdjustment[key];
          } else {
            currentAdjustment[key] = value;
          }
        });

        if (Object.keys(currentAdjustment).length > 0) {
          nextAdjustments[projectKey] = currentAdjustment;
        } else {
          delete nextAdjustments[projectKey];
        }

        return {
          ...scenario,
          adjustments: nextAdjustments,
        };
      })
    );
  };

  const resetScenarioProject = (scenarioId, projectId) => {
    if (isReadOnly) {
      return;
    }
    setScenarios((prev) =>
      prev.map((scenario) => {
        if (scenario.id !== scenarioId || scenario.isBaseline) {
          return scenario;
        }

        const projectKey = toIdKey(projectId);
        if (!projectKey) {
          return scenario;
        }

        if (!scenario.adjustments || !scenario.adjustments[projectKey]) {
          return scenario;
        }

        const nextAdjustments = { ...scenario.adjustments };
        delete nextAdjustments[projectKey];

        return {
          ...scenario,
          adjustments: nextAdjustments,
        };
      })
    );
  };

  // Data import/export
  const handleImport = (file) => {
    if (isReadOnly) {
      return;
    }

    handleCSVImport(file, projects, setProjects, staffCategories);
  };

  const handleExport = async () => {
    try {
      const blob = await exportDatabase();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vector_organization_snapshot_${
        new Date().toISOString().split("T")[0]
      }.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting data:", error);
    }
  };

  // Show loading state only initially
  if (dbLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">
            Loading Vector...
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (dbError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-sm max-w-md">
          <div className="text-red-600 mb-4">
            <AlertTriangle size={48} className="mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Database Error
          </h2>
          <p className="text-gray-600 mb-4">{dbError}</p>
          <button
            onClick={clearError}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {moduleOptions.map((module) => {
            const Icon = module.icon;
            const isActive = activeModule === module.id;
            return (
              <button
                type="button"
                key={module.id}
                onClick={() => handleSelectModule(module.id)}
                className={`flex h-full w-full items-start gap-3 rounded-lg border px-4 py-3 text-left shadow-sm transition ${
                  isActive
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
                }`}
              >
                <span
                  className={`rounded-full border p-2 ${
                    isActive
                      ? "border-blue-400 bg-blue-100 text-blue-600"
                      : "border-slate-200 bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon size={20} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{module.label}</span>
                  <span className="mt-1 block text-xs text-inherit">{module.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        {activeModule === "planning" ? (
          <>
            <div className="bg-white rounded-lg shadow-sm relative">
              {isSaving && (
                <div className="absolute top-4 right-4 flex items-center gap-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">Saving...</span>
                </div>
              )}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: "overview", label: "Overview", icon: Calendar },
                    {
                      id: "projects",
                      label: "Projects & Programs",
                      icon: FolderOpen,
                    },
                    {
                      type: "dropdown",
                      id: "people-menu",
                      label: "People",
                      icon: Users,
                      items: [
                        { id: "people", label: "Staff", icon: UserCircle },
                        { id: "assignments", label: "Assignments", icon: Users },
                        { id: "staff", label: "Categories", icon: Settings },
                      ],
                    },
                    {
                      id: "allocations",
                      label: "Effort Projections",
                      icon: Edit3,
                    },
                    { id: "scenarios", label: "Scenarios", icon: GitBranch },
                    {
                      id: "schedule",
                      label: "Schedule View",
                      icon: CalendarClock,
                    },
                    {
                      id: "forecast",
                      label: "Resource Forecast",
                      icon: AlertTriangle,
                    },
                    { id: "reports", label: "Reports", icon: FileSpreadsheet },
                    { id: "settings", label: "Settings", icon: Settings },
                  ].map((tab) => {
                    if (tab.type === "dropdown") {
                      const Icon = tab.icon;
                      const isActive = tab.items.some((item) => item.id === activeTab);
                      return (
                        <div
                          key={tab.id}
                          className="relative"
                          ref={(element) => {
                            if (element) {
                              dropdownRefs.current[tab.id] = element;
                            } else {
                              delete dropdownRefs.current[tab.id];
                            }
                          }}
                        >
                          <button
                            type="button"
                            id={`${tab.id}-button`}
                            onClick={() =>
                              setActiveDropdown((current) =>
                                current === tab.id ? null : tab.id
                              )
                            }
                            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                              isActive
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                            aria-haspopup="menu"
                            aria-expanded={activeDropdown === tab.id}
                          >
                            <Icon size={16} />
                            {tab.label}
                            <ChevronDown size={14} />
                          </button>
                          {activeDropdown === tab.id && (
                            <div
                              className="absolute left-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10"
                              role="menu"
                              aria-labelledby={`${tab.id}-button`}
                            >
                              {tab.items.map((item) => {
                                const SubIcon = item.icon;
                                const isSubActive = activeTab === item.id;
                                return (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    key={item.id}
                                    onClick={() => {
                                      setActiveTab(item.id);
                                      setActiveDropdown(null);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                                      isSubActive
                                        ? "bg-blue-50 text-blue-600"
                                        : "text-gray-700 hover:bg-gray-50"
                                    }`}
                                  >
                                    <SubIcon size={16} />
                                    {item.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    const Icon = tab.icon;
                    return (
                      <button
                        type="button"
                        key={tab.id}
                        onClick={() => {
                          setActiveDropdown(null);
                          setActiveTab(tab.id);
                        }}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                          activeTab === tab.id
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <Icon size={16} />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            <div className="space-y-6">
              {activeTab === "overview" && (
                <Overview
                  projects={projects}
                  projectTypes={projectTypes}
                  staffingGaps={staffingGaps}
                  projectTimelines={projectTimelines}
                />
              )}

              {activeTab === "projects" && (
                <ProjectsPrograms
                  projects={projects}
                  projectTypes={projectTypes}
                  fundingSources={fundingSources}
                  staffCategories={staffCategories}
                  addProject={addProject}
                  updateProject={updateProject}
                  deleteProject={deleteProject}
                  handleImport={handleImport}
                  isReadOnly={isReadOnly}
                />
              )}
              {activeTab === "staff" && (
                <StaffCategories
                  staffCategories={staffCategories}
                  addStaffCategory={addStaffCategory}
                  updateStaffCategory={updateStaffCategory}
                  deleteStaffCategory={deleteStaffCategory}
                  capacityWarnings={categoryCapacityWarnings}
                  maxMonthlyFteHours={MAX_MONTHLY_FTE_HOURS}
                  isReadOnly={isReadOnly}
                />
              )}

              {activeTab === "people" && (
                <PeopleTab
                  staffMembers={staffMembers}
                  staffCategories={staffCategories}
                  addStaffMember={addStaffMember}
                  updateStaffMember={updateStaffMember}
                  deleteStaffMember={deleteStaffMember}
                  staffAvailabilityByCategory={staffAvailabilityByCategory}
                  isReadOnly={isReadOnly}
                />
              )}

              {activeTab === "assignments" && (
                <StaffAssignmentsTab
                  projects={projects.filter((project) =>
                    isProjectOrProgram(project)
                  )}
                  staffMembers={staffMembers}
                  staffCategories={staffCategories}
                  staffAllocations={staffAllocations}
                  assignmentOverrides={staffAssignmentOverrides}
                  assignmentPlan={staffAssignmentPlan}
                  onUpdateAssignment={updateStaffAssignmentOverride}
                  onResetProjectAssignments={resetProjectAssignments}
                  staffAvailabilityByCategory={staffAvailabilityByCategory}
                  isReadOnly={isReadOnly}
                />
              )}

              {activeTab === "allocations" && (
                <StaffAllocations
                  projects={projects.filter((p) => p.type === "project")}
                  projectTypes={projectTypes}
                  staffCategories={staffCategories}
                  staffAllocations={staffAllocations}
                  updateStaffAllocation={updateStaffAllocation}
                  fundingSources={fundingSources}
                  isReadOnly={isReadOnly}
                />
              )}

              {activeTab === "scenarios" && (
                <ScenariosTab
                  projects={projects}
                  projectTypes={projectTypes}
                  staffCategories={staffCategories}
                  staffAllocations={staffAllocations}
                  staffAvailabilityByCategory={staffAvailabilityByCategory}
                  scenarios={scenarios}
                  activeScenarioId={activeScenarioId}
                  onSelectScenario={setActiveScenarioId}
                  onCreateScenario={createScenario}
                  onDuplicateScenario={duplicateScenario}
                  onUpdateScenarioMeta={updateScenarioMeta}
                  onUpdateScenarioAdjustment={updateScenarioAdjustment}
                  onResetScenarioProject={resetScenarioProject}
                  timeHorizon={timeHorizon}
                  isReadOnly={isReadOnly}
                />
              )}

              {activeTab === "schedule" && (
                <ScheduleView
                  projectTimelines={projectTimelines}
                  projectTypes={projectTypes}
                  staffCategories={staffCategories}
                  staffAllocations={staffAllocations}
                  staffAvailabilityByCategory={staffAvailabilityByCategory}
                  scheduleHorizon={scheduleHorizon}
                  setScheduleHorizon={setScheduleHorizon}
                />
              )}
              {activeTab === "forecast" && (
                <ResourceForecast
                  resourceForecast={resourceForecast}
                  staffCategories={staffCategories}
                  staffingGaps={staffingGaps}
                  timeHorizon={timeHorizon}
                  setTimeHorizon={setTimeHorizon}
                />
              )}

              {activeTab === "reports" && (
                <ReportsTab
                  projects={projects}
                  projectTypes={projectTypes}
                  fundingSources={fundingSources}
                  projectTimelines={projectTimelines}
                  staffCategories={staffCategories}
                  staffAllocations={staffAllocations}
                  staffingGaps={staffingGaps}
                  resourceForecast={resourceForecast}
                  staffMembers={staffMembers}
                  staffAssignmentPlan={staffAssignmentPlan}
                />
              )}

              {activeTab === "settings" && (
                <SettingsTab
                  projectTypes={projectTypes}
                  fundingSources={fundingSources}
                  addProjectType={addProjectType}
                  updateProjectType={updateProjectType}
                  deleteProjectType={deleteProjectType}
                  addFundingSource={addFundingSource}
                  updateFundingSource={updateFundingSource}
                  deleteFundingSource={deleteFundingSource}
                  isReadOnly={isReadOnly}
                />
              )}
            </div>
          </>
        ) : (
          <FinancialModelingModule
            projectTimelines={projectTimelines}
            projectTypes={projectTypes}
            fundingSources={fundingSources}
            operatingBudget={activeUtilityProfile.operatingBudget}
            onUpdateOperatingBudget={(year, field, value) =>
              updateOperatingBudgetValue(activeUtility, year, field, value)
            }
            financialConfig={activeUtilityProfile.financialConfig}
            onUpdateFinancialConfig={(updates) =>
              updateFinancialConfiguration(activeUtility, updates)
            }
            budgetEscalations={activeUtilityProfile.budgetEscalations}
          onUpdateBudgetEscalation={(field, value) =>
            updateBudgetEscalation(activeUtility, field, value)
          }
          fundingSourceAssumptions={fundingSourceAssumptions}
          onUpdateFundingSourceAssumption={updateFundingSourceAssumption}
          activeUtility={activeUtility}
          onChangeUtility={(utility) => setActiveUtility(utility)}
          utilityOptions={UTILITY_OPTIONS}
          projectTypeUtilities={projectTypeUtilities}
          onUpdateProjectTypeUtility={handleUpdateProjectTypeUtility}
          isReadOnly={isReadOnly}
          existingDebtManualTotals={activeUtilityProfile.existingDebtManualTotals}
          existingDebtInstruments={activeUtilityProfile.existingDebtInstruments}
          onUpdateExistingDebtManual={(year, value) =>
            updateExistingDebtManualValue(activeUtility, year, value)
          }
          onAddExistingDebtInstrument={(instrument) =>
            addExistingDebtInstrument(activeUtility, instrument)
          }
          onRemoveExistingDebtInstrument={(instrumentId) =>
            removeExistingDebtInstrument(activeUtility, instrumentId)
          }
        />
      )}
      
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Data Management</h3>
          <div className="flex flex-wrap gap-4 items-center">
            <button
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
              onClick={handleExport}
            >
              <Download size={16} />
              Export JSON Snapshot
            </button>
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-500">
              <Upload size={16} />
              Import snapshots coming soon
            </div>
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-900 space-y-1">
            <p>
              • <strong>Supabase Postgres:</strong> All organization data is stored securely in a hosted Postgres database with row-level security.
            </p>
            <p>
              • <strong>Automatic persistence:</strong> Changes are saved instantly. Export a snapshot when you need a point-in-time backup or to share data with support.
            </p>
            <p>
              • <strong>Imports:</strong> Snapshot imports will be available in a future release.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CapitalPlanningTool;
