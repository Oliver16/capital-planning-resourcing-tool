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
  timeHorizon
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
      staffCategories
    );
  }

  const startDate = new Date(Math.min(...validDates));
  startDate.setDate(1); // Start of month

  return generateForecastFromDate(
    startDate,
    timeHorizon,
    projectTimelines,
    staffAllocations,
    staffCategories
  );
};

const generateForecastFromDate = (
  startDate,
  timeHorizon,
  projectTimelines,
  staffAllocations,
  staffCategories
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
        monthData[`${category.name}_capacity`] =
          (category.designCapacity || 0) + (category.constructionCapacity || 0);
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
              if (isInDesign && allocation.designHours) {
                monthData[`${category.name}_required`] +=
                  (allocation.designHours || 0) / (4.33 * 40);
              }
              if (isInConstruction && allocation.constructionHours) {
                monthData[`${category.name}_required`] +=
                  (allocation.constructionHours || 0) / (4.33 * 40);
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
      const capacity = (month[`${category.name}_capacity`] || 0) / (4.33 * 40);
      const gap = required - capacity;

      if (gap > 0.1) {
        // Threshold for significant gap
        gaps.push({
          month: month.month,
          monthLabel: month.monthLabel,
          category: category.name,
          required: required.toFixed(2),
          capacity: capacity.toFixed(2),
          gap: gap.toFixed(2),
        });
      }
    });
  });

  return gaps;
};
