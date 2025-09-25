import React from "react";
import { X } from "lucide-react";
import { sanitizeHoursValue } from "../../utils/programStaffing";

const baseInputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2";
const programInputClass = `${baseInputClass} focus:border-purple-500 focus:ring-purple-200`;

const ProgramStaffingModal = ({
  isOpen,
  programName,
  staffCategories = [],
  config = {},
  onChange,
  onClose,
  onSave,
  onClear,
  hasExistingConfig,
}) => {
  if (!isOpen) {
    return null;
  }

  const sortedCategories = [...staffCategories].sort((a, b) => {
    const nameA = (a?.name || "").toLowerCase();
    const nameB = (b?.name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const totals = sortedCategories.reduce(
    (accumulator, category) => {
      const key = String(category.id);
      const entry = config?.[key];
      const pm = sanitizeHoursValue(entry?.pmHours);
      const design = sanitizeHoursValue(entry?.designHours);
      const construction = sanitizeHoursValue(entry?.constructionHours);

      accumulator.pm += pm;
      accumulator.design += design;
      accumulator.construction += construction;
      accumulator.total += pm + design + construction;

      if (pm > 0 || design > 0 || construction > 0) {
        accumulator.categories += 1;
      }

      return accumulator;
    },
    { pm: 0, design: 0, construction: 0, total: 0, categories: 0 }
  );

  const hasCategories = sortedCategories.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900">
              Configure staffing by category
            </h2>
            <p className="text-sm text-gray-500">
              Assign monthly PM, design, and construction hours for each staff
              category supporting <span className="font-medium text-gray-700">{programName || "this program"}</span>.
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

        <div className="max-h-[60vh] overflow-y-auto p-6 pt-4">
          {hasCategories ? (
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">Staff category</th>
                  <th className="px-3 py-2">PM hours</th>
                  <th className="px-3 py-2">Design hours</th>
                  <th className="px-3 py-2">Construction hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedCategories.map((category) => {
                  const key = String(category.id);
                  const entry = config?.[key] || {
                    pmHours: "",
                    designHours: "",
                    constructionHours: "",
                  };

                  return (
                    <tr key={category.id} className="text-gray-700">
                      <td className="px-3 py-3 font-medium text-gray-800">
                        {category.name}
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={entry.pmHours}
                          onChange={(event) =>
                            onChange?.(category.id, "pmHours", event.target.value)
                          }
                          className={`${programInputClass} w-full`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={entry.designHours}
                          onChange={(event) =>
                            onChange?.(category.id, "designHours", event.target.value)
                          }
                          className={`${programInputClass} w-full`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={entry.constructionHours}
                          onChange={(event) =>
                            onChange?.(
                              category.id,
                              "constructionHours",
                              event.target.value
                            )
                          }
                          className={`${programInputClass} w-full`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              No staff categories are available yet. Add categories in the People tab to configure detailed program staffing.
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 bg-gray-50 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 sm:grid-cols-4">
              <div>
                <div className="text-xs font-semibold uppercase text-gray-500">Total categories</div>
                <div className="text-lg font-semibold text-gray-900">{totals.categories}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-gray-500">PM hours</div>
                <div className="text-lg font-semibold text-gray-900">{totals.pm.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-gray-500">Design hours</div>
                <div className="text-lg font-semibold text-gray-900">{totals.design.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-gray-500">Construction hours</div>
                <div className="text-lg font-semibold text-gray-900">{totals.construction.toFixed(1)}</div>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onClear}
                disabled={!hasExistingConfig}
                className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition ${
                  hasExistingConfig
                    ? "border border-transparent bg-red-50 text-red-600 hover:bg-red-100"
                    : "cursor-not-allowed border border-transparent bg-gray-200 text-gray-500"
                }`}
              >
                Clear staffing
              </button>
              <button
                type="button"
                onClick={onSave}
                className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
              >
                Save configuration
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgramStaffingModal;
