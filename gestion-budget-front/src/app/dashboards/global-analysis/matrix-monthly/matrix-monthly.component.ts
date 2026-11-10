import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { TransactionService } from '../../../transaction/transaction.service';
import { DashboardService } from '../../dashboard.service';
import { MatrixMonthlyDto, PaymentMethodMonthlyRowDto } from './matrix-monthly.model';

@Component({
  selector: 'app-matrix-monthly',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './matrix-monthly.component.html',
  styleUrl: './matrix-monthly.component.scss',
})
export class MatrixMonthlyComponent {
  protected dashboardService = inject(DashboardService);
  protected transactionService = inject(TransactionService);

  protected matrixData = signal<MatrixMonthlyDto | null>(null);
  protected matrixProjectedData = signal<MatrixMonthlyDto | null>(null);

  protected isLoading = signal<boolean>(false);

  protected isMatrixAllExpanded = signal<boolean>(false);

  protected weeksArray = signal<number[]>([]);

  constructor() {
    effect(() => {
      this.loadMonthlyMatrix();
    });
  }

  private loadMonthlyMatrix(): void {
    this.isLoading.set(true);

    this.dashboardService.getMonthlyMatrix().subscribe({
      next: (data: MatrixMonthlyDto) => {
        if (data?.rows) {
          data.rows.forEach((row: PaymentMethodMonthlyRowDto) => {
            row.isExpanded = false;
          });

          this.weeksArray.set(Array.from({ length: data.maxWeeksInMonth }, (_, i) => i));
        }

        this.matrixData.set(data);
        this.isMatrixAllExpanded.set(false);
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

    if (currentData?.rows) {
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
