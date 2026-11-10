import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, input, output, signal, WritableSignal } from '@angular/core';
import { ProjectedBudgetComponent } from './projected-budget.component';
import { DashboardService } from '../../dashboards/dashboard.service';
import { ProjectedBudgetService } from '../projected-budget.service';
import { ToastService } from '../../shared/ConfirmationToast/toast.service';
import { ProjectedBudgetCategoryType, ProjectedBudgetItems } from '../projected-budget-items.model';
import { Transaction } from '../../transaction/transaction.model';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ProjectedBudgetTableComponent } from '../projected-budget-table/projected-budget-table.component';
import { ProjectedBudgetToolboxComponent } from '../projected-budget-toolbox/projected-budget-toolbox.component';
import { ProjectedBudgetFilterComponent } from '../projected-budget-filter/projected-budget-filter.component';
import { ModalComponent } from '../../shared/modal/modal.component';

// --- Stubs Explicites des Composants Enfants pour Isoler le Parent ---
@Component({ selector: 'app-projected-budget-table', template: '' })
class StubProjectedBudgetTableComponent {
  readonly title = input.required<string>();
  readonly formArray = input.required<any[]>();
  readonly addRequested = output<void>();
  readonly deletedRequested = output<number>();
  readonly tableUpdated = output<void>();
}

@Component({ selector: 'app-projected-budget-filter', template: '' })
class StubProjectedBudgetFilterComponent {}

@Component({ selector: 'app-projected-budget-toolbox', template: '' })
class StubProjectedBudgetToolboxComponent {
  readonly dispatchRequested = output<any>();
}

@Component({ selector: 'app-modal', template: '' })
class StubModalComponent {
  readonly title = input<string>('');
  readonly options = input<string>('');
  readonly type = input<string>('');
  readonly confirmText = input<string>('');
  readonly cancelText = input<string>('');
  readonly resultAction = output<void>();
}

