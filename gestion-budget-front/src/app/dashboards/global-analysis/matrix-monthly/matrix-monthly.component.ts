import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { TransactionService } from '../../../transaction/transaction.service';
import { DashboardService } from '../../dashboard.service'; // Ajuste tes chemins
import { MatrixMonthlyDto, PaymentMethodMonthlyRowDto } from './matrix-monthly.model';

@Component({
  selector: 'app-matrix-monthly',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './matrix-monthly.component.html',
  styleUrl: './matrix-monthly.component.scss',
})
export class MatrixMonthlyComponent implements OnInit {
  protected dashboardService = inject(DashboardService);
  protected transactionService = inject(TransactionService);

  protected matrixData = signal<MatrixMonthlyDto | null>(null);
  protected isLoading = signal<boolean>(false);

  protected isMatrixAllExpanded = signal<boolean>(false);

  protected weeksArray = signal<number[]>([]);

  constructor() {
    effect(() => {
      const account = this.transactionService.selectedAccountIdFilter();
      const year = this.dashboardService.selectedYear();
      const month = this.dashboardService.selectedMonth();
      const isChecked = this.dashboardService.isCheckedFilter();

      this.loadMonthlyMatrix(account, year, month, isChecked);
    });
  }

  ngOnInit(): void {}

  private loadMonthlyMatrix(
    accountId: number | null,
    year: number,
    month: number | null,
    isChecked: boolean | null,
  ): void {
    this.isLoading.set(true);

    this.dashboardService.getMonthlyMatrix(accountId, year, month, isChecked).subscribe({
      next: (data: MatrixMonthlyDto) => {
        if (data && data.rows) {
          data.rows.forEach((row: PaymentMethodMonthlyRowDto) => {
            row.isExpanded = false;
          });

          this.weeksArray.set(Array.from({ length: data.maxWeeksInMonth }, (_, i) => i));
        }

        this.matrixData.set(data);
        this.isMatrixAllExpanded.set(false); // Reset du bouton au changement de filtre
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Erreur lors du chargement de la matrice mensuelle', err);
        this.matrixData.set(null);
        this.isLoading.set(false);
      },
    });
  }

  protected onToggleAllRows(): void {
    this.isMatrixAllExpanded.update((v) => !v);
    const targetState = this.isMatrixAllExpanded();
    const currentData = this.matrixData();

    if (currentData && currentData.rows) {
      currentData.rows.forEach((row: PaymentMethodMonthlyRowDto) => {
        row.isExpanded = targetState;
      });
      this.matrixData.set({ ...currentData });
    }
  }

  protected toggleRow(row: PaymentMethodMonthlyRowDto): void {
    row.isExpanded = !row.isExpanded;
    const currentData = this.matrixData();

    if (currentData) {
      this.matrixData.set({
        ...currentData,
        rows: currentData.rows || [],
        categoryRows: currentData.categoryRows || [],
        maxWeeksInMonth: currentData.maxWeeksInMonth ?? 4,
      });
    }
  }
}
