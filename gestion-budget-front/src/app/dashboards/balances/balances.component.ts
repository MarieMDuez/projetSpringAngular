import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../settings/account/account.service';
import { TransactionService } from '../../transaction/transaction.service';
import { DashboardService } from '../dashboard.service';

@Component({
  selector: 'app-balances',
  imports: [CommonModule, FormsModule],
  templateUrl: './balances.component.html',
  styleUrl: './balances.component.scss',
})
export class BalancesComponent implements OnInit {
  protected transactionService = inject(TransactionService);
  protected accountService = inject(AccountService);
  protected dashboardService = inject(DashboardService);

  protected currentBalances = this.dashboardService.balances;
  ngOnInit(): void {
    this.dashboardService
      .loadBalances(this.transactionService.selectedAccountIdFilter() ?? null)
      .subscribe({
        next: () => {},
        error: (err: HttpErrorResponse) =>
          console.error('Erreur lors du chargement des soldes du dashboard', err),
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
      if (!isNaN(parsed)) {
        accountId = parsed;
      }
    }
    if (this.transactionService.selectedAccountIdFilter() === accountId) {
      return;
    }
    this.transactionService.selectedAccountIdFilter.set(accountId);

    this.dashboardService.loadBalances(accountId).subscribe({
      next: () => {},
      error: (err: HttpErrorResponse) =>
        console.error('Erreur lors du chargement des soldes du dashboard', err),
    });
  }
}
