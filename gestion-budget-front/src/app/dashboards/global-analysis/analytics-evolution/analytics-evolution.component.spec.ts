import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsEvolutionComponent } from './analytics-evolution.component';
import { DashboardService } from '../../dashboard.service';
import { AccountService } from '../../../settings/account/account.service';
import { TransactionService } from '../../../transaction/transaction.service';
import { signal, Component } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { AnalyticsEvolutionDto } from './analytics-evolution.model';

@Component({ selector: 'apx-chart', template: '' })
class StubApexChartComponent {}

describe('AnalyticsEvolutionComponent', () => {
  let component: AnalyticsEvolutionComponent;
  let fixture: ComponentFixture<AnalyticsEvolutionComponent>;
  let mockDashboardService: any;
  let mockAccountService: any;
  let mockTransactionService: any;

  const currentYear = new Date().getFullYear();

  const mockEvolutionDto: AnalyticsEvolutionDto = {
    globalEvolution: [
      { month: 1, debits: 1200, credits: 2000 }, // Janvier : Résultat Net +800
      { month: 2, debits: 2500, credits: 1800 }, // Février : Résultat Net -700
      { month: 3, debits: 0, credits: 0 }, // Mars : Résultat Net 0
    ],
    categoryEvolution: [],
    paymentEvolution: [],
  };

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const norm = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mockDashboardService = {
      selectedYear: signal<number>(currentYear),
      getEvolution: vi.fn().mockReturnValue(of(mockEvolutionDto)),
    };

    mockAccountService = {
      activeAccounts: signal([]),
    };

    mockTransactionService = {};

    TestBed.configureTestingModule({
      imports: [AnalyticsEvolutionComponent],
    }).overrideComponent(AnalyticsEvolutionComponent, {
      set: {
        providers: [
          { provide: DashboardService, useValue: mockDashboardService },
          { provide: AccountService, useValue: mockAccountService },
          { provide: TransactionService, useValue: mockTransactionService },
        ],
      },
    });
  });

  const createComponent = async (): Promise<void> => {
    fixture = TestBed.createComponent(AnalyticsEvolutionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  describe('Cycle de vie, Hydratation et Robustesse API', () => {
    it('should invoke getEvolution via constructor effect and hydrate evolutionData signal', async () => {
      await createComponent();

      expect(mockDashboardService.getEvolution).toHaveBeenCalled();
      expect(component['evolutionData']()).toEqual(mockEvolutionDto);
    });

    it('should capture HTTP runtime faults, push trace onto console, and gracefully keep state clean', async () => {
      mockDashboardService.getEvolution.mockReturnValue(throwError(() => new Error('DB Down')));
      await createComponent();

      expect(component['evolutionData']()).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Erreur lors du chargement de l'évolution chronologique",
      );
    });
  });

  describe('Mécanique Logique des Signaux et Variables Statiques', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should pre-populate correct static dimensions for availableYears and French xAxisMonths', () => {
      expect(component['xAxisMonths']).toHaveLength(12);
      expect(component['xAxisMonths'][0]).toBe('Janv');
      expect(component['xAxisMonths'][11]).toBe('Déc');

      expect(component['availableYears']).toHaveLength(5);
      expect(component['availableYears']).toContain(currentYear);
    });

    it('should transform data matrices into explicit inputs formatted for the line/bar graphs series fields', () => {
      const computedSeries = component['globalSeries']();

      expect(computedSeries).toHaveLength(2);
      expect(computedSeries[0].name).toBe('Dépenses (-)');
      expect(computedSeries[0].data).toEqual([1200, 2500, 0]);

      expect(computedSeries[1].name).toBe('Revenus (+)');
      expect(computedSeries[1].data).toEqual([2000, 1800, 0]);
    });

    it('should default to empty arrays safely inside chart mappings when global dataset drops to null', () => {
      component['evolutionData'].set(null);
      fixture.detectChanges();

      const computedSeries = component['globalSeries']();
      expect(computedSeries[0].data).toEqual([]);
      expect(computedSeries[1].data).toEqual([]);
    });
  });
  describe('Intégration du Template DOM et Rendu Réel', () => {
    it('should project the current selected year inside the table card title header node', async () => {
      mockDashboardService.selectedYear.set(2027);
      await createComponent();

      const titleText = norm(el().querySelector('.card-title')?.textContent);
      expect(titleText).toContain('Bilan Mensuel Détaillé (2027)');
    });

    it('should iterate and render one data row per element available inside the globalEvolution array', async () => {
      await createComponent();

      const tableRows = el().querySelectorAll('.evolution-table tbody tr');
      expect(tableRows).toHaveLength(3);
    });

    it('should map month numerical tokens into correct literal label shortcuts via xAxisMonths array lookup', async () => {
      await createComponent();

      const labels = Array.from(
        el().querySelectorAll('.evolution-table tbody tr .month-label'),
      ).map((node) => node.textContent?.trim());

      expect(labels[0]).toBe('Janv');
      expect(labels[1]).toBe('Févr');
      expect(labels[2]).toBe('Mars');
    });

    it('should apply positive badges and format text nodes accurately when item credits exceed debits', async () => {
      await createComponent();

      const tableRows = el().querySelectorAll('.evolution-table tbody tr');
      // Janvier est à l'index 0
      const cells = tableRows[0].querySelectorAll('td');

      expect(norm(cells[1].textContent)).toMatch(/1[ ,.]200[.,]00 €/);
      expect(norm(cells[2].textContent)).toMatch(/2[ ,.]000[.,]00 €/);

      // Index 3 (Résultat Net) : 2000 - 1200 = 800
      const netCell = cells[3];
      expect(norm(netCell.textContent)).toMatch(/800[.,]00 €/);
      expect(netCell.classList.contains('positive')).toBe(true);
      expect(netCell.classList.contains('negative')).toBe(false);
    });

    it('should apply negative structural classes when debits are strictly greater than credits', async () => {
      await createComponent();

      const tableRows = el().querySelectorAll('.evolution-table tbody tr');
      // Février est à l'index 1
      const cells = tableRows[1].querySelectorAll('td');

      // Index 3 (Résultat Net) : Février 1800 - 2500 = -700
      const netCell = cells[3];
      expect(norm(netCell.textContent)).toMatch(/-700[.,]00 €/);
      expect(netCell.classList.contains('negative')).toBe(true);
      expect(netCell.classList.contains('positive')).toBe(false);
    });

    it('should consider equilibrium (net zero) as positive status without negative styling badges', async () => {
      await createComponent();

      const tableRows = el().querySelectorAll('.evolution-table tbody tr');
      // Mars est à l'index 2
      const cells = tableRows[2].querySelectorAll('td');

      // Index 3 (Résultat Net) : Mars 0 - 0 = 0 -> Reste dans la condition positive >= 0
      const netCell = cells[3];
      expect(norm(netCell.textContent)).toMatch(/0[.,]00 €/);
      expect(netCell.classList.contains('positive')).toBe(true);
      expect(netCell.classList.contains('negative')).toBe(false);
    });
  });
});
