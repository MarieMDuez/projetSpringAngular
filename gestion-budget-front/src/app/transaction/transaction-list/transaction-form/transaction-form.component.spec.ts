import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Component, input, output, signal, WritableSignal, ViewChild } from '@angular/core';
import { TransactionFormComponent } from './transaction-form.component';
import { TransactionService } from '../../transaction.service';
import { AccountService } from '../../../settings/account/account.service';
import { PaymentMethodService } from '../../../settings/payment-method/payment-method.service';
import { CategoryService } from '../../../settings/category/category.service';
import { DashboardService } from '../../../dashboards/dashboard.service';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';
import { AccountFormComponent } from '../../../settings/account/account-form/account-form.component';
import { CategoryFormComponent } from '../../../settings/category/category-form/category-form.component';
import { PaymentMethodFormComponent } from '../../../settings/payment-method/payment-method-form/payment-method-form.component';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { Transaction } from '../../transaction.model';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';

// --- Stubs légers d'isolation des dépendances enfants complexes ---
@Component({ selector: 'app-account-form', template: '' })
class StubAccountFormComponent {
  readonly saveSuccess = output<number>();
}

@Component({ selector: 'app-category-form', template: '' })
class StubCategoryFormComponent {
  readonly saveSuccess = output<number>();
}

@Component({ selector: 'app-payment-method-form', template: '' })
class StubPaymentMethodFormComponent {
  readonly saveSuccess = output<number>();
}

@Component({ selector: 'app-modal', template: '' })
class StubModalComponent {
  readonly options = input<string>('');
  open = vi.fn();
  close = vi.fn();
}

