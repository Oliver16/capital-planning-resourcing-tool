const toNumber = (value, { allowNegative = false } = {}) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  if (!allowNegative && numeric < 0) {
    return 0;
  }

  return numeric;
};

const toNullableId = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : trimmed;
  }

  return null;
};

const sanitizePhaseDurations = (input = {}) => {
  const source =
    input && typeof input === 'object'
      ? input
      : {
          pm: input?.pmDuration ?? input?.pmMonths,
          design: input?.designDuration ?? input?.designMonths,
          construction: input?.constructionDuration ?? input?.constructionMonths,
        };

  return {
    pm: toNumber(
      source.pm ?? source.pmDuration ?? source.pmMonths ?? input.pmDuration
    ),
    design: toNumber(
      source.design ?? source.designDuration ?? source.designMonths ?? input.designDuration
    ),
    construction: toNumber(
      source.construction ??
        source.constructionDuration ??
        source.constructionMonths ??
        input.constructionDuration
    ),
  };
};

const sanitizePhaseHours = (input = {}) => {
  const source =
    input && typeof input === 'object'
      ? input
      : {
          pmHours: input.pmHours ?? input.pm,
          designHours: input.designHours ?? input.design,
          constructionHours: input.constructionHours ?? input.construction,
        };

  return {
    pmHours: toNumber(
      source.pmHours ?? source.pm ?? input.pmHours ?? input.pm
    ),
    designHours: toNumber(
      source.designHours ?? source.design ?? input.designHours ?? input.design
    ),
    constructionHours: toNumber(
      source.constructionHours ??
        source.construction ??
        input.constructionHours ??
        input.construction
    ),
  };
};

const sanitizeCategoryHours = (input = {}) => {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const normalized = {};

  Object.entries(input).forEach(([categoryId, values]) => {
    const key = toNullableId(categoryId);
    if (!key) {
      return;
    }

    const hours = sanitizePhaseHours(values);
    if (hours.pmHours || hours.designHours || hours.constructionHours) {
      normalized[key] = hours;
    }
  });

  return normalized;
};

const sanitizeTimestamp = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const normalizeEffortTemplate = (template = {}) => {
  if (!template || typeof template !== 'object') {
    return {
      id: null,
      name: '',
      description: '',
      templateType: 'project',
      projectTypeId: null,
      defaultPhaseDurations: { pm: 0, design: 0, construction: 0 },
      defaultPhaseHours: { pmHours: 0, designHours: 0, constructionHours: 0 },
      hoursByCategory: {},
      notes: '',
      createdAt: null,
      updatedAt: null,
    };
  }

  const defaultPhaseDurations = sanitizePhaseDurations(
    template.defaultPhaseDurations ??
      template.phaseDurations ??
      template.defaultDurations ??
      template
  );

  const defaultPhaseHours = sanitizePhaseHours(
    template.defaultPhaseHours ??
      template.defaultHours ??
      template.hours ??
      template
  );

  const hoursByCategory = sanitizeCategoryHours(
    template.hoursByCategory ??
      template.categoryHours ??
      template.continuousHoursByCategory ??
      {}
  );

  const name =
    typeof template.name === 'string' ? template.name.trim() : '';
  const description =
    typeof template.description === 'string' ? template.description.trim() : '';
  const notes = typeof template.notes === 'string' ? template.notes.trim() : '';

  const templateType =
    template.templateType === 'program' || template.templateType === 'programmatic'
      ? 'program'
      : 'project';

  return {
    ...template,
    id: toNullableId(template.id),
    projectTypeId: toNullableId(template.projectTypeId),
    templateType,
    name,
    description,
    notes,
    defaultPhaseDurations,
    defaultPhaseHours,
    defaultHours: defaultPhaseHours,
    phaseDurations: defaultPhaseDurations,
    hoursByCategory,
    createdAt: sanitizeTimestamp(template.createdAt ?? template.created_at),
    updatedAt: sanitizeTimestamp(template.updatedAt ?? template.updated_at),
  };
};
