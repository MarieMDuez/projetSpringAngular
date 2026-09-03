import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { TransactionFormComponent } from './transaction-form.component';
import { TransactionService } from '../../transaction.service';
import { AccountService } from '../../../settings/account/account.service';
import { CategoryService } from '../../../settings/category/category.service';
import { PaymentMethodService } from '../../../settings/payment-method/payment-method.service';
import { of, throwError } from 'rxjs';
import { vi, describe, beforeEach, it, expect, Mock } from 'vitest';
import { signal, WritableSignal, NO_ERRORS_SCHEMA } from '@angular/core';
import { Transaction } from '../../transaction.model';
import { Account } from '../../../settings/account/account.model';
import { Category } from '../../../settings/category/category.model';
import { PaymentMethod } from '../../../settings/payment-method/payment-method.model';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';

describe('TransactionFormComponent', () => {
  let component: TransactionFormComponent;
  let fixture: ComponentFixture<TransactionFormComponent>;

  let mockTransactionService: Partial<TransactionService>;
  let mockAccountService: Partial<AccountService>;
  let mockCategoryService: Partial<CategoryService>;
  let mockPaymentMethodService: Partial<PaymentMethodService>;

  const mockToastService: { show: Mock } = { show: vi.fn() };

  // Signal réactif pour piloter l'état d'édition à la volée
  let transactionToEditSignal: WritableSignal<Transaction | null>;

  beforeEach(async () => {
    transactionToEditSignal = signal<Transaction | null>(null);

    mockTransactionService = {
      transactionToEdit: transactionToEditSignal,
      createTransaction: vi.fn().mockReturnValue(of({})),
      updateTransaction: vi.fn().mockReturnValue(of({})),
      generateRecurrentTransactions: vi.fn().mockReturnValue(of({})),
      allTransactionsSignal: signal([]),
    };

    mockAccountService = {
      activeAccounts: signal<Partial<Account>[]>([
        { id: 1, label: 'Compte Courant', isActive: true },
      ]) as any,
    };

    mockCategoryService = {
      activeCategories: signal<Partial<Category>[]>([
        { id: 2, label: 'Alimentation', isActive: true },
      ]) as any,
    };

    mockPaymentMethodService = {
      activePaymentMethods: signal<Partial<PaymentMethod>[]>([
        { id: 3, label: 'Carte', isActive: true },
      ]) as any,
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
      schemas: [NO_ERRORS_SCHEMA], // Isole le template contre les directives de navigation ou CSS tierces
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Déclenchement de l'initialisation du formulaire réactif
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

    // Assertion stricte sur la structure du DTO de transaction attendu par l'API Java
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

    // Propagation de la transaction à modifier
    transactionToEditSignal.set(txToEdit);

    fixture.detectChanges();
    await fixture.whenStable(); // Attente du traitement asynchrone du macro-task de l'effect()

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
