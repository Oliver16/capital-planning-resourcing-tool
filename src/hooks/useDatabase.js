import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { normalizeProjectBudgetBreakdown } from '../utils/projectBudgets';
import {
  sanitizeExistingDebtInstrumentList,
  sanitizeExistingDebtManualTotals,
  normalizeBudgetRow,
} from '../utils/financialModeling';

const toCamelCaseKey = (key) =>
  key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const camelizeRecord = (record) => {
  if (!record || typeof record !== 'object') {
    return record;
  }

  return Object.entries(record).reduce((accumulator, [key, value]) => {
    accumulator[toCamelCaseKey(key)] = value;
    return accumulator;
  }, {});
};

const parseJsonField = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch (error) {
      console.warn('Unable to parse JSON field', error);
      return fallback;
    }
  }

  return fallback;
};

const serializeContinuousConfig = (config) => {
  if (!config || typeof config !== 'object') {
    return null;
  }

  const keys = Object.keys(config);
  if (!keys.length) {
    return null;
  }

  return JSON.stringify(config);
};

const normalizeNullable = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }
    return trimmed;
  }

  if (Number.isNaN(value)) {
    return null;
  }

  return value;
};

const projectFromRow = (row) => {
  const camel = camelizeRecord(row);
  camel.continuousHoursByCategory = parseJsonField(
    camel.continuousHoursByCategory,
    {}
  );
  return normalizeProjectBudgetBreakdown(camel);
};

const projectToRow = (project, organizationId) => {
  const normalizedProject = normalizeProjectBudgetBreakdown(project);

  return {
    organization_id: organizationId,
    name: normalizedProject.name || '',
    type: normalizedProject.type || 'project',
    project_type_id: normalizeNullable(normalizedProject.projectTypeId),
    funding_source_id: normalizeNullable(normalizedProject.fundingSourceId),
    total_budget: normalizeNullable(normalizedProject.totalBudget),
    design_budget: normalizeNullable(normalizedProject.designBudget),
    construction_budget: normalizeNullable(normalizedProject.constructionBudget),
    design_duration: normalizeNullable(normalizedProject.designDuration),
    construction_duration: normalizeNullable(normalizedProject.constructionDuration),
    design_start_date: normalizedProject.designStartDate || null,
    construction_start_date: normalizedProject.constructionStartDate || null,
    annual_budget: normalizeNullable(normalizedProject.annualBudget),
    design_budget_percent: normalizeNullable(
      normalizedProject.designBudgetPercent
    ),
    construction_budget_percent: normalizeNullable(
      normalizedProject.constructionBudgetPercent
    ),
    continuous_pm_hours: normalizeNullable(normalizedProject.continuousPmHours),
    continuous_design_hours: normalizeNullable(
      normalizedProject.continuousDesignHours
    ),
    continuous_construction_hours: normalizeNullable(
      normalizedProject.continuousConstructionHours
    ),
    continuous_hours_by_category: serializeContinuousConfig(
      normalizedProject.continuousHoursByCategory
    ),
    program_start_date: normalizedProject.programStartDate || null,
    program_end_date: normalizedProject.programEndDate || null,
    priority: normalizedProject.priority || 'Medium',
    description: normalizedProject.description || '',
    delivery_type: normalizedProject.deliveryType || 'self-perform',
  };
};

const staffCategoryFromRow = (row) => camelizeRecord(row);

const staffCategoryToRow = (category, organizationId) => ({
  organization_id: organizationId,
  name: category.name || '',
  hourly_rate: normalizeNullable(category.hourlyRate) ?? 0,
  pm_capacity: normalizeNullable(category.pmCapacity) ?? 0,
  design_capacity: normalizeNullable(category.designCapacity) ?? 0,
  construction_capacity: normalizeNullable(category.constructionCapacity) ?? 0,
});

const staffMemberFromRow = (row) => camelizeRecord(row);

const staffMemberToRow = (member, organizationId) => ({
  organization_id: organizationId,
  name: member.name || '',
  category_id: normalizeNullable(member.categoryId),
  pm_availability: normalizeNullable(member.pmAvailability) ?? 0,
  design_availability: normalizeNullable(member.designAvailability) ?? 0,
  construction_availability: normalizeNullable(member.constructionAvailability) ?? 0,
});

const staffAllocationFromRow = (row) => camelizeRecord(row);

const staffAllocationToRow = (allocation, organizationId) => ({
  organization_id: organizationId,
  project_id: normalizeNullable(allocation.projectId),
  category_id: normalizeNullable(allocation.categoryId),
  pm_hours: normalizeNullable(allocation.pmHours) ?? 0,
  design_hours: normalizeNullable(allocation.designHours) ?? 0,
  construction_hours: normalizeNullable(allocation.constructionHours) ?? 0,
});

