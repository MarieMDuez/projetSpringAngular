import { TitleCasePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AccountService } from '../../settings/account/account.service';
import { TransactionService } from '../../transaction/transaction.service';
import { BalancesComponent } from '../balances/balances.component';
import { DashboardService } from '../dashboard.service';
import { AnalyticsEvolutionComponent } from './analytics-evolution/analytics-evolution.component';
import { AnalyticsDashboardComponent } from './analytics/analytics.component';
import { MatrixMonthlyComponent } from './matrix-monthly/matrix-monthly.component';
import { MatrixDashboardComponent } from './matrix/matrix-dashboard.component';

@Component({
  selector: 'app-global-analysis',
  imports: [
    AnalyticsDashboardComponent,
    MatrixMonthlyComponent,
    AnalyticsEvolutionComponent,
    MatrixDashboardComponent,
    BalancesComponent,
    FormsModule,
    TitleCasePipe,
    RouterLink,
  ],
  templateUrl: './global-analysis.component.html',
  styleUrl: './global-analysis.component.scss',
})
export class GlobalAnalysisComponent {
  protected dashboardService = inject(DashboardService);
  protected accountService = inject(AccountService);
  protected transactionService = inject(TransactionService);
  protected accounts = this.accountService.activeAccounts;

  protected isLoading = signal<boolean>(false);

  isBalanceExpanded = signal<boolean>(true);
  isAnalyticsExpanded = signal<boolean>(true);
  isMatrixMonthlyExpanded = signal<boolean>(true);
  isEvolutionExpanded = signal<boolean>(true);
  isMatrixExpanded = signal<boolean>(true);
  isAllExpand = signal<boolean>(true);

  toggleSection(
    section: 'balance' | 'analytics' | 'matrix-monthly' | 'evolution' | 'matrix',
  ): void {
    switch (section) {
      case 'balance':
        this.isBalanceExpanded.update((v) => !v);
        break;
      case 'analytics':
        this.isAnalyticsExpanded.update((v) => !v);
        break;
      case 'matrix-monthly':
        this.isMatrixMonthlyExpanded.update((v) => !v);
        break;
      case 'evolution':
        this.isEvolutionExpanded.update((v) => !v);
        break;
      case 'matrix':
        this.isMatrixExpanded.update((v) => !v);
        break;
    }
  }

  protected onAllExpand(): void {
    this.isAllExpand.update((v) => !v);
    this.isBalanceExpanded.set(this.isAllExpand());
    this.isAnalyticsExpanded.set(this.isAllExpand());
    this.isMatrixMonthlyExpanded.set(this.isAllExpand());
    this.isEvolutionExpanded.set(this.isAllExpand());
    this.isMatrixExpanded.set(this.isAllExpand());
  }

  protected availableMonths = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(2000, i, 1)),
  }));

  protected availableYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 3 + i);

  protected onAccountChange(accountId: number | null): void {
    if (this.transactionService.selectedAccountIdFilter() === accountId) {
      return;
    }
    this.transactionService.selectedAccountIdFilter.set(accountId);
  }

  protected onMonthChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.dashboardService.selectedMonth.set(val ? Number(val) : null);
  }

  protected onYearChange(event: Event): void {
    this.dashboardService.selectedYear.set(Number((event.target as HTMLSelectElement).value));
  }
}
