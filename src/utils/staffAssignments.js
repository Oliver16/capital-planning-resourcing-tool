import { isCapitalProject, isProgramProject } from "./projectTypes.js";

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const cloneHours = (hours = {}) => ({
  pmHours: toNumber(hours.pmHours),
  designHours: toNumber(hours.designHours),
  constructionHours: toNumber(hours.constructionHours),
});

const DEFAULT_PHASE_DURATIONS = {
  pm: 1,
  design: 1,
  construction: 1,
};

const DEFAULT_PROGRAM_DURATION_MONTHS = 12;

const normalizePhaseDuration = (value) => {
  const numeric = toNumber(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};

const ensurePhaseDuration = (value) => (value > 0 ? value : 1);

const parseDateValue = (value) => {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const calculateInclusiveMonthSpan = (start, end) => {
  const startDate = parseDateValue(start);
  const endDate = parseDateValue(end);

  if (!startDate || !endDate) {
    return DEFAULT_PROGRAM_DURATION_MONTHS;
  }

  const startMonth = startDate.getFullYear() * 12 + startDate.getMonth();
  const endMonth = endDate.getFullYear() * 12 + endDate.getMonth();
  const difference = endMonth - startMonth;

  if (!Number.isFinite(difference)) {
    return DEFAULT_PROGRAM_DURATION_MONTHS;
  }

  if (difference < 0) {
    return DEFAULT_PROGRAM_DURATION_MONTHS;
  }

  return Math.max(1, difference + 1);
};

const getProjectPhaseDurations = (project = {}) => {
  const designRaw = normalizePhaseDuration(project.designDuration);
  const constructionRaw = normalizePhaseDuration(project.constructionDuration);
  const pmRaw = designRaw + constructionRaw;

  return {
    pm: ensurePhaseDuration(pmRaw),
    design: ensurePhaseDuration(designRaw),
    construction: ensurePhaseDuration(constructionRaw),
  };
};

const getProgramPhaseDurations = (project = {}) => {
  const durationMonths = calculateInclusiveMonthSpan(
    project.programStartDate,
    project.programEndDate
  );

  const normalized = ensurePhaseDuration(durationMonths);

  return {
    pm: normalized,
    design: normalized,
    construction: normalized,
  };
};

const buildProjectPhaseDurationMap = (projects = []) => {
  const map = new Map();

  projects.forEach((project) => {
    if (!project || project.id == null) {
      return;
    }

    if (isProgramProject(project)) {
      map.set(Number(project.id), getProgramPhaseDurations(project));
      return;
    }

    if (isCapitalProject(project)) {
      map.set(Number(project.id), getProjectPhaseDurations(project));
    }
  });

  return map;
};

const convertTotalsToMonthly = (
  hours = {},
  durations = DEFAULT_PHASE_DURATIONS
) => {
  const pmDuration = Math.max(toNumber(durations.pm) || 0, 1);
  const designDuration = Math.max(toNumber(durations.design) || 0, 1);
  const constructionDuration = Math.max(toNumber(durations.construction) || 0, 1);

  const pmHours = toNumber(hours.pmHours) / pmDuration;
  const designHours = toNumber(hours.designHours) / designDuration;
  const constructionHours =
    toNumber(hours.constructionHours) / constructionDuration;

  return {
    pmHours,
    designHours,
    constructionHours,
    totalHours: pmHours + designHours + constructionHours,
  };
};

const convertMonthlyToTotals = (
  hours = {},
  durations = DEFAULT_PHASE_DURATIONS
) => {
  const pmDuration = Math.max(toNumber(durations.pm) || 0, 1);
  const designDuration = Math.max(toNumber(durations.design) || 0, 1);
  const constructionDuration = Math.max(toNumber(durations.construction) || 0, 1);

  const pmHours = toNumber(hours.pmHours) * pmDuration;
  const designHours = toNumber(hours.designHours) * designDuration;
  const constructionHours =
    toNumber(hours.constructionHours) * constructionDuration;

  return {
    pmHours,
    designHours,
    constructionHours,
    totalHours: pmHours + designHours + constructionHours,
  };
};

const buildMonthlyDemand = (demand = {}, projectDurations = new Map()) => {
  const monthly = {};

  Object.entries(demand).forEach(([projectId, categories]) => {
    const projectKey = Number(projectId);
    const durations = projectDurations.get(projectKey) || DEFAULT_PHASE_DURATIONS;

    monthly[projectKey] = {};

    Object.entries(categories || {}).forEach(([categoryId, hours]) => {
      monthly[projectKey][Number(categoryId)] = convertTotalsToMonthly(
        hours,
        durations
      );
    });
  });

  return monthly;
};

const convertProjectCategoryMapToTotals = (
  map = {},
  projectDurations = new Map()
) => {
  const converted = {};

  Object.entries(map).forEach(([projectId, categories]) => {
    const projectKey = Number(projectId);
    const durations = projectDurations.get(projectKey) || DEFAULT_PHASE_DURATIONS;

    converted[projectKey] = {};

    Object.entries(categories || {}).forEach(([entryId, hours]) => {
      converted[projectKey][Number(entryId)] = convertMonthlyToTotals(
        hours,
        durations
      );
    });
  });

  return converted;
};

const incrementPhaseValue = (target, phase, value) => {
  if (!target || !phase) {
    return;
  }

  const key = `${phase}Hours`;
  const current = toNumber(target[key]);
  const increment = toNumber(value);
  target[key] = current + increment;
};

const getTotalFromHours = (hours = {}) =>
  toNumber(hours.pmHours) +
  toNumber(hours.designHours) +
  toNumber(hours.constructionHours);

const emptyHours = () => ({
  pmHours: 0,
  designHours: 0,
  constructionHours: 0,
  totalHours: 0,
});

const addHours = (target, addition = {}) => {
  if (!target) {
    return emptyHours();
  }

  target.pmHours = toNumber(target.pmHours) + toNumber(addition.pmHours);
  target.designHours =
    toNumber(target.designHours) + toNumber(addition.designHours);
  target.constructionHours =
    toNumber(target.constructionHours) + toNumber(addition.constructionHours);
  target.totalHours =
    toNumber(target.totalHours) + toNumber(addition.totalHours || getTotalFromHours(addition));

  return target;
};

const buildProjectCategoryDemand = (staffAllocations = {}) => {
  const demand = {};

  Object.entries(staffAllocations).forEach(([projectId, categories]) => {
    if (!categories) {
      return;
    }

    const projectKey = Number(projectId);
    demand[projectKey] = {};

    Object.entries(categories).forEach(([categoryId, allocation]) => {
      const categoryKey = Number(categoryId);
      demand[projectKey][categoryKey] = cloneHours(allocation);
    });
  });

  return demand;
};

const normalizeProgramCategoryDemand = (project = {}) => {
  const raw = project?.continuousHoursByCategory;

  if (!raw) {
    return null;
  }

  let parsed = raw;

  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      console.warn("Unable to parse program hours config:", error);
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const normalized = {};

  Object.entries(parsed).forEach(([categoryId, hours]) => {
    if (!hours || typeof hours !== "object") {
      return;
    }

    const categoryKey = Number(categoryId);
    if (!Number.isFinite(categoryKey)) {
      return;
    }

    const pmHours = Math.max(0, toNumber(hours.pmHours));
    const designHours = Math.max(0, toNumber(hours.designHours));
    const constructionHours = Math.max(0, toNumber(hours.constructionHours));

    if (pmHours > 0 || designHours > 0 || constructionHours > 0) {
      normalized[categoryKey] = { pmHours, designHours, constructionHours };
    }
  });

  return Object.keys(normalized).length > 0 ? normalized : null;
};

const buildProgramMonthlyDemand = (project = {}, staffCategories = []) => {
  const categoryConfig = normalizeProgramCategoryDemand(project);

  if (categoryConfig) {
    return categoryConfig;
  }

  const monthlyByCategory = {};

  const allocatePhase = (phaseKey, value, capacityField) => {
    const hours = Math.max(0, toNumber(value));
    if (hours <= 0) {
      return;
    }

    const eligibleCategories = (staffCategories || []).filter((category) => {
      if (!category || category.id == null) {
        return false;
      }

      return toNumber(category[capacityField]) > 0;
    });

    if (eligibleCategories.length === 0) {
      return;
    }

    const totalCapacity = eligibleCategories.reduce(
      (sum, category) => sum + Math.max(0, toNumber(category[capacityField])),
      0
    );

    eligibleCategories.forEach((category) => {
      const categoryId = Number(category.id);
      if (!Number.isFinite(categoryId)) {
        return;
      }

      if (!monthlyByCategory[categoryId]) {
        monthlyByCategory[categoryId] = {
          pmHours: 0,
          designHours: 0,
          constructionHours: 0,
        };
      }

      const capacityValue = Math.max(0, toNumber(category[capacityField]));
      const weight =
        totalCapacity > 0
          ? capacityValue / totalCapacity
          : 1 / eligibleCategories.length;

      monthlyByCategory[categoryId][`${phaseKey}Hours`] += hours * weight;
    });
  };

  allocatePhase("pm", project?.continuousPmHours, "pmCapacity");
  allocatePhase("design", project?.continuousDesignHours, "designCapacity");
  allocatePhase(
    "construction",
    project?.continuousConstructionHours,
    "constructionCapacity"
  );

  return Object.keys(monthlyByCategory).length > 0 ? monthlyByCategory : null;
};

const buildProgramDemandMaps = (projects = [], staffCategories = []) => {
  const totals = {};
  const monthly = {};

  (projects || []).forEach((project) => {
    if (!project || project.id == null || !isProgramProject(project)) {
      return;
    }

    const monthlyDemand = buildProgramMonthlyDemand(project, staffCategories);

    if (!monthlyDemand) {
      return;
    }

    const duration = ensurePhaseDuration(
      calculateInclusiveMonthSpan(
        project.programStartDate,
        project.programEndDate
      )
    );

    const projectKey = Number(project.id);
    totals[projectKey] = {};
    monthly[projectKey] = {};

    Object.entries(monthlyDemand).forEach(([categoryId, hours]) => {
      const categoryKey = Number(categoryId);
      if (!Number.isFinite(categoryKey)) {
        return;
      }

      const pmMonthly = Math.max(0, toNumber(hours.pmHours));
      const designMonthly = Math.max(0, toNumber(hours.designHours));
      const constructionMonthly = Math.max(
        0,
        toNumber(hours.constructionHours)
      );

      if (pmMonthly <= 0 && designMonthly <= 0 && constructionMonthly <= 0) {
        return;
      }

      totals[projectKey][categoryKey] = {
        pmHours: pmMonthly * duration,
        designHours: designMonthly * duration,
        constructionHours: constructionMonthly * duration,
      };

      monthly[projectKey][categoryKey] = {
        pmHours: pmMonthly,
        designHours: designMonthly,
        constructionHours: constructionMonthly,
      };
    });

    if (Object.keys(totals[projectKey]).length === 0) {
      delete totals[projectKey];
      delete monthly[projectKey];
    }
  });

  return { totals, monthly };
};

const buildManualAssignmentMaps = (
  assignmentOverrides = {},
  staffById = new Map()
) => {
  const manualAssignmentsByProject = {};
  const manualUsageByStaff = {};
  const manualByProjectCategory = {};

  Object.entries(assignmentOverrides).forEach(([projectId, staffEntries]) => {
    const projectKey = Number(projectId);
    if (!manualAssignmentsByProject[projectKey]) {
      manualAssignmentsByProject[projectKey] = {};
    }

    Object.entries(staffEntries || {}).forEach(([staffId, assignment]) => {
      const staffKey = Number(staffId);
      const hours = cloneHours(assignment);
      const totalHours = getTotalFromHours(hours);

      if (totalHours <= 0) {
        return;
      }

      manualAssignmentsByProject[projectKey][staffKey] = hours;

      if (!manualUsageByStaff[staffKey]) {
        manualUsageByStaff[staffKey] = emptyHours();
      }

      addHours(manualUsageByStaff[staffKey], hours);

      const staff = staffById.get(staffKey);
      const categoryId = staff?.categoryId;
      if (categoryId != null) {
        if (!manualByProjectCategory[projectKey]) {
          manualByProjectCategory[projectKey] = {};
        }

        if (!manualByProjectCategory[projectKey][categoryId]) {
          manualByProjectCategory[projectKey][categoryId] = emptyHours();
        }

        addHours(manualByProjectCategory[projectKey][categoryId], hours);
      }
    });
  });

  return { manualAssignmentsByProject, manualUsageByStaff, manualByProjectCategory };
};

const subtractManualFromMonthlyDemand = (
  demand,
  manualByProjectCategory
) => {
  const residualDemand = {};

  Object.entries(demand).forEach(([projectId, categories]) => {
    const projectKey = Number(projectId);
    residualDemand[projectKey] = {};

    Object.entries(categories).forEach(([categoryId, hours]) => {
      const categoryKey = Number(categoryId);
      const manual =
        manualByProjectCategory?.[projectKey]?.[categoryKey] || emptyHours();

      const pmHours = Math.max(0, toNumber(hours.pmHours) - toNumber(manual.pmHours));
      const designHours = Math.max(
        0,
        toNumber(hours.designHours) - toNumber(manual.designHours)
      );
      const constructionHours = Math.max(
        0,
        toNumber(hours.constructionHours) - toNumber(manual.constructionHours)
      );

      residualDemand[projectKey][categoryKey] = {
        pmHours,
        designHours,
        constructionHours,
      };
    });
  });

  return residualDemand;
};

const buildStaffAvailabilityMap = (staffMembers = [], manualUsageByStaff = {}) => {
  const availabilityMap = new Map();

  staffMembers.forEach((member) => {
    if (!member || member.id == null) {
      return;
    }

    const staffId = Number(member.id);
    const manualUsage = manualUsageByStaff[staffId] || emptyHours();

    const pmAvailability = Math.max(0, toNumber(member.pmAvailability) - toNumber(manualUsage.pmHours));
    const designAvailability = Math.max(
      0,
      toNumber(member.designAvailability) - toNumber(manualUsage.designHours)
    );
    const constructionAvailability = Math.max(
      0,
      toNumber(member.constructionAvailability) -
        toNumber(manualUsage.constructionHours)
    );

    availabilityMap.set(staffId, {
      categoryId: member.categoryId != null ? Number(member.categoryId) : null,
      remaining: {
        pmHours: pmAvailability,
        designHours: designAvailability,
        constructionHours: constructionAvailability,
      },
      availability: {
        pmHours: toNumber(member.pmAvailability),
        designHours: toNumber(member.designAvailability),
        constructionHours: toNumber(member.constructionAvailability),
        totalHours:
          toNumber(member.pmAvailability) +
          toNumber(member.designAvailability) +
          toNumber(member.constructionAvailability),
      },
      manual: manualUsage,
    });
  });

  return availabilityMap;
};

const PHASES = [
  { key: "pm", availabilityKey: "pmAvailability" },
  { key: "design", availabilityKey: "designAvailability" },
  { key: "construction", availabilityKey: "constructionAvailability" },
];

export const buildStaffAssignmentPlan = ({
  projects = [],
  staffAllocations = {},
  staffMembers = [],
  staffCategories = [],
  assignmentOverrides = {},
} = {}) => {
  if (!projects.length || !staffMembers.length) {
    return {
      assignmentsByProject: {},
      manualAssignmentsByProject: {},
      autoAssignmentsByProject: {},
      projectSummaries: {},
      staffUtilization: {},
      totals: {
        demand: emptyHours(),
        manual: emptyHours(),
        auto: emptyHours(),
        assigned: emptyHours(),
        unfilled: emptyHours(),
      },
      unfilledDemand: {},
    };
  }

  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const staffById = new Map(staffMembers.map((member) => [member.id, member]));

  const projectPhaseDurations = buildProjectPhaseDurationMap(projects);
  const demand = buildProjectCategoryDemand(staffAllocations);
  const { totals: programDemandTotals } = buildProgramDemandMaps(
    projects,
    staffCategories
  );

  Object.entries(programDemandTotals).forEach(([projectId, categories]) => {
    const projectKey = Number(projectId);
    if (!demand[projectKey]) {
      demand[projectKey] = {};
    }

    Object.entries(categories || {}).forEach(([categoryId, hours]) => {
      const categoryKey = Number(categoryId);
      const existing = demand[projectKey][categoryKey] || emptyHours();

      demand[projectKey][categoryKey] = {
        pmHours: toNumber(existing.pmHours) + toNumber(hours.pmHours),
        designHours:
          toNumber(existing.designHours) + toNumber(hours.designHours),
        constructionHours:
          toNumber(existing.constructionHours) +
          toNumber(hours.constructionHours),
      };
    });
  });

  const monthlyDemand = buildMonthlyDemand(demand, projectPhaseDurations);

  const {
    manualAssignmentsByProject,
    manualUsageByStaff,
    manualByProjectCategory,
  } = buildManualAssignmentMaps(assignmentOverrides, staffById);

  const residualMonthlyDemand = subtractManualFromMonthlyDemand(
    monthlyDemand,
    manualByProjectCategory
  );

  const availabilityMap = buildStaffAvailabilityMap(
    staffMembers,
    manualUsageByStaff
  );

  const staffByCategory = new Map();
  staffMembers.forEach((member) => {
    const categoryId = member?.categoryId;
    if (categoryId == null) {
      return;
    }

    if (!staffByCategory.has(categoryId)) {
      staffByCategory.set(categoryId, []);
    }
    staffByCategory.get(categoryId).push(member.id);
  });

  const autoAssignmentsByProject = {};
  const assignmentsByProject = {};
  const projectSummaries = {};
  const staffAutoUsage = {};
  const unfilledDemandMonthly = {};

  Object.entries(residualMonthlyDemand).forEach(([projectId, categories]) => {
    const projectKey = Number(projectId);
    const project = projectMap.get(projectKey);
    if (!project) {
      return;
    }

    if (!assignmentsByProject[projectKey]) {
      assignmentsByProject[projectKey] = {};
    }

    if (!autoAssignmentsByProject[projectKey]) {
      autoAssignmentsByProject[projectKey] = {};
    }

    Object.entries(categories).forEach(([categoryId, remaining]) => {
      const categoryKey = Number(categoryId);
      const staffIds = staffByCategory.get(categoryKey) || [];

      PHASES.forEach((phase) => {
        const demandKey = `${phase.key}Hours`;
        let remainingDemand = toNumber(remaining[demandKey]);
        if (remainingDemand <= 0) {
          return;
        }

        const staffWithAvailability = staffIds
          .map((id) => ({ id, data: availabilityMap.get(id) }))
          .filter((entry) => entry.data && entry.data.remaining[demandKey] > 0)
          .sort(
            (a, b) =>
              toNumber(b.data.remaining[demandKey]) -
              toNumber(a.data.remaining[demandKey])
          );

        staffWithAvailability.forEach((entry) => {
          if (remainingDemand <= 0) {
            return;
          }

          const { id: staffId, data } = entry;
          const available = toNumber(data.remaining[demandKey]);
          if (available <= 0) {
            return;
          }

          const allocation = Math.min(available, remainingDemand);
          remainingDemand -= allocation;
          data.remaining[demandKey] = available - allocation;

          if (!autoAssignmentsByProject[projectKey][staffId]) {
            autoAssignmentsByProject[projectKey][staffId] = emptyHours();
          }
          incrementPhaseValue(
            autoAssignmentsByProject[projectKey][staffId],
            phase.key,
            allocation
          );

          if (!assignmentsByProject[projectKey][staffId]) {
            assignmentsByProject[projectKey][staffId] = emptyHours();
          }
          incrementPhaseValue(
            assignmentsByProject[projectKey][staffId],
            phase.key,
            allocation
          );

          if (!staffAutoUsage[staffId]) {
            staffAutoUsage[staffId] = emptyHours();
          }
          incrementPhaseValue(staffAutoUsage[staffId], phase.key, allocation);
        });

        if (remainingDemand > 0) {
          if (!unfilledDemandMonthly[projectKey]) {
            unfilledDemandMonthly[projectKey] = {};
          }

          if (!unfilledDemandMonthly[projectKey][categoryKey]) {
            unfilledDemandMonthly[projectKey][categoryKey] = emptyHours();
          }

          incrementPhaseValue(
            unfilledDemandMonthly[projectKey][categoryKey],
            phase.key,
            remainingDemand
          );
        }
      });
    });
  });

  // Merge manual assignments with final assignments
  Object.entries(manualAssignmentsByProject).forEach(
    ([projectId, staffEntries]) => {
      const projectKey = Number(projectId);
      if (!assignmentsByProject[projectKey]) {
        assignmentsByProject[projectKey] = {};
      }

      Object.entries(staffEntries).forEach(([staffId, hours]) => {
        const staffKey = Number(staffId);
        if (!assignmentsByProject[projectKey][staffKey]) {
          assignmentsByProject[projectKey][staffKey] = emptyHours();
        }

        PHASES.forEach((phase) => {
          const demandKey = `${phase.key}Hours`;
          incrementPhaseValue(
            assignmentsByProject[projectKey][staffKey],
            phase.key,
            toNumber(hours[demandKey])
          );
        });
      });
    }
  );

  const totals = {
    demand: emptyHours(),
    manual: emptyHours(),
    auto: emptyHours(),
    assigned: emptyHours(),
    unfilled: emptyHours(),
  };

  Object.entries(demand).forEach(([projectId, categories]) => {
    const projectKey = Number(projectId);
    const projectDemand = emptyHours();
    const projectManual = emptyHours();
    const projectAuto = emptyHours();
    const projectAssigned = emptyHours();
    const projectUnfilled = emptyHours();
    const durations =
      projectPhaseDurations.get(projectKey) || DEFAULT_PHASE_DURATIONS;

    Object.entries(categories).forEach(([categoryId, hours]) => {
      const categoryDemand = cloneHours(hours);
      categoryDemand.totalHours = getTotalFromHours(categoryDemand);
      addHours(projectDemand, categoryDemand);
    });

    const manualStaffEntries = manualAssignmentsByProject[projectKey] || {};
    Object.values(manualStaffEntries).forEach((hours) => {
      const manualHours = convertMonthlyToTotals(hours, durations);
      addHours(projectManual, manualHours);
    });

    const autoStaffEntries = autoAssignmentsByProject[projectKey] || {};
    Object.values(autoStaffEntries).forEach((hours) => {
      const autoHours = convertMonthlyToTotals(hours, durations);
      addHours(projectAuto, autoHours);
    });

    const assignedStaffEntries = assignmentsByProject[projectKey] || {};
    Object.values(assignedStaffEntries).forEach((hours) => {
      const assignedHours = convertMonthlyToTotals(hours, durations);
      addHours(projectAssigned, assignedHours);
    });

    const projectUnfilledEntry = unfilledDemandMonthly[projectKey] || {};
    Object.values(projectUnfilledEntry).forEach((hours) => {
      const unfilledHours = convertMonthlyToTotals(hours, durations);
      addHours(projectUnfilled, unfilledHours);
    });

    projectSummaries[projectKey] = {
      demand: projectDemand,
      manual: projectManual,
      auto: projectAuto,
      assigned: projectAssigned,
      unfilled: projectUnfilled,
    };

    addHours(totals.demand, projectDemand);
    addHours(totals.manual, projectManual);
    addHours(totals.auto, projectAuto);
    addHours(totals.assigned, projectAssigned);
    addHours(totals.unfilled, projectUnfilled);
  });

  const staffUtilization = {};
  staffMembers.forEach((member) => {
    if (!member || member.id == null) {
      return;
    }

    const staffId = Number(member.id);
    const availabilityEntry = availabilityMap.get(staffId);
    const manualUsage = manualUsageByStaff[staffId] || emptyHours();
    const autoUsage = staffAutoUsage[staffId] || emptyHours();
    const assignedUsage = emptyHours();
    addHours(assignedUsage, manualUsage);
    addHours(assignedUsage, autoUsage);

    const availability = availabilityEntry?.availability || {
      pmHours: toNumber(member.pmAvailability),
      designHours: toNumber(member.designAvailability),
      constructionHours: toNumber(member.constructionAvailability),
      totalHours:
        toNumber(member.pmAvailability) +
        toNumber(member.designAvailability) +
        toNumber(member.constructionAvailability),
    };

    const remaining = {
      pmHours: Math.max(0, toNumber(availability.pmHours) - toNumber(assignedUsage.pmHours)),
      designHours: Math.max(
        0,
        toNumber(availability.designHours) - toNumber(assignedUsage.designHours)
      ),
      constructionHours: Math.max(
        0,
        toNumber(availability.constructionHours) -
          toNumber(assignedUsage.constructionHours)
      ),
    };
    remaining.totalHours =
      toNumber(remaining.pmHours) +
      toNumber(remaining.designHours) +
      toNumber(remaining.constructionHours);

    const overbooked =
      toNumber(assignedUsage.pmHours) > toNumber(availability.pmHours) + 1e-6 ||
      toNumber(assignedUsage.designHours) >
        toNumber(availability.designHours) + 1e-6 ||
      toNumber(assignedUsage.constructionHours) >
        toNumber(availability.constructionHours) + 1e-6 ||
      toNumber(assignedUsage.totalHours) >
        toNumber(availability.totalHours) + 1e-6;

    staffUtilization[staffId] = {
      availability,
      manual: manualUsage,
      auto: staffAutoUsage[staffId] || emptyHours(),
      assigned: assignedUsage,
      remaining,
      overbooked,
    };
  });

  return {
    assignmentsByProject,
    manualAssignmentsByProject,
    autoAssignmentsByProject,
    projectSummaries,
    staffUtilization,
    totals,
    demandByProjectCategory: demand,
    monthlyDemandByProjectCategory: monthlyDemand,
    unfilledDemand: convertProjectCategoryMapToTotals(
      unfilledDemandMonthly,
      projectPhaseDurations
    ),
  };
};

export const buildStaffUtilizationReportData = ({
  plan,
  projects = [],
  staffMembers = [],
  staffCategories = [],
}) => {
  if (!plan) {
    return null;
  }

  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const staffMap = new Map(staffMembers.map((member) => [member.id, member]));
  const categoryMap = new Map(
    staffCategories.map((category) => [category.id, category])
  );
  const projectDurations = buildProjectPhaseDurationMap(projects);

  const assignments = [];
  const manualAssignments = [];

  Object.entries(plan.assignmentsByProject || {}).forEach(
    ([projectId, staffEntries]) => {
      const projectKey = Number(projectId);
      const project = projectMap.get(projectKey);
      if (!project) {
        return;
      }

      Object.entries(staffEntries || {}).forEach(([staffId, hours]) => {
        const staffKey = Number(staffId);
        const staff = staffMap.get(staffKey);
        if (!staff) {
          return;
        }

        const durations =
          projectDurations.get(projectKey) || DEFAULT_PHASE_DURATIONS;
        const manualMonthly = plan.manualAssignmentsByProject?.[projectKey]?.[
          staffKey
        ] || emptyHours();
        const autoMonthly = plan.autoAssignmentsByProject?.[projectKey]?.[
          staffKey
        ] || emptyHours();
        const totalMonthly = cloneHours(hours);
        totalMonthly.totalHours = getTotalFromHours(totalMonthly);

        const manualHours = convertMonthlyToTotals(manualMonthly, durations);
        const autoHours = convertMonthlyToTotals(autoMonthly, durations);
        const totalHours = convertMonthlyToTotals(totalMonthly, durations);

        const manualTotal = toNumber(manualHours.totalHours);
        const autoTotal = toNumber(autoHours.totalHours);

        const staffUtil = plan.staffUtilization?.[staffKey];
        const availability = staffUtil?.availability || {
          pmHours: toNumber(staff.pmAvailability),
          designHours: toNumber(staff.designAvailability),
          constructionHours: toNumber(staff.constructionAvailability),
          totalHours:
            toNumber(staff.pmAvailability) +
            toNumber(staff.designAvailability) +
            toNumber(staff.constructionAvailability),
        };

        const assignedMonthly = toNumber(
          staffUtil?.assigned?.totalHours || totalMonthly.totalHours
        );

        const utilizationPercent = availability.totalHours
          ? (assignedMonthly / availability.totalHours) *
            100
          : 0;

        const category = categoryMap.get(staff.categoryId);

        assignments.push({
          projectId: projectKey,
          projectName: project.name,
          staffId: staffKey,
          staffName: staff.name,
          categoryId: staff.categoryId,
          categoryName: category?.name || "Uncategorized",
          manual: {
            pmHours: toNumber(manualHours.pmHours),
            designHours: toNumber(manualHours.designHours),
            constructionHours: toNumber(manualHours.constructionHours),
            totalHours: manualTotal,
          },
          auto: {
            pmHours: toNumber(autoHours.pmHours),
            designHours: toNumber(autoHours.designHours),
            constructionHours: toNumber(autoHours.constructionHours),
            totalHours: autoTotal,
          },
          totals: {
            pmHours: toNumber(totalHours.pmHours),
            designHours: toNumber(totalHours.designHours),
            constructionHours: toNumber(totalHours.constructionHours),
            totalHours: totalHours.totalHours,
          },
          availability,
          utilizationPercent,
          overbooked: Boolean(staffUtil?.overbooked),
          hasManualOverride: manualTotal > 0,
        });

        if (manualTotal > 0) {
          manualAssignments.push({
            projectId: projectKey,
            staffId: staffKey,
            hours: manualHours,
          });
        }
      });
    }
  );

  assignments.sort((a, b) => {
    if (a.projectName === b.projectName) {
      return a.staffName.localeCompare(b.staffName);
    }
    return a.projectName.localeCompare(b.projectName);
  });

  const manualHoursTotal = assignments.reduce(
    (sum, entry) => sum + toNumber(entry.manual.totalHours),
    0
  );
  const autoHoursTotal = assignments.reduce(
    (sum, entry) => sum + toNumber(entry.auto.totalHours),
    0
  );
  const totalAssignedHours = manualHoursTotal + autoHoursTotal;
  const demandTotal = toNumber(plan.totals?.demand?.totalHours);
  const unfilledTotal = toNumber(plan.totals?.unfilled?.totalHours);

  const staffCoverage = new Map();
  Object.entries(plan.staffUtilization || {}).forEach(([staffId, usage]) => {
    const staffKey = Number(staffId);
    const staff = staffMap.get(staffKey);
    if (!staff) {
      return;
    }

    const availability = usage.availability || {
      pmHours: toNumber(staff.pmAvailability),
      designHours: toNumber(staff.designAvailability),
      constructionHours: toNumber(staff.constructionAvailability),
      totalHours:
        toNumber(staff.pmAvailability) +
        toNumber(staff.designAvailability) +
        toNumber(staff.constructionAvailability),
    };

    const assigned = usage.assigned || emptyHours();
    const assignedTotalMonthly = getTotalFromHours(assigned);

    if (assignedTotalMonthly <= 0) {
      return;
    }

    staffCoverage.set(staffKey, {
      staffName: staff.name,
      availability: availability.totalHours,
      assigned: assignedTotalMonthly,
      overbooked: Boolean(usage.overbooked),
    });
  });

  const projectSummaries = Object.entries(plan.projectSummaries || {}).map(
    ([projectId, summary]) => {
      const project = projectMap.get(Number(projectId));
      if (!project) {
        return null;
      }

      return {
        projectId: Number(projectId),
        projectName: project.name,
        demand: summary.demand,
        manual: summary.manual,
        auto: summary.auto,
        assigned: summary.assigned,
        unfilled: summary.unfilled,
      };
    }
  ).filter(Boolean);

  const unfilledDemandRows = [];
  Object.entries(plan.unfilledDemand || {}).forEach(
    ([projectId, categories]) => {
      const project = projectMap.get(Number(projectId));
      if (!project) {
        return;
      }

      Object.entries(categories || {}).forEach(([categoryId, hours]) => {
        const category = categoryMap.get(Number(categoryId));

        PHASES.forEach((phase) => {
          const key = `${phase.key}Hours`;
          const value = toNumber(hours[key]);
          if (value > 0) {
            unfilledDemandRows.push({
              projectId: Number(projectId),
              projectName: project.name,
              categoryName: category?.name || "Uncategorized",
              phase: phase.key,
              hours: value,
            });
          }
        });
      });
    }
  );

  const overbookedCount = Array.from(staffCoverage.values()).filter(
    (entry) => entry.overbooked
  ).length;

  const manualOverrideCount = manualAssignments.length;
  const staffAssignedCount = staffCoverage.size;
  const projectsCovered = new Set(assignments.map((entry) => entry.projectId))
    .size;

  const coverageRate = demandTotal
    ? Math.min(1, totalAssignedHours / demandTotal) * 100
    : totalAssignedHours > 0
    ? 100
    : 0;

  const fileBase = new Date().toISOString().split("T")[0];

  return {
    title: "Staff Utilization Plan",
    fileName: `staff_utilization_${fileBase}.xlsx`,
    assignments,
    projectSummaries,
    staffSummaries: Array.from(staffCoverage.values()),
    unfilledDemandRows,
    meta: {
      totalAssignedHours,
      manualHours: manualHoursTotal,
      autoHours: autoHoursTotal,
      demandHours: demandTotal,
      unfilledHours: unfilledTotal,
      coverageRate,
      overbookedCount,
      manualOverrideCount,
      staffAssignedCount,
      projectsCovered,
      generatedAt: new Date(),
    },
  };
};

