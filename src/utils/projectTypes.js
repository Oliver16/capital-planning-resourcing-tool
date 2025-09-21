const extractTypeValue = (input) => {
  if (input && typeof input === "object" && "type" in input) {
    return input.type;
  }

  return input;
};

const normalizeTypeString = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim().toLowerCase();
};

const collapseNormalizedString = (value) =>
  normalizeTypeString(value).replace(/[\s_-]+/g, "");

const collapseTypeString = (input) => {
  const extracted = extractTypeValue(input);

  if (extracted && typeof extracted === "object") {
    return "";
  }

  return collapseNormalizedString(extracted);
};

const containsKeyword = (collapsed, keyword) =>
  typeof collapsed === "string" && collapsed.includes(keyword);

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const hasPositiveNumber = (value) => toNumber(value) > 0;

const parseContinuousConfig = (config) => {
  if (!config) {
    return null;
  }

  if (typeof config === "object") {
    return config;
  }

  if (typeof config === "string") {
    try {
      const parsed = JSON.parse(config);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  return null;
};

const hasProgramCategoryConfig = (project = {}) => {
  const config = parseContinuousConfig(project?.continuousHoursByCategory);

  if (!config || typeof config !== "object") {
    return false;
  }

  return Object.values(config).some((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    return (
      hasPositiveNumber(entry.pmHours) ||
      hasPositiveNumber(entry.designHours) ||
      hasPositiveNumber(entry.constructionHours)
    );
  });
};

const hasLabelWithKeyword = (project, keyword) => {
  if (!project || typeof project !== "object") {
    return false;
  }

  const candidateValues = [
    project?.typeName,
    project?.projectTypeName,
    project?.projectClassification,
    project?.category,
    project?.classification,
    project?.projectType?.name,
    project?.projectType?.type,
  ];

  return candidateValues.some((value) =>
    containsKeyword(collapseNormalizedString(value), keyword)
  );
};

const hasProgramIndicators = (project = {}) => {
  if (!project || typeof project !== "object") {
    return false;
  }

  if (hasProgramCategoryConfig(project)) {
    return true;
  }

  if (
    hasPositiveNumber(project.continuousPmHours) ||
    hasPositiveNumber(project.continuousDesignHours) ||
    hasPositiveNumber(project.continuousConstructionHours)
  ) {
    return true;
  }

  if (project.programStartDate || project.programEndDate) {
    return true;
  }

  if (hasPositiveNumber(project.annualBudget)) {
    return true;
  }

  if (hasLabelWithKeyword(project, "program")) {
    return true;
  }

  return false;
};

const hasCapitalIndicators = (project = {}) => {
  if (!project || typeof project !== "object") {
    return false;
  }

  if (hasProgramIndicators(project)) {
    return false;
  }

  if (
    hasPositiveNumber(project.totalBudget) ||
    hasPositiveNumber(project.designBudget) ||
    hasPositiveNumber(project.constructionBudget)
  ) {
    return true;
  }

  if (
    hasPositiveNumber(project.designDuration) ||
    hasPositiveNumber(project.constructionDuration)
  ) {
    return true;
  }

  if (project.designStartDate || project.constructionStartDate) {
    return true;
  }

  if (hasLabelWithKeyword(project, "project") || hasLabelWithKeyword(project, "capital")) {
    return true;
  }

  return false;
};

export const isProgramProject = (projectOrType) => {
  const collapsed = collapseTypeString(projectOrType);
  if (containsKeyword(collapsed, "program")) {
    return true;
  }

  if (projectOrType && typeof projectOrType === "object") {
    return hasProgramIndicators(projectOrType);
  }

  return false;
};

export const isCapitalProject = (projectOrType) => {
  if (isProgramProject(projectOrType)) {
    return false;
  }

  const collapsed = collapseTypeString(projectOrType);
  if (
    containsKeyword(collapsed, "project") ||
    containsKeyword(collapsed, "capital")
  ) {
    return true;
  }

  if (!collapsed && projectOrType && typeof projectOrType === "object") {
    return hasCapitalIndicators(projectOrType);
  }

  if (!collapsed) {
    return true;
  }

  if (projectOrType && typeof projectOrType === "object") {
    return hasCapitalIndicators(projectOrType);
  }

  return false;

};

export const isProjectOrProgram = (projectOrType) =>
  isCapitalProject(projectOrType) || isProgramProject(projectOrType);

export const getProjectTypeDisplayLabel = (projectOrType) =>
  isProgramProject(projectOrType) ? "Annual Program" : "Capital Project";
