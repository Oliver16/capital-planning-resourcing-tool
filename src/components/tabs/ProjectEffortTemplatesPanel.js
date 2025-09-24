import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  SlidersHorizontal,
  Users,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  normalizeEffortTemplate,
  getTemplateTotals,
  getMatchingProjectIds,
  formatTemplateCriteria,
} from "../../utils/projectEffortTemplates";

const DELIVERY_OPTIONS = [
  { value: "self-perform", label: "Self-Perform" },
  { value: "hybrid", label: "Hybrid" },
  { value: "consultant", label: "Consultant" },
];

const defaultDraft = {
  id: null,
  name: "",
  projectTypeId: "",
  sizeCategory: "",
  deliveryType: "",
  notes: "",
  hoursByCategory: {},
};

const toStringValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value === 0 ? "" : value.toString();
  }
  const trimmed = value.toString().trim();
  return trimmed === "0" ? "" : trimmed;
};

const TemplateFormModal = ({
  isOpen,
  onClose,
  onSave,
  staffCategories = [],
  projectTypes = [],
  template,
  isReadOnly = false,
}) => {
  const [draft, setDraft] = useState(defaultDraft);

  useEffect(() => {
    if (!isOpen) {
      setDraft(defaultDraft);
      return;
    }

    const normalized = normalizeEffortTemplate(template || {});
    const categoryConfig = {};

    (staffCategories || []).forEach((category) => {
      if (!category || category.id === undefined || category.id === null) {
        return;
      }
      const key = String(category.id);
      const entry = normalized.hoursByCategory?.[key];
      categoryConfig[key] = {
        pmHours: toStringValue(entry?.pmHours),
        designHours: toStringValue(entry?.designHours),
        constructionHours: toStringValue(entry?.constructionHours),
      };
    });

    setDraft({
      id: normalized.id ?? null,
      name: normalized.name || "",
      projectTypeId: normalized.projectTypeId ? String(normalized.projectTypeId) : "",
      sizeCategory: normalized.sizeCategory || "",
      deliveryType: normalized.deliveryType || "",
      notes: normalized.notes || "",
      hoursByCategory: categoryConfig,
    });
  }, [isOpen, template, staffCategories]);

  if (!isOpen) {
    return null;
  }

  const handleFieldChange = (field) => (event) => {
    const value = event.target.value;
    setDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleCategoryChange = (categoryId, field, value) => {
    if (!/^\d*(\.\d*)?$/.test(value)) {
      return;
    }
    const key = String(categoryId);
    setDraft((previous) => ({
      ...previous,
      hoursByCategory: {
        ...previous.hoursByCategory,
        [key]: {
          ...(previous.hoursByCategory?.[key] || {}),
          [field]: value,
        },
      },
    }));
  };

  const handleSave = () => {
    const normalized = normalizeEffortTemplate({
      ...draft,
      projectTypeId: draft.projectTypeId || null,
    });

    const hoursByCategory = {};
    Object.entries(draft.hoursByCategory || {}).forEach(([key, entry]) => {
      if (!entry) {
        return;
      }
      const pm = Number(entry.pmHours);
      const design = Number(entry.designHours);
      const construction = Number(entry.constructionHours);
      if (
        (Number.isFinite(pm) && pm > 0) ||
        (Number.isFinite(design) && design > 0) ||
        (Number.isFinite(construction) && construction > 0)
      ) {
        hoursByCategory[key] = {
          pmHours: Math.round(pm * 100) / 100 || 0,
          designHours: Math.round(design * 100) / 100 || 0,
          constructionHours: Math.round(construction * 100) / 100 || 0,
        };
      }
    });

    onSave({
      ...normalized,
      projectTypeId: draft.projectTypeId || null,
      sizeCategory: draft.sizeCategory?.trim() || "",
      deliveryType: draft.deliveryType || "",
      notes: draft.notes?.trim() || "",
      hoursByCategory,
    });
  };

  const sortedCategories = (staffCategories || [])
    .filter((category) => category && category.id != null)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  const totals = sortedCategories.reduce(
    (accumulator, category) => {
      const key = String(category.id);
      const entry = draft.hoursByCategory?.[key];
      const pm = Number(entry?.pmHours) || 0;
      const design = Number(entry?.designHours) || 0;
      const construction = Number(entry?.constructionHours) || 0;

      accumulator.pm += pm;
      accumulator.design += design;
      accumulator.construction += construction;

      if (pm > 0 || design > 0 || construction > 0) {
        accumulator.categories += 1;
      }

      return accumulator;
    },
    { pm: 0, design: 0, construction: 0, categories: 0 }
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/50 px-4 py-6" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {draft.id ? "Edit effort template" : "New effort template"}
            </h2>
            <p className="text-sm text-gray-500">
              Define default monthly PM, design, and construction hours by staff category.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gray-100 p-2 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-gray-600">
            <span className="font-medium text-gray-700">Template name</span>
            <input
              type="text"
              value={draft.name}
              onChange={handleFieldChange("name")}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              placeholder="e.g. Small self-perform pipeline"
              disabled={isReadOnly}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-600">
            <span className="font-medium text-gray-700">Project type</span>
            <select
              value={draft.projectTypeId}
              onChange={handleFieldChange("projectTypeId")}
              disabled={isReadOnly}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            >
              <option value="">Any type</option>
              {(projectTypes || []).map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-600">
            <span className="font-medium text-gray-700">Project size</span>
            <input
              type="text"
              value={draft.sizeCategory}
              onChange={handleFieldChange("sizeCategory")}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              placeholder="e.g. Small / Medium / Large"
              disabled={isReadOnly}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-600">
            <span className="font-medium text-gray-700">Delivery model</span>
            <select
              value={draft.deliveryType}
              onChange={handleFieldChange("deliveryType")}
              disabled={isReadOnly}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            >
              <option value="">Any delivery</option>
              {DELIVERY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="md:col-span-2 flex flex-col gap-2 text-sm text-gray-600">
            <span className="font-medium text-gray-700">Assumptions / notes</span>
            <textarea
              value={draft.notes}
              onChange={handleFieldChange("notes")}
              placeholder="Document assumptions or key drivers behind this template."
              rows={3}
              disabled={isReadOnly}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
          </label>
        </div>

        <div className="max-h-[45vh] overflow-y-auto border-t border-gray-100">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Staff category</th>
                <th className="px-4 py-3">PM hours</th>
                <th className="px-4 py-3">Design hours</th>
                <th className="px-4 py-3">Construction hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedCategories.map((category) => {
                const key = String(category.id);
                const entry = draft.hoursByCategory?.[key] || {
                  pmHours: "",
                  designHours: "",
                  constructionHours: "",
                };

                return (
                  <tr key={category.id} className="bg-white">
                    <td className="px-4 py-3 font-medium text-gray-700">
                      {category.name}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={entry.pmHours}
                        onChange={(event) =>
                          handleCategoryChange(category.id, "pmHours", event.target.value)
                        }
                        disabled={isReadOnly}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:cursor-not-allowed disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={entry.designHours}
                        onChange={(event) =>
                          handleCategoryChange(category.id, "designHours", event.target.value)
                        }
                        disabled={isReadOnly}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:cursor-not-allowed disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={entry.constructionHours}
                        onChange={(event) =>
                          handleCategoryChange(category.id, "constructionHours", event.target.value)
                        }
                        disabled={isReadOnly}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:cursor-not-allowed disabled:bg-gray-100"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 px-6 py-4 text-sm text-gray-600">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
              {totals.categories} {totals.categories === 1 ? "category" : "categories"} configured
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              Total {Math.round((totals.pm + totals.design + totals.construction) * 10) / 10} hrs/month
            </span>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isReadOnly}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                isReadOnly
                  ? "cursor-not-allowed bg-gray-300 focus:ring-gray-200"
                  : "bg-purple-600 hover:bg-purple-700 focus:ring-purple-400"
              }`}
            >
              <SlidersHorizontal size={16} className="text-purple-100" />
              Save template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ApplyTemplateModal = ({
  isOpen,
  onClose,
  template,
  projects = [],
  projectTypes = [],
  onApply,
  isReadOnly = false,
}) => {
  const normalizedTemplate = useMemo(
    () => normalizeEffortTemplate(template || {}),
    [template]
  );

  const matchingProjectIds = useMemo(
    () => getMatchingProjectIds(normalizedTemplate, projects),
    [normalizedTemplate, projects]
  );

  const [selected, setSelected] = useState(new Set());
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelected(new Set());
      setIsApplying(false);
      return;
    }
    setSelected(new Set(matchingProjectIds));
    setIsApplying(false);
  }, [isOpen, matchingProjectIds]);

  if (!isOpen) {
    return null;
  }

  const toggleProject = (projectId) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleApply = async () => {
    if (!onApply || isReadOnly) {
      return;
    }
    setIsApplying(true);
    try {
      await onApply(normalizedTemplate, Array.from(selected));
      onClose();
    } catch (error) {
      console.error("Error applying template:", error);
    } finally {
      setIsApplying(false);
    }
  };

  const totals = getTemplateTotals(normalizedTemplate);
  const templateProjects = projects.filter((project) => matchingProjectIds.includes(project.id));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/50 px-4 py-6" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Apply effort template</h2>
            <p className="text-sm text-gray-500">
              Select the projects that should receive the hours defined in this template.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gray-100 p-2 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-lg border border-purple-100 bg-purple-50 p-4">
            <p className="text-sm font-medium text-purple-900">{normalizedTemplate.name}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {formatTemplateCriteria({
                template: normalizedTemplate,
                projectTypes,
                deliveryOptions: DELIVERY_OPTIONS,
              }).map((chip, index) => (
                <span
                  key={`${chip.label}-${index}`}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium ${
                    chip.tone === "type"
                      ? "bg-blue-100 text-blue-800"
                      : chip.tone === "size"
                      ? "bg-green-100 text-green-800"
                      : chip.tone === "delivery"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {chip.label}
                </span>
              ))}
            </div>
            {normalizedTemplate.notes && (
              <p className="mt-2 text-xs text-purple-700">{normalizedTemplate.notes}</p>
            )}
            <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-purple-700 sm:grid-cols-4">
              <div className="rounded-md bg-white px-3 py-2 shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-purple-500">PM</p>
                <p className="text-sm font-semibold text-purple-900">{totals.pm.toLocaleString()} hrs</p>
              </div>
              <div className="rounded-md bg-white px-3 py-2 shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-purple-500">Design</p>
                <p className="text-sm font-semibold text-purple-900">{totals.design.toLocaleString()} hrs</p>
              </div>
              <div className="rounded-md bg-white px-3 py-2 shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-purple-500">Construction</p>
                <p className="text-sm font-semibold text-purple-900">{totals.construction.toLocaleString()} hrs</p>
              </div>
              <div className="rounded-md bg-white px-3 py-2 shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-purple-500">Total</p>
                <p className="text-sm font-semibold text-purple-900">
                  {(totals.pm + totals.design + totals.construction).toLocaleString()} hrs
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-600">
                <Users size={16} /> {matchingProjectIds.length} matching {matchingProjectIds.length === 1 ? "project" : "projects"}
              </span>
              {matchingProjectIds.length === 0 && (
                <span className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle size={16} /> No projects currently meet this criteria.
                </span>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Apply</th>
                    <th className="px-4 py-2 text-left">Project</th>
                    <th className="px-4 py-2 text-left">Delivery</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {templateProjects.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500">
                        No matching projects yet.
                      </td>
                    </tr>
                  )}
                  {templateProjects.map((project) => (
                    <tr key={project.id}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          checked={selected.has(project.id)}
                          onChange={() => toggleProject(project.id)}
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <p className="font-medium text-gray-800">{project.name}</p>
                        <p className="text-xs text-gray-500">
                          {project.projectTypeId
                            ? projectTypes.find((type) => String(type.id) === String(project.projectTypeId))?.name || "Unassigned"
                            : "Unassigned"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {DELIVERY_OPTIONS.find(
                          (option) => option.value === (project.deliveryType || "self-perform")
                        )?.label || project.deliveryType || "Self-Perform"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 text-sm">
          <p className="text-xs text-gray-500">
            Applying this template will overwrite the monthly hours for the selected projects. You can make manual adjustments afterwards in the allocations grid.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isReadOnly || selected.size === 0 || isApplying}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                isReadOnly || selected.size === 0 || isApplying
                  ? "cursor-not-allowed bg-gray-300 focus:ring-gray-200"
                  : "bg-purple-600 hover:bg-purple-700 focus:ring-purple-400"
              }`}
            >
              <CheckCircle2 size={16} className="text-purple-100" />
              Apply template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProjectEffortTemplatesPanel = ({
  templates = [],
  projects = [],
  projectTypes = [],
  staffCategories = [],
  onSaveTemplate,
  onDeleteTemplate,
  onApplyTemplate,
  isReadOnly = false,
}) => {
  const normalizedTemplates = useMemo(
    () => (templates || []).map((template) => normalizeEffortTemplate(template)),
    [templates]
  );

  const summaries = useMemo(
    () =>
      normalizedTemplates.map((template) => {
        const totals = getTemplateTotals(template);
        const matches = getMatchingProjectIds(template, projects);
        return {
          template,
          totals,
          matchingProjectIds: matches,
        };
      }),
    [normalizedTemplates, projects]
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(null);

  const openForm = (templateToEdit = null) => {
    setEditingTemplate(templateToEdit);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setEditingTemplate(null);
    setIsFormOpen(false);
  };

  const openApplyModal = (templateToApply) => {
    setActiveTemplate(templateToApply);
    setIsApplyOpen(true);
  };

  const closeApplyModal = () => {
    setActiveTemplate(null);
    setIsApplyOpen(false);
  };

  const handleSaveTemplate = async (template) => {
    if (!onSaveTemplate) {
      return;
    }
    await onSaveTemplate(template);
    closeForm();
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!onDeleteTemplate || !templateId) {
      return;
    }
    await onDeleteTemplate(templateId);
  };

  const handleApplyTemplate = async (template, projectIds) => {
    if (!onApplyTemplate) {
      return;
    }
    await onApplyTemplate(template, projectIds);
  };

  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Project effort templates</h2>
          <p className="text-sm text-gray-500">
            Build reusable staffing assumptions and apply them across similar projects in one step.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openForm(null)}
          disabled={isReadOnly}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 ${
            isReadOnly
              ? "cursor-not-allowed bg-gray-300 focus:ring-gray-200"
              : "bg-purple-600 hover:bg-purple-700 focus:ring-purple-400"
          }`}
        >
          <Plus size={16} className="text-purple-100" />
          New template
        </button>
      </div>

      {summaries.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
          No templates yet. Create your first template to quickly populate staff effort across projects.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {summaries.map(({ template, totals, matchingProjectIds }) => (
            <div key={template.id || template.name} className="flex h-full flex-col justify-between rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {template.name}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {formatTemplateCriteria({
                        template,
                        projectTypes,
                        deliveryOptions: DELIVERY_OPTIONS,
                      }).map((chip, index) => (
                        <span
                          key={`${chip.label}-${index}`}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium ${
                            chip.tone === "type"
                              ? "bg-blue-100 text-blue-800"
                              : chip.tone === "size"
                              ? "bg-green-100 text-green-800"
                              : chip.tone === "delivery"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {chip.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openForm(template)}
                      disabled={isReadOnly}
                      className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                        isReadOnly
                          ? "cursor-not-allowed border-gray-200 text-gray-300"
                          : "border-blue-200 text-blue-600 hover:border-blue-300 hover:text-blue-700"
                      }`}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(template.id)}
                      disabled={isReadOnly}
                      className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                        isReadOnly
                          ? "cursor-not-allowed border-gray-200 text-gray-300"
                          : "border-red-200 text-red-600 hover:border-red-300 hover:text-red-700"
                      }`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {template.notes && (
                  <p className="text-xs text-gray-500">{template.notes}</p>
                )}

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">PM</p>
                    <p className="text-sm font-semibold text-gray-900">{totals.pm.toLocaleString()} hrs</p>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">Design</p>
                    <p className="text-sm font-semibold text-gray-900">{totals.design.toLocaleString()} hrs</p>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">Construction</p>
                    <p className="text-sm font-semibold text-gray-900">{totals.construction.toLocaleString()} hrs</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Users size={14} />
                  {matchingProjectIds.length} matching {matchingProjectIds.length === 1 ? "project" : "projects"}
                  {matchingProjectIds.length === 0 && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                      <AlertTriangle size={12} /> No matches yet
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => openApplyModal(template)}
                disabled={isReadOnly || normalizedTemplates.length === 0}
                className={`mt-4 inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                  isReadOnly
                    ? "cursor-not-allowed bg-gray-200 text-gray-500 focus:ring-gray-200"
                    : "bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-400"
                }`}
              >
                <SlidersHorizontal size={16} className="text-purple-100" />
                Apply template
              </button>
            </div>
          ))}
        </div>
      )}

      <TemplateFormModal
        isOpen={isFormOpen}
        onClose={closeForm}
        onSave={handleSaveTemplate}
        staffCategories={staffCategories}
        projectTypes={projectTypes}
        template={editingTemplate}
        isReadOnly={isReadOnly}
      />

      <ApplyTemplateModal
        isOpen={isApplyOpen}
        onClose={closeApplyModal}
        template={activeTemplate}
        projects={projects}
        projectTypes={projectTypes}
        onApply={handleApplyTemplate}
        isReadOnly={isReadOnly}
      />
    </section>
  );
};

export default ProjectEffortTemplatesPanel;