const staffAssignmentFromRow = (row) => camelizeRecord(row);

const staffAssignmentToRow = (assignment, organizationId) => ({
  organization_id: organizationId,
  project_id: normalizeNullable(assignment.projectId),
  staff_id: normalizeNullable(assignment.staffId),
  pm_hours: normalizeNullable(assignment.pmHours) ?? 0,
  design_hours: normalizeNullable(assignment.designHours) ?? 0,
  construction_hours: normalizeNullable(assignment.constructionHours) ?? 0,
});

const UTILITY_KEYS = new Set(['water', 'sewer', 'power', 'gas', 'stormwater']);

const normalizeUtilityKey = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return UTILITY_KEYS.has(normalized) ? normalized : null;
};

const sanitizeFinancialConfig = (rawConfig = {}) => {
  const currentYear = new Date().getFullYear();
  const startYear = Number(rawConfig.startYear);
  const projectionYears = Number(rawConfig.projectionYears);
  const startingCashBalance = Number(rawConfig.startingCashBalance);
  const targetCoverageRatio = Number(rawConfig.targetCoverageRatio);

  return {
    startYear: Number.isFinite(startYear) ? startYear : currentYear,
    projectionYears: Number.isFinite(projectionYears) && projectionYears > 0
      ? Math.round(projectionYears)
      : 10,
    startingCashBalance: Number.isFinite(startingCashBalance) ? startingCashBalance : 0,
    targetCoverageRatio: Number.isFinite(targetCoverageRatio) ? targetCoverageRatio : 1.5,
  };
};

const sanitizeBudgetEscalations = (rawEscalations = {}) => {
  if (!rawEscalations || typeof rawEscalations !== 'object') {
    return {};
  }

  return Object.entries(rawEscalations).reduce((accumulator, [key, value]) => {
    if (!key) {
      return accumulator;
    }
    const numeric = Number(value);
    accumulator[key] = Number.isFinite(numeric) ? numeric : 0;
    return accumulator;
  }, {});
};

const utilityProfileFromRow = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    utilityKey: normalizeUtilityKey(row.utility_key),
    financialConfig: sanitizeFinancialConfig(parseJsonField(row.financial_config, {})),
    budgetEscalations: sanitizeBudgetEscalations(parseJsonField(row.budget_escalations, {})),
    existingDebtManualTotals: sanitizeExistingDebtManualTotals(
      parseJsonField(row.existing_debt_manual_totals, {})
    ),
    existingDebtInstruments: sanitizeExistingDebtInstrumentList(
      parseJsonField(row.existing_debt_instruments, [])
    ),
  };
};

const utilityProfileToRow = (organizationId, utilityKey, profile = {}) => {
  const normalizedKey = normalizeUtilityKey(utilityKey);
  const financialConfig = sanitizeFinancialConfig(profile.financialConfig || {});
  const budgetEscalations = sanitizeBudgetEscalations(profile.budgetEscalations || {});
  const manualTotals = sanitizeExistingDebtManualTotals(
    profile.existingDebtManualTotals || {}
  );
  const instruments = sanitizeExistingDebtInstrumentList(
    profile.existingDebtInstruments || []
  );

  return {
    organization_id: organizationId,
    utility_key: normalizedKey,
    financial_config: JSON.stringify(financialConfig),
    budget_escalations: JSON.stringify(budgetEscalations),
    existing_debt_manual_totals: JSON.stringify(manualTotals),
    existing_debt_instruments: JSON.stringify(instruments),
  };
};

const operatingBudgetFromRow = (row) => {
  if (!row) {
    return null;
  }

  const revenueLineItems = parseJsonField(row.revenue_line_items, null);
  const expenseLineItems = parseJsonField(row.expense_line_items, null);

  let normalized = normalizeBudgetRow({
    year: row.fiscal_year,
    revenueLineItems,
    expenseLineItems,
    rateIncreasePercent: row.rate_increase_percent,
    existingDebtService: row.existing_debt_service,
  });

  const hasRevenueDetail = Array.isArray(revenueLineItems) && revenueLineItems.length > 0;
  const hasExpenseDetail = Array.isArray(expenseLineItems) && expenseLineItems.length > 0;

  if (!hasRevenueDetail) {
    const operatingRevenue = Number(row.operating_revenue) || 0;
    const nonOperatingRevenue = Number(row.non_operating_revenue) || 0;
    const adjustedRevenue = normalized.revenueLineItems.map((item) => {
      if (item.id === 'utilitySales') {
        return { ...item, amount: operatingRevenue };
      }
      if (item.id === 'nonOperatingRevenue') {
        return { ...item, amount: nonOperatingRevenue };
      }
      return { ...item, amount: 0 };
    });
    normalized = normalizeBudgetRow({
      ...normalized,
      revenueLineItems: adjustedRevenue,
    });
  }

  if (!hasExpenseDetail) {
    const omExpenses = Number(row.om_expenses) || 0;
    const salaries = Number(row.salaries) || 0;
    const adminExpenses = Number(row.admin_expenses) || 0;
    const adjustedExpenses = normalized.expenseLineItems.map((item) => {
      if (item.id === 'operationsMaintenance') {
        return { ...item, amount: omExpenses };
      }
      if (item.id === 'plantPayroll') {
        return { ...item, amount: salaries };
      }
      if (item.id === 'otherAdministrative') {
        return { ...item, amount: adminExpenses };
      }
      return { ...item, amount: 0 };
    });
    normalized = normalizeBudgetRow({
      ...normalized,
      expenseLineItems: adjustedExpenses,
    });
  }

  return normalized;
};

