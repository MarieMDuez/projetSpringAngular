import { ProjectedBudgetCategoryType } from '../../projected_budget/projected-budget-items.model';

export interface ProjectedBudgetSettings {
  id?: number;
  category: { id: number; label?: string };
  type: ProjectedBudgetCategoryType;
}
