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

  return orderedGroups.filter(
    (group) => group.projects.length > 0 || group.programs.length > 0
  );
};
