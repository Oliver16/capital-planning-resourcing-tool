import { useState, useEffect, useCallback, useMemo } from "react";

let SQL = null;
let db = null;

// Initialize SQLite
const initSQL = async () => {
  if (!SQL) {
    const sqlModule = await import("sql.js");
    SQL = await sqlModule.default({
      locateFile: (file) => `https://sql.js.org/dist/${file}`,
    });
  }
  return SQL;
};

// Database schema
const createTables = (database) => {
  database.run(`
    CREATE TABLE IF NOT EXISTS project_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS funding_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS staff_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      hourly_rate REAL NOT NULL,
      pm_capacity INTEGER NOT NULL DEFAULT 0,
      design_capacity INTEGER NOT NULL DEFAULT 0,
      construction_capacity INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('project', 'program')),
      project_type_id INTEGER,
      funding_source_id INTEGER,

      total_budget REAL,
      design_budget REAL,
      construction_budget REAL,
      design_duration INTEGER,
      construction_duration INTEGER,
      design_start_date DATE,
      construction_start_date DATE,

      annual_budget REAL,
      design_budget_percent REAL,
      construction_budget_percent REAL,
      continuous_pm_hours INTEGER,
      continuous_design_hours INTEGER,
      continuous_construction_hours INTEGER,
      program_start_date DATE,
      program_end_date DATE,

      priority TEXT CHECK (priority IN ('High', 'Medium', 'Low')),
      description TEXT,
      delivery_type TEXT NOT NULL DEFAULT 'self-perform' CHECK (delivery_type IN ('self-perform','hybrid','consultant')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (project_type_id) REFERENCES project_types(id),
      FOREIGN KEY (funding_source_id) REFERENCES funding_sources(id)
    );
  `);

  try {
    database.run(
      "ALTER TABLE projects ADD COLUMN delivery_type TEXT DEFAULT 'self-perform'"
    );
    database.run(
      "UPDATE projects SET delivery_type = 'self-perform' WHERE delivery_type IS NULL"
    );
  } catch (error) {
    if (!error.message?.includes("duplicate column name")) {
      console.warn("Delivery type migration warning:", error);
    }
  }

  try {
    database.run(
      "ALTER TABLE projects ADD COLUMN continuous_pm_hours INTEGER DEFAULT 0"
    );
  } catch (error) {
    if (!error.message?.includes("duplicate column name")) {
      console.warn("Continuous PM hours migration warning:", error);
    }
  }

  database.run(`
    CREATE TABLE IF NOT EXISTS staff_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      pm_hours REAL DEFAULT 0,
      design_hours REAL DEFAULT 0,
      construction_hours REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES staff_categories(id) ON DELETE CASCADE,
      UNIQUE(project_id, category_id)
    );
  `);

  try {
    database.run(
      "ALTER TABLE staff_allocations ADD COLUMN pm_hours REAL DEFAULT 0"
    );
  } catch (error) {
    if (!error.message?.includes("duplicate column name")) {
      console.warn("PM hours migration warning:", error);
    }
  }

  database.run(`
    CREATE TABLE IF NOT EXISTS staff_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER,
      pm_availability REAL DEFAULT 0,
      design_availability REAL DEFAULT 0,
      construction_availability REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES staff_categories(id) ON DELETE SET NULL
    );
  `);
};

// Helper function to safely bind parameters
const safeBindParams = (params) => {
  return params.map((param) => {
    if (param === undefined || param === null) {
      return null;
    }

    if (typeof param === "number" && !Number.isFinite(param)) {
      return null;
    }

    return param;
  });
};

