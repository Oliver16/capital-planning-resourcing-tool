const parseNumeric = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const clampPercent = (value) => {
  if (!Number.isFinite(value)) {
    return null;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 100) {
    return 100;
  }

  return value;
};

const roundTo = (value, precision = 2) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

export const normalizeProjectBudgetBreakdown = (project) => {
  if (!project || project.type !== "project") {
    return project;
  }

  const result = { ...project };

  const totalBudget = parseNumeric(project.totalBudget);
  const existingDesignBudget = parseNumeric(project.designBudget);
  const existingConstructionBudget = parseNumeric(project.constructionBudget);
  let designPercent = parseNumeric(project.designBudgetPercent);
  let constructionPercent = parseNumeric(project.constructionBudgetPercent);

  if (
    totalBudget !== null &&
    totalBudget !== 0 &&
    !Number.isFinite(designPercent) &&
    Number.isFinite(existingDesignBudget)
  ) {
    designPercent = (existingDesignBudget / totalBudget) * 100;
  }

  if (
    totalBudget !== null &&
    totalBudget !== 0 &&
    !Number.isFinite(constructionPercent) &&
    Number.isFinite(existingConstructionBudget)
  ) {
    constructionPercent = (existingConstructionBudget / totalBudget) * 100;
  }

  if (Number.isFinite(designPercent)) {
    const normalizedPercent = roundTo(clampPercent(designPercent));
    result.designBudgetPercent = normalizedPercent;

    if (Number.isFinite(totalBudget)) {
      result.designBudget = Math.round(
        (totalBudget * normalizedPercent) / 100
      );
    }
  } else if (Number.isFinite(existingDesignBudget)) {
    result.designBudget = Math.round(existingDesignBudget);
  }

  if (Number.isFinite(constructionPercent)) {
    const normalizedPercent = roundTo(clampPercent(constructionPercent));
    result.constructionBudgetPercent = normalizedPercent;

    if (Number.isFinite(totalBudget)) {
      result.constructionBudget = Math.round(
        (totalBudget * normalizedPercent) / 100
      );
    }
  } else if (Number.isFinite(existingConstructionBudget)) {
    result.constructionBudget = Math.round(existingConstructionBudget);
  }

  return result;
};
