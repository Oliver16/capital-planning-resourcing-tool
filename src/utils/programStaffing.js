const sanitizeHoursValue = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};

const parseCategoryHoursConfig = (config) => {
  if (!config) {
    return {};
  }

  if (typeof config === "string") {
    try {
      const parsed = JSON.parse(config);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      console.warn("Unable to parse program hours config:", error);
      return {};
    }
  }

  return typeof config === "object" ? config : {};
};

const sanitizeCategoryHoursMap = (config) => {
  const parsed = parseCategoryHoursConfig(config);
  const sanitized = {};

  Object.entries(parsed).forEach(([key, value]) => {
    if (!value || typeof value !== "object") {
      return;
    }

    const pmHours = sanitizeHoursValue(value.pmHours);
    const designHours = sanitizeHoursValue(value.designHours);
    const constructionHours = sanitizeHoursValue(value.constructionHours);

    if (pmHours > 0 || designHours > 0 || constructionHours > 0) {
      sanitized[String(key)] = { pmHours, designHours, constructionHours };
    }
  });

  return sanitized;
};

const getVisibleCategoryHours = (program, staffCategories = []) => {
  const sanitized = sanitizeCategoryHoursMap(program?.continuousHoursByCategory);

  if (!Array.isArray(staffCategories) || staffCategories.length === 0) {
    return sanitized;
  }

  const validCategoryIds = new Set(
    staffCategories
      .filter((category) => category && category.id != null)
      .map((category) => String(category.id))
  );

  return Object.entries(sanitized).reduce((accumulator, [key, value]) => {
    if (validCategoryIds.has(key)) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});
};

const buildModalStateForProgram = (program, staffCategories = []) => {
  const sanitized = sanitizeCategoryHoursMap(program?.continuousHoursByCategory);
  const config = {};
  const extraEntries = {};
  const knownCategoryIds = new Set();

  (staffCategories || []).forEach((category) => {
    if (!category || category.id == null) {
      return;
    }

    const key = String(category.id);
    knownCategoryIds.add(key);
    const entry = sanitized[key];
    config[key] = {
      pmHours: entry ? String(entry.pmHours) : "",
      designHours: entry ? String(entry.designHours) : "",
      constructionHours: entry ? String(entry.constructionHours) : "",
    };
  });

  Object.entries(sanitized).forEach(([key, entry]) => {
    if (!knownCategoryIds.has(key)) {
      extraEntries[key] = entry;
    }
  });

  return {
    config,
    extraEntries,
    hadExistingValues: Object.keys(sanitized).length > 0,
  };
};

const buildCategoryUpdatesForSave = (
  draftConfig,
  staffCategories = [],
  extraEntries = {}
) => {
  const mergedConfig = {};
  let totalPm = 0;
  let totalDesign = 0;
  let totalConstruction = 0;

  const addEntry = (key, entry) => {
    if (!entry) {
      return;
    }

    const pmHours = sanitizeHoursValue(entry.pmHours);
    const designHours = sanitizeHoursValue(entry.designHours);
    const constructionHours = sanitizeHoursValue(entry.constructionHours);

    if (pmHours > 0 || designHours > 0 || constructionHours > 0) {
      mergedConfig[String(key)] = { pmHours, designHours, constructionHours };
      totalPm += pmHours;
      totalDesign += designHours;
      totalConstruction += constructionHours;
    }
  };

  (staffCategories || []).forEach((category) => {
    if (!category || category.id == null) {
      return;
    }

    const key = String(category.id);
    const entry = draftConfig?.[key];

    if (!entry) {
      return;
    }

    addEntry(key, {
      pmHours: entry.pmHours,
      designHours: entry.designHours,
      constructionHours: entry.constructionHours,
    });
  });

  Object.entries(extraEntries || {}).forEach(([key, entry]) => {
    if (mergedConfig[key]) {
      return;
    }

    addEntry(key, entry);
  });

  return {
    sanitizedConfig:
      Object.keys(mergedConfig).length > 0 ? mergedConfig : null,
    totals: {
      pm: totalPm,
      design: totalDesign,
      construction: totalConstruction,
      total: totalPm + totalDesign + totalConstruction,
    },
  };
};

export {
  sanitizeHoursValue,
  parseCategoryHoursConfig,
  sanitizeCategoryHoursMap,
  getVisibleCategoryHours,
  buildModalStateForProgram,
  buildCategoryUpdatesForSave,
};
