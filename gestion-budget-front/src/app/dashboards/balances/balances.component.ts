import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../../transaction/transaction.service';
import { AccountService } from '../../settings/account/account.service';
import { DashboardService } from '../dashboard.service';
import { HttpErrorResponse } from '@angular/common/http';

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
    this.dashboardService.loadBalances(null).subscribe({
      next: () => {},
      error: (err: HttpErrorResponse) =>
        console.error('Erreur lors du chargement des soldes du dashboard', err),
    });
  }
  protected onAccountScopeChange(value: unknown): void {
    const accountId =
      value !== null && value !== undefined && value !== 'null' && value !== ''
        ? Number(value)
        : null;

    this.transactionService.selectedAccountIdFilter.set(accountId);

    this.transactionService.loadFilteredTransactions({ accountId }).subscribe({
      error: (err) => console.error('Erreur de filtrage', err),
    });

    this.dashboardService.loadBalances(accountId).subscribe({
      next: () => {},
      error: (err: HttpErrorResponse) =>
        console.error('Erreur lors du chargement des soldes du dashboard', err),
    });
  }
}
