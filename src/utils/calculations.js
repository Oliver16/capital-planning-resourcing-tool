export const calculateTimelines = (projects) => {
  return projects.map((project) => {
    if (project.type === "project") {
      const designStart = new Date(project.designStartDate);
      const designEnd = new Date(designStart);
      designEnd.setMonth(designEnd.getMonth() + (project.designDuration || 0));

      const constructionStart = new Date(project.constructionStartDate);
      const constructionEnd = new Date(constructionStart);
      constructionEnd.setMonth(
        constructionEnd.getMonth() + (project.constructionDuration || 0)
      );

      return {
        ...project,
        designStart,
        designEnd,
        constructionStart,
        constructionEnd,
      };
    } else {
      // Annual program
      const programStart = new Date(project.programStartDate);
      const programEnd = new Date(project.programEndDate);

      return {
        ...project,
        designStart: programStart,
        designEnd: programEnd,
        constructionStart: programStart,
        constructionEnd: programEnd,
      };
    }
  });
};

export const generateResourceForecast = (
  projectTimelines,
  staffAllocations,
  staffCategories,
  timeHorizon,
  staffAvailabilityByCategory = {}
) => {
  // Validate inputs
  if (!Array.isArray(projectTimelines) || projectTimelines.length === 0) {
    return [];
  }

  if (!Array.isArray(staffCategories) || staffCategories.length === 0) {
    return [];
  }

  // Get valid dates from projects
  const validDates = projectTimelines
    .filter((p) => p.designStart && !isNaN(p.designStart.getTime()))
    .map((p) => p.designStart.getTime());

  if (validDates.length === 0) {
    // If no valid dates, start from current date
    const startDate = new Date();
    startDate.setDate(1); // Start of month
    return generateForecastFromDate(
      startDate,
      timeHorizon,
      projectTimelines,
      staffAllocations,
      staffCategories,
      staffAvailabilityByCategory
    );
  }

  const startDate = new Date(Math.min(...validDates));
  startDate.setDate(1); // Start of month

  return generateForecastFromDate(
    startDate,
    timeHorizon,
    projectTimelines,
    staffAllocations,
    staffCategories,
    staffAvailabilityByCategory
  );
};

const generateForecastFromDate = (
  startDate,
  timeHorizon,
  projectTimelines,
  staffAllocations,
  staffCategories,
  staffAvailabilityByCategory = {}
) => {
  const forecast = [];
  const safeTimeHorizon = Math.max(1, Math.min(timeHorizon || 36, 120)); // Limit to reasonable range

  for (let i = 0; i < safeTimeHorizon; i++) {
    const currentDate = new Date(startDate);
    currentDate.setMonth(currentDate.getMonth() + i);

    // Validate date
    if (isNaN(currentDate.getTime())) {
      console.warn(`Invalid date at month ${i}, skipping`);
      continue;
    }

    const monthData = {
      month: currentDate.toISOString().substr(0, 7),
      monthLabel: currentDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      }),
    };

    // Initialize staff requirements
    staffCategories.forEach((category) => {
      if (category && category.name) {
        monthData[`${category.name}_required`] = 0;
        const availability = staffAvailabilityByCategory[category.id];
        const fallbackTotal =
          (category.pmCapacity || 0) +
          (category.designCapacity || 0) +
          (category.constructionCapacity || 0);
        const totalHours =
          availability && typeof availability.total === "number"
            ? availability.total
            : fallbackTotal;

        monthData[`${category.name}_actual`] =
          (totalHours || 0) / (4.33 * 40);
      }
    });

    // Calculate requirements for each project
    projectTimelines.forEach((project) => {
      if (!project || !project.designStart) return;

      if (project.type === "project") {
        const isInDesign =
          currentDate >= project.designStart && currentDate < project.designEnd;
        const isInConstruction =
          currentDate >= project.constructionStart &&
          currentDate < project.constructionEnd;

        if (isInDesign || isInConstruction) {
          staffCategories.forEach((category) => {
            if (!category || !category.name) return;

            const allocation = staffAllocations[project.id]?.[category.id];
            if (allocation) {
              if (
                isInDesign &&
                allocation.designHours &&
                (project.designDuration || 0) > 0
              ) {
                monthData[`${category.name}_required`] +=
                  allocation.designHours /
                  project.designDuration /
                  (4.33 * 40);
              }
              if (
                isInConstruction &&
                allocation.constructionHours &&
                (project.constructionDuration || 0) > 0
              ) {
                monthData[`${category.name}_required`] +=
                  allocation.constructionHours /
                  project.constructionDuration /
                  (4.33 * 40);
              }

              const totalDurationMonths =
                (project.designDuration || 0) +
                (project.constructionDuration || 0);
              if (
                (isInDesign || isInConstruction) &&
                allocation.pmHours &&
                totalDurationMonths > 0
              ) {
                monthData[`${category.name}_required`] +=
                  allocation.pmHours /
                  totalDurationMonths /
                  (4.33 * 40);
              }
            }
          });
        }
      } else {
        // Annual program - continuous demand
        const isActive =
          currentDate >= project.designStart &&
          currentDate <= project.constructionEnd;
        if (isActive) {
          staffCategories.forEach((category) => {
            if (!category || !category.name) return;

            // Use predefined continuous hours for programs
            if (
              project.continuousDesignHours &&
              (category.designCapacity || 0) > 0
            ) {
              monthData[`${category.name}_required`] +=
                (project.continuousDesignHours || 0) / (4.33 * 40);
            }
            if (
              project.continuousConstructionHours &&
              (category.constructionCapacity || 0) > 0
            ) {
              monthData[`${category.name}_required`] +=
                (project.continuousConstructionHours || 0) / (4.33 * 40);
            }
            if (
              project.continuousPmHours &&
              (category.pmCapacity || 0) > 0
            ) {
              monthData[`${category.name}_required`] +=
                (project.continuousPmHours || 0) / (4.33 * 40);
            }
          });
        }
      }
    });

    forecast.push(monthData);
  }

  return forecast;
};