describe('ProjectedBudgetComponent', () => {
  let component: ProjectedBudgetComponent;
  let fixture: ComponentFixture<ProjectedBudgetComponent>;
  let mockDashboardService: any;
  let mockProjectedBudgetService: any;
  let mockToastService: any;

  let budgetItemsSignal: WritableSignal<ProjectedBudgetItems[]>;
  let toolboxTransactionsSignal: WritableSignal<Transaction[]>;

  const getMockBudgetItems = (): ProjectedBudgetItems[] => [
    {
      type: ProjectedBudgetCategoryType.INCOME,
      accountAmount: 2000,
      cashAmount: 100,
      comment: 'Salaire',
      category: { id: 1, label: 'Travail' },
      paymentMethod: { id: 1, label: 'Virement' },
    },
    {
      type: ProjectedBudgetCategoryType.FIXED_EXPENSE,
      accountAmount: 800,
      cashAmount: 0,
      comment: 'Loyer',
      category: { id: 2, label: 'Logement' },
      paymentMethod: { id: 1, label: 'Virement' },
    },
    {
      type: ProjectedBudgetCategoryType.SAVINGS,
      accountAmount: 200,
      cashAmount: 50,
      comment: 'Livret A',
      category: { id: 3, label: 'Épargne' },
      paymentMethod: { id: 2, label: 'Prélèvement' },
    },
    {
      type: ProjectedBudgetCategoryType.VARIABLE_EXPENSE,
      accountAmount: 300,
      cashAmount: 40,
      comment: 'Courses',
      category: { id: 4, label: 'Alimentation' },
      paymentMethod: { id: 3, label: 'Carte' },
    },
  ];

  const getMockTransaction = (): Transaction =>
    ({
      id: 99,
      amount: 150,
      category: { id: 5, label: 'Loisirs' },
      paymentMethod: { id: 3, label: 'Carte' },
    }) as any;

  beforeEach(() => {
    budgetItemsSignal = signal<ProjectedBudgetItems[]>(getMockBudgetItems());
    toolboxTransactionsSignal = signal<Transaction[]>([]);

    mockDashboardService = {
      selectedYear: signal(2026),
      selectedMonth: signal(10),
      selectedAccountId: signal(1),
      // Bouchon total pour intercepter et couper court à la fuite HTTP :
      getSummary: vi.fn().mockReturnValue(
        of({
          currentGlobalBalance: 0,
          projectedGlobalBalance: 0,
          accountsDetails: [],
        }),
      ),
    };
    mockToastService = {
      show: vi.fn(),
    };
    mockProjectedBudgetService = {
      budgetItems: budgetItemsSignal,
      toolboxTransactions: toolboxTransactionsSignal,
      saveProjectedBudgetItems: vi.fn().mockReturnValue(of(getMockBudgetItems())),
      deleteProjectedBudgetPeriod: vi.fn().mockReturnValue(of(true)),
    };

    TestBed.configureTestingModule({
      imports: [ProjectedBudgetComponent],
    })
      .overrideComponent(ProjectedBudgetComponent, {
        remove: {
          imports: [
            ProjectedBudgetTableComponent,
            ProjectedBudgetToolboxComponent,
            ProjectedBudgetFilterComponent,
            ModalComponent,
          ],
        },
        add: {
          imports: [
            StubProjectedBudgetTableComponent,
            StubProjectedBudgetToolboxComponent,
            StubProjectedBudgetFilterComponent,
            StubModalComponent,
          ],
        },
      })
      .overrideComponent(ProjectedBudgetComponent, {
        set: {
          providers: [
            { provide: DashboardService, useValue: mockDashboardService },
            { provide: ProjectedBudgetService, useValue: mockProjectedBudgetService },
            { provide: ToastService, useValue: mockToastService },
          ],
        },
      });
  });

  const createComponent = async (): Promise<void> => {
    fixture = TestBed.createComponent(ProjectedBudgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  describe('Initialisation et Signaux de Filtrage Groupe', () => {
    it('should split master budgetItems into discrete categories arrays computed chains', async () => {
      await createComponent();

      expect(component.incomes()).toHaveLength(1);
      expect(component.incomes()[0].comment).toBe('Salaire');

      expect(component.fixedExpenses()).toHaveLength(1);
      expect(component.savings()).toHaveLength(1);
      expect(component.variableExpenses()).toHaveLength(1);
    });

    it('should force reference mutation update on onItemChanged execution', async () => {
      await createComponent();
      const spyUpdate = vi.spyOn(budgetItemsSignal, 'update');

      component.onItemChanged();
      expect(spyUpdate).toHaveBeenCalled();
    });
  });

  describe('Gestion Logique de la Sidebar (Toolbox)', () => {
    it('should show sidebar automatically if toolbox has pending transactions and no user toggle', async () => {
      toolboxTransactionsSignal.set([getMockTransaction()]);
      await createComponent();

      expect(component.isSidebarVisible()).toBe(true);
    });

    it('should respect manual user override over automatic data-driven sidebar toggle triggers', async () => {
      await createComponent();
      expect(component.isSidebarVisible()).toBe(false);

      component.toggleSidebar();
      expect(component.isSidebarVisible()).toBe(true);

      component.toggleSidebar();
      expect(component.isSidebarVisible()).toBe(false);
    });
  });
  describe('Opérations d Édition (Lignes & Transactions)', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should append a blank data line block structure configured with accurate target CategoryType', () => {
      component.addNewLine(ProjectedBudgetCategoryType.INCOME);

      const currentItems = budgetItemsSignal();
      expect(currentItems).toHaveLength(5);
      expect(currentItems[4].type).toBe(ProjectedBudgetCategoryType.INCOME);
      expect(currentItems[4].accountAmount).toBe(0);
      expect(currentItems[4].comment).toBe('');
    });

    it('should find and splice the exact row index entry match inside the targeted CategoryType subset array', () => {
      // Suppression du premier element de FIXED_EXPENSE (index 0 de ce sous-groupe)
      component.deleteLine(ProjectedBudgetCategoryType.FIXED_EXPENSE, 0);

      const remainingItems = budgetItemsSignal();
      expect(remainingItems).toHaveLength(3);
      expect(remainingItems.some((item) => item.comment === 'Loyer')).toBe(false);
    });

    it('should return safely without breaking state transitions if deleteLine maps a non-existent group index', () => {
      component.deleteLine(ProjectedBudgetCategoryType.INCOME, 99);
      expect(budgetItemsSignal()).toHaveLength(4);
    });

    it('should transform a baseline transaction into budget items template mapping and clean toolbox arrays', () => {
      const pendingTransaction = getMockTransaction();
      toolboxTransactionsSignal.set([pendingTransaction]);

      component.onAddTransactionToBudget({
        transaction: pendingTransaction,
        targetCategoryType: ProjectedBudgetCategoryType.VARIABLE_EXPENSE,
      });

      const updatedItems = budgetItemsSignal();
      expect(updatedItems).toHaveLength(5);

      const appendedRow = updatedItems[4];
      expect(appendedRow.type).toBe(ProjectedBudgetCategoryType.VARIABLE_EXPENSE);
      expect(appendedRow.accountAmount).toBe(150);
      expect(appendedRow.category.label).toBe('Loisirs');

      // Doit purger la toolbox de l'element traité
      expect(toolboxTransactionsSignal()).toHaveLength(0);
    });
  });

  describe('Calculateurs Financiers et Formules Cumulées (Computed)', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should aggregate account and cash numbers accurately for each individual financial type', () => {
      // Revenus = 2000 + 100 = 2100
      expect(component.totalIncomes()).toBe(2100);
      // Épargne = 200 + 50 = 250
      expect(component.totalSavings()).toBe(250);
      // Fixes = 800 + 0 = 800
      expect(component.totalFixedExpenses()).toBe(800);
      // Variables = 300 + 40 = 340
      expect(component.totalVariableExpenses()).toBe(340);
    });

    it('should compute exact financial margins for Reste à vivre metric', () => {
      // 2100 (Revenus) - 800 (Fixes) = 1300
      expect(component.restToLive()).toBe(1300);
    });

    it('should track global remaining net margin inside final balance computation chains', () => {
      // 2100 - (250 + 800 + 340) = 710
      expect(component.balance()).toBe(710);
    });

    it('should sum all cashAmount fields across all categories for cashToGet accumulator', () => {
      // 100 (Incomes) + 0 (Fixed) + 50 (Savings) + 40 (Variable) = 190
      expect(component.cashToGet()).toBe(190);
    });
  });

  describe('Drag & Drop et Traitement CdkDragDrop', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should capture cross-container drops and proxy transaction transformation operations', () => {
      const droppedTransaction = getMockTransaction();
      const mockDragDropEvent: any = {
        previousContainer: { id: 'toolbox' },
        container: { id: 'incomes-list' },
        item: { data: droppedTransaction },
      };

      component.onDrop(mockDragDropEvent, ProjectedBudgetCategoryType.INCOME);
      expect(budgetItemsSignal()).toHaveLength(5);
    });

    it('should ignore local drops occurring within the exact same structural container context boundary', () => {
      const sameContainer = { id: 'incomes-list' };

      const mockDragDropEvent: any = {
        previousContainer: sameContainer,
        container: sameContainer,
        item: { data: {} },
      };

      component.onDrop(mockDragDropEvent, ProjectedBudgetCategoryType.INCOME);

      expect(budgetItemsSignal()).toHaveLength(4);
    });
  });

  describe('Persistance et Actions Globales (Submit / Delete)', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should clean invalid blank lines rows before triggering save API calls and emit success toast notification', () => {
      // Injection d'une ligne vide non renseignée
      budgetItemsSignal.update((items) => [
        ...items,
        {
          type: ProjectedBudgetCategoryType.INCOME,
          accountAmount: 0,
          cashAmount: 0,
          comment: '',
          category: { id: 0, label: '' },
          paymentMethod: { id: 0, label: '' },
        },
      ]);

      component.onSubmit();

      // La ligne vide doit être filtrée (supprimée) avant le push vers le serveur
      expect(budgetItemsSignal()).toHaveLength(4);
      expect(mockProjectedBudgetService.saveProjectedBudgetItems).toHaveBeenCalled();
      expect(mockToastService.show).toHaveBeenCalledWith(
        'Budget enregistré avec succès',
        'success',
      );
    });

    it('should display specialized error toast components when persistence endpoints reject calls', () => {
      mockProjectedBudgetService.saveProjectedBudgetItems.mockReturnValue(
        throwError(() => new HttpErrorResponse({ error: 'Bad Request' })),
      );

      component.onSubmit();
      expect(mockToastService.show).toHaveBeenCalledWith(
        `Une erreur est survenue lors de l'enregistrement du budget`,
        'error',
      );
    });

    it('should invoke delete execution lifecycle workflows upon onDeletePeriod invocation', () => {
      component.onDeletePeriod();
      expect(mockProjectedBudgetService.deleteProjectedBudgetPeriod).toHaveBeenCalled();
    });
  });
});
