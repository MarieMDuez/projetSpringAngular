import { CommonModule } from '@angular/common';
import { Component, effect, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../settings/account/account.service';
import { DashboardService } from '../dashboard.service';

@Component({
  selector: 'app-balances',
  imports: [CommonModule, FormsModule],
  templateUrl: './balances.component.html',
  styleUrl: './balances.component.scss',
})
export class BalancesComponent {
  protected accountService = inject(AccountService);
  protected dashboardService = inject(DashboardService);

  protected currentBalances = this.dashboardService.balances;
  protected showAccount = input<boolean>(true);

  constructor() {
    effect(() => {
      this.dashboardService.loadBalances().subscribe({
        next: () => {},
      });
    });
  }

  protected onAccountScopeChange(value: unknown): void {
    let accountId: number | null = null;
    if (
      value !== null &&
      value !== undefined &&
      value !== 'null' &&
      value !== 'undefined' &&
      value !== ''
    ) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        accountId = parsed;
      }
    }
    if (this.dashboardService.selectedAccountId() === accountId) {
      return;
    }
    this.dashboardService.selectedAccountId.set(accountId);
  }
}