const operatingBudgetToRow = (organizationId, utilityKey, row) => ({
  const normalized = normalizeBudgetRow(row);
  const revenueItems = Array.isArray(normalized.revenueLineItems)
    ? normalized.revenueLineItems
    : [];
  const expenseItems = Array.isArray(normalized.expenseLineItems)
    ? normalized.expenseLineItems
    : [];

  const sumByIds = (items, ids) =>
    items.reduce((sum, item) => {
      if (!item || !ids.includes(item.id)) {
        return sum;
      }
      const amount = Number(item.amount);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

  const omExpenses = sumByIds(expenseItems, [
    'purchasedSupplyProduction',
    'purchasedEnergy',
    'chemicalsSupplies',
    'testingLabServices',
    'plantUtilities',
    'operationsMaintenance',
    'distributionPlant',
    'repairsMaintenance',
    'vehiclesFuel',
    'toolsUniformsEquipment',
  ]);
  const salaryExpenses = sumByIds(expenseItems, ['plantPayroll', 'administrativeSalaries']);
  const adminExpenses = sumByIds(expenseItems, [
    'employeeBenefits',
    'payrollTaxes',
    'insurance',
    'otherAdministrative',
  ]);

  return {
    organization_id: organizationId,
    utility_key: normalizeUtilityKey(utilityKey),
    fiscal_year: Number(normalized.year),
    operating_revenue: normalizeNullable(normalized.operatingRevenue) ?? 0,
    non_operating_revenue: normalizeNullable(normalized.nonOperatingRevenue) ?? 0,
    om_expenses: normalizeNullable(omExpenses) ?? 0,
    salaries: normalizeNullable(salaryExpenses) ?? 0,
    admin_expenses: normalizeNullable(adminExpenses) ?? 0,
    existing_debt_service: normalizeNullable(normalized.existingDebtService) ?? 0,
    rate_increase_percent: normalizeNullable(normalized.rateIncreasePercent) ?? 0,
    revenue_line_items: JSON.stringify(revenueItems),
    expense_line_items: JSON.stringify(expenseItems),
  };
};

const projectTypeUtilityFromRow = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    projectTypeId: row.project_type_id,
    utilityKey: normalizeUtilityKey(row.utility_key),
  };
};

const projectTypeUtilityToRow = (organizationId, projectTypeId, utilityKey) => ({
  organization_id: organizationId,
  project_type_id: projectTypeId,
  utility_key: normalizeUtilityKey(utilityKey),
});

const fundingAssumptionFromRow = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    fundingSourceId: row.funding_source_id,
    sourceName: row.source_name || '',
    financingType: row.financing_type || 'cash',
    interestRate: Number(row.interest_rate) || 0,
    termYears: Number(row.term_years) || 0,
  };
};

const fundingAssumptionToRow = (organizationId, assumption) => ({
  organization_id: organizationId,
  funding_source_id: assumption.fundingSourceId,
  source_name: assumption.sourceName || null,
  financing_type: assumption.financingType || 'cash',
  interest_rate: normalizeNullable(assumption.interestRate) ?? 0,
  term_years: normalizeNullable(assumption.termYears) ?? 0,
});

const buildErrorMessage = (error, fallback) =>
  error?.message || fallback || 'Unexpected database error.';