export const calculateStaffingGaps = (resourceForecast, staffCategories) => {
  if (!Array.isArray(resourceForecast) || !Array.isArray(staffCategories)) {
    return [];
  }

  const gaps = [];

  resourceForecast.forEach((month) => {
    if (!month) return;

    staffCategories.forEach((category) => {
      if (!category || !category.name) return;

      const required = month[`${category.name}_required`] || 0;
      const actual = month[`${category.name}_actual`] || 0;
      const gap = required - actual;

      if (gap > 0.1) {
        // Threshold for significant gap
        gaps.push({
          month: month.month,
          monthLabel: month.monthLabel,
          category: category.name,
          required: required.toFixed(2),
          available: actual.toFixed(2),
          gap: gap.toFixed(2),
        });
      }
    });
  });

  return gaps;
};

const HOURS_PER_FTE_MONTH = 4.33 * 40;

const safeDate = (value) => {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const calculateMonthDifference = (start, end) => {
  const startDate = safeDate(start);
  const endDate = safeDate(end);

  if (!startDate || !endDate) {
    return 0;
  }

  return (
    endDate.getFullYear() * 12 +
    endDate.getMonth() -
    (startDate.getFullYear() * 12 + startDate.getMonth())
  );
};

export const applyScenarioAdjustments = (projects, adjustments = {}) => {
  if (!Array.isArray(projects)) {
    return [];
  }

  return projects.map((project) => {
    const adjustment =
      adjustments[project.id] || adjustments[String(project.id)] || null;

    if (!adjustment) {
      return { ...project };
    }

    if (project.type === "project") {
      return {
        ...project,
        designStartDate: adjustment.designStartDate || project.designStartDate,
        constructionStartDate:
          adjustment.constructionStartDate || project.constructionStartDate,
      };
    }

    return {
      ...project,
      programStartDate: adjustment.programStartDate || project.programStartDate,
      programEndDate: adjustment.programEndDate || project.programEndDate,
    };
  });
};

const getScenarioStartDate = (projectTimelines) => {
  const validDates = (projectTimelines || [])
    .map((project) => project?.designStart)
    .filter((date) => date instanceof Date && !Number.isNaN(date.getTime()));

  if (validDates.length === 0) {
    const fallback = new Date();
    fallback.setDate(1);
    return fallback;
  }

  const earliest = new Date(Math.min(...validDates.map((date) => date.getTime())));
  earliest.setDate(1);
  return earliest;
};

const ensureCategoryDetail = (monthDetail, category, available) => {
  if (monthDetail.categories[category.id]) {
    return monthDetail.categories[category.id];
  }

  const detail = {
    id: category.id,
    name: category.name,
    available:
      typeof available === "number" ? Number(available.toFixed(2)) : 0,
    required: 0,
    gap: 0,
    projects: [],
  };

  monthDetail.categories[category.id] = detail;
  return detail;
};

const addContribution = (monthData, category, categoryDetail, project, fte) => {
  if (!fte || Number.isNaN(fte) || fte <= 0) {
    return;
  }

  const key = `${category.name}_required`;
  monthData[key] += fte;
  categoryDetail.required += fte;

  const existingProject = categoryDetail.projects.find(
    (item) => item.projectId === project.id
  );

  if (existingProject) {
    existingProject.fte += fte;
  } else {
    categoryDetail.projects.push({
      projectId: project.id,
      projectName: project.name,
      fte,
    });
  }
};

export const generateScenarioForecastDetails = (
  projectTimelines,
  staffAllocations,
  staffCategories,
  timeHorizon,
  staffAvailabilityByCategory = {}
) => {
  if (
    !Array.isArray(projectTimelines) ||
    projectTimelines.length === 0 ||
    !Array.isArray(staffCategories) ||
    staffCategories.length === 0
  ) {
    return { forecast: [], monthDetails: {}, startDate: new Date() };
  }

  const safeTimeHorizon = Math.max(1, Math.min(timeHorizon || 36, 120));
  const startDate = getScenarioStartDate(projectTimelines);
  const forecast = [];
  const monthDetails = {};

  for (let index = 0; index < safeTimeHorizon; index += 1) {
    const currentDate = new Date(startDate);
    currentDate.setMonth(currentDate.getMonth() + index);

    if (Number.isNaN(currentDate.getTime())) {
      continue;
    }

    const monthKey = currentDate.toISOString().slice(0, 7);
    const monthLabel = currentDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });

    const monthData = {
      month: monthKey,
      monthLabel,
    };

    const categoryAvailability = {};

    staffCategories.forEach((category) => {
      if (!category || !category.name) {
        return;
      }

      const availability = staffAvailabilityByCategory[category.id];
      const fallbackTotal =
        (category.pmCapacity || 0) +
        (category.designCapacity || 0) +
        (category.constructionCapacity || 0);
      const totalHours =
        availability && typeof availability.total === "number"
          ? availability.total
          : fallbackTotal;
      const availableFte = (totalHours || 0) / HOURS_PER_FTE_MONTH;

      categoryAvailability[category.id] = availableFte;
      monthData[`${category.name}_required`] = 0;
      monthData[`${category.name}_actual`] = Number(availableFte.toFixed(2));
    });

    const monthDetail = {
      monthKey,
      monthLabel,
      categories: {},
      totalAvailable: Number(
        Object.values(categoryAvailability).reduce(
          (sum, value) => sum + value,
          0
        ).toFixed(2)
      ),
      totalRequired: 0,
      totalShortage: 0,
    };

    monthDetails[monthKey] = monthDetail;

    projectTimelines.forEach((project) => {
      if (!project || !(project.designStart instanceof Date)) {
        return;
      }

      if (project.type === "project") {
        const isInDesign =
          currentDate >= project.designStart && currentDate < project.designEnd;
        const isInConstruction =
          currentDate >= project.constructionStart &&
          currentDate < project.constructionEnd;

        if (!isInDesign && !isInConstruction) {
          return;
        }

        staffCategories.forEach((category) => {
          if (!category || !category.name) {
            return;
          }

          const allocation = staffAllocations[project.id]?.[category.id];
          if (!allocation) {
            return;
          }

          const categoryDetail = ensureCategoryDetail(
            monthDetail,
            category,
            categoryAvailability[category.id]
          );

          if (
            isInDesign &&
            allocation.designHours &&
            (project.designDuration || 0) > 0
          ) {
            const designFte =
              allocation.designHours /
              (project.designDuration || 1) /
              HOURS_PER_FTE_MONTH;
            addContribution(
              monthData,
              category,
              categoryDetail,
              project,
              designFte
            );
          }

          if (
            isInConstruction &&
            allocation.constructionHours &&
            (project.constructionDuration || 0) > 0
          ) {
            const constructionFte =
              allocation.constructionHours /
              (project.constructionDuration || 1) /
              HOURS_PER_FTE_MONTH;
            addContribution(
              monthData,
              category,
              categoryDetail,
              project,
              constructionFte
            );
          }

          const totalDurationMonths =
            (project.designDuration || 0) + (project.constructionDuration || 0);

          if (
            (isInDesign || isInConstruction) &&
            allocation.pmHours &&
            totalDurationMonths > 0
          ) {
            const pmFte =
              allocation.pmHours / totalDurationMonths / HOURS_PER_FTE_MONTH;
            addContribution(
              monthData,
              category,
              categoryDetail,
              project,
              pmFte
            );
          }
        });
      } else {
        const isActive =
          currentDate >= project.designStart &&
          currentDate <= project.constructionEnd;

        if (!isActive) {
          return;
        }

        staffCategories.forEach((category) => {
          if (!category || !category.name) {
            return;
          }

          const categoryDetail = ensureCategoryDetail(
            monthDetail,
            category,
            categoryAvailability[category.id]
          );

          let totalFte = 0;

          if (
            project.continuousDesignHours &&
            (category.designCapacity || 0) > 0
          ) {
            totalFte +=
              (project.continuousDesignHours || 0) / HOURS_PER_FTE_MONTH;
          }

          if (
            project.continuousConstructionHours &&
            (category.constructionCapacity || 0) > 0
          ) {
            totalFte +=
              (project.continuousConstructionHours || 0) /
              HOURS_PER_FTE_MONTH;
          }

          if (project.continuousPmHours && (category.pmCapacity || 0) > 0) {
            totalFte += (project.continuousPmHours || 0) / HOURS_PER_FTE_MONTH;
          }

          if (totalFte > 0) {
            addContribution(
              monthData,
              category,
              categoryDetail,
              project,
              totalFte
            );
          }
        });
      }
    });

    staffCategories.forEach((category) => {
      if (!category || !category.name) {
        return;
      }

      const requiredKey = `${category.name}_required`;
      if (typeof monthData[requiredKey] === "number") {
        monthData[requiredKey] = Number(monthData[requiredKey].toFixed(2));
      }

      const categoryDetail = monthDetail.categories[category.id];
      if (categoryDetail) {
        categoryDetail.required = Number(categoryDetail.required.toFixed(2));
        categoryDetail.gap = Number(
          Math.max(0, categoryDetail.required - categoryDetail.available).toFixed(2)
        );
        categoryDetail.projects = categoryDetail.projects
          .map((project) => ({
            ...project,
            fte: Number(project.fte.toFixed(2)),
          }))
          .sort((a, b) => b.fte - a.fte);
      }
    });

    monthDetail.totalRequired = Number(
      staffCategories
        .reduce(
          (sum, category) => sum + (monthData[`${category.name}_required`] || 0),
          0
        )
        .toFixed(2)
    );

    monthDetail.totalShortage = Number(
      Object.values(monthDetail.categories)
        .reduce((sum, category) => sum + (category.gap || 0), 0)
        .toFixed(2)
    );

    forecast.push(monthData);
  }

  return { forecast, monthDetails, startDate };
};

