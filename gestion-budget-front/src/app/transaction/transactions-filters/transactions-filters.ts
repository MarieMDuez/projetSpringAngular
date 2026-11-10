import { TitleCasePipe } from '@angular/common';
import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, forkJoin, of, switchMap } from 'rxjs';
import { DashboardService } from '../../dashboards/dashboard.service';
import { AccountService } from '../../settings/account/account.service';
import { CategoryService } from '../../settings/category/category.service';
import { PaymentMethodService } from '../../settings/payment-method/payment-method.service';
import { SelectLoopDirective } from '../../shared/directives/select-loop.directive';
import { TransactionFilters } from '../transaction.model';
import { TransactionService } from '../transaction.service';

@Component({
  selector: 'app-transactions-filters',
  imports: [ReactiveFormsModule, TitleCasePipe, SelectLoopDirective],
  templateUrl: './transactions-filters.html',
  styleUrl: './transactions-filters.scss',
})
export class TransactionsFilters implements OnInit {
  protected filterForm!: FormGroup;
  private readonly myFormBuilder = inject(FormBuilder);
  protected transactionService = inject(TransactionService);
  protected dashboardService = inject(DashboardService);
  protected accountService = inject(AccountService);
  protected categoryService = inject(CategoryService);
  protected paymentMethodService = inject(PaymentMethodService);

  protected accounts = this.accountService.allAccounts;
  protected categories = this.categoryService.allCategories;
  protected paymentMethods = this.paymentMethodService.allPaymentMethods;

  constructor() {
    effect(() => {
      const serviceAccountId = this.dashboardService.selectedAccountId();
      this.filterForm?.get('accountId')?.setValue(serviceAccountId ?? '', { emitEvent: true });
    });
  }

  ngOnInit(): void {
    this.initFilterForm();
    this.setupDynamicFiltering();
    this.transactionService.loadUniqueRecurrences().subscribe({
      next: () => {},
      error: (err) => console.error('Erreur lors du chargement des récurrences uniques', err),
    });
  }

  initFilterForm() {
    const currentAccountId = this.dashboardService.selectedAccountId();

    this.filterForm = this.myFormBuilder.group({
      accountId: [currentAccountId !== null ? currentAccountId.toString() : ''],
      categoryId: [''],
      paymentMethodId: [''],
      type: [''],
      year: [''],
      month: [''],
      day: [''],
      isChecked: [''],
      recurrenceMonths: [''],
      limit: 50,
    });
  }

  setupDynamicFiltering() {
    const initialAccountId = this.dashboardService.selectedAccountId();

    this.dashboardService.selectedAccountId.set(initialAccountId ? Number(initialAccountId) : null);

    this.transactionService.loadFilteredTransactions(this.filterForm.value).subscribe({
      error: (err) => console.error('Erreur de filtrage', err),
    });

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        switchMap((currentFilters) => {
          const yearStr = currentFilters.year?.toString() || '';
          const dayNum = currentFilters.day ? Number(currentFilters.day) : null;
          if (
            (yearStr.length > 0 && yearStr.length < 4) ||
            (dayNum !== null && (dayNum < 1 || dayNum > 31))
          ) {
            return of([]);
          }

          const accountId = currentFilters?.accountId;
          this.dashboardService.selectedAccountId.set(accountId ? Number(accountId) : null);

          const filtersCopy: TransactionFilters = { ...currentFilters };
          if (currentFilters.year || currentFilters.month || Number(currentFilters.limit) === 0) {
            delete filtersCopy.limit;
          }
          Object.keys(filtersCopy).forEach((key) => {
            const k = key as keyof TransactionFilters;
            if (filtersCopy[k] === '' || filtersCopy[k] === null || filtersCopy[k] === undefined) {
              delete filtersCopy[k];
            }
          });

          return forkJoin([
            this.transactionService.loadFilteredTransactions(filtersCopy),
            this.dashboardService.loadBalances(),
          ]);
        }),
      )
      .subscribe({
        next: () => {},
        error: (err) => console.error('Erreur de filtrage dynamique', err),
      });
  }

  public clearAllFilters(): void {
    this.filterForm.reset({
      accountId: '',
      categoryId: '',
      paymentMethodId: '',
      type: '',
      year: '',
      month: '',
      day: '',
      isChecked: '',
      limit: 50,
    });
    this.dashboardService.selectedAccountId.set(null);

    this.transactionService.loadFilteredTransactions({ limit: 50 }).subscribe({
      error: (err) => console.error('Erreur de filtrage', err),
    });
  }

  public clearSingleFilter(controlName: string): void {
    const control = this.filterForm.get(controlName);
    if (!control) return;
    control.setValue('');
    if (controlName === 'accountId') {
      this.dashboardService.selectedAccountId.set(null);
    }
  }

  protected availableMonths = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(2000, i, 1)),
  }));

  protected isFilterOpen = signal<boolean>(false);

  protected toggleFilterOpen(): void {
    this.isFilterOpen.update((v) => !v);
  }
}