// Database operations
const DatabaseService = {
  async initDatabase() {
    if (!db) {
      await initSQL();

      // Try to load existing database from localStorage
      const savedDb = localStorage.getItem("capitalPlanningDB");
      if (savedDb) {
        try {
          const binaryArray = new Uint8Array(JSON.parse(savedDb));
          db = new SQL.Database(binaryArray);
        } catch (error) {
          console.warn(
            "Error loading saved database, creating new one:",
            error
          );
          db = new SQL.Database();
          createTables(db);
        }
      } else {
        db = new SQL.Database();
        createTables(db);
      }
    }
    return db;
  },

  async saveDatabase() {
    if (db) {
      try {
        const data = db.export();
        localStorage.setItem(
          "capitalPlanningDB",
          JSON.stringify(Array.from(data))
        );
      } catch (error) {
        console.error("Error saving database:", error);
      }
    }
  },

  // Projects
  async saveProject(project) {
    await this.initDatabase();

    try {
      if (project.id) {
        // Update existing project
        const stmt = db.prepare(`
          UPDATE projects SET
            name=?, type=?, project_type_id=?, funding_source_id=?,
            total_budget=?, design_budget=?, construction_budget=?,
            design_duration=?, construction_duration=?,
            design_start_date=?, construction_start_date=?,
            annual_budget=?, design_budget_percent=?, construction_budget_percent=?,
            continuous_pm_hours=?, continuous_design_hours=?, continuous_construction_hours=?,
            program_start_date=?, program_end_date=?,
            priority=?, description=?, delivery_type=?, updated_at=CURRENT_TIMESTAMP
          WHERE id=?
        `);

        const params = safeBindParams([
          project.name || "",
          project.type || "project",
          project.projectTypeId || null,
          project.fundingSourceId || null,
          project.totalBudget || null,
          project.designBudget || null,
          project.constructionBudget || null,
          project.designDuration || null,
          project.constructionDuration || null,
          project.designStartDate || null,
          project.constructionStartDate || null,
          project.annualBudget || null,
          project.designBudgetPercent || null,
          project.constructionBudgetPercent || null,
          project.continuousPmHours || null,
          project.continuousDesignHours || null,
          project.continuousConstructionHours || null,
          project.programStartDate || null,
          project.programEndDate || null,
          project.priority || "Medium",
          project.description || "",
          project.deliveryType || "self-perform",
          project.id,
        ]);

        stmt.run(params);
        stmt.free();
        await this.saveDatabase();
        return project.id;
      } else {
        // Insert new project
        const stmt = db.prepare(`
          INSERT INTO projects (
            name, type, project_type_id, funding_source_id,
            total_budget, design_budget, construction_budget,
            design_duration, construction_duration,
            design_start_date, construction_start_date,
            annual_budget, design_budget_percent, construction_budget_percent,
            continuous_pm_hours, continuous_design_hours, continuous_construction_hours,
            program_start_date, program_end_date,
            priority, description, delivery_type
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `);

        const params = safeBindParams([
          project.name || "",
          project.type || "project",
          project.projectTypeId || null,
          project.fundingSourceId || null,
          project.totalBudget || null,
          project.designBudget || null,
          project.constructionBudget || null,
          project.designDuration || null,
          project.constructionDuration || null,
          project.designStartDate || null,
          project.constructionStartDate || null,
          project.annualBudget || null,
          project.designBudgetPercent || null,
          project.constructionBudgetPercent || null,
          project.continuousPmHours || null,
          project.continuousDesignHours || null,
          project.continuousConstructionHours || null,
          project.programStartDate || null,
          project.programEndDate || null,
          project.priority || "Medium",
          project.description || "",
          project.deliveryType || "self-perform",
        ]);

        stmt.run(params);
        const newId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
        stmt.free();
        await this.saveDatabase();
        return newId;
      }
    } catch (error) {
      console.error("Error saving project:", error);
      throw error;
    }
  },

  async getProjects() {
    await this.initDatabase();
    try {
      const results = db.exec(`
        SELECT p.*, pt.name as project_type_name, pt.color as project_type_color,
               fs.name as funding_source_name
        FROM projects p
        LEFT JOIN project_types pt ON p.project_type_id = pt.id
        LEFT JOIN funding_sources fs ON p.funding_source_id = fs.id
        ORDER BY p.updated_at DESC
      `);

      if (!results.length) return [];

      return results[0].values.map((row) => {
        const cols = results[0].columns;
        const project = {};
        cols.forEach((col, index) => {
          if (col.includes("_")) {
            const camelCol = col.replace(/_([a-z])/g, (match, letter) =>
              letter.toUpperCase()
            );
            project[camelCol] = row[index];
          } else {
            project[col] = row[index];
          }
        });
        return project;
      });
    } catch (error) {
      console.error("Error getting projects:", error);
      return [];
    }
  },

  async deleteProject(id) {
    await this.initDatabase();
    try {
      const stmt = db.prepare("DELETE FROM projects WHERE id = ?");
      stmt.run([id]);
      stmt.free();
      await this.saveDatabase();
      return true;
    } catch (error) {
      console.error("Error deleting project:", error);
      throw error;
    }
  },

  // Staff Categories
  async saveStaffCategory(category) {
    await this.initDatabase();

    try {
      if (category.id) {
        const stmt = db.prepare(`
          UPDATE staff_categories SET
            name=?, hourly_rate=?, pm_capacity=?, design_capacity=?, construction_capacity=?,
            updated_at=CURRENT_TIMESTAMP
          WHERE id=?
        `);

        const params = safeBindParams([
          category.name || "",
          category.hourlyRate || 0,
          category.pmCapacity || 0,
          category.designCapacity || 0,
          category.constructionCapacity || 0,
          category.id,
        ]);

        stmt.run(params);
        stmt.free();
        await this.saveDatabase();
        return category.id;
      } else {
        const stmt = db.prepare(`
          INSERT INTO staff_categories (name, hourly_rate, pm_capacity, design_capacity, construction_capacity)
          VALUES (?,?,?,?,?)
        `);

        const params = safeBindParams([
          category.name || "",
          category.hourlyRate || 0,
          category.pmCapacity || 0,
          category.designCapacity || 0,
          category.constructionCapacity || 0,
        ]);

        stmt.run(params);
        const newId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
        stmt.free();
        await this.saveDatabase();
        return newId;
      }
    } catch (error) {
      console.error("Error saving staff category:", error);
      throw error;
    }
  },

  async getStaffCategories() {
    await this.initDatabase();
    try {
      const results = db.exec("SELECT * FROM staff_categories ORDER BY name");

      if (!results.length) return [];

      return results[0].values.map((row) => ({
        id: row[0],
        name: row[1],
        hourlyRate: row[2],
        pmCapacity: row[3],
        designCapacity: row[4],
        constructionCapacity: row[5],
        createdAt: row[6],
        updatedAt: row[7],
      }));
    } catch (error) {
      console.error("Error getting staff categories:", error);
      return [];
    }
  },

  async deleteStaffCategory(id) {
    await this.initDatabase();
    try {
      const stmt = db.prepare("DELETE FROM staff_categories WHERE id = ?");
      stmt.run([id]);
      stmt.free();
      await this.saveDatabase();
      return true;
    } catch (error) {
      console.error("Error deleting staff category:", error);
      throw error;
    }
  },

  // Project Types
  async saveProjectType(type) {
    await this.initDatabase();

    try {
      if (type.id) {
        const stmt = db.prepare(
          "UPDATE project_types SET name=?, color=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
        );
        const params = safeBindParams([
          type.name || "",
          type.color || "#3b82f6",
          type.id,
        ]);
        stmt.run(params);
        stmt.free();
        await this.saveDatabase();
        return type.id;
      } else {
        const stmt = db.prepare(
          "INSERT INTO project_types (name, color) VALUES (?,?)"
        );
        const params = safeBindParams([
          type.name || "",
          type.color || "#3b82f6",
        ]);
        stmt.run(params);
        const newId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
        stmt.free();
        await this.saveDatabase();
        return newId;
      }
    } catch (error) {
      console.error("Error saving project type:", error);
      throw error;
    }
  },

  async getProjectTypes() {
    await this.initDatabase();
    try {
      const results = db.exec("SELECT * FROM project_types ORDER BY name");

      if (!results.length) return [];

      return results[0].values.map((row) => ({
        id: row[0],
        name: row[1],
        color: row[2],
        createdAt: row[3],
        updatedAt: row[4],
      }));
    } catch (error) {
      console.error("Error getting project types:", error);
      return [];
    }
  },

  async deleteProjectType(id) {
    await this.initDatabase();
    try {
      const stmt = db.prepare("DELETE FROM project_types WHERE id = ?");
      stmt.run([id]);
      stmt.free();
      await this.saveDatabase();
      return true;
    } catch (error) {
      console.error("Error deleting project type:", error);
      throw error;
    }
  },

  // Funding Sources
  async saveFundingSource(source) {
    await this.initDatabase();

    try {
      if (source.id) {
        const stmt = db.prepare(
          "UPDATE funding_sources SET name=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
        );
        const params = safeBindParams([
          source.name || "",
          source.description || "",
          source.id,
        ]);
        stmt.run(params);
        stmt.free();
        await this.saveDatabase();
        return source.id;
      } else {
        const stmt = db.prepare(
          "INSERT INTO funding_sources (name, description) VALUES (?,?)"
        );
        const params = safeBindParams([
          source.name || "",
          source.description || "",
        ]);
        stmt.run(params);
        const newId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
        stmt.free();
        await this.saveDatabase();
        return newId;
      }
    } catch (error) {
      console.error("Error saving funding source:", error);
      throw error;
    }
  },

  async getFundingSources() {
    await this.initDatabase();
    try {
      const results = db.exec("SELECT * FROM funding_sources ORDER BY name");

      if (!results.length) return [];

      return results[0].values.map((row) => ({
        id: row[0],
        name: row[1],
        description: row[2],
        createdAt: row[3],
        updatedAt: row[4],
      }));
    } catch (error) {
      console.error("Error getting funding sources:", error);
      return [];
    }
  },

  async deleteFundingSource(id) {
    await this.initDatabase();
    try {
      const stmt = db.prepare("DELETE FROM funding_sources WHERE id = ?");
      stmt.run([id]);
      stmt.free();
      await this.saveDatabase();
      return true;
    } catch (error) {
      console.error("Error deleting funding source:", error);
      throw error;
    }
  },

  // Staff Allocations
  async saveStaffAllocation(allocation) {
    await this.initDatabase();

    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO staff_allocations
        (project_id, category_id, pm_hours, design_hours, construction_hours, updated_at)
        VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)
      `);

      const params = safeBindParams([
        allocation.projectId || 0,
        allocation.categoryId || 0,
        allocation.pmHours || 0,
        allocation.designHours || 0,
        allocation.constructionHours || 0,
      ]);

      stmt.run(params);
      stmt.free();
      await this.saveDatabase();
      return true;
    } catch (error) {
      console.error("Error saving staff allocation:", error);
      throw error;
    }
  },

  async getStaffAllocations() {
    await this.initDatabase();
    try {
      const results = db.exec(
        "SELECT id, project_id, category_id, pm_hours, design_hours, construction_hours, created_at, updated_at FROM staff_allocations"
      );

      if (!results.length) return [];

      return results[0].values.map((row) => ({
        id: row[0],
        projectId: row[1],
        categoryId: row[2],
        pmHours: row[3] ?? 0,
        designHours: row[4] ?? 0,
        constructionHours: row[5] ?? 0,
        createdAt: row[6],
        updatedAt: row[7],
      }));
    } catch (error) {
      console.error("Error getting staff allocations:", error);
      return [];
    }
  },

  // Staff Members
  async saveStaffMember(member) {
    await this.initDatabase();

    try {
      if (member.id) {
        const stmt = db.prepare(`
          UPDATE staff_members SET
            name=?, category_id=?, pm_availability=?, design_availability=?, construction_availability=?,
            updated_at=CURRENT_TIMESTAMP
          WHERE id=?
        `);

        const params = safeBindParams([
          member.name || "",
          member.categoryId || null,
          member.pmAvailability || 0,
          member.designAvailability || 0,
          member.constructionAvailability || 0,
          member.id,
        ]);

        stmt.run(params);
        stmt.free();
        await this.saveDatabase();
        return member.id;
      }

      const stmt = db.prepare(`
        INSERT INTO staff_members (name, category_id, pm_availability, design_availability, construction_availability)
        VALUES (?,?,?,?,?)
      `);

      const params = safeBindParams([
        member.name || "",
        member.categoryId || null,
        member.pmAvailability || 0,
        member.designAvailability || 0,
        member.constructionAvailability || 0,
      ]);

      stmt.run(params);
      const newId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
      stmt.free();
      await this.saveDatabase();
      return newId;
    } catch (error) {
      console.error("Error saving staff member:", error);
      throw error;
    }
  },

  async getStaffMembers() {
    await this.initDatabase();
    try {
      const results = db.exec(`
        SELECT id, name, category_id, pm_availability, design_availability, construction_availability
        FROM staff_members
        ORDER BY name COLLATE NOCASE
      `);

      if (!results.length) return [];

      return results[0].values.map((row) => ({
        id: row[0],
        name: row[1],
        categoryId: row[2],
        pmAvailability: row[3] ?? 0,
        designAvailability: row[4] ?? 0,
        constructionAvailability: row[5] ?? 0,
      }));
    } catch (error) {
      console.error("Error getting staff members:", error);
      return [];
    }
  },

  async deleteStaffMember(id) {
    await this.initDatabase();
    try {
      const stmt = db.prepare("DELETE FROM staff_members WHERE id = ?");
      stmt.run([id]);
      stmt.free();
      await this.saveDatabase();
      return true;
    } catch (error) {
      console.error("Error deleting staff member:", error);
      throw error;
    }
  },

  // Export/Import
  async exportDatabase() {
    await this.initDatabase();
    try {
      const data = db.export();
      return new Blob([data], { type: "application/x-sqlite3" });
    } catch (error) {
      console.error("Error exporting database:", error);
      throw error;
    }
  },

  async importDatabase(file) {
    try {
      await initSQL();
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      db = new SQL.Database(data);
      await this.saveDatabase();
      return true;
    } catch (error) {
      console.error("Error importing database:", error);
      throw error;
    }
  },
};

// Initialize with default data
const initializeDatabase = async (defaultData) => {
  try {
    await DatabaseService.initDatabase();

    // Check if database is empty
    const [projectTypes, fundingSources, staffCategories] = await Promise.all([
      DatabaseService.getProjectTypes(),
      DatabaseService.getFundingSources(),
      DatabaseService.getStaffCategories(),
    ]);

    if (
      projectTypes.length === 0 &&
      fundingSources.length === 0 &&
      staffCategories.length === 0
    ) {
      console.log("Initializing database with default data...");

      const projectTypeIdMap = {};
      const fundingSourceIdMap = {};
      const staffCategoryIdMap = {};

      // Insert project types
      for (const type of defaultData.projectTypes || []) {
        const { id: originalId, name, color } = type;
        const newId = await DatabaseService.saveProjectType({ name, color });
        if (originalId != null) {
          projectTypeIdMap[originalId] = newId;
        }
      }

      // Insert funding sources
      for (const source of defaultData.fundingSources || []) {
        const { id: originalId, name, description } = source;
        const newId = await DatabaseService.saveFundingSource({
          name,
          description,
        });
        if (originalId != null) {
          fundingSourceIdMap[originalId] = newId;
        }
      }

      // Insert staff categories
      for (const category of defaultData.staffCategories || []) {
        const {
          id: originalId,
          name,
          hourlyRate,
          pmCapacity,
          designCapacity,
          constructionCapacity,
        } = category;
        const newId = await DatabaseService.saveStaffCategory({
          name,
          hourlyRate,
          pmCapacity,
          designCapacity,
          constructionCapacity,
        });

        if (originalId != null) {
          staffCategoryIdMap[originalId] = newId;
        }
      }

      // Insert staff members
      for (const member of defaultData.staffMembers || []) {
        const { id: _originalId, categoryId, ...memberData } = member;
        await DatabaseService.saveStaffMember({
          ...memberData,
          categoryId: staffCategoryIdMap[categoryId] ?? categoryId ?? null,
        });
      }

      // Insert projects
      for (const project of defaultData.projects || []) {
        const { id: _originalId, ...projectData } = project;
        const mappedProject = {
          ...projectData,
          projectTypeId:
            projectTypeIdMap[project.projectTypeId] ?? project.projectTypeId,
          fundingSourceId:
            fundingSourceIdMap[project.fundingSourceId] ?? project.fundingSourceId,
        };
        await DatabaseService.saveProject(mappedProject);
      }

      console.log("Database initialized successfully");
    }

    return true;
  } catch (error) {
    console.error("Error initializing database:", error);
    return false;
  }
};

export const useDatabase = (defaultData) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);

  // Initialize database
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        await initializeDatabase(defaultData);
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        console.error("Database initialization error:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Database operations with error handling
  const withErrorHandling = useCallback((operation) => {
    return async (...args) => {
      try {
        return await operation(...args);
      } catch (err) {
        console.error("Database operation error:", err);
        setError(err.message);
        throw err;
      }
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const operations = useMemo(
    () => ({
      saveProject: withErrorHandling(
        DatabaseService.saveProject.bind(DatabaseService)
      ),
      getProjects: withErrorHandling(
        DatabaseService.getProjects.bind(DatabaseService)
      ),
      deleteProject: withErrorHandling(
        DatabaseService.deleteProject.bind(DatabaseService)
      ),
      saveStaffCategory: withErrorHandling(
        DatabaseService.saveStaffCategory.bind(DatabaseService)
      ),
      getStaffCategories: withErrorHandling(
        DatabaseService.getStaffCategories.bind(DatabaseService)
      ),
      deleteStaffCategory: withErrorHandling(
        DatabaseService.deleteStaffCategory.bind(DatabaseService)
      ),
      saveProjectType: withErrorHandling(
        DatabaseService.saveProjectType.bind(DatabaseService)
      ),
      getProjectTypes: withErrorHandling(
        DatabaseService.getProjectTypes.bind(DatabaseService)
      ),
      deleteProjectType: withErrorHandling(
        DatabaseService.deleteProjectType.bind(DatabaseService)
      ),
      saveFundingSource: withErrorHandling(
        DatabaseService.saveFundingSource.bind(DatabaseService)
      ),
      getFundingSources: withErrorHandling(
        DatabaseService.getFundingSources.bind(DatabaseService)
      ),
      deleteFundingSource: withErrorHandling(
        DatabaseService.deleteFundingSource.bind(DatabaseService)
      ),
      saveStaffAllocation: withErrorHandling(
        DatabaseService.saveStaffAllocation.bind(DatabaseService)
      ),
      getStaffAllocations: withErrorHandling(
        DatabaseService.getStaffAllocations.bind(DatabaseService)
      ),
      saveStaffMember: withErrorHandling(
        DatabaseService.saveStaffMember.bind(DatabaseService)
      ),
      getStaffMembers: withErrorHandling(
        DatabaseService.getStaffMembers.bind(DatabaseService)
      ),
      deleteStaffMember: withErrorHandling(
        DatabaseService.deleteStaffMember.bind(DatabaseService)
      ),
      exportDatabase: withErrorHandling(
        DatabaseService.exportDatabase.bind(DatabaseService)
      ),
      importDatabase: withErrorHandling(
        DatabaseService.importDatabase.bind(DatabaseService)
      ),
    }),
    [withErrorHandling]
  );

  return {
    // State
    isLoading,
    isInitialized,
    error,
    clearError,

    // Operations
    ...operations,
  };
};
