import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, input, output, signal, WritableSignal } from '@angular/core';
import { ProjectedBudgetFilterComponent } from './projected-budget-filter.component';
import { DashboardService } from '../../dashboards/dashboard.service';
import { AccountService } from '../../settings/account/account.service';
import { ToastService } from '../../shared/ConfirmationToast/toast.service';
import { ProjectedBudgetService } from '../projected-budget.service';
import { ModalComponent } from '../../shared/modal/modal.component';
import { ProjectedBudgetPeriod } from '../projected-budget-period.model';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError, EMPTY } from 'rxjs';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { HttpErrorResponse } from '@angular/common/http';
import { By } from '@angular/platform-browser';

registerLocaleData(localeFr, 'fr-FR');

// --- Stub pour isoler la modale enfant et intercepter les appels open/close ---
@Component({ selector: 'app-modal', template: '' })
class StubModalComponent {
  readonly title = input<string>('');
  readonly options = input<string>('');
  readonly type = input<string>('');
  readonly confirmText = input<string>('');
  readonly cancelText = input<string>('');
  readonly resultAction = output<any>();

  open = vi.fn();
  close = vi.fn();
}

describe('ProjectedBudgetFilterComponent', () => {
  let component: ProjectedBudgetFilterComponent;
  let fixture: ComponentFixture<ProjectedBudgetFilterComponent>;
  let mockDashboardService: any;
  let mockProjectedBudgetService: any;
  let mockAccountService: any;
  let mockToastService: any;

  // Signaux réactifs pour piloter les états dans le service mocké
  let selectedAccountIdSignal: WritableSignal<number | null>;
  let selectedMonthSignal: WritableSignal<number | null>;
  let selectedYearSignal: WritableSignal<number | null>;
  let activePeriodSignal: WritableSignal<any | null>;
  let toolboxTransactionsSignal: WritableSignal<any[]>;
  let isLoadingSignal: WritableSignal<boolean>;

  const currentYear = new Date().getFullYear();

  const mockPeriods: ProjectedBudgetPeriod[] = [
    { id: 10, month: 5, year: currentYear, weeksCount: 4, accountId: 1 } as any,
    { id: 20, month: 6, year: currentYear, weeksCount: 5, accountId: 1 } as any,
  ];

  const mockItems = [{ id: 100, budgetPeriod: { id: 10, month: 5, year: currentYear } }];

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const norm = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    selectedAccountIdSignal = signal<number | null>(1);
    selectedMonthSignal = signal<number | null>(5);
    selectedYearSignal = signal<number | null>(currentYear);
    activePeriodSignal = signal<any | null>(null);
    toolboxTransactionsSignal = signal<any[]>([]);
    isLoadingSignal = signal<boolean>(false);

    mockDashboardService = {
      selectedAccountId: selectedAccountIdSignal,
      selectedMonth: selectedMonthSignal,
      selectedYear: selectedYearSignal,
    };

    mockAccountService = {
      activeAccounts: signal([
        { id: 1, label: 'Compte Courant' },
        { id: 2, label: 'Livret A' },
      ]),
    };

    mockToastService = {
      show: vi.fn(),
    };

    mockProjectedBudgetService = {
      isLoading: isLoadingSignal,
      activePeriod: activePeriodSignal,
      toolboxTransactions: toolboxTransactionsSignal,
      getAvailablePeriodsForDuplication: vi.fn().mockReturnValue(of(mockPeriods)),
      getProjectedBudgetItems: vi.fn().mockReturnValue(of(mockItems)),
      createProjectedBudgetPeriod: vi.fn().mockReturnValue(of(true)),
      executeDuplicationItems: vi.fn().mockReturnValue(of(true)),
      fetchSuggestedTransactions: vi.fn().mockReturnValue(of([])),
    };

    TestBed.configureTestingModule({
      imports: [ProjectedBudgetFilterComponent],
    })
      .overrideComponent(ProjectedBudgetFilterComponent, {
        remove: { imports: [ModalComponent] },
        add: { imports: [StubModalComponent] },
      })
      .overrideComponent(ProjectedBudgetFilterComponent, {
        set: {
          providers: [
            { provide: DashboardService, useValue: mockDashboardService },
            { provide: AccountService, useValue: mockAccountService },
            { provide: ProjectedBudgetService, useValue: mockProjectedBudgetService },
            { provide: ToastService, useValue: mockToastService },
          ],
        },
      });
  });

  const createComponent = async (): Promise<void> => {
    fixture = TestBed.createComponent(ProjectedBudgetFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  describe('Cycle de vie, Filtres Générés et Validation', () => {
    it('should query getAvailablePeriodsForDuplication immediately when accountId signal is active', async () => {
      await createComponent();

      expect(mockProjectedBudgetService.getAvailablePeriodsForDuplication).toHaveBeenCalledWith(1);
      expect(component.availablePeriods()).toEqual(mockPeriods);
    });

    it('should dynamically update validation rules state via isFilterValid computed chain', async () => {
      await createComponent();
      expect(component.isFilterValid()).toBe(true);

      selectedMonthSignal.set(null);
      fixture.detectChanges();
      expect(component.isFilterValid()).toBe(false);
    });

    it('should ignore duplicate selection assignments if account target value is already selected', async () => {
      await createComponent();
      const spySet = vi.spyOn(selectedAccountIdSignal, 'set');

      component['onAccountChange'](1);
      expect(spySet).not.toHaveBeenCalled();
    });
  });
  describe('Orchestration du Chargement Budgétaire (onLoadBudget)', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should set activePeriod, clear toolboxes, and trigger success notification when pre-existing items are recovered', () => {
      component.onLoadBudget();

      expect(mockProjectedBudgetService.getProjectedBudgetItems).toHaveBeenCalledWith(1, 5, 2026);
      expect(activePeriodSignal()).toEqual(mockItems[0].budgetPeriod);
      expect(toolboxTransactionsSignal()).toEqual([]);
      expect(mockToastService.show).toHaveBeenCalledWith(
        'Budget prévisionnel chargé avec succès',
        'success',
      );
    });

    it('should initialize a brand new period block fallback directly if returned item lists are empty', () => {
      mockProjectedBudgetService.getProjectedBudgetItems.mockReturnValue(of([]));
      component.onLoadBudget();

      expect(mockProjectedBudgetService.createProjectedBudgetPeriod).toHaveBeenCalledWith(
        1,
        5,
        2026,
        undefined,
      );
      expect(mockToastService.show).toHaveBeenCalledWith('Nouveau budget initialisé', 'success');
    });

    it('should catch HTTP 409 conflicts and gracefully fall back to suggest transactions routing actions', () => {
      const conflictError = new HttpErrorResponse({
        status: 409,
        error: { period: { id: 88, month: 5, year: 2026 } },
      });
      mockProjectedBudgetService.getProjectedBudgetItems.mockReturnValue(
        throwError(() => conflictError),
      );

      component.onLoadBudget();

      expect(activePeriodSignal()).toEqual(conflictError.error.period);
      expect(mockProjectedBudgetService.fetchSuggestedTransactions).toHaveBeenCalledWith(
        1,
        5,
        2026,
      );
    });

    it('should trigger pop-up modal open configurations if pre-existing elements match active clone request requirements', async () => {
      const stubModalInstance = fixture.debugElement.query(
        By.directive(StubModalComponent),
      ).componentInstance;

      const openSpy = vi.spyOn(stubModalInstance, 'open');

      component.onLoadBudget(10, 'init');
      fixture.detectChanges();

      expect(openSpy).toHaveBeenCalled();
      expect(isLoadingSignal()).toBe(false);
    });

    it('should fallback onto generalized error toast components when service request pipes reject unexpectedly', () => {
      mockProjectedBudgetService.getProjectedBudgetItems.mockReturnValue(
        throwError(() => new Error('Fatal')),
      );
      component.onLoadBudget();

      expect(mockToastService.show).toHaveBeenCalledWith(
        'Erreur lors du traitement du budget',
        'error',
      );
    });
  });

  describe('Mécanique d Écrasement et Duplication (executeDuplicationItems)', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should stop duplicate processing immediately if essential model information blocks are missing', () => {
      component.selectedModelPeriodId.set(null);
      component.executeDuplicationItems('confirm');

      expect(mockToastService.show).toHaveBeenCalledWith(
        'Impossible de dupliquer : informations manquantes.',
        'error',
      );
      expect(mockProjectedBudgetService.executeDuplicationItems).not.toHaveBeenCalled();
    });

    it('should bypass data overwriting procedures completely if action is explicitly canceled by user selection', () => {
      component.executeDuplicationItems('cancel');
      expect(mockProjectedBudgetService.executeDuplicationItems).not.toHaveBeenCalled();
    });

    it('should request backend synchronization and invoke success updates notifications when confirm is submitted', () => {
      component.selectedModelPeriodId.set(10);
      activePeriodSignal.set({ id: 20 });

      component.executeDuplicationItems('confirm');

      expect(mockProjectedBudgetService.executeDuplicationItems).toHaveBeenCalledWith(10, 20);
      expect(mockToastService.show).toHaveBeenCalledWith(
        'Budget écrasé et dupliqué avec succès !',
        'success',
      );
    });

    it('should trigger dedicated error notifications when duplication requests face infrastructure rejection', () => {
      component.selectedModelPeriodId.set(10);
      activePeriodSignal.set({ id: 20 });
      mockProjectedBudgetService.executeDuplicationItems.mockReturnValue(
        throwError(() => new Error('DB Lock')),
      );

      component.executeDuplicationItems('confirm');

      expect(mockToastService.show).toHaveBeenCalledWith(
        'Erreur lors de l’écrasement du budget.',
        'error',
      );
    });
  });
});
