import { ProjectedBudgetPeriod } from './projected-budget-period.model';

export enum ProjectedBudgetCategoryType {
  INCOME = 'INCOME',
  SAVINGS = 'SAVINGS',
  FIXED_EXPENSE = 'FIXED_EXPENSE',
  VARIABLE_EXPENSE = 'VARIABLE_EXPENSE',
}
export const categoryFormMap: Record<
  ProjectedBudgetCategoryType,
  'incomes' | 'savings' | 'fixedExpenses' | 'variableExpenses'
> = {
  [ProjectedBudgetCategoryType.INCOME]: 'incomes',
  [ProjectedBudgetCategoryType.SAVINGS]: 'savings',
  [ProjectedBudgetCategoryType.FIXED_EXPENSE]: 'fixedExpenses',
  [ProjectedBudgetCategoryType.VARIABLE_EXPENSE]: 'variableExpenses',
};

export const ProjectedBudgetCategoryTypeLabels: Record<ProjectedBudgetCategoryType, string> = {
  [ProjectedBudgetCategoryType.INCOME]: 'Revenus',
  [ProjectedBudgetCategoryType.SAVINGS]: 'Epargne',
  [ProjectedBudgetCategoryType.FIXED_EXPENSE]: 'Charges fixes',
  [ProjectedBudgetCategoryType.VARIABLE_EXPENSE]: 'Charges variables',
};

export interface ProjectedBudgetItems {
  id?: number;
  budgetPeriod?: ProjectedBudgetPeriod;
  type: ProjectedBudgetCategoryType;
  category: { id: number; label?: string };
  paymentMethod: { id: number; label?: string };
  accountAmount?: number;
  cashAmount?: number;
  comment?: string;
}
