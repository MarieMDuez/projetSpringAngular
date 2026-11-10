import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  Component,
  input,
  output,
  signal,
  WritableSignal,
  Pipe,
  PipeTransform,
} from '@angular/core';
import { TransactionTableComponent } from './transaction-table.component';
import { TransactionService } from '../../transaction.service';
import { AccountService } from '../../../settings/account/account.service';
import { CategoryService } from '../../../settings/category/category.service';
import { PaymentMethodService } from '../../../settings/payment-method/payment-method.service';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { FindByIdPipe } from '../../../shared/pipes/find-by-id-pipe';
import { Transaction } from '../../transaction.model';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

registerLocaleData(localeFr, 'fr-FR');

// --- Stubs d'isolation des dépendances enfants et des pipes personnalisés ---
@Component({ selector: 'app-modal', template: '' })
class StubModalComponent {
  readonly title = input<string>('');
  readonly options = input<string>('');
  readonly type = input<string>('');
  readonly resultAction = output<any>();
}

@Pipe({
  name: 'findById',
  standalone: true,
})
class StubFindByIdPipe implements PipeTransform {
  transform(items: any[], id: number) {
    return items ? items.find((i) => i.id === id) || null : null;
  }
}

describe('TransactionTableComponent', () => {
  let component: TransactionTableComponent;
  let fixture: ComponentFixture<TransactionTableComponent>;
  let mockTransactionService: any;
  let mockAccountService: any;
  let mockCategoryService: any;
  let mockPaymentMethodService: any;
  let mockToastService: any;

  let filteredTxSignal: WritableSignal<Transaction[]>;
  let txToEditSignal: WritableSignal<Transaction | null>;
  const getMockTransactions = (): Transaction[] => [
    {
      id: 501,
      amount: 1450.75,
      emissionDate: '2026-11-10',
      type: 'DEBIT',
      description: 'Loyer mensuel',
      recurrenceMonths: 1,
      isChecked: true,
      isAlertTriggered: false,
      parentTransactionId: null,
      account: { id: 10 },
      category: { id: 20 },
      paymentMethod: { id: 30 },
    },
    {
      id: 502,
      amount: 200,
      emissionDate: '2026-11-10',
      type: 'CREDIT',
      description: 'Vente occasion',
      recurrenceMonths: 0,
      isChecked: false,
      isAlertTriggered: false,
      parentTransactionId: null,
      account: { id: 10 },
      category: { id: 40 },
      paymentMethod: { id: 30 },
    },
  ];

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const norm = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();

  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    filteredTxSignal = signal<Transaction[]>(getMockTransactions());
    txToEditSignal = signal<Transaction | null>(null);

    mockTransactionService = {
      filteredTransactionsSignal: filteredTxSignal,
      transactionToEdit: txToEditSignal,
      deleteTransaction: vi.fn().mockReturnValue(of(true)),
      updateTransaction: vi.fn().mockReturnValue(of({})),
    };

    mockAccountService = {
      allAccounts: signal([{ id: 10, label: 'Compte Principal', isActive: true }]),
    };
    mockCategoryService = {
      allCategories: signal([
        { id: 20, label: 'Logement', isActive: true },
        { id: 40, label: 'Divertissement', isActive: true },
      ]),
    };
    mockPaymentMethodService = {
      allPaymentMethods: signal([{ id: 30, label: 'Virement', isActive: true }]),
    };
    mockToastService = { show: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [TransactionTableComponent],
      providers: [
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: AccountService, useValue: mockAccountService },
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: PaymentMethodService, useValue: mockPaymentMethodService },
        { provide: ToastService, useValue: mockToastService },
      ],
    })
      .overrideComponent(TransactionTableComponent, {
        remove: { imports: [ModalComponent, FindByIdPipe] },
        add: { imports: [StubModalComponent, StubFindByIdPipe] },
      })
      .compileComponents();
  });

  const createComponent = async (): Promise<void> => {
    fixture = TestBed.createComponent(TransactionTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  describe('Initialisation Générale et Indexation (trackBy)', () => {
    it('should assign a fallback fallback tracking index if identifiers are missing', async () => {
      await createComponent();
      expect(component['trackByTransactionId'](0, { id: 42 } as any)).toBe(42);
      expect(component['trackByTransactionId'](1, { description: 'test' } as any)).toBe(-1);
    });
  });

  describe('Actions de Saisie Directe et Redirection (onEdit)', () => {
    it('should set global editing signal context pointer and activate smooth window scrolling', async () => {
      await createComponent();
      const spyScroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
      const targetTx = getMockTransactions()[0];

      const anchor = document.createElement('div');
      anchor.id = 'editFormTransaction';
      el().appendChild(anchor);

      component.onEdit(targetTx);

      expect(txToEditSignal()).toEqual(targetTx);
      expect(spyScroll).toHaveBeenCalled();
      anchor.remove();
    });
  });
  describe('Inversions d États et Pointages Synchrone (onToggleCheck)', () => {
    it('should calculate inverse boolean flag attributes and trigger updateTransaction API', async () => {
      await createComponent();
      const targetTx = getMockTransactions()[0]; // isChecked: true initialement

      component.onToggleCheck(targetTx);

      expect(mockTransactionService.updateTransaction).toHaveBeenCalledWith(501, {
        ...targetTx,
        isChecked: false,
      });
    });

    it('should deploy failure notification popups blocks whenever endpoint parameters reject modifications', async () => {
      mockTransactionService.updateTransaction.mockReturnValue(throwError(() => new Error('Lock')));
      await createComponent();
      const targetTx = getMockTransactions()[1];

      component.onToggleCheck(targetTx);

      expect(mockToastService.show).toHaveBeenCalledWith(
        'Une erreur est survenue lors du pointage de la transaction',
        'error',
      );
    });
  });

  describe('Validation des Modales et Flux de Deletion (deleteTransaction)', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should request backend deleteTransaction endpoint on confirm trigger and emit toast notice', () => {
      const targetTx = getMockTransactions()[0];
      component['transactionToDelete'].set(targetTx);

      component['deleteTransaction']('confirm');

      expect(mockTransactionService.deleteTransaction).toHaveBeenCalledWith(501);
      expect(mockToastService.show).toHaveBeenCalledWith(
        'Transaction supprimée avec succès !',
        'success',
      );
    });

    it('should issue generic alert messages if backend deletion routines fail unexpectedly', () => {
      mockTransactionService.deleteTransaction.mockReturnValue(
        throwError(() => new Error('Fatal')),
      );
      const targetTx = getMockTransactions()[0];
      component['transactionToDelete'].set(targetTx);

      component['deleteTransaction']('confirm');

      expect(mockToastService.show).toHaveBeenCalledWith(
        'Une erreur est survenue lors de la suppression',
        'error',
      );
    });

    it('should flash temporary deletions pointers without modifications when cancel actions fire', () => {
      component['transactionToDelete'].set(getMockTransactions()[0]);

      component['deleteTransaction']('cancel');

      expect(component['transactionToDelete']()).toBeNull();
      expect(mockTransactionService.deleteTransaction).not.toHaveBeenCalled();
    });
  });

  describe('Validation Syntaxique du Template HTML', () => {
    it('should render placeholders layout messages if filtered arrays dry out to empty status', async () => {
      filteredTxSignal.set([]);
      await createComponent();

      const emptyBlock = el().querySelector('.empty-state');
      expect(emptyBlock).not.toBeNull();
      expect(norm(emptyBlock?.textContent)).toBe('Aucune transaction pour le moment.');
    });
  });
});
