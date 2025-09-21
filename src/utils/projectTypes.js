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

const collapseTypeString = (input) =>
  normalizeTypeString(extractTypeValue(input)).replace(/[\s_-]+/g, "");

const containsKeyword = (collapsed, keyword) =>
  typeof collapsed === "string" && collapsed.includes(keyword);

export const isProgramProject = (projectOrType) => {
  const collapsed = collapseTypeString(projectOrType);
  if (!collapsed) {
    return false;
  }

  return containsKeyword(collapsed, "program");
};

export const isCapitalProject = (projectOrType) => {
  const collapsed = collapseTypeString(projectOrType);
  if (!collapsed) {
    return true;
  }

  if (containsKeyword(collapsed, "program")) {
    return false;
  }

  return containsKeyword(collapsed, "project") || !collapsed;
};

export const isProjectOrProgram = (projectOrType) =>
  isCapitalProject(projectOrType) || isProgramProject(projectOrType);

export const getProjectTypeDisplayLabel = (projectOrType) =>
  isProgramProject(projectOrType) ? "Annual Program" : "Capital Project";
