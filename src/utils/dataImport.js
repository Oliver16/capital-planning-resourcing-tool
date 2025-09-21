import { normalizeProjectBudgetBreakdown } from "./projectBudgets";

const normalizeDeliveryType = (value) => {
  if (!value) {
    return "self-perform";
  }

  const normalized = value.toString().trim().toLowerCase();

  if (normalized.includes("consult")) {
    return "consultant";
  }

  if (normalized.includes("hybrid")) {
    return "hybrid";
  }

  if (normalized.includes("self")) {
    return "self-perform";
  }

  return "self-perform";
};

const normalizeCategoryName = (value = "") =>
  value.toString().toLowerCase().replace(/[^a-z0-9]+/g, "");

const sanitizeHourValue = (value) => {
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.round(parsed * 10) / 10;
};

const parseOptionalFloat = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const sumContinuousHours = (config = {}) => {
  return Object.values(config).reduce(
    (totals, entry = {}) => {
      const pm = Number(entry.pmHours);
      const design = Number(entry.designHours);
      const construction = Number(entry.constructionHours);

      totals.pm += Number.isFinite(pm) ? pm : 0;
      totals.design += Number.isFinite(design) ? design : 0;
      totals.construction += Number.isFinite(construction) ? construction : 0;

      return totals;
    },
    { pm: 0, design: 0, construction: 0 }
  );
};

export const handleCSVImport = async (
  file,
  projects,
  setProjects,
  staffCategories = []
) => {
  try {
    const text = await file.text();
    const lines = text.split("\n");
    const headers = lines[0].split(",");

    const categoryMap = new Map();
    (Array.isArray(staffCategories) ? staffCategories : []).forEach((category) => {
      if (!category || !category.name) return;
      categoryMap.set(normalizeCategoryName(category.name), category.id);
    });

    const importedProjects = lines
      .slice(1)
      .filter((line) => line.trim())
      .map((line, index) => {
        const values = line.split(",");
        const row = {};
        headers.forEach((header, i) => {
          row[header.trim()] = values[i]?.trim() || "";
        });

        const continuousHoursByCategory = {};
        Object.entries(row).forEach(([header, rawValue]) => {
          const normalizedHeader = header.toLowerCase();
          const match = normalizedHeader.match(
            /^(pm|design|construction)\s*hours\s*-\s*(.+)$/
          );
          if (!match) {
            return;
          }

          const [, discipline, categoryName] = match;
          const normalizedCategory = normalizeCategoryName(categoryName);
          if (!normalizedCategory) {
            return;
          }

          const categoryId = categoryMap.get(normalizedCategory);
          if (!categoryId) {
            return;
          }

          const fieldKey =
            discipline === "pm"
              ? "pmHours"
              : discipline === "design"
              ? "designHours"
              : "constructionHours";

          const sanitized = sanitizeHourValue(rawValue);
          if (sanitized <= 0) {
            return;
          }

          const entryKey = String(categoryId);
          const existingEntry = continuousHoursByCategory[entryKey] || {
            pmHours: 0,
            designHours: 0,
            constructionHours: 0,
          };

          continuousHoursByCategory[entryKey] = {
            ...existingEntry,
            [fieldKey]: sanitized,
          };
        });

        const totalsFromCategories = sumContinuousHours(
          continuousHoursByCategory
        );

        const type =
          row["Type"]?.toLowerCase() === "program" ? "program" : "project";

        const totalBudget = parseFloat(
          row["Total Budget"] || row["Budget"] || 0
        );
        const designBudget = parseFloat(row["Design Budget"] || 0);
        const constructionBudget = parseFloat(
          row["Construction Budget"] || 0
        );

        const rawDesignPercent = parseOptionalFloat(row["Design %"]);
        const rawConstructionPercent = parseOptionalFloat(row["Construction %"]);

        const designBudgetPercent =
          rawDesignPercent ?? (type === "program" ? 15 : null);
        const constructionBudgetPercent =
          rawConstructionPercent ?? (type === "program" ? 85 : null);

        return normalizeProjectBudgetBreakdown({
          id: Math.max(...projects.map((p) => p.id), 0) + index + 1,
          name:
            row["Project Name"] ||
            row["Name"] ||
            `Imported Project ${index + 1}`,
          type,
          projectTypeId: 1, // Default, user can change
          fundingSourceId: 1, // Default, user can change
          deliveryType: normalizeDeliveryType(row["Delivery Type"]),
          totalBudget,
          designBudget,
          constructionBudget,
          designDuration: parseInt(
            row["Design Duration"] || row["Design Months"] || 3
          ),
          constructionDuration: parseInt(
            row["Construction Duration"] || row["Construction Months"] || 12
          ),
          designStartDate:
            row["Design Start"] || row["Start Date"] || "2025-01-01",
          constructionStartDate:
            row["Construction Start"] || row["Start Date"] || "2025-06-01",
          priority: row["Priority"] || "Medium",
          description: row["Description"] || "",
          // Program-specific fields
          annualBudget: parseFloat(row["Annual Budget"] || 0),
          designBudgetPercent,
          constructionBudgetPercent,
          programStartDate: row["Program Start"] || "2025-01-01",
          programEndDate: row["Program End"] || "2027-12-31",
          continuousPmHours:
            totalsFromCategories.pm ||
            sanitizeHourValue(row["Continuous PM Hours"] || 0),
          continuousDesignHours:
            totalsFromCategories.design ||
            sanitizeHourValue(row["Continuous Design Hours"] || 0),
          continuousConstructionHours:
            totalsFromCategories.construction ||
            sanitizeHourValue(row["Continuous Construction Hours"] || 0),
          continuousHoursByCategory,
        });
      });

    setProjects([...projects, ...importedProjects]);
    alert(`Successfully imported ${importedProjects.length} projects/programs`);
  } catch (error) {
    alert("Error importing file. Please ensure it is in CSV format.");
    console.error("Import error:", error);
  }
};