export const calculateScenarioGaps = (forecast, staffCategories) => {
  if (!Array.isArray(forecast) || !Array.isArray(staffCategories)) {
    return [];
  }

  const gaps = [];

  forecast.forEach((month) => {
    if (!month) {
      return;
    }

    staffCategories.forEach((category) => {
      if (!category || !category.name) {
        return;
      }

      const required = month[`${category.name}_required`] || 0;
      const actual = month[`${category.name}_actual`] || 0;
      const gapValue = required - actual;

      if (gapValue > 0.1) {
        gaps.push({
          month: month.month,
          monthLabel: month.monthLabel,
          category: category.name,
          required: Number(required.toFixed(2)),
          available: Number(actual.toFixed(2)),
          gap: Number(gapValue.toFixed(2)),
          severity: gapValue > 1 ? "critical" : "moderate",
        });
      }
    });
  });

  return gaps;
};

export const summarizeScenarioGaps = (gaps) => {
  if (!Array.isArray(gaps) || gaps.length === 0) {
    return {
      totalGap: 0,
      moderateCount: 0,
      criticalCount: 0,
      worstGap: 0,
      worstMonthLabel: "",
      worstCategory: "",
      affectedCategories: [],
      shortageMonthCount: 0,
    };
  }

  let totalGap = 0;
  let moderateCount = 0;
  let criticalCount = 0;
  let worstGap = 0;
  let worstMonthLabel = "";
  let worstCategory = "";
  const categories = new Set();
  const months = new Set();

  gaps.forEach((gap) => {
    totalGap += gap.gap;
    categories.add(gap.category);
    months.add(gap.month);

    if (gap.severity === "critical") {
      criticalCount += 1;
    } else {
      moderateCount += 1;
    }

    if (gap.gap > worstGap) {
      worstGap = gap.gap;
      worstMonthLabel = gap.monthLabel;
      worstCategory = gap.category;
    }
  });

  return {
    totalGap,
    moderateCount,
    criticalCount,
    worstGap,
    worstMonthLabel,
    worstCategory,
    affectedCategories: Array.from(categories),
    shortageMonthCount: months.size,
  };
};

