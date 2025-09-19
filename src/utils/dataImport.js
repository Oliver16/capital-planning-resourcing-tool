export const handleCSVImport = async (file, projects, setProjects) => {
  try {
    const text = await file.text();
    const lines = text.split("\n");
    const headers = lines[0].split(",");

    const importedProjects = lines
      .slice(1)
      .filter((line) => line.trim())
      .map((line, index) => {
        const values = line.split(",");
        const row = {};
        headers.forEach((header, i) => {
          row[header.trim()] = values[i]?.trim() || "";
        });

        return {
          id: Math.max(...projects.map((p) => p.id), 0) + index + 1,
          name:
            row["Project Name"] ||
            row["Name"] ||
            `Imported Project ${index + 1}`,
          type:
            row["Type"]?.toLowerCase() === "program" ? "program" : "project",
          projectTypeId: 1, // Default, user can change
          fundingSourceId: 1, // Default, user can change
          totalBudget: parseFloat(row["Total Budget"] || row["Budget"] || 0),
          designBudget: parseFloat(row["Design Budget"] || 0),
          constructionBudget: parseFloat(row["Construction Budget"] || 0),
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
          designBudgetPercent: parseFloat(row["Design %"] || 15),
          constructionBudgetPercent: parseFloat(row["Construction %"] || 85),
          programStartDate: row["Program Start"] || "2025-01-01",
          programEndDate: row["Program End"] || "2027-12-31",
        };
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

export const downloadCSVTemplate = () => {
  const templateData = [
    "Project Name,Type,Total Budget,Design Budget,Construction Budget,Design Duration,Construction Duration,Design Start,Construction Start,Priority,Description",
    "Sample Water Main Project,project,1500000,150000,1350000,4,10,2025-01-01,2025-05-01,High,Sample project description",
    "Distribution System Annual Program,program,750000,,,,,2025-01-01,2027-12-31,Medium,Ongoing distribution system improvements",
  ].join("\n");

  const blob = new Blob([templateData], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "CIP_Import_Template.csv";
  a.click();
  URL.revokeObjectURL(url);
};
