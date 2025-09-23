const toNumber = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.round(parsed * 100) / 100;
};

const parseBudgetBoundary = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }

  return Math.round(numeric);
};

const normalizeComplexity = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  const normalized = value.toString().trim().toLowerCase();

  if (normalized === "low") {
    return "Low";
  }

  if (normalized === "high") {
    return "High";
  }

  if (normalized === "medium" || normalized === "normal") {
    return "Normal";
  }

  return "";
};

const complexityKey = (value) => {
  if (!value) {
    return "";
  }

  const normalized = value.toString().trim().toLowerCase();

  if (normalized === "medium") {
    return "normal";
  }

  if (normalized === "low" || normalized === "normal" || normalized === "high") {
    return normalized;
  }

  return "";
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const formatBudget = (value) => {
  if (!Number.isFinite(value)) {
    return "$0";
  }

  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (absolute >= 1_000) {
    return `$${Math.round(value / 1_000)}K`;
  }

  return currencyFormatter.format(value);
};

export const sanitizeTemplateHours = (hoursByCategory = {}) => {
  if (!hoursByCategory || typeof hoursByCategory !== "object") {
    return {};
  }

  const sanitized = {};

  Object.entries(hoursByCategory).forEach(([key, value]) => {
    if (!value || typeof value !== "object") {
      return;
    }

    const pmHours = toNumber(value.pmHours);
    const designHours = toNumber(value.designHours);
    const constructionHours = toNumber(value.constructionHours);

    if (pmHours > 0 || designHours > 0 || constructionHours > 0) {
      sanitized[String(key)] = { pmHours, designHours, constructionHours };
    }
  });

  return sanitized;
};

export const normalizeEffortTemplate = (template = {}) => {
  const normalizedHours = sanitizeTemplateHours(template.hoursByCategory);

  let minBudget = parseBudgetBoundary(
    template.minTotalBudget ?? template.minBudget
  );
  let maxBudget = parseBudgetBoundary(
    template.maxTotalBudget ?? template.maxBudget
  );

  if (minBudget !== null && maxBudget !== null && maxBudget < minBudget) {
    [minBudget, maxBudget] = [maxBudget, minBudget];
  }

  return {
    id: template.id ?? null,
    name: template.name?.toString().trim() || "Untitled template",
    projectTypeId: template.projectTypeId ?? null,
    complexity: normalizeComplexity(
      template.complexity ?? template.sizeCategory
    ),
    minTotalBudget: minBudget,
    maxTotalBudget: maxBudget,
    deliveryType: template.deliveryType?.toString().trim() || "",
    notes: template.notes?.toString().trim() || "",
    hoursByCategory: normalizedHours,
  };
};

export const getTemplateTotals = (template) => {
  const hours = sanitizeTemplateHours(template?.hoursByCategory);

  return Object.values(hours).reduce(
    (totals, entry) => {
      totals.pm += entry.pmHours || 0;
      totals.design += entry.designHours || 0;
      totals.construction += entry.constructionHours || 0;
      return totals;
    },
    { pm: 0, design: 0, construction: 0 }
  );
};

export const getMatchingProjectIds = (template, projects = []) => {
  if (!template) {
    return [];
  }

  const normalizedTemplate = normalizeEffortTemplate(template);
  const normalizedType = normalizedTemplate.projectTypeId
    ? String(normalizedTemplate.projectTypeId)
    : null;
  const normalizedComplexity = complexityKey(normalizedTemplate.complexity);
  const normalizedDelivery = normalizedTemplate.deliveryType
    ? normalizedTemplate.deliveryType.toString().trim().toLowerCase()
    : "";
  const minBudget = Number.isFinite(normalizedTemplate.minTotalBudget)
    ? normalizedTemplate.minTotalBudget
    : null;
  const maxBudget = Number.isFinite(normalizedTemplate.maxTotalBudget)
    ? normalizedTemplate.maxTotalBudget
    : null;

  return projects
    .filter((project) => project && project.type === "project")
    .filter((project) => {
      if (normalizedType && String(project.projectTypeId) !== normalizedType) {
        return false;
      }

      if (normalizedComplexity) {
        const projectComplexity = complexityKey(
          project.complexity ?? project.sizeCategory
        );
        if (!projectComplexity || projectComplexity !== normalizedComplexity) {
          return false;
        }
      }

      if (normalizedDelivery) {
        const projectDelivery = project.deliveryType
          ? project.deliveryType.toString().trim().toLowerCase()
          : "";
        if (!projectDelivery || projectDelivery !== normalizedDelivery) {
          return false;
        }
      }

      const projectBudget = Number(project.totalBudget);
      if (minBudget !== null) {
        if (!Number.isFinite(projectBudget) || projectBudget < minBudget) {
          return false;
        }
      }
      if (maxBudget !== null) {
        if (!Number.isFinite(projectBudget) || projectBudget > maxBudget) {
          return false;
        }
      }

      return true;
    })
    .map((project) => project.id)
    .filter((id) => id !== undefined && id !== null);
};

export const formatTemplateCriteria = ({
  template,
  projectTypes = [],
  deliveryOptions = [],
}) => {
  if (!template) {
    return [];
  }

  const normalizedTemplate = normalizeEffortTemplate(template);
  const chips = [];

  if (normalizedTemplate.projectTypeId) {
    const match = projectTypes.find(
      (type) => String(type.id) === String(normalizedTemplate.projectTypeId)
    );
    if (match?.name) {
      chips.push({ label: match.name, tone: "type" });
    }
  } else {
    chips.push({ label: "Any type", tone: "muted" });
  }

  if (normalizedTemplate.complexity) {
    chips.push({
      label: `Complexity: ${normalizedTemplate.complexity}`,
      tone: "complexity",
    });
  } else {
    chips.push({ label: "Any complexity", tone: "muted" });
  }

  const minBudget = Number.isFinite(normalizedTemplate.minTotalBudget)
    ? normalizedTemplate.minTotalBudget
    : null;
  const maxBudget = Number.isFinite(normalizedTemplate.maxTotalBudget)
    ? normalizedTemplate.maxTotalBudget
    : null;

  if (minBudget !== null || maxBudget !== null) {
    let label = "";
    if (minBudget !== null && maxBudget !== null) {
      label = `Budget ${formatBudget(minBudget)}–${formatBudget(maxBudget)}`;
    } else if (minBudget !== null) {
      label = `Budget ≥ ${formatBudget(minBudget)}`;
    } else {
      label = `Budget ≤ ${formatBudget(maxBudget)}`;
    }

    chips.push({ label, tone: "budget" });
  } else {
    chips.push({ label: "Any budget", tone: "muted" });
  }

  if (normalizedTemplate.deliveryType) {
    const match = deliveryOptions.find(
      (option) => option.value === normalizedTemplate.deliveryType
    );
    chips.push({
      label:
        match?.label || `Delivery: ${normalizedTemplate.deliveryType}`,
      tone: "delivery",
    });
  } else {
    chips.push({ label: "Any delivery", tone: "muted" });
  }

  return chips;
};
