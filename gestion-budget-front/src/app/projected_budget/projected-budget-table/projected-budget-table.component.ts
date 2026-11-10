import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../settings/category/category.service';
import { PaymentMethodService } from '../../settings/payment-method/payment-method.service';
import { ProjectedBudgetItems } from '../projected-budget-items.model';

@Component({
  selector: 'app-projected-budget-table',
  imports: [FormsModule, CurrencyPipe],
  templateUrl: './projected-budget-table.component.html',
  styleUrl: './projected-budget-table.component.scss',
})
export class ProjectedBudgetTableComponent {
  protected categoriesService = inject(CategoryService);
  protected paymentMethodsService = inject(PaymentMethodService);
  title = input.required<string>();
  formArray = input.required<ProjectedBudgetItems[]>();

  addRequested = output<void>();
  deletedRequested = output<number>();
  protected readonly totalAccount = computed(() => {
    return this.formArray().reduce((sum, item) => sum + (item.accountAmount || 0), 0);
  });

  protected readonly totalCash = computed(() => {
    return this.formArray().reduce((sum, item) => sum + (item.cashAmount || 0), 0);
  });

  protected readonly globalTableTotal = computed(() => {
    return this.totalAccount() + this.totalCash();
  });

  tableUpdated = output<void>();

  protected onTableInteraction(): void {
    this.tableUpdated.emit();
  }

  onAdd(): void {
    this.addRequested.emit();
  }
  onDelete(index: number): void {
    this.deletedRequested.emit(index);
  }
}
