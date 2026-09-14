import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardService } from '../../dashboards/dashboard.service';
import { AccountService } from '../../settings/account/account.service';
import { CategoryService } from '../../settings/category/category.service';
import { PaymentMethodService } from '../../settings/payment-method/payment-method.service';
import { TransactionService } from '../transaction.service';
import { TransactionsFilters } from './transactions-filters';

describe('TransactionFiltersComponent', () => {
  let component: TransactionsFilters;
  let fixture: ComponentFixture<TransactionsFilters>;

  let mockTransactionService: Partial<TransactionService>;
  let mockAccountService: Partial<AccountService>;
  let mockDashboardService: Partial<DashboardService>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockTransactionService = {
      selectedAccountIdFilter: signal<number | null>(null),
      recurrenceFilter: signal<number | null>(null),
      uniqueRecurrences: signal<number[]>([]),
      loadFilteredTransactions: vi.fn().mockReturnValue(of([])),
      loadUniqueRecurrences: vi.fn().mockReturnValue(of([])),
      generateRecurrentTransactions: vi.fn().mockReturnValue(of(void 0)),
    };

    mockDashboardService = {
      balances: signal({
        id: null,
        label: 'Vue Globale',
        initialBalance: 1000,
        currentBalance: 800,
        projectedBalance: 1100,
      }),
      loadBalances: vi.fn().mockReturnValue(of({})),
    };

    mockAccountService = { allAccounts: signal([]) };

    await TestBed.configureTestingModule({
      imports: [TransactionsFilters, ReactiveFormsModule],
      providers: [
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: AccountService, useValue: mockAccountService },
        { provide: CategoryService, useValue: { allCategories: signal([]) } },
        { provide: PaymentMethodService, useValue: { allPaymentMethods: signal([]) } },
        { provide: DashboardService, useValue: mockDashboardService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionsFilters);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize form with default value structures', () => {
    const filterForm = component['filterForm'] as FormGroup;

    expect(component).toBeTruthy();
    expect(filterForm.get('isChecked')).toBeDefined();
    expect(filterForm.value.isChecked).toBe('');
    expect(filterForm.value.limit).toBe(50);
  });

  it('should filter out empty fields and ignore truncated year inputs dynamically', async () => {
    const filterForm = component['filterForm'] as FormGroup;

    filterForm.patchValue({ year: '202' });
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(mockTransactionService.loadFilteredTransactions).not.toHaveBeenCalledWith(
      expect.objectContaining({ year: '202' }),
    );

    filterForm.patchValue({ year: '2026', month: '8' });
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(mockTransactionService.loadFilteredTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        year: '2026',
        month: '8',
      }),
    );
  });

  it('should reset all form controls and flush global account state when clearAllFilters is invoked', () => {
    const filterForm = component['filterForm'] as FormGroup;
    filterForm.patchValue({ isChecked: 'true', accountId: '12' });

    component.clearAllFilters();

    expect(filterForm.value.isChecked).toBe('');
    expect(filterForm.value.accountId).toBe('');
    expect(mockTransactionService.selectedAccountIdFilter!()).toBeNull();
    expect(mockTransactionService.loadFilteredTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 }),
    );
  });

  it('should reset a single target control when clearSingleFilter is called', () => {
    const filterForm = component['filterForm'] as FormGroup;
    filterForm.patchValue({ isChecked: 'false', type: 'DEBIT' });

    component.clearSingleFilter('isChecked');

    expect(filterForm.value.isChecked).toBe('');
    expect(filterForm.value.type).toBe('DEBIT');
  });
});
