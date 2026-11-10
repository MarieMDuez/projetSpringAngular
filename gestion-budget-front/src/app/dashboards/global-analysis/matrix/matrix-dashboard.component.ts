import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../../settings/account/account.service';
import { TransactionService } from '../../../transaction/transaction.service';
import { DashboardService } from '../../dashboard.service';
import { MatrixDashboardDto, PaymentMethodRowDto } from './matrix-dashboard.model';

@Component({
  selector: 'app-matrix-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './matrix-dashboard.component.html',
  styleUrl: './matrix-dashboard.component.scss',
})
export class MatrixDashboardComponent {
  protected dashboardService = inject(DashboardService);
  protected accountService = inject(AccountService);
  protected transactionService = inject(TransactionService);

  protected accounts = this.accountService.activeAccounts;

  protected matrixData = signal<MatrixDashboardDto | null>(null);
  protected isLoading = signal<boolean>(false);

  protected isMatrixAllExpanded = signal<boolean>(false);

  protected availableMonths = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(2000, i, 1)),
  }));

  constructor() {
    effect(() => {
      this.loadMatrixData();
    });
  }

  private loadMatrixData(): void {
    this.isLoading.set(true);

    this.dashboardService.getMatrix().subscribe({
      next: (data) => {
        if (data?.rows) {
          data.rows.forEach((row: PaymentMethodRowDto) => {
            row.isExpanded = false;
          });
          this.isMatrixAllExpanded.set(false);
        }
        this.matrixData.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Erreur lors du chargement de la matrice annuelle', err);
        this.matrixData.set(null);
        this.isLoading.set(false);
      },
    });
  }

  protected onToggleAllMatrixRows(): void {
    this.isMatrixAllExpanded.update((v) => !v);
    const targetState = this.isMatrixAllExpanded();
    const currentData = this.matrixData();

    if (currentData?.rows) {
      currentData.rows.forEach((row: PaymentMethodRowDto) => {
        row.isExpanded = targetState;
      });

      this.matrixData.set({ ...currentData });
    }
  }
}