const addBudgetForMonth = (totals, date, amount) => {
  const validDate = safeDate(date);
  if (!validDate || !Number.isFinite(amount) || amount === 0) {
    return;
  }

  const year = validDate.getFullYear();
  totals[year] = (totals[year] || 0) + amount;
};

const distributeBudgetByYear = (projects = []) => {
  const totals = {};

  projects.forEach((project) => {
    if (!project) {
      return;
    }

    if (project.type === "project") {
      const designDuration = Math.max(0, project.designDuration || 0);
      const constructionDuration = Math.max(0, project.constructionDuration || 0);

      if (designDuration > 0 && project.designBudget) {
        const start = safeDate(project.designStartDate);
        if (start) {
          const monthly = project.designBudget / designDuration;
          for (let i = 0; i < designDuration; i += 1) {
            const monthDate = new Date(start);
            monthDate.setMonth(monthDate.getMonth() + i);
            addBudgetForMonth(totals, monthDate, monthly);
          }
        }
      }

      if (constructionDuration > 0 && project.constructionBudget) {
        const start = safeDate(project.constructionStartDate);
        if (start) {
          const monthly = project.constructionBudget / constructionDuration;
          for (let i = 0; i < constructionDuration; i += 1) {
            const monthDate = new Date(start);
            monthDate.setMonth(monthDate.getMonth() + i);
            addBudgetForMonth(totals, monthDate, monthly);
          }
        }
      }
    } else {
      const start = safeDate(project.programStartDate);
      const end = safeDate(project.programEndDate);

      if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        const monthSpan = calculateMonthDifference(start, end) + 1;
        const months = Math.max(1, monthSpan);
        const monthlyBudget = (project.annualBudget || 0) / 12;

        for (let i = 0; i < months; i += 1) {
          const monthDate = new Date(start);
          monthDate.setMonth(monthDate.getMonth() + i);
          addBudgetForMonth(totals, monthDate, monthlyBudget);
        }
      }
    }
  });

  return totals;
};

