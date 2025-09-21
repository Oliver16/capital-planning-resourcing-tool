const parseDateValue = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getProjectStartTimestamp = (project) => {
  if (!project) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamps = [];

  const designStart = parseDateValue(project.designStartDate);
  if (designStart) {
    timestamps.push(designStart.getTime());
  }

  const constructionStart = parseDateValue(project.constructionStartDate);
  if (constructionStart) {
    timestamps.push(constructionStart.getTime());
  }

  if (timestamps.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.min(...timestamps);
};

const getProgramStartTimestamp = (program) => {
  if (!program) {
    return Number.POSITIVE_INFINITY;
  }

  const startDate =
    parseDateValue(program.programStartDate) ||
    parseDateValue(program.designStartDate) ||
    parseDateValue(program.constructionStartDate);

  return startDate ? startDate.getTime() : Number.POSITIVE_INFINITY;
};

const sortItemsByStart = (items = [], getStartTime) => {
  if (!Array.isArray(items) || items.length <= 1) {
    return items;
  }

  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aTime = getStartTime(a.item);
      const bTime = getStartTime(b.item);

      if (aTime === bTime) {
        const aName = a.item?.name ?? "";
        const bName = b.item?.name ?? "";
        const nameComparison = aName.localeCompare(bName);

        if (nameComparison !== 0) {
          return nameComparison;
        }

        return a.index - b.index;
      }

      return aTime - bTime;
    })
    .map(({ item }) => item);
};

export const groupProjectsByType = (projects = [], projectTypes = []) => {
  const typeMap = new Map();
  projectTypes.forEach((type) => {
    if (type && (type.id || type.id === 0)) {
      typeMap.set(type.id, type);
    }
  });

  const groupsMap = new Map();

  const ensureGroup = (key, type) => {
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        key,
        type: type || null,
        label: type?.name || "Unassigned type",
        color: type?.color || "#6b7280",
        projects: [],
        programs: [],
      });
    }
    return groupsMap.get(key);
  };

  projects.forEach((project) => {
    if (!project) return;
    const type = typeMap.get(project.projectTypeId);
    const key = type ? String(type.id) : "unassigned";
    const group = ensureGroup(key, type);

    if (project.type === "program") {
      group.programs.push(project);
    } else {
      group.projects.push(project);
    }
  });

  const orderedGroups = [];

  projectTypes.forEach((type) => {
    if (!type) return;
    const key = String(type.id);
    const group = groupsMap.get(key);
    if (group) {
      orderedGroups.push(group);
    }
  });

  if (groupsMap.has("unassigned")) {
    orderedGroups.push(groupsMap.get("unassigned"));
  }

  // Include any additional groups that might have been added dynamically with
  // types not present in the current projectTypes list.
  groupsMap.forEach((group, key) => {
    if (
      key !== "unassigned" &&
      !projectTypes.some((type) => String(type?.id) === key)
    ) {
      orderedGroups.push(group);
    }
  });

  orderedGroups.forEach((group) => {
    group.projects = sortItemsByStart(group.projects, getProjectStartTimestamp);
    group.programs = sortItemsByStart(group.programs, getProgramStartTimestamp);
  });

  return orderedGroups.filter(
    (group) => group.projects.length > 0 || group.programs.length > 0
  );
};
