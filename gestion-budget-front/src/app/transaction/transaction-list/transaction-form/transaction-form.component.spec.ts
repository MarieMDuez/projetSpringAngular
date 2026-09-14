import { NO_ERRORS_SCHEMA, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { Account } from '../../../settings/account/account.model';
import { AccountService } from '../../../settings/account/account.service';
import { Category } from '../../../settings/category/category.model';
import { CategoryService } from '../../../settings/category/category.service';
import { PaymentMethod } from '../../../settings/payment-method/payment-method.model';
import { PaymentMethodService } from '../../../settings/payment-method/payment-method.service';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';
import { Transaction } from '../../transaction.model';
import { TransactionService } from '../../transaction.service';
import { TransactionFormComponent } from './transaction-form.component';

import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

registerLocaleData(localeFr);

describe('TransactionFormComponent', () => {
  let component: TransactionFormComponent;
  let fixture: ComponentFixture<TransactionFormComponent>;

  let mockTransactionService: Partial<TransactionService>;
  let mockAccountService: Partial<AccountService>;
  let mockCategoryService: Partial<CategoryService>;
  let mockPaymentMethodService: Partial<PaymentMethodService>;

  const mockToastService: { show: Mock } = { show: vi.fn() };

  let transactionToEditSignal: WritableSignal<Transaction | null>;

  beforeEach(async () => {
    transactionToEditSignal = signal<Transaction | null>(null);

    mockTransactionService = {
      transactionToEdit: transactionToEditSignal,
      createTransaction: vi.fn().mockReturnValue(of({})),
      updateTransaction: vi.fn().mockReturnValue(of({})),
      generateRecurrentTransactions: vi.fn().mockReturnValue(of({})),
      allTransactionsSignal: signal([]),
      selectedAccountIdFilter: signal<number | null>(null),
    };

    mockAccountService = {
      activeAccounts: signal<Account[]>([
        {
          id: 1,
          label: 'Compte Courant',
          isActive: true,
          initialBalance: 0,
          isDefault: false,
          position: 1,
        },
      ]),

      editingAccount: signal<Account | null>(null),
    };

    mockCategoryService = {
      activeCategories: signal<Category[]>([
        { id: 2, label: 'Alimentation', isActive: true, position: 1 },
      ]),
      editingCategory: signal<Category | null>(null),
    };

    mockPaymentMethodService = {
      activePaymentMethods: signal<PaymentMethod[]>([
        { id: 3, label: 'Carte', isActive: true, position: 1 },
      ]),
      editingPaymentMethod: signal<PaymentMethod | null>(null),
    };

    await TestBed.configureTestingModule({
      imports: [TransactionFormComponent, ReactiveFormsModule],
      providers: [
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: AccountService, useValue: mockAccountService },
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: PaymentMethodService, useValue: mockPaymentMethodService },
        { provide: ToastService, useValue: mockToastService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and initialize with default values', () => {
    const transactionForm = component['transactionForm'] as FormGroup;

    expect(component).toBeTruthy();
    expect(transactionForm.value.type).toBe('DEBIT');
    expect(transactionForm.value.amount).toBeNull();
  });

  it('should invalidate form if amount is zero or negative', () => {
    const transactionForm = component['transactionForm'] as FormGroup;
    const amountControl = transactionForm.get('amount');

    amountControl?.setValue(0);
    expect(transactionForm.invalid).toBe(true);
    expect(amountControl?.errors?.['min']).toBeDefined();

    amountControl?.setValue(50.5);
    transactionForm.patchValue({ accountId: '1', categoryId: '2', paymentMethodId: '3' });
    expect(transactionForm.valid).toBe(true);
  });

  it('should call createTransaction when form is submitted valid in creation mode', () => {
    const transactionForm = component['transactionForm'] as FormGroup;

    transactionForm.patchValue({
      amount: 150.0,
      emissionDate: '2026-05-12',
      type: 'DEBIT',
      description: 'Courses Leclerc',
      recurrenceMonths: 0,
      isChecked: true,
      accountId: '1',
      categoryId: '2',
      paymentMethodId: '3',
    });

    component['onSubmit']();

    expect(mockTransactionService.createTransaction as Mock).toHaveBeenCalledWith({
      amount: 150.0,
      emissionDate: '2026-05-12',
      type: 'DEBIT',
      description: 'Courses Leclerc',
      recurrenceMonths: 0,
      isAlertTriggered: false,
      isChecked: true,
      account: { id: 1 },
      category: { id: 2 },
      paymentMethod: { id: 3 },
      parentTransactionId: null,
    });
  });

  it('should auto-populate the form when transactionToEdit signal emits a transaction', async () => {
    const transactionForm = component['transactionForm'] as FormGroup;
    const txToEdit: Transaction = {
      id: 99,
      amount: 45.5,
      emissionDate: '2026-06-01',
      type: 'CREDIT',
      description: 'Remboursement',
      isAlertTriggered: false,
      isChecked: false,
      account: { id: 1 },
      category: { id: 2 },
      paymentMethod: { id: 3 },
      parentTransactionId: null,
    };

    transactionToEditSignal.set(txToEdit);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(transactionForm.value.amount).toBe(45.5);
    expect(transactionForm.value.type).toBe('CREDIT');
    expect(transactionForm.value.description).toBe('Remboursement');
  });

  it('should set error message if backend submission crashes', () => {
    const transactionForm = component['transactionForm'] as FormGroup;

    (mockTransactionService.createTransaction as Mock).mockReturnValue(
      throwError(() => new Error('DB Crash')),
    );

    transactionForm.patchValue({
      amount: 10,
      emissionDate: '2026-05-12',
      type: 'DEBIT',
      accountId: '1',
      categoryId: '2',
      paymentMethodId: '3',
    });

    component['onSubmit']();

    expect(mockToastService.show).toHaveBeenCalledWith(
      "Erreur lors de l'enregistrement de la transaction",
      'error',
    );
  });

  it('should dispatch request to generate scheduled rows on valid calendar submission', () => {
    component['generateRecurrent'](12, 2026);

    expect(mockTransactionService.generateRecurrentTransactions).toHaveBeenCalledWith(12, 2026);
  });
});