export const calculateBudgetTimingImpact = (baselineProjects, scenarioProjects) => {
  const baselineTotals = distributeBudgetByYear(baselineProjects);
  const scenarioTotals = distributeBudgetByYear(scenarioProjects);

  const years = Array.from(
    new Set([
      ...Object.keys(baselineTotals),
      ...Object.keys(scenarioTotals),
    ])
  )
    .map((year) => parseInt(year, 10))
    .filter((year) => Number.isFinite(year))
    .sort((a, b) => a - b);

  const differences = years.map((year) => {
    const baseline = baselineTotals[year] || 0;
    const scenario = scenarioTotals[year] || 0;
    const delta = scenario - baseline;
    const exceededLimit = baseline > 0 ? scenario > baseline * 1.1 : scenario > baseline;

    return {
      year,
      baseline,
      scenario,
      delta,
      exceededLimit,
    };
  });

  return {
    baselineByYear: baselineTotals,
    scenarioByYear: scenarioTotals,
    differences,
    exceededYears: differences.filter((entry) => entry.exceededLimit),
  };
};

export const identifyResourceConflicts = (monthDetails) => {
  const details = Object.values(monthDetails || {});

  if (details.length === 0) {
    return {
      peakDemand: null,
      peakShortage: null,
      conflicts: [],
      categoryPeaks: {},
    };
  }

  const sortedDetails = details.sort(
    (a, b) => new Date(`${a.monthKey}-01`) - new Date(`${b.monthKey}-01`)
  );

  const conflicts = [];
  const categoryPeaks = {};
  let peakDemand = null;
  let peakShortage = null;

  sortedDetails.forEach((detail) => {
    if (!peakDemand || detail.totalRequired > peakDemand.totalRequired) {
      peakDemand = detail;
    }

    if (!peakShortage || detail.totalShortage > peakShortage.totalShortage) {
      peakShortage = detail;
    }

    Object.values(detail.categories).forEach((categoryDetail) => {
      if (
        !categoryPeaks[categoryDetail.id] ||
        categoryDetail.required > categoryPeaks[categoryDetail.id].required
      ) {
        categoryPeaks[categoryDetail.id] = {
          monthLabel: detail.monthLabel,
          required: categoryDetail.required,
          available: categoryDetail.available,
        };
      }

      if (categoryDetail.gap && categoryDetail.gap > 0.1) {
        const topProjects = categoryDetail.projects
          .map((project) => ({
            projectId: project.projectId,
            projectName: project.projectName,
            fte: Number(project.fte.toFixed(2)),
          }))
          .sort((a, b) => b.fte - a.fte)
          .slice(0, 3);

        conflicts.push({
          monthKey: detail.monthKey,
          monthLabel: detail.monthLabel,
          categoryId: categoryDetail.id,
          categoryName: categoryDetail.name,
          gap: Number(categoryDetail.gap.toFixed(2)),
          topProjects,
        });
      }
    });
  });

  return {
    peakDemand: peakDemand
      ? {
          monthKey: peakDemand.monthKey,
          monthLabel: peakDemand.monthLabel,
          required: Number(peakDemand.totalRequired.toFixed(2)),
          available: Number(peakDemand.totalAvailable.toFixed(2)),
        }
      : null,
    peakShortage:
      peakShortage && peakShortage.totalShortage > 0.1
        ? {
            monthKey: peakShortage.monthKey,
            monthLabel: peakShortage.monthLabel,
            shortage: Number(peakShortage.totalShortage.toFixed(2)),
            categories: Object.values(peakShortage.categories)
              .filter((category) => category.gap && category.gap > 0.1)
              .map((category) => ({
                id: category.id,
                name: category.name,
                gap: Number(category.gap.toFixed(2)),
              })),
          }
        : null,
    conflicts,
    categoryPeaks,
  };
};