describe('TransactionFormComponent', () => {
  let component: TransactionFormComponent;
  let fixture: ComponentFixture<TransactionFormComponent>;
  let mockTransactionService: any;
  let mockAccountService: any;
  let mockPaymentMethodService: any;
  let mockCategoryService: any;
  let mockDashboardService: any;
  let mockToastService: any;

  let txToEditSignal: WritableSignal<Transaction | null>;
  let allTxSignal: WritableSignal<Transaction[]>;

  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    txToEditSignal = signal<Transaction | null>(null);
    allTxSignal = signal<Transaction[]>([]);

    mockTransactionService = {
      transactionToEdit: txToEditSignal,
      allTransactionsSignal: allTxSignal,
      createTransaction: vi.fn().mockReturnValue(of({})),
      updateTransaction: vi.fn().mockReturnValue(of({})),
      generateRecurrentTransactions: vi.fn().mockReturnValue(of({})),
    };

    mockAccountService = { activeAccounts: signal([{ id: 1, label: 'Compte A', isActive: true }]) };
    mockPaymentMethodService = { activePaymentMethods: signal([{ id: 1, label: 'Carte' }]) };
    mockCategoryService = { activeCategories: signal([{ id: 1, label: 'Courses' }]) };

    mockDashboardService = {
      selectedAccountId: signal<number | null>(1),
    };

    mockToastService = { show: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [TransactionFormComponent, ReactiveFormsModule],
      providers: [
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: AccountService, useValue: mockAccountService },
        { provide: PaymentMethodService, useValue: mockPaymentMethodService },
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: ToastService, useValue: mockToastService },
      ],
    })
      .overrideComponent(TransactionFormComponent, {
        remove: {
          imports: [
            AccountFormComponent,
            CategoryFormComponent,
            PaymentMethodFormComponent,
            ModalComponent,
          ],
        },
        add: {
          imports: [
            StubAccountFormComponent,
            StubCategoryFormComponent,
            StubPaymentMethodFormComponent,
            StubModalComponent,
          ],
        },
      })
      .compileComponents();
  });

  const createComponent = async (): Promise<void> => {
    fixture = TestBed.createComponent(TransactionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  describe('Initialisation Nominale du Formulaire réactif', () => {
    it('should generate form groups validations rules and set automated target date', async () => {
      await createComponent();

      expect(component['transactionForm']).toBeDefined();
      expect(component['transactionForm'].get('type')?.value).toBe('DEBIT');
      expect(component['transactionForm'].get('amount')?.value).toBeNull();
      expect(component['transactionForm'].get('recurrenceMonths')?.value).toBe(0);
    });
  });

  describe('Raccourcis de Création Rapide et Modales (onChangeSelect)', () => {
    it('should catch select assignment additions tokens and open modal instances', async () => {
      await createComponent();

      // Affectation des instances de stubs sur les viewchild pour simuler l'UI
      const fakeModal = { open: vi.fn(), close: vi.fn() } as any;
      component.modalComponentAccount = fakeModal;

      const mockEvent = { target: { value: 'add' } } as unknown as Event;
      component['onChangeSelect'](mockEvent, 'account');

      expect(fakeModal.open).toHaveBeenCalled();
    });

    it('should seamlessly catch output signals from inner forms and patch value fields', async () => {
      await createComponent();
      component.onAccountCreated(42);
      expect(component['transactionForm'].get('accountId')?.value).toBe(42);

      component.onCategoryCreated(88);
      expect(component['transactionForm'].get('categoryId')?.value).toBe(88);

      component.onPaymentMethodCreated(99);
      expect(component['transactionForm'].get('paymentMethodId')?.value).toBe(99);
    });
  });
  describe('Soumissions du Formulaire et Traitement API (onSubmit / onCancelEdit)', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should discard submission workflows instantly if form controls parameters are invalid', () => {
      component['transactionForm'].patchValue({ amount: null });
      component['onSubmit']();

      expect(mockTransactionService.createTransaction).not.toHaveBeenCalled();
    });

    it('should invoke createTransaction API payload, trigger success toaster notice and clear input pointers', () => {
      component['transactionForm'].setValue({
        amount: 45.5,
        emissionDate: '2026-11-10',
        type: 'DEBIT',
        description: 'Courses hebdomadaires',
        recurrenceMonths: 0,
        isChecked: false,
        accountId: '1',
        categoryId: '1',
        paymentMethodId: '1',
      });

      component['onSubmit']();

      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 45.5,
          type: 'DEBIT',
          description: 'Courses hebdomadaires',
        }),
      );
      expect(mockToastService.show).toHaveBeenCalledWith('Transaction enregistrée !', 'success');
      expect(component['transactionForm'].get('amount')?.value).toBeNull();
    });

    it('should swap context routing rules onto updateTransaction when an active selection editing model is matched', () => {
      txToEditSignal.set({
        id: 999,
        amount: 100,
        emissionDate: '2026-11-10',
        type: 'CREDIT',
        description: 'Remboursement',
      } as any);
      fixture.detectChanges();

      // Remplissage complet des champs requis pour valider le formulaire en mode édition
      component['transactionForm'].setValue({
        amount: 120,
        emissionDate: '2026-11-10',
        type: 'CREDIT',
        description: 'Remboursement Modifié',
        recurrenceMonths: 0,
        isChecked: false,
        accountId: '1',
        categoryId: '1',
        paymentMethodId: '1',
      });

      component['onSubmit']();

      expect(mockTransactionService.updateTransaction).toHaveBeenCalledWith(
        999,
        expect.objectContaining({
          id: 999,
          amount: 120,
          type: 'CREDIT',
          description: 'Remboursement Modifié',
        }),
      );
      expect(mockToastService.show).toHaveBeenCalledWith('Transaction mise à jour !', 'success');
      expect(txToEditSignal()).toBeNull();
    });

    it('should purge editing context configurations completely and fire reset upon onCancelEdit triggers', () => {
      txToEditSignal.set({ id: 55 } as any);
      component.onCancelEdit();

      expect(txToEditSignal()).toBeNull();
    });
  });

  describe('Génération de Masse des Transactions Récurrentes (generateRecurrent)', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should log successes toaster notifications reflecting accurately numbers of created transactions entries', () => {
      mockDashboardService.selectedAccountId.set(1);

      // Simule une augmentation de taille de la liste globale (ex: 2 nouvelles lignes insérées)
      allTxSignal.set([]);
      mockTransactionService.generateRecurrentTransactions.mockImplementation(() => {
        allTxSignal.set([{ id: 1 } as any, { id: 2 } as any]);
        return of({});
      });

      component['generateRecurrent'](12, 2026);

      expect(mockTransactionService.generateRecurrentTransactions).toHaveBeenCalledWith(12, 2026);
      expect(mockToastService.show).toHaveBeenCalledWith(
        '2 transactions récurrentes ont été générées !',
        'success',
      );
    });

    it('should dispatch info messages parameters if target numbers of lines remain static', () => {
      allTxSignal.set([]);
      mockTransactionService.generateRecurrentTransactions.mockReturnValue(of({}));

      component['generateRecurrent'](12, 2026);
      expect(mockToastService.show).toHaveBeenCalledWith(
        'Toutes les transactions récurrentes existent déjà pour ce mois',
        'info',
      );
    });

    it('should cascade failure toaster structures prompts whenever endpoints execution processes reject calls', () => {
      mockTransactionService.generateRecurrentTransactions.mockReturnValue(
        throwError(() => new Error('Fatal')),
      );

      component['generateRecurrent'](12, 2026);
      expect(mockToastService.show).toHaveBeenCalledWith(
        'Erreur lors de la génération automatique',
        'error',
      );
    });
  });
});
