import { Routes } from '@angular/router';
import { GlobalAnalysisComponent } from './dashboards/global-analysis/global-analysis.component';
import { SettingsComponent } from './settings/settings.component';
import { TransactionListComponent } from './transaction/transaction-list/transaction-list.component';
import { SummaryComponent } from './dashboards/summaryDashboard/summary/summary.component';
import { ProjectedBudgetComponent } from './projected_budget/projected-budget/projected-budget.component';

export const routes: Routes = [
  { path: '', component: SummaryComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'transactions', component: TransactionListComponent },
  { path: 'global-analysis', component: GlobalAnalysisComponent },
  { path: 'projected-budget', component: ProjectedBudgetComponent },
];
