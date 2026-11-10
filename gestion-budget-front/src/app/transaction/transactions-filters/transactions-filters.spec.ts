import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { TransactionService } from '../transaction.service';
import { DashboardService } from '../../dashboards/dashboard.service';
import { AccountService } from '../../settings/account/account.service';
import { CategoryService } from '../../settings/category/category.service';
import { PaymentMethodService } from '../../settings/payment-method/payment-method.service';
import { signal, WritableSignal, Directive } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { TransactionsFilters } from './transactions-filters';

// Stub de la directive présente dans le HTML
@Directive({
  selector: '[appSelectLoop]',
  standalone: true,
})
class StubSelectLoopDirective {}

describe('TransactionsFilters', () => {
  let component: TransactionsFilters;
  let fixture: ComponentFixture<TransactionsFilters>;
  let mockTransactionService: any;
  let mockDashboardService: any;
  let mockAccountService: any;
  let mockCategoryService: any;
  let mockPaymentMethodService: any;

  let selectedAccountIdSignal: WritableSignal<number | null>;

  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    selectedAccountIdSignal = signal<number | null>(1);

    mockTransactionService = {
      uniqueRecurrences: signal([0, 1, 3]),
      loadUniqueRecurrences: vi.fn().mockReturnValue(of([])),
      loadFilteredTransactions: vi.fn().mockReturnValue(of([])),
    };

    mockDashboardService = {
      selectedAccountId: selectedAccountIdSignal,
      loadBalances: vi.fn().mockReturnValue(of({})),
    };

    mockAccountService = { allAccounts: signal([{ id: 1, label: 'Compte A', isActive: true }]) };
    mockCategoryService = { allCategories: signal([{ id: 10, label: 'Courses', isActive: true }]) };
    mockPaymentMethodService = {
      allPaymentMethods: signal([{ id: 20, label: 'Carte', isActive: true }]),
    };

    // Neutralisation de setupDynamicFiltering lors de la compilation pour maîtriser l'asynchronisme
    vi.spyOn(TransactionsFilters.prototype, 'setupDynamicFiltering').mockImplementation(vi.fn());

    await TestBed.configureTestingModule({
      imports: [TransactionsFilters, ReactiveFormsModule, StubSelectLoopDirective],
      providers: [
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: AccountService, useValue: mockAccountService },
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: PaymentMethodService, useValue: mockPaymentMethodService },
      ],
    }).compileComponents();
  });

  const createComponent = async (): Promise<void> => {
    fixture = TestBed.createComponent(TransactionsFilters);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  describe('Initialisation et Liaison des Données (OnInit)', () => {
    it('should generate form controls and query unique recurrences from service pipeline', async () => {
      await createComponent();

      expect(component['filterForm']).toBeDefined();
      expect(component['filterForm'].get('limit')?.value).toBe(50);
      expect(mockTransactionService.loadUniqueRecurrences).toHaveBeenCalled();
    });

    it('should pre-populate account identifier control based on dashboard global context states', async () => {
      selectedAccountIdSignal.set(42);
      await createComponent();

      // On compare des types identiques (number ou string selon le format reçu)
      expect(Number(component['filterForm'].get('accountId')?.value)).toBe(42);
    });
  });

  describe('Gestion Rétractable de l Affichage (Toggle)', () => {
    it('should update open state variable flags and follow user clicks', async () => {
      await createComponent();
      expect(component['isFilterOpen']()).toBe(false);

      component['toggleFilterOpen']();
      expect(component['isFilterOpen']()).toBe(true);
    });
  });
  describe('Réinitialisations et Purges Métier (clearFilters)', () => {
    beforeEach(async () => {
      await createComponent();
      component['filterForm'].patchValue({
        accountId: '1',
        categoryId: '10',
        year: 2026,
      });
    });

    it('should reset target input properties to baseline empty values upon clearSingleFilter execution', () => {
      component.clearSingleFilter('categoryId');
      expect(component['filterForm'].get('categoryId')?.value).toBe('');
      expect(component['filterForm'].get('year')?.value).toBe(2026);
    });

    it('should explicitly clear global dashboard state pointers if target field matches accountId', () => {
      component.clearSingleFilter('accountId');
      expect(component['filterForm'].get('accountId')?.value).toBe('');
      expect(mockDashboardService.selectedAccountId()).toBeNull();
    });

    it('should flush all input entries variables to defaults parameters on clearAllFilters submittal', () => {
      component.clearAllFilters();

      expect(component['filterForm'].get('categoryId')?.value).toBe('');
      expect(component['filterForm'].get('limit')?.value).toBe(50);
      expect(mockDashboardService.selectedAccountId()).toBeNull();
      expect(mockTransactionService.loadFilteredTransactions).toHaveBeenCalledWith({ limit: 50 });
    });
  });

  describe('Validation de la Cinématique Filtrante Asynchrone', () => {
    it('should execute backend requests pipeline dynamically and register stream results', async () => {
      // Restauration de l'implémentation d'origine uniquement pour ce bloc
      vi.restoreAllMocks();

      fixture = TestBed.createComponent(TransactionsFilters);
      component = fixture.componentInstance;
      fixture.detectChanges();

      // On déclenche la modification du formulaire
      component['filterForm'].patchValue({ type: 'DEBIT' });
      fixture.detectChanges();

      // On attend la fin des 300ms de debounceTime de manière native
      await new Promise((resolve) => setTimeout(resolve, 310));
      fixture.detectChanges();

      expect(mockTransactionService.loadFilteredTransactions).toHaveBeenCalled();
      expect(mockDashboardService.loadBalances).toHaveBeenCalled();
    });
  });
});
