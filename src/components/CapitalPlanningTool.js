import React, { useState, useEffect, useMemo } from "react";
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

// Import data and utilities
import {
  defaultStaffCategories,
  defaultProjectTypes,
  defaultFundingSources,
  defaultProjects,
  defaultStaffMembers,
} from "../data/defaultData";
import {
  calculateTimelines,
  generateResourceForecast,
  calculateStaffingGaps,
} from "../utils/calculations";
import { handleCSVImport } from "../utils/dataImport";
import { useDatabase } from "../hooks/useDatabase";

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

const CapitalPlanningTool = () => {
  // Database hook with fixed default data
  const defaultData = useMemo(
    () => ({
      projects: defaultProjects,
      staffCategories: defaultStaffCategories,
      projectTypes: defaultProjectTypes,
      fundingSources: defaultFundingSources,
      staffAllocations: {},
      staffMembers: defaultStaffMembers,
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
    exportDatabase,
    importDatabase,
  } = useDatabase(defaultData);

  // Core data states
  const [staffCategories, setStaffCategories] = useState(
    defaultStaffCategories
  );
  const [projectTypes, setProjectTypes] = useState(defaultProjectTypes);
  const [fundingSources, setFundingSources] = useState(defaultFundingSources);
  const [projects, setProjects] = useState(defaultProjects);
  const [staffAllocations, setStaffAllocations] = useState({});
  const [staffMembers, setStaffMembers] = useState(defaultStaffMembers);
  const [activeTab, setActiveTab] = useState("overview");
  const [timeHorizon, setTimeHorizon] = useState(36);
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
            allocationsData,
            staffMembersData,
          ] = await Promise.all([
            getProjects(),
            getStaffCategories(),
            getProjectTypes(),
            getFundingSources(),
            getStaffAllocations(),
            getStaffMembers(),
          ]);

          // Only update if we got actual data
          if (projectsData && projectsData.length > 0) {
            setProjects(
              projectsData.map((project) => ({
                ...project,
                deliveryType: project.deliveryType || "self-perform",
              }))
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

          if (staffMembersData && staffMembersData.length > 0) {
            setStaffMembers(staffMembersData);
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
    getStaffAllocations,
    getStaffMembers,
  ]);

  const staffAvailabilityByCategory = useMemo(() => {
    const availability = {};

    staffMembers.forEach((member) => {
      if (!member || !member.categoryId) {
        return;
      }

      const categoryId = parseInt(member.categoryId, 10);

      if (!Number.isFinite(categoryId)) {
        return;
      }

      if (!availability[categoryId]) {
        availability[categoryId] = {
          pm: 0,
          design: 0,
          construction: 0,
          total: 0,
        };
      }

      const pm = getNumericValue(member.pmAvailability);
      const design = getNumericValue(member.designAvailability);
      const construction = getNumericValue(member.constructionAvailability);

      availability[categoryId].pm += pm;
      availability[categoryId].design += design;
      availability[categoryId].construction += construction;
      availability[categoryId].total += pm + design + construction;
    });

    return availability;
  }, [staffMembers]);

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
      const validProjectIds = new Set(projects.map((project) => project.id));
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
            const numericId = Number(projectId);
            if (validProjectIds.has(numericId)) {
              nextAdjustments[numericId] = adjustment;
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

  // Project management functions
  const addProject = async (type = "project") => {
    const newProject =
      type === "project"
        ? {
            name: "New Project",
            type: "project",
            projectTypeId: projectTypes[0]?.id || 1,
            fundingSourceId: fundingSources[0]?.id || 1,
            deliveryType: "self-perform",
            totalBudget: 1000000,
            designBudget: 100000,
            constructionBudget: 900000,
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
            annualBudget: 500000,
            designBudgetPercent: 15,
            constructionBudgetPercent: 85,
            continuousPmHours: 20,
            continuousDesignHours: 40,
            continuousConstructionHours: 80,
            description: "",
          };

    try {
      const savedProjectId = await saveProject(newProject);
      const projectWithId = { ...newProject, id: savedProjectId };
      setProjects((prev) => [...prev, projectWithId]);
    } catch (error) {
      console.error("Error adding project:", error);
    }
  };

  const updateProject = async (id, fieldOrUpdates, value) => {
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
      p.id === id ? { ...p, ...updates } : p
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
    try {
      await dbDeleteProject(id);
      setProjects(projects.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  // Staff management functions
  const updateStaffAllocation = async (projectId, categoryId, phase, hours) => {
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
      await saveStaffAllocation({
        projectId: parseInt(projectId),
        categoryId: parseInt(categoryId),
        pmHours: newAllocations[projectId][categoryId].pmHours || 0,
        designHours: newAllocations[projectId][categoryId].designHours || 0,
        constructionHours:
          newAllocations[projectId][categoryId].constructionHours || 0,
      });
    } catch (error) {
      console.error("Error saving staff allocation:", error);
    }
  };

  const addStaffCategory = async () => {
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
    const existingMember = staffMembers.find((member) => member.id === id);

    if (!existingMember) {
      return;
    }

    let sanitizedValue = value;

    if (field === "categoryId") {
      const parsed = parseInt(value, 10);
      sanitizedValue = Number.isFinite(parsed) ? parsed : null;
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
    try {
      await dbDeleteStaffMember(id);
      setStaffMembers((prev) => prev.filter((member) => member.id !== id));
    } catch (error) {
      console.error("Error deleting staff member:", error);
    }
  };

  // Project Types Management
  const addProjectType = async () => {
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
    try {
      await dbDeleteProjectType(id);
      setProjectTypes(projectTypes.filter((t) => t.id !== id));
    } catch (error) {
      console.error("Error deleting project type:", error);
    }
  };

  // Funding Sources Management
  const addFundingSource = async () => {
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
    try {
      await dbDeleteFundingSource(id);
      setFundingSources(fundingSources.filter((f) => f.id !== id));
    } catch (error) {
      console.error("Error deleting funding source:", error);
    }
  };

  // Scenario planning helpers
  const createScenario = () => {
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
    setScenarios((prev) =>
      prev.map((scenario) =>
        scenario.id === scenarioId && !scenario.isBaseline
          ? { ...scenario, ...updates }
          : scenario
      )
    );
  };

  const updateScenarioAdjustment = (scenarioId, projectId, fields) => {
    setScenarios((prev) =>
      prev.map((scenario) => {
        if (scenario.id !== scenarioId || scenario.isBaseline) {
          return scenario;
        }

        const nextAdjustments = { ...(scenario.adjustments || {}) };
        const currentAdjustment = { ...(nextAdjustments[projectId] || {}) };

        Object.entries(fields).forEach(([key, value]) => {
          if (!value) {
            delete currentAdjustment[key];
          } else {
            currentAdjustment[key] = value;
          }
        });

        if (Object.keys(currentAdjustment).length > 0) {
          nextAdjustments[projectId] = currentAdjustment;
        } else {
          delete nextAdjustments[projectId];
        }

        return {
          ...scenario,
          adjustments: nextAdjustments,
        };
      })
    );
  };

  const resetScenarioProject = (scenarioId, projectId) => {
    setScenarios((prev) =>
      prev.map((scenario) => {
        if (scenario.id !== scenarioId || scenario.isBaseline) {
          return scenario;
        }

        if (!scenario.adjustments || !scenario.adjustments[projectId]) {
          return scenario;
        }

        const nextAdjustments = { ...scenario.adjustments };
        delete nextAdjustments[projectId];

        return {
          ...scenario,
          adjustments: nextAdjustments,
        };
      })
    );
  };

  // Data import/export
  const handleImport = (file) => {
    handleCSVImport(file, projects, setProjects, staffCategories);
  };

  const handleExport = async () => {
    try {
      const blob = await exportDatabase();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `capital_plan_database_${
        new Date().toISOString().split("T")[0]
      }.sqlite`;
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
            Loading Capital Planning Tool...
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Capital Improvement Planning & Resource Forecasting
              </h1>
              <p className="text-gray-600">
                Utilities infrastructure planning and staff resource management
                tool
              </p>
            </div>
            {isSaving && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Saving...</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[ 
                { id: "overview", label: "Overview", icon: Calendar },
                {
                  id: "projects",
                  label: "Projects & Programs",
                  icon: FolderOpen,
                },
                { id: "staff", label: "Staff Categories", icon: Users },
                { id: "people", label: "People", icon: UserCircle },
                { id: "allocations", label: "Staff Allocations", icon: Edit3 },
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
                {
                  id: "reports",
                  label: "Reports",
                  icon: FileSpreadsheet,
                },
                { id: "settings", label: "Settings", icon: Settings },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
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

        {/* Tab Content */}
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
            />
          )}
        </div>

        {/* Export/Import Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Data Management</h3>
          <div className="flex gap-4">
            <button
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
              onClick={handleExport}
            >
              <Download size={16} />
              Export SQLite Database
            </button>
            <label className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 cursor-pointer">
              <Upload size={16} />
              Import SQLite Database
              <input
                type="file"
                accept=".sqlite,.db,.sqlite3"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    try {
                      await importDatabase(file);
                      window.location.reload();
                    } catch (error) {
                      alert(
                        "Error importing database. Please check file format."
                      );
                    }
                  }
                }}
              />
            </label>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">
              Database Features
            </h4>
            <div className="text-gray-700 text-sm space-y-1">
              <p>
                • <strong>SQLite Database:</strong> Full relational database
                with foreign keys and constraints
              </p>
              <p>
                • <strong>Large Storage:</strong> Can handle hundreds of MB of
                project data
              </p>
              <p>
                • <strong>Data Integrity:</strong> ACID transactions and
                referential integrity
              </p>
              <p>
                • <strong>Portable:</strong> Export as .sqlite files that work
                with any SQLite client
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CapitalPlanningTool;
