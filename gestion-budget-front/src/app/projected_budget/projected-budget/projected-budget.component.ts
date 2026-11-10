import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { DashboardService } from '../../dashboards/dashboard.service';
import { ToastService } from '../../shared/ConfirmationToast/toast.service';
import { OpenDialogDirective } from '../../shared/directives/open-dialog.directive';
import { ModalComponent } from '../../shared/modal/modal.component';
import { Transaction } from '../../transaction/transaction.model';
import { ProjectedBudgetFilterComponent } from '../projected-budget-filter/projected-budget-filter.component';
import { ProjectedBudgetCategoryType, ProjectedBudgetItems } from '../projected-budget-items.model';
import { ProjectedBudgetTableComponent } from '../projected-budget-table/projected-budget-table.component';
import { ProjectedBudgetToolboxComponent } from '../projected-budget-toolbox/projected-budget-toolbox.component';
import { ProjectedBudgetService } from '../projected-budget.service';

@Component({
  selector: 'app-projected-budget',
  imports: [
    ProjectedBudgetTableComponent,
    ProjectedBudgetToolboxComponent,
    ProjectedBudgetFilterComponent,
    DragDropModule,
    ModalComponent,
    OpenDialogDirective,
  ],
  templateUrl: './projected-budget.component.html',
  styleUrl: './projected-budget.component.scss',
})
export class ProjectedBudgetComponent {
  protected dashboardService = inject(DashboardService);
  protected projectedBudgetService = inject(ProjectedBudgetService);
  protected budgetService = inject(ProjectedBudgetService);
  private readonly toastService = inject(ToastService);

  protected projectedBudgetPeriodToDelete = signal<ProjectedBudgetItems[] | null>(null);

  protected readonly CategoryType = ProjectedBudgetCategoryType;
  readonly incomes = computed(() =>
    this.budgetService.budgetItems().filter((item) => item.type === 'INCOME'),
  );
  readonly savings = computed(() =>
    this.budgetService.budgetItems().filter((item) => item.type === 'SAVINGS'),
  );
  readonly fixedExpenses = computed(() =>
    this.budgetService.budgetItems().filter((item) => item.type === 'FIXED_EXPENSE'),
  );
  readonly variableExpenses = computed(() =>
    this.budgetService.budgetItems().filter((item) => item.type === 'VARIABLE_EXPENSE'),
  );

  onItemChanged(): void {
    this.budgetService.budgetItems.update((items) => [...items]);
  }

  private readonly userToggle = signal<boolean | null>(null);

  public isSidebarVisible = computed(() => {
    if (this.userToggle() !== null) {
      return this.userToggle();
    }
    return this.budgetService.toolboxTransactions().length > 0;
  });

  public toggleSidebar(): void {
    this.userToggle.set(!this.isSidebarVisible());
  }

  addNewLine(categoryType: ProjectedBudgetCategoryType): void {
    const newLine: ProjectedBudgetItems = {
      type: categoryType,
      accountAmount: 0,
      cashAmount: 0,
      comment: '',
      category: { id: 0, label: '' },
      paymentMethod: { id: 0, label: '' },
    };

    this.budgetService.budgetItems.update((currentItems) => [...currentItems, newLine]);
  }

  deleteLine(categoryType: ProjectedBudgetCategoryType, indexInGroup: number): void {
    const targetedGroup = this.budgetService
      .budgetItems()
      .filter((item) => item.type === categoryType);
    const itemToDelete = targetedGroup[indexInGroup];

    if (!itemToDelete) return;

    this.budgetService.budgetItems.update((currentItems) =>
      currentItems.filter((item) => item !== itemToDelete),
    );
  }

  onAddTransactionToBudget(event: {
    transaction: Transaction;
    targetCategoryType: ProjectedBudgetCategoryType;
  }) {
    const newItem: ProjectedBudgetItems = {
      type: event.targetCategoryType,
      accountAmount: event.transaction.amount!,
      category: { id: event.transaction.category.id, label: event.transaction.category.label },
      paymentMethod: {
        id: event.transaction.paymentMethod.id,
        label: event.transaction.paymentMethod.label,
      },
      cashAmount: 0,
      comment: '',
    };

    this.budgetService.budgetItems.update((currentItems) => [...currentItems, newItem]);
    this.budgetService.toolboxTransactions.update((currentTransactions) =>
      currentTransactions.filter((t) => t.id !== event.transaction.id),
    );
  }

  readonly totalIncomes = computed(() => {
    return this.budgetService
      .budgetItems()
      .filter((item) => item.type === 'INCOME')
      .reduce((sum, item) => sum + (item.accountAmount || 0) + (item.cashAmount || 0), 0);
  });

  readonly totalSavings = computed(() => {
    return this.budgetService
      .budgetItems()
      .filter((item) => item.type === 'SAVINGS')
      .reduce((sum, item) => sum + (item.accountAmount || 0) + (item.cashAmount || 0), 0);
  });

  readonly totalFixedExpenses = computed(() => {
    return this.budgetService
      .budgetItems()
      .filter((item) => item.type === 'FIXED_EXPENSE')
      .reduce((sum, item) => sum + (item.accountAmount || 0) + (item.cashAmount || 0), 0);
  });

  readonly totalVariableExpenses = computed(() => {
    return this.budgetService
      .budgetItems()
      .filter((item) => item.type === 'VARIABLE_EXPENSE')
      .reduce((sum, item) => sum + (item.accountAmount || 0) + (item.cashAmount || 0), 0);
  });

  readonly restToLive = computed(() => {
    return this.totalIncomes() - this.totalFixedExpenses();
  });

  readonly balance = computed(() => {
    return (
      this.totalIncomes() -
      (this.totalSavings() + this.totalFixedExpenses() + this.totalVariableExpenses())
    );
  });

  readonly cashToGet = computed(() => {
    return this.budgetService.budgetItems().reduce((sum, item) => sum + (item.cashAmount || 0), 0);
  });

  onDrop(
    event: CdkDragDrop<ProjectedBudgetItems[]>,
    targetCategoryType: ProjectedBudgetCategoryType,
  ) {
    if (event.previousContainer !== event.container) {
      const transaction = event.item.data as Transaction;

      this.onAddTransactionToBudget({
        transaction,
        targetCategoryType,
      });
    }
  }

  onSubmit() {
    const validItems = this.budgetService.budgetItems().filter((item) => {
      const hasAmount =
        (item.accountAmount && item.accountAmount > 0) || (item.cashAmount && item.cashAmount > 0);

      const hasCategory = item.category?.id && item.category.id > 0;
      const hasPaymentMethod = item.paymentMethod?.id && item.paymentMethod.id > 0;

      return hasAmount || hasCategory || hasPaymentMethod;
    });

    this.budgetService.budgetItems.set(validItems);
    this.budgetService.saveProjectedBudgetItems().subscribe({
      next: (projectedBudgetItems: ProjectedBudgetItems[]) => {
        this.toastService.show('Budget enregistré avec succès', 'success');
      },
      error: (err: HttpErrorResponse) => {
        this.toastService.show(
          `Une erreur est survenue lors de l'enregistrement du budget`,
          'error',
        );
      },
    });
  }
  onDeletePeriod() {
    this.budgetService.deleteProjectedBudgetPeriod().subscribe();
  }
}