const computeProjectShifts = (baselineProjects = [], scenarioProjects = []) => {
  const scenarioMap = new Map(
    scenarioProjects.map((project) => [project.id, project])
  );

  return baselineProjects.map((baseline) => {
    const scenario = scenarioMap.get(baseline.id) || baseline;

    if (baseline.type === "project") {
      return {
        projectId: baseline.id,
        name: baseline.name,
        type: baseline.type,
        designShiftMonths: calculateMonthDifference(
          baseline.designStartDate,
          scenario.designStartDate
        ),
        constructionShiftMonths: calculateMonthDifference(
          baseline.constructionStartDate,
          scenario.constructionStartDate
        ),
      };
    }

    return {
      projectId: baseline.id,
      name: baseline.name,
      type: baseline.type,
      programShiftMonths: calculateMonthDifference(
        baseline.programStartDate,
        scenario.programStartDate
      ),
      programEndShiftMonths: calculateMonthDifference(
        baseline.programEndDate,
        scenario.programEndDate
      ),
    };
  });
};

const quarterFromMonthKey = (monthKey) => {
  if (!monthKey || typeof monthKey !== "string") {
    return "";
  }

  const [yearStr, monthStr] = monthKey.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return monthKey;
  }

  const quarter = Math.floor((month - 1) / 3) + 1;
  return `Q${quarter} ${year}`;
};

