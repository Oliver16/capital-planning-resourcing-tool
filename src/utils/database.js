import Dexie from "dexie";

// Initialize IndexedDB database using Dexie (simpler than sql.js for this use case)
class CapitalPlanningDB extends Dexie {
  constructor() {
    super("CapitalPlanningDB");

    // Define schemas
    this.version(1).stores({
      projects:
        "++id, name, type, projectTypeId, fundingSourceId, totalBudget, designBudget, constructionBudget, designDuration, constructionDuration, designStartDate, constructionStartDate, priority, description, annualBudget, designBudgetPercent, constructionBudgetPercent, continuousDesignHours, continuousConstructionHours, programStartDate, programEndDate, createdAt, updatedAt",
      staffCategories:
        "++id, name, hourlyRate, designCapacity, constructionCapacity, createdAt, updatedAt",
      projectTypes: "++id, name, color, createdAt, updatedAt",
      fundingSources: "++id, name, description, createdAt, updatedAt",
      staffAllocations:
        "++id, projectId, categoryId, designHours, constructionHours, createdAt, updatedAt",
      appSettings: "key, value, updatedAt",
    });

    this.version(2)
      .stores({
        projects:
          "++id, name, type, projectTypeId, fundingSourceId, deliveryType, totalBudget, designBudget, constructionBudget, designDuration, constructionDuration, designStartDate, constructionStartDate, priority, description, annualBudget, designBudgetPercent, constructionBudgetPercent, continuousDesignHours, continuousConstructionHours, programStartDate, programEndDate, createdAt, updatedAt",
        staffCategories:
          "++id, name, hourlyRate, designCapacity, constructionCapacity, createdAt, updatedAt",
        projectTypes: "++id, name, color, createdAt, updatedAt",
        fundingSources: "++id, name, description, createdAt, updatedAt",
        staffAllocations:
          "++id, projectId, categoryId, designHours, constructionHours, createdAt, updatedAt",
        appSettings: "key, value, updatedAt",
      })
      .upgrade(async (tx) => {
        await tx.table("projects").toCollection().modify((project) => {
          project.deliveryType = project.deliveryType || "self-perform";
        });
      });

    this.version(3)
      .stores({
        projects:
          "++id, name, type, projectTypeId, fundingSourceId, deliveryType, totalBudget, designBudget, constructionBudget, designDuration, constructionDuration, designStartDate, constructionStartDate, priority, description, annualBudget, designBudgetPercent, constructionBudgetPercent, continuousDesignHours, continuousConstructionHours, programStartDate, programEndDate, createdAt, updatedAt",
        staffCategories:
          "++id, name, hourlyRate, designCapacity, constructionCapacity, createdAt, updatedAt",
        projectTypes: "++id, name, color, createdAt, updatedAt",
        fundingSources: "++id, name, description, createdAt, updatedAt",
        staffAllocations:
          "++id, projectId, categoryId, pmHours, designHours, constructionHours, createdAt, updatedAt",
        appSettings: "key, value, updatedAt",
      })
      .upgrade(async (tx) => {
        await tx
          .table("staffAllocations")
          .toCollection()
          .modify((allocation) => {
            allocation.pmHours = allocation.pmHours || 0;
          });
      });

    this.version(4)
      .stores({
        projects:
          "++id, name, type, projectTypeId, fundingSourceId, deliveryType, totalBudget, designBudget, constructionBudget, designDuration, constructionDuration, designStartDate, constructionStartDate, priority, description, annualBudget, designBudgetPercent, constructionBudgetPercent, continuousPmHours, continuousDesignHours, continuousConstructionHours, programStartDate, programEndDate, createdAt, updatedAt",
        staffCategories:
          "++id, name, hourlyRate, designCapacity, constructionCapacity, createdAt, updatedAt",
        projectTypes: "++id, name, color, createdAt, updatedAt",
        fundingSources: "++id, name, description, createdAt, updatedAt",
        staffAllocations:
          "++id, projectId, categoryId, pmHours, designHours, constructionHours, createdAt, updatedAt",
        appSettings: "key, value, updatedAt",
      })
      .upgrade(async (tx) => {
        await tx
          .table("projects")
          .toCollection()
          .modify((project) => {
            project.continuousPmHours = project.continuousPmHours || 0;
          });
      });

    this.version(5).stores({
      projects:
        "++id, name, type, projectTypeId, fundingSourceId, deliveryType, totalBudget, designBudget, constructionBudget, designDuration, constructionDuration, designStartDate, constructionStartDate, priority, description, annualBudget, designBudgetPercent, constructionBudgetPercent, continuousPmHours, continuousDesignHours, continuousConstructionHours, programStartDate, programEndDate, createdAt, updatedAt",
      staffCategories:
        "++id, name, hourlyRate, designCapacity, constructionCapacity, createdAt, updatedAt",
      projectTypes: "++id, name, color, createdAt, updatedAt",
      fundingSources: "++id, name, description, createdAt, updatedAt",
      staffAllocations:
        "++id,[projectId+categoryId],projectId,categoryId,pmHours,designHours,constructionHours,createdAt,updatedAt",
      staffAssignments:
        "++id,[projectId+staffId],projectId,staffId,pmHours,designHours,constructionHours,createdAt,updatedAt",
      appSettings: "key, value, updatedAt",
    });
  }
}

