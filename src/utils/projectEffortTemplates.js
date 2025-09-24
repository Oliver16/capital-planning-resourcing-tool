const toNumber = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.round(parsed * 100) / 100;
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

  return {
    id: template.id ?? null,
    name: template.name?.toString().trim() || "Untitled template",
    projectTypeId: template.projectTypeId ?? null,
    sizeCategory: template.sizeCategory?.toString().trim() || "",
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

const normalizeString = (value) => value?.toString().trim().toLowerCase() || "";

export const getMatchingProjectIds = (template, projects = []) => {
  if (!template) {
    return [];
  }

  const normalizedType = template.projectTypeId
    ? String(template.projectTypeId)
    : null;
  const normalizedSize = normalizeString(template.sizeCategory);
  const normalizedDelivery = template.deliveryType
    ? template.deliveryType.toString().trim().toLowerCase()
    : "";

  return projects
    .filter((project) => project && project.type === "project")
    .filter((project) => {
      if (normalizedType && String(project.projectTypeId) !== normalizedType) {
        return false;
      }

      if (normalizedSize) {
        const projectSize = normalizeString(project.sizeCategory);
        if (!projectSize || projectSize !== normalizedSize) {
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

  const chips = [];

  if (template.projectTypeId) {
    const match = projectTypes.find(
      (type) => String(type.id) === String(template.projectTypeId)
    );
    if (match?.name) {
      chips.push({ label: match.name, tone: "type" });
    }
  } else {
    chips.push({ label: "Any type", tone: "muted" });
  }

  if (template.sizeCategory) {
    chips.push({ label: `Size: ${template.sizeCategory}`, tone: "size" });
  } else {
    chips.push({ label: "Any size", tone: "muted" });
  }

  if (template.deliveryType) {
    const match = deliveryOptions.find(
      (option) => option.value === template.deliveryType
    );
    chips.push({
      label: match?.label || `Delivery: ${template.deliveryType}`,
      tone: "delivery",
    });
  } else {
    chips.push({ label: "Any delivery", tone: "muted" });
  }

  return chips;
};