export const buildScenarioRecommendations = ({
  scenario,
  gapSummary,
  conflictHighlights,
  deltaByProject,
}) => {
  const recommendations = [];
  const conflicts = conflictHighlights?.conflicts || [];
  const peakShortage = conflictHighlights?.peakShortage;

  const adjustments = (deltaByProject || []).filter(
    (shift) =>
      (shift.designShiftMonths && shift.designShiftMonths !== 0) ||
      (shift.constructionShiftMonths && shift.constructionShiftMonths !== 0) ||
      (shift.programShiftMonths && shift.programShiftMonths !== 0) ||
      (shift.programEndShiftMonths && shift.programEndShiftMonths !== 0)
  );

  adjustments.forEach((shift) => {
    const conflict = conflicts.find((item) =>
      item.topProjects.some((project) => project.projectId === shift.projectId)
    );

    if (!conflict) {
      return;
    }

    const shiftValues = [
      shift.designShiftMonths || 0,
      shift.constructionShiftMonths || 0,
      shift.programShiftMonths || 0,
      shift.programEndShiftMonths || 0,
    ].filter((value) => value !== 0);

    if (shiftValues.length === 0) {
      return;
    }

    const magnitude = Math.max(...shiftValues.map((value) => Math.abs(value)));
    const direction = shiftValues.some((value) => value < 0)
      ? "Accelerating"
      : "Delaying";

    recommendations.push(
      `${direction} ${shift.name} by ${magnitude} month${
        magnitude === 1 ? "" : "s"
      } creates a ${conflict.gap.toFixed(1)} FTE gap in ${
        conflict.categoryName
      } (${conflict.monthLabel}).`
    );
  });

  if (conflicts.length > 0) {
    const worstConflict = conflicts.reduce((max, item) =>
      item.gap > max.gap ? item : max
    );

    const neededFte = Math.max(1, Math.round(worstConflict.gap));
    const primaryProject = worstConflict.topProjects[0];
    const relatedShift = (deltaByProject || []).find(
      (shift) => shift.projectId === primaryProject.projectId
    );

    const suggestedDelay = relatedShift
      ? Math.max(
          1,
          Math.abs(
            relatedShift.designShiftMonths ||
              relatedShift.constructionShiftMonths ||
              relatedShift.programShiftMonths ||
              relatedShift.programEndShiftMonths ||
              1
          )
        )
      : 3;

    recommendations.push(
      `Consider hiring ${neededFte} additional ${worstConflict.categoryName}${
        neededFte > 1 ? "s" : ""
      } or delaying ${primaryProject.projectName} by ${suggestedDelay} month${
        suggestedDelay === 1 ? "" : "s"
      }.`
    );
  }

  if (peakShortage && peakShortage.shortage > 0.1) {
    const categories = peakShortage.categories
      .map((category) => category.name)
      .join(peakShortage.categories.length > 1 ? ", " : "");

    const quarterLabel = quarterFromMonthKey(peakShortage.monthKey);
    recommendations.push(
      `Peak conflict occurs in ${quarterLabel} with a ${peakShortage.shortage.toFixed(
        1
      )} FTE shortage across ${categories}.`
    );
  }

  if (gapSummary?.totalGap > 0 && recommendations.length === 0) {
    recommendations.push(
      `Scenario introduces ${gapSummary.totalGap.toFixed(
        1
      )} FTE shortage across ${gapSummary.affectedCategories.length} staff categories.`
    );
  }

  return Array.from(new Set(recommendations));
};

export const analyzeScenario = (
  baselineProjects,
  scenario,
  staffAllocations,
  staffCategories,
  staffAvailabilityByCategory = {},
  timeHorizon = 36
) => {
  const scenarioProjects = applyScenarioAdjustments(
    baselineProjects,
    scenario?.adjustments || {}
  );
  const scenarioTimelines = calculateTimelines(scenarioProjects);
  const { forecast, monthDetails, startDate } = generateScenarioForecastDetails(
    scenarioTimelines,
    staffAllocations,
    staffCategories,
    timeHorizon,
    staffAvailabilityByCategory
  );
  const gaps = calculateScenarioGaps(forecast, staffCategories);
  const gapSummary = summarizeScenarioGaps(gaps);
  const budgetImpacts = calculateBudgetTimingImpact(
    baselineProjects,
    scenarioProjects
  );
  const conflictHighlights = identifyResourceConflicts(monthDetails);
  const deltaByProject = computeProjectShifts(baselineProjects, scenarioProjects);
  const recommendations = buildScenarioRecommendations({
    scenario,
    gapSummary,
    conflictHighlights,
    deltaByProject,
  });

  return {
    scenarioId: scenario?.id,
    name: scenario?.name,
    description: scenario?.description,
    projects: scenarioProjects,
    timelines: scenarioTimelines,
    forecast,
    gaps,
    gapSummary,
    budgetImpacts,
    conflictHighlights,
    monthDetails,
    deltaByProject,
    recommendations,
    startDate,
  };
};