export const useDatabase = (defaultData = {}) => {
  const { activeOrganizationId, canEditActiveOrg, authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);

  const organizationId = activeOrganizationId;

  const assertReady = useCallback(() => {
    if (!supabase) {
      const message =
        'Supabase client is not configured. Ensure Supabase URL and anon key environment variables are provided.';
      setError(message);
      throw new Error(message);
    }

    if (!organizationId) {
      throw new Error('No active organization selected.');
    }
  }, [organizationId]);

  const assertCanEdit = useCallback(() => {
    if (!canEditActiveOrg) {
      throw new Error('You do not have permission to modify this organization.');
    }
  }, [canEditActiveOrg]);

  const ensureSeedData = useCallback(async () => {
    if (!defaultData || !organizationId || !supabase) {
      return;
    }

    const ensureEntries = async (table, builder) => {
      const { count, error: countError } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (countError) {
        throw countError;
      }

      if ((count ?? 0) > 0) {
        const { data, error: fetchError } = await supabase
          .from(table)
          .select('*')
          .eq('organization_id', organizationId);

        if (fetchError) {
          throw fetchError;
        }

        return data || [];
      }

      const payload = builder();
      if (!payload || !payload.length) {
        return [];
      }

      const { data, error: insertError } = await supabase
        .from(table)
        .insert(payload)
        .select();

      if (insertError) {
        throw insertError;
      }

      return data || [];
    };

    const projectTypes = await ensureEntries('project_types', () =>
      (defaultData.projectTypes || []).map((type) => ({
        organization_id: organizationId,
        name: type.name,
        color: type.color,
      }))
    );

    const fundingSources = await ensureEntries('funding_sources', () =>
      (defaultData.fundingSources || []).map((source) => ({
        organization_id: organizationId,
        name: source.name,
        description: source.description || null,
      }))
    );

    const staffCategories = await ensureEntries('staff_categories', () =>
      (defaultData.staffCategories || []).map((category) => ({
        organization_id: organizationId,
        name: category.name,
        hourly_rate: category.hourlyRate ?? 0,
        pm_capacity: category.pmCapacity ?? 0,
        design_capacity: category.designCapacity ?? 0,
        construction_capacity: category.constructionCapacity ?? 0,
      }))
    );

    const categoryIdByName = new Map(
      (staffCategories || []).map((category) => [category.name, category.id])
    );
    const projectTypeIdByName = new Map(
      (projectTypes || []).map((type) => [type.name, type.id])
    );
    const fundingSourceIdByName = new Map(
      (fundingSources || []).map((source) => [source.name, source.id])
    );

    await ensureEntries('staff_members', () =>
      (defaultData.staffMembers || []).map((member) => ({
        organization_id: organizationId,
        name: member.name,
        category_id: member.categoryId
          ? categoryIdByName.get(
              (defaultData.staffCategories || []).find(
                (category) => String(category.id) === String(member.categoryId)
              )?.name || ''
            ) || null
          : null,
        pm_availability: member.pmAvailability ?? 0,
        design_availability: member.designAvailability ?? 0,
        construction_availability: member.constructionAvailability ?? 0,
      }))
    );

    await ensureEntries('projects', () =>
      (defaultData.projects || []).map((project) => {
        const normalizedProject = normalizeProjectBudgetBreakdown(project);

        const projectTypeName = (defaultData.projectTypes || []).find(
          (type) => String(type.id) === String(normalizedProject.projectTypeId)
        )?.name;
        const fundingSourceName = (defaultData.fundingSources || []).find(
          (source) => String(source.id) === String(normalizedProject.fundingSourceId)
        )?.name;

        const remappedContinuous = {};
        if (
          normalizedProject.type === 'program' &&
          normalizedProject.continuousHoursByCategory &&
          typeof normalizedProject.continuousHoursByCategory === 'object'
        ) {
          Object.entries(normalizedProject.continuousHoursByCategory).forEach(
            ([key, value]) => {
              const categoryName = (defaultData.staffCategories || []).find(
                (category) => String(category.id) === String(key)
              )?.name;
              const categoryId = categoryName
                ? categoryIdByName.get(categoryName)
                : null;

              if (categoryId && value && typeof value === 'object') {
                remappedContinuous[categoryId] = value;
              }
            }
          );
        }

        return {
          organization_id: organizationId,
          name: normalizedProject.name,
          type: normalizedProject.type || 'project',
          project_type_id: projectTypeName
            ? projectTypeIdByName.get(projectTypeName) || null
            : null,
          funding_source_id: fundingSourceName
            ? fundingSourceIdByName.get(fundingSourceName) || null
            : null,
          total_budget: normalizedProject.totalBudget ?? null,
          design_budget: normalizedProject.designBudget ?? null,
          construction_budget: normalizedProject.constructionBudget ?? null,
          design_duration: normalizedProject.designDuration ?? null,
          construction_duration: normalizedProject.constructionDuration ?? null,
          design_start_date: normalizedProject.designStartDate || null,
          construction_start_date: normalizedProject.constructionStartDate || null,
          annual_budget: normalizedProject.annualBudget ?? null,
          design_budget_percent: normalizedProject.designBudgetPercent ?? null,
          construction_budget_percent:
            normalizedProject.constructionBudgetPercent ?? null,
          continuous_pm_hours: normalizedProject.continuousPmHours ?? null,
          continuous_design_hours: normalizedProject.continuousDesignHours ?? null,
          continuous_construction_hours:
            normalizedProject.continuousConstructionHours ?? null,
          continuous_hours_by_category:
            Object.keys(remappedContinuous).length > 0
              ? JSON.stringify(remappedContinuous)
              : null,
          program_start_date: normalizedProject.programStartDate || null,
          program_end_date: normalizedProject.programEndDate || null,
          priority: normalizedProject.priority || 'Medium',
          description: normalizedProject.description || '',
          delivery_type: normalizedProject.deliveryType || 'self-perform',
        };
      })
    );
  }, [defaultData, organizationId]);

  useEffect(() => {
    let cancelled = false;

    const initialise = async () => {
      if (authLoading) {
        return;
      }

      if (!supabase || !organizationId) {
        setIsInitialized(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        await ensureSeedData();
        if (!cancelled) {
          setIsInitialized(true);
          setError(null);
        }
      } catch (initializationError) {
        if (!cancelled) {
          setIsInitialized(false);
          setError(buildErrorMessage(initializationError, 'Failed to initialise data.'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    initialise();

    return () => {
      cancelled = true;
    };
  }, [authLoading, organizationId, ensureSeedData]);

  const clearError = useCallback(() => setError(null), []);

  const saveProject = useCallback(
    async (project) => {
      assertReady();
      assertCanEdit();

      const payload = projectToRow(project, organizationId);
      const { organization_id, ...updatePayload } = payload;

      if (project.id) {
        const { error: updateError } = await supabase
          .from('projects')
          .update(updatePayload)
          .eq('id', project.id)
          .eq('organization_id', organizationId);

        if (updateError) {
          throw updateError;
        }

        return project.id;
      }

      const { data, error: insertError } = await supabase
        .from('projects')
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return data?.id;
    },
    [organizationId, assertReady, assertCanEdit]
  );

  const getProjects = useCallback(async () => {
    assertReady();
    const { data, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    return (data || []).map(projectFromRow);
  }, [organizationId, assertReady]);

  const deleteProject = useCallback(
    async (id) => {
      assertReady();
      assertCanEdit();

      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (deleteError) {
        throw deleteError;
      }

      return true;
    },
    [organizationId, assertReady, assertCanEdit]
  );

  const saveProjectType = useCallback(
    async (type) => {
      assertReady();
      assertCanEdit();

      const payload = {
        organization_id: organizationId,
        name: type.name || 'New Type',
        color: type.color || '#3b82f6',
      };

      if (type.id) {
        const { error: updateError } = await supabase
          .from('project_types')
          .update({ name: payload.name, color: payload.color })
          .eq('id', type.id)
          .eq('organization_id', organizationId);

        if (updateError) {
          throw updateError;
        }

        return type.id;
      }

      const { data, error: insertError } = await supabase
        .from('project_types')
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return data?.id;
    },
    [organizationId, assertReady, assertCanEdit]
  );

  const getProjectTypes = useCallback(async () => {
    assertReady();
    const { data, error: fetchError } = await supabase
      .from('project_types')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    return (data || []).map(camelizeRecord);
  }, [organizationId, assertReady]);

  const deleteProjectType = useCallback(
    async (id) => {
      assertReady();
      assertCanEdit();

      const { error: deleteError } = await supabase
        .from('project_types')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (deleteError) {
        throw deleteError;
      }

      return true;
    },
    [organizationId, assertReady, assertCanEdit]
  );

  const saveFundingSource = useCallback(
    async (source) => {
      assertReady();
      assertCanEdit();

      const payload = {
        organization_id: organizationId,
        name: source.name || 'New Funding Source',
        description: source.description || null,
      };

      if (source.id) {
        const { error: updateError } = await supabase
          .from('funding_sources')
          .update({ name: payload.name, description: payload.description })
          .eq('id', source.id)
          .eq('organization_id', organizationId);

        if (updateError) {
          throw updateError;
        }

        return source.id;
      }

      const { data, error: insertError } = await supabase
        .from('funding_sources')
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return data?.id;
    },
    [organizationId, assertReady, assertCanEdit]
  );

  const getFundingSources = useCallback(async () => {
    assertReady();
    const { data, error: fetchError } = await supabase
      .from('funding_sources')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    return (data || []).map(camelizeRecord);
  }, [organizationId, assertReady]);

  const deleteFundingSource = useCallback(
    async (id) => {
      assertReady();
      assertCanEdit();

      const { error: deleteError } = await supabase
        .from('funding_sources')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (deleteError) {
        throw deleteError;
      }

      return true;
    },
    [organizationId, assertReady, assertCanEdit]
  );

  const saveStaffCategory = useCallback(
    async (category) => {
      assertReady();
      assertCanEdit();

      const payload = staffCategoryToRow(category, organizationId);
      const { organization_id, ...updatePayload } = payload;

      if (category.id) {
        const { error: updateError } = await supabase
          .from('staff_categories')
          .update(updatePayload)
          .eq('id', category.id)
          .eq('organization_id', organizationId);

        if (updateError) {
          throw updateError;
        }

        return category.id;
      }

      const { data, error: insertError } = await supabase
        .from('staff_categories')
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return data?.id;
    },
    [organizationId, assertReady, assertCanEdit]
  );

  const getStaffCategories = useCallback(async () => {
    assertReady();
    const { data, error: fetchError } = await supabase
      .from('staff_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    return (data || []).map(staffCategoryFromRow);
  }, [organizationId, assertReady]);

  const deleteStaffCategory = useCallback(
    async (id) => {
      assertReady();
      assertCanEdit();

      const { error: deleteError } = await supabase
        .from('staff_categories')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (deleteError) {
        throw deleteError;
      }

      return true;
    },
    [organizationId, assertReady, assertCanEdit]
  );

  const saveStaffMember = useCallback(
    async (member) => {
      assertReady();
      assertCanEdit();

      const payload = staffMemberToRow(member, organizationId);
      const { organization_id, ...updatePayload } = payload;

      if (member.id) {
        const { error: updateError } = await supabase
          .from('staff_members')
          .update(updatePayload)
          .eq('id', member.id)
          .eq('organization_id', organizationId);

        if (updateError) {
          throw updateError;
        }

        return member.id;
      }

      const { data, error: insertError } = await supabase
        .from('staff_members')
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return data?.id;
    },
    [organizationId, assertReady, assertCanEdit]
  );

  const getStaffMembers = useCallback(async () => {
    assertReady();
    const { data, error: fetchError } = await supabase
      .from('staff_members')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    return (data || []).map(staffMemberFromRow);
  }, [organizationId, assertReady]);

  const deleteStaffMember = useCallback(
    async (id) => {
      assertReady();
      assertCanEdit();

      const { error: deleteError } = await supabase
        .from('staff_members')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (deleteError) {
        throw deleteError;
      }

      return true;
    },
    [organizationId, assertReady, assertCanEdit]
  );

  const saveStaffAllocation = useCallback(
    async (allocation) => {
      assertReady();
      assertCanEdit();

      const payload = staffAllocationToRow(allocation, organizationId);
      const { organization_id, project_id, category_id, ...updatePayload } = payload;

      const { data: existing, error: existingError } = await supabase
        .from('staff_allocations')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('project_id', project_id)
        .eq('category_id', category_id)
        .limit(1);

      if (existingError) {
        throw existingError;
      }

      if (existing && existing.length) {
        const { error: updateError } = await supabase
          .from('staff_allocations')
          .update(updatePayload)
          .eq('id', existing[0].id)
          .eq('organization_id', organizationId);

        if (updateError) {
          throw updateError;
        }

        return existing[0].id;
      }

      const { data, error: insertError } = await supabase
        .from('staff_allocations')
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return data?.id;
    },
    [organizationId, assertReady, assertCanEdit]
  );

  const getStaffAllocations = useCallback(async () => {
    assertReady();
    const { data, error: fetchError } = await supabase
      .from('staff_allocations')
      .select('*')
      .eq('organization_id', organizationId);

    if (fetchError) {
      throw fetchError;
    }

    return (data || []).map(staffAllocationFromRow);
  }, [organizationId, assertReady]);

  const saveStaffAssignment = useCallback(
    async (assignment) => {
      assertReady();
      assertCanEdit();

      const payload = staffAssignmentToRow(assignment, organizationId);
      const { organization_id, project_id, staff_id, ...updatePayload } = payload;

      const { data: existing, error: existingError } = await supabase
        .from('staff_assignments')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('project_id', project_id)
        .eq('staff_id', staff_id)
        .limit(1);

      if (existingError) {
        throw existingError;
      }

      if (existing && existing.length) {
        const { error: updateError } = await supabase
          .from('staff_assignments')
          .update(updatePayload)
          .eq('id', existing[0].id)
          .eq('organization_id', organizationId);

        if (updateError) {
          throw updateError;
        }

        return existing[0].id;
      }

      const { data, error: insertError } = await supabase
        .from('staff_assignments')
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return data?.id;
    },
    [organizationId, assertReady, assertCanEdit]
  );

  const getStaffAssignments = useCallback(async () => {
    assertReady();
    const { data, error: fetchError } = await supabase
      .from('staff_assignments')
      .select('*')
      .eq('organization_id', organizationId);

    if (fetchError) {
      throw fetchError;
    }

    return (data || []).map(staffAssignmentFromRow);
  }, [organizationId, assertReady]);

  const deleteStaffAssignment = useCallback(
    async (id) => {
      assertReady();
      assertCanEdit();

      const { error: deleteError } = await supabase
        .from('staff_assignments')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (deleteError) {
        throw deleteError;
      }

      return true;
    },
    [organizationId, assertReady, assertCanEdit]
  );

  const getUtilityProfiles = useCallback(async () => {
    assertReady();

    const { data, error: fetchError } = await supabase
      .from('utility_financial_profiles')
      .select('*')
      .eq('organization_id', organizationId);

    if (fetchError) {
      throw fetchError;
    }

    const profiles = {};
    (data || []).forEach((row) => {
      const parsed = utilityProfileFromRow(row);
      if (parsed?.utilityKey) {
        profiles[parsed.utilityKey] = parsed;
      }
    });

    return profiles;
  }, [organizationId, assertReady]);

  const saveUtilityProfile = useCallback(
    async (utilityKey, profile) => {
      assertReady();
      assertCanEdit();

      const normalizedKey = normalizeUtilityKey(utilityKey);
      if (!normalizedKey) {
        throw new Error('A valid utility key is required.');
      }

      const payload = utilityProfileToRow(organizationId, normalizedKey, profile);
      const { data, error: upsertError } = await supabase
        .from('utility_financial_profiles')
        .upsert(payload, { onConflict: 'organization_id,utility_key' })
        .select()
        .single();

      if (upsertError) {
        throw upsertError;
      }

      return utilityProfileFromRow(data);
    },
    [organizationId, assertReady, assertCanEdit]
  );

  const getUtilityOperatingBudgets = useCallback(async () => {
    assertReady();

    const { data, error: fetchError } = await supabase
      .from('utility_operating_budgets')
      .select('*')
      .eq('organization_id', organizationId)
      .order('fiscal_year', { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    const budgets = new Map();
    (data || []).forEach((row) => {
      const utilityKey = normalizeUtilityKey(row.utility_key);
      const parsedRow = operatingBudgetFromRow(row);
      if (!utilityKey || !parsedRow) {
        return;
      }
      if (!budgets.has(utilityKey)) {
        budgets.set(utilityKey, []);
      }
      budgets.get(utilityKey).push(parsedRow);
    });

    return budgets;
  }, [organizationId, assertReady]);

  const upsertUtilityOperatingBudgetRows = useCallback(
    async (utilityKey, rows) => {
      if (!rows || !rows.length) {
        return;
      }

      assertReady();
      assertCanEdit();

      const payload = rows
        .filter((row) => Number.isFinite(Number(row?.year)))
        .map((row) => operatingBudgetToRow(organizationId, utilityKey, row));

      if (!payload.length) {
        return;
      }

      const { error: upsertError } = await supabase
        .from('utility_operating_budgets')
        .upsert(payload, { onConflict: 'organization_id,utility_key,fiscal_year' });

      if (upsertError) {
        throw upsertError;
      }
    },
    [organizationId, assertReady, assertCanEdit]
  );

  const deleteUtilityOperatingBudgetsNotIn = useCallback(
    async (utilityKey, yearsToKeep = []) => {
      assertReady();
      assertCanEdit();

      const normalizedKey = normalizeUtilityKey(utilityKey);
      if (!normalizedKey) {
        return;
      }

      let query = supabase
        .from('utility_operating_budgets')
        .delete()
        .eq('organization_id', organizationId)
        .eq('utility_key', normalizedKey);

      const sanitizedYears = (yearsToKeep || [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));

      if (sanitizedYears.length > 0) {
        query = query.not('fiscal_year', 'in', `(${sanitizedYears.join(',')})`);
      }

      const { error: deleteError } = await query;

      if (deleteError) {
        throw deleteError;
      }
    },
    [organizationId, assertReady, assertCanEdit]
  );

  const getProjectTypeUtilities = useCallback(async () => {
    assertReady();

    const { data, error: fetchError } = await supabase
      .from('project_type_utilities')
      .select('*')
      .eq('organization_id', organizationId);

    if (fetchError) {
      throw fetchError;
    }

    const assignments = {};
    (data || []).forEach((row) => {
      const parsed = projectTypeUtilityFromRow(row);
      if (!parsed?.projectTypeId) {
        return;
      }
      assignments[String(parsed.projectTypeId)] = parsed.utilityKey || null;
    });

    return assignments;
  }, [organizationId, assertReady]);

  const saveProjectTypeUtility = useCallback(
    async (projectTypeId, utilityKey) => {
      assertReady();
      assertCanEdit();

      if (!projectTypeId) {
        throw new Error('Project type id is required.');
      }

      const normalizedKey = normalizeUtilityKey(utilityKey);

      if (!normalizedKey) {
        const { error: deleteError } = await supabase
          .from('project_type_utilities')
          .delete()
          .eq('organization_id', organizationId)
          .eq('project_type_id', projectTypeId);

        if (deleteError) {
          throw deleteError;
        }

        return null;
      }

      const payload = projectTypeUtilityToRow(organizationId, projectTypeId, normalizedKey);
      const { data, error: upsertError } = await supabase
        .from('project_type_utilities')
        .upsert(payload, { onConflict: 'organization_id,project_type_id' })
        .select()
        .single();

      if (upsertError) {
        throw upsertError;
      }

      return projectTypeUtilityFromRow(data);
    },
    [organizationId, assertReady, assertCanEdit]
  );

  const getFundingSourceAssumptions = useCallback(async () => {
    assertReady();

    const { data, error: fetchError } = await supabase
      .from('funding_source_financing_assumptions')
      .select('*')
      .eq('organization_id', organizationId);

    if (fetchError) {
      throw fetchError;
    }

    return (data || []).map(fundingAssumptionFromRow).filter(Boolean);
  }, [organizationId, assertReady]);

  const saveFundingSourceAssumption = useCallback(
    async (assumption) => {
      assertReady();
      assertCanEdit();

      if (!assumption || !assumption.fundingSourceId) {
        throw new Error('A funding source id is required.');
      }

      const payload = fundingAssumptionToRow(organizationId, assumption);
      const { data, error: upsertError } = await supabase
        .from('funding_source_financing_assumptions')
        .upsert(payload, { onConflict: 'organization_id,funding_source_id' })
        .select()
        .single();

      if (upsertError) {
        throw upsertError;
      }

      return fundingAssumptionFromRow(data);
    },
    [organizationId, assertReady, assertCanEdit]
  );

  const exportDatabase = useCallback(async () => {
    assertReady();

    const fetchTable = async (table) => {
      const { data, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .eq('organization_id', organizationId);

      if (fetchError) {
        throw fetchError;
      }

      return data || [];
    };

    const payload = {
      exportedAt: new Date().toISOString(),
      organizationId,
      data: {
        projects: await fetchTable('projects'),
        projectTypes: await fetchTable('project_types'),
        fundingSources: await fetchTable('funding_sources'),
        staffCategories: await fetchTable('staff_categories'),
        staffMembers: await fetchTable('staff_members'),
        staffAllocations: await fetchTable('staff_allocations'),
        staffAssignments: await fetchTable('staff_assignments'),
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });

    return blob;
  }, [organizationId, assertReady]);

  const importDatabase = useCallback(async () => {
    throw new Error('Importing data is not supported in the Supabase mode yet.');
  }, []);

  return useMemo(
    () => ({
      isLoading,
      isInitialized,
      error,
      clearError,
      saveProject,
      getProjects,
      deleteProject,
      saveProjectType,
      getProjectTypes,
      deleteProjectType,
      saveFundingSource,
      getFundingSources,
      deleteFundingSource,
      saveStaffCategory,
      getStaffCategories,
      deleteStaffCategory,
      saveStaffAllocation,
      getStaffAllocations,
      saveStaffMember,
      getStaffMembers,
      deleteStaffMember,
      saveStaffAssignment,
      getStaffAssignments,
      deleteStaffAssignment,
      getUtilityProfiles,
      saveUtilityProfile,
      getUtilityOperatingBudgets,
      upsertUtilityOperatingBudgetRows,
      deleteUtilityOperatingBudgetsNotIn,
      getProjectTypeUtilities,
      saveProjectTypeUtility,
      getFundingSourceAssumptions,
      saveFundingSourceAssumption,
      exportDatabase,
      importDatabase,
    }),
    [
      isLoading,
      isInitialized,
      error,
      clearError,
      saveProject,
      getProjects,
      deleteProject,
      saveProjectType,
      getProjectTypes,
      deleteProjectType,
      saveFundingSource,
      getFundingSources,
      deleteFundingSource,
      saveStaffCategory,
      getStaffCategories,
      deleteStaffCategory,
      saveStaffAllocation,
      getStaffAllocations,
      saveStaffMember,
      getStaffMembers,
      deleteStaffMember,
      saveStaffAssignment,
      getStaffAssignments,
      deleteStaffAssignment,
      getUtilityProfiles,
      saveUtilityProfile,
      getUtilityOperatingBudgets,
      upsertUtilityOperatingBudgetRows,
      deleteUtilityOperatingBudgetsNotIn,
      getProjectTypeUtilities,
      saveProjectTypeUtility,
      getFundingSourceAssumptions,
      saveFundingSourceAssumption,
      exportDatabase,
      importDatabase,
    ]
  );
};