export const exportData = (data) => {
  const exportData = {
    ...data,
    exportDate: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "capital_plan_data.json";
  a.click();
  URL.revokeObjectURL(url);
};

export const downloadCSVTemplate = (staffCategories = []) => {
  const fallbackCategories = [
    { name: "Project Manager" },
    { name: "Civil Engineer" },
    { name: "Construction Manager" },
  ];

  const categories = (Array.isArray(staffCategories) && staffCategories.length
    ? staffCategories
    : fallbackCategories
  ).filter((category) => category && category.name);

  const baseHeaders = [
    "Project Name",
    "Type",
    "Total Budget",
      "Design Budget",
      "Construction Budget",
      "Design Duration",
      "Construction Duration",
      "Design Start",
      "Construction Start",
      "Priority",
      "Description",
      "Delivery Type",
      "Annual Budget",
      "Design %",
      "Construction %",
    "Program Start",
    "Program End",
    "Continuous PM Hours",
    "Continuous Design Hours",
    "Continuous Construction Hours",
  ];

  const categoryHeaders = categories.flatMap((category) => [
    `PM Hours - ${category.name}`,
    `Design Hours - ${category.name}`,
    `Construction Hours - ${category.name}`,
  ]);

  const headers = [...baseHeaders, ...categoryHeaders];

  const templateRows = [
    headers,
    [
      "Sample Water Main Project",
      "project",
      "1500000",
      "150000",
      "1350000",
      "4",
      "10",
      "2025-01-01",
      "2025-05-01",
      "High",
      "Sample project description",
      "self-perform",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    [
      "Distribution System Annual Program",
      "program",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "Medium",
      "Ongoing distribution system improvements",
      "hybrid",
      "750000",
      "15",
      "85",
      "2025-01-01",
      "2027-12-31",
      "20",
      "30",
      "80",
      ...categories.flatMap((category, index) => {
        if (index === 0) {
          return ["20", "0", "0"];
        }
        if (index === 1) {
          return ["0", "30", "0"];
        }
        if (index === 2) {
          return ["0", "0", "80"];
        }
        return ["0", "0", "0"];
      }),
    ],
  ];

  const templateData = templateRows.map((row) => row.join(",")).join("\n");

  const blob = new Blob([templateData], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "CIP_Import_Template.csv";
  a.click();
  URL.revokeObjectURL(url);
};