// Create database instance
export const db = new CapitalPlanningDB();

// Database operations
export const DatabaseService = {
  // Projects
  async saveProject(project) {
    const timestamp = new Date().toISOString();
    const projectData = {
      ...project,
      deliveryType: project.deliveryType || "self-perform",
      updatedAt: timestamp,
      createdAt: project.createdAt || timestamp,
    };

    if (project.id && (await db.projects.get(project.id))) {
      return await db.projects.update(project.id, projectData);
    } else {
      const { id, ...dataWithoutId } = projectData;
      return await db.projects.add(dataWithoutId);
    }
  },

  async getProjects() {
    return await db.projects.orderBy("updatedAt").reverse().toArray();
  },

  async deleteProject(id) {
    await db.projects.delete(id);
    // Also delete related staff allocations
    await db.staffAllocations.where("projectId").equals(id).delete();
    await db.staffAssignments.where("projectId").equals(id).delete();
  },

  // Staff Categories
  async saveStaffCategory(category) {
    const timestamp = new Date().toISOString();
    const categoryData = {
      ...category,
      updatedAt: timestamp,
      createdAt: category.createdAt || timestamp,
    };

    if (category.id && (await db.staffCategories.get(category.id))) {
      return await db.staffCategories.update(category.id, categoryData);
    } else {
      const { id, ...dataWithoutId } = categoryData;
      return await db.staffCategories.add(dataWithoutId);
    }
  },

  async getStaffCategories() {
    return await db.staffCategories.orderBy("name").toArray();
  },

  async deleteStaffCategory(id) {
    await db.staffCategories.delete(id);
    // Also delete related staff allocations
    await db.staffAllocations.where("categoryId").equals(id).delete();
  },

  // Project Types
  async saveProjectType(type) {
    const timestamp = new Date().toISOString();
    const typeData = {
      ...type,
      updatedAt: timestamp,
      createdAt: type.createdAt || timestamp,
    };

    if (type.id && (await db.projectTypes.get(type.id))) {
      return await db.projectTypes.update(type.id, typeData);
    } else {
      const { id, ...dataWithoutId } = typeData;
      return await db.projectTypes.add(dataWithoutId);
    }
  },

  async getProjectTypes() {
    return await db.projectTypes.orderBy("name").toArray();
  },

  async deleteProjectType(id) {
    return await db.projectTypes.delete(id);
  },

  // Funding Sources
  async saveFundingSource(source) {
    const timestamp = new Date().toISOString();
    const sourceData = {
      ...source,
      updatedAt: timestamp,
      createdAt: source.createdAt || timestamp,
    };

    if (source.id && (await db.fundingSources.get(source.id))) {
      return await db.fundingSources.update(source.id, sourceData);
    } else {
      const { id, ...dataWithoutId } = sourceData;
      return await db.fundingSources.add(dataWithoutId);
    }
  },

  async getFundingSources() {
    return await db.fundingSources.orderBy("name").toArray();
  },

  async deleteFundingSource(id) {
    return await db.fundingSources.delete(id);
  },

  // Staff Allocations
  async saveStaffAllocation(allocation) {
    const timestamp = new Date().toISOString();
    const allocationData = {
      ...allocation,
      pmHours: allocation.pmHours || 0,
      updatedAt: timestamp,
      createdAt: allocation.createdAt || timestamp,
    };

    // Check if allocation exists for this project/category combination
    const existing = await db.staffAllocations
      .where("[projectId+categoryId]")
      .equals([allocation.projectId, allocation.categoryId])
      .first();

    if (existing) {
      return await db.staffAllocations.update(existing.id, allocationData);
    } else {
      return await db.staffAllocations.add(allocationData);
    }
  },

  async getStaffAllocations() {
    const allocations = await db.staffAllocations.toArray();
    return allocations.map((allocation) => ({
      ...allocation,
      pmHours: allocation.pmHours || 0,
    }));
  },

  async deleteStaffAllocation(projectId, categoryId) {
    return await db.staffAllocations
      .where("[projectId+categoryId]")
      .equals([projectId, categoryId])
      .delete();
  },

  // Staff Assignments
  async saveStaffAssignment(assignment) {
    const timestamp = new Date().toISOString();
    const assignmentData = {
      ...assignment,
      pmHours: assignment.pmHours || 0,
      designHours: assignment.designHours || 0,
      constructionHours: assignment.constructionHours || 0,
      updatedAt: timestamp,
      createdAt: assignment.createdAt || timestamp,
    };

    const existing = await db.staffAssignments
      .where("[projectId+staffId]")
      .equals([assignment.projectId, assignment.staffId])
      .first();

    if (existing) {
      return await db.staffAssignments.update(existing.id, assignmentData);
    }

    return await db.staffAssignments.add(assignmentData);
  },

  async getStaffAssignments() {
    const assignments = await db.staffAssignments.toArray();
    return assignments.map((assignment) => ({
      ...assignment,
      pmHours: assignment.pmHours || 0,
      designHours: assignment.designHours || 0,
      constructionHours: assignment.constructionHours || 0,
    }));
  },

  async deleteStaffAssignment(projectId, staffId) {
    return await db.staffAssignments
      .where("[projectId+staffId]")
      .equals([projectId, staffId])
      .delete();
  },

  // Bulk operations
  async saveAllData(data) {
    try {
      await db.transaction(
        "rw",
        db.projects,
        db.staffCategories,
        db.projectTypes,
        db.fundingSources,
        db.staffAllocations,
        db.staffAssignments,
        async () => {
          // Clear existing data
          await db.projects.clear();
          await db.staffCategories.clear();
          await db.projectTypes.clear();
          await db.fundingSources.clear();
          await db.staffAllocations.clear();
          await db.staffAssignments.clear();

          // Add new data
          if (data.projects) {
            for (const project of data.projects) {
              await this.saveProject(project);
            }
          }

          if (data.staffCategories) {
            for (const category of data.staffCategories) {
              await this.saveStaffCategory(category);
            }
          }

          if (data.projectTypes) {
            for (const type of data.projectTypes) {
              await this.saveProjectType(type);
            }
          }

          if (data.fundingSources) {
            for (const source of data.fundingSources) {
              await this.saveFundingSource(source);
            }
          }

          if (data.staffAllocations) {
            for (const projectId of Object.keys(data.staffAllocations)) {
              for (const categoryId of Object.keys(
                data.staffAllocations[projectId]
              )) {
                const allocation =
                  data.staffAllocations[projectId][categoryId];
                await this.saveStaffAllocation({
                  projectId: parseInt(projectId, 10),
                  categoryId: parseInt(categoryId, 10),
                  pmHours: allocation.pmHours || 0,
                  designHours: allocation.designHours || 0,
                  constructionHours: allocation.constructionHours || 0,
                });
              }
            }
          }

          if (data.staffAssignments) {
            for (const projectId of Object.keys(data.staffAssignments)) {
              for (const staffId of Object.keys(
                data.staffAssignments[projectId]
              )) {
                const assignment =
                  data.staffAssignments[projectId][staffId];
                await this.saveStaffAssignment({
                  projectId: parseInt(projectId, 10),
                  staffId: parseInt(staffId, 10),
                  pmHours: assignment.pmHours || 0,
                  designHours: assignment.designHours || 0,
                  constructionHours: assignment.constructionHours || 0,
                });
              }
            }
          }
        }
      );
      return true;
    } catch (error) {
      console.error("Error saving data:", error);
      return false;
    }
  },

  async getAllData() {
    try {
      const [
        projects,
        staffCategories,
        projectTypes,
        fundingSources,
        allocationsArray,
        assignmentsArray,
      ] = await Promise.all([
        this.getProjects(),
        this.getStaffCategories(),
        this.getProjectTypes(),
        this.getFundingSources(),
        this.getStaffAllocations(),
        this.getStaffAssignments(),
      ]);

      // Convert allocations array back to object format
      const staffAllocations = {};
      allocationsArray.forEach((allocation) => {
        if (!staffAllocations[allocation.projectId]) {
          staffAllocations[allocation.projectId] = {};
        }
        staffAllocations[allocation.projectId][allocation.categoryId] = {
          designHours: allocation.designHours || 0,
          constructionHours: allocation.constructionHours || 0,
        };
      });

      const staffAssignments = {};
      assignmentsArray.forEach((assignment) => {
        if (!staffAssignments[assignment.projectId]) {
          staffAssignments[assignment.projectId] = {};
        }
        staffAssignments[assignment.projectId][assignment.staffId] = {
          pmHours: assignment.pmHours || 0,
          designHours: assignment.designHours || 0,
          constructionHours: assignment.constructionHours || 0,
        };
      });

      return {
        projects,
        staffCategories,
        projectTypes,
        fundingSources,
        staffAllocations,
        staffAssignments,
      };
    } catch (error) {
      console.error("Error loading data:", error);
      return null;
    }
  },

  // Database maintenance
  async clearAllData() {
    try {
      await db.transaction(
        "rw",
        db.projects,
        db.staffCategories,
        db.projectTypes,
        db.fundingSources,
        db.staffAllocations,
        db.staffAssignments,
        async () => {
          await db.projects.clear();
          await db.staffCategories.clear();
          await db.projectTypes.clear();
          await db.fundingSources.clear();
          await db.staffAllocations.clear();
          await db.staffAssignments.clear();
        }
      );
      return true;
    } catch (error) {
      console.error("Error clearing data:", error);
      return false;
    }
  },

  async exportDatabase() {
    const data = await this.getAllData();
    return {
      ...data,
      exportDate: new Date().toISOString(),
      version: "1.0",
    };
  },

  async importDatabase(data) {
    return await this.saveAllData(data);
  },

  // Database info
  async getDatabaseInfo() {
    const [
      projectCount,
      categoryCount,
      typeCount,
      sourceCount,
      allocationCount,
    ] = await Promise.all([
      db.projects.count(),
      db.staffCategories.count(),
      db.projectTypes.count(),
      db.fundingSources.count(),
      db.staffAllocations.count(),
    ]);

    return {
      projectCount,
      categoryCount,
      typeCount,
      sourceCount,
      allocationCount,
      databaseSize: await this.getDatabaseSize(),
    };
  },

  async getDatabaseSize() {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage,
          available: estimate.quota,
          usedMB: (estimate.usage / (1024 * 1024)).toFixed(2),
          availableMB: (estimate.quota / (1024 * 1024)).toFixed(2),
        };
      }
      return null;
    } catch (error) {
      console.error("Error getting database size:", error);
      return null;
    }
  },
};

// Initialize database with default data if empty
export const initializeDatabase = async (defaultData) => {
  try {
    const projectCount = await db.projects.count();

    if (projectCount === 0) {
      console.log("Initializing database with default data...");
      await DatabaseService.saveAllData(defaultData);
      console.log("Database initialized successfully");
    }

    return true;
  } catch (error) {
    console.error("Error initializing database:", error);
    return false;
  }
};
