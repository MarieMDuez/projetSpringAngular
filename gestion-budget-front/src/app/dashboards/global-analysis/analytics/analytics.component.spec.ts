import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsDashboardComponent } from './analytics.component';
import { DashboardService } from '../../dashboard.service';
import { TransactionService } from '../../../transaction/transaction.service';
import { signal, Component } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError, Subject } from 'rxjs';
import { AnalyticsDashboardDto } from './analytics-dashboard.model';

@Component({ selector: 'apx-chart', template: '' })
class StubApexChartComponent {}

describe('AnalyticsDashboardComponent', () => {
  let component: AnalyticsDashboardComponent;
  let fixture: ComponentFixture<AnalyticsDashboardComponent>;
  let mockDashboardService: any;
  let mockTransactionService: any;

  const mockAnalyticsDto: AnalyticsDashboardDto = {
    categoryDistribution: [
      { label: 'Courses', total: 150, type: 'DEBIT' },
      { label: 'Netflix', total: 10, type: 'DEBIT' },
      { label: 'Salaire', total: 2000, type: 'CREDIT' },
      { label: 'Freelance', total: 500, type: 'CREDIT' },
    ],
    paymentDistribution: [
      { label: 'Carte Bancaire', total: 160, type: 'DEBIT' },
      { label: 'Virement', total: 2500, type: 'CREDIT' },
    ],
  };

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const norm = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();
  const text = (selector: string): string => norm(el().querySelector(selector)?.textContent);

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mockDashboardService = {
      getAnalytics: vi.fn().mockReturnValue(of(mockAnalyticsDto)),
    };
    mockTransactionService = {};

    TestBed.configureTestingModule({
      imports: [AnalyticsDashboardComponent],
    }).overrideComponent(AnalyticsDashboardComponent, {
      set: {
        providers: [
          { provide: DashboardService, useValue: mockDashboardService },
          { provide: TransactionService, useValue: mockTransactionService },
        ],
      },
    });
  });

  const createComponent = async (): Promise<void> => {
    fixture = TestBed.createComponent(AnalyticsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  describe('Cycle de vie et Hydratation (API)', () => {
    it('should trigger getAnalytics on init and stop loading on success', async () => {
      await createComponent();

      expect(mockDashboardService.getAnalytics).toHaveBeenCalled();
      expect(component['isLoading']()).toBe(false);
      expect(component['analyticsData']()).toEqual(mockAnalyticsDto);
    });

    it('should catch API failures, log to console, and stop loading indicator securely', async () => {
      mockDashboardService.getAnalytics.mockReturnValue(throwError(() => new Error('Crash')));
      await createComponent();

      expect(component['isLoading']()).toBe(false);
      expect(component['analyticsData']()).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Erreur lors du chargement des statistiques de l'analytics",
      );
    });
  });

  describe('Logique Réactive des Signaux Calculés (Computed)', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should split categories and payment distributions into pure debit/credit data sets', () => {
      expect(component['categoryDebits']()).toHaveLength(2);
      expect(component['categoryCredits']()).toHaveLength(2);
      expect(component['paymentDebits']()).toHaveLength(1);
      expect(component['paymentCredits']()).toHaveLength(1);
    });

    it('should map arrays into correct formats for series numbers and string labels', () => {
      expect(component['categoryDebitsSeries']()).toEqual([150, 10]);
      expect(component['categoryDebitsLabels']()).toEqual(['Courses', 'Netflix']);
    });

    it('should perform secure aggregations and compute accurate accumulated sums', () => {
      expect(component['categoryDebitsTotal']()).toBe(160);
      expect(component['categoryCreditsTotal']()).toBe(2500);
    });

    it('should fall back gracefully to empty structures when base data is nullified', () => {
      component['analyticsData'].set(null);
      fixture.detectChanges();

      expect(component['categoryDebits']()).toEqual([]);
      expect(component['categoryDebitsTotal']()).toBe(0);
    });
  });
  describe('Configurations des Graphiques ApexCharts', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should generate valid ApexOptions layout structures', () => {
      const options = component['categoryDebitsOptions']();
      expect(options.chart?.type).toBe('donut');
      expect(options.chart?.height).toBe(350);
      expect(options.colors).toEqual(component['chartColors']);
    });

    it('should format labels text nodes with locale currency symbols', () => {
      const options = component['categoryDebitsOptions']();
      const valueFormatter = options.plotOptions?.pie?.donut?.labels?.value?.formatter;
      const totalFormatter = options.plotOptions?.pie?.donut?.labels?.total?.formatter;

      expect(valueFormatter).toBeDefined();
      expect(totalFormatter).toBeDefined();

      const resultValue = valueFormatter!('150').replace(/\s+/g, ' ');
      const resultTotal = totalFormatter!({} as any).replace(/\s+/g, ' ');

      expect(resultValue).toContain('150,00 €');
      expect(resultTotal).toContain('160,00 €');
    });
  });

  describe('Intégration du Template DOM et Rendu Réel', () => {
    it('should display the loading placeholder container when analyticsData is null', async () => {
      const loadingSubject = new Subject<any>();
      mockDashboardService.getAnalytics.mockReturnValue(loadingSubject);

      fixture = TestBed.createComponent(AnalyticsDashboardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(el().querySelector('.loading-state')).not.toBeNull();
      expect(text('.loading-state')).toContain('Analyse des transactions financières en cours...');
      expect(el().querySelector('.analytics-grid')).toBeNull();

      loadingSubject.next(mockAnalyticsDto);
      loadingSubject.complete();
    });

    it('should hide loading indicators and paint sections once hydrations succeed', async () => {
      await createComponent();

      expect(el().querySelector('.loading-state')).toBeNull();
      expect(el().querySelector('.analytics-grid')).not.toBeNull();

      const sectionTitles = Array.from(el().querySelectorAll('.card-title')).map((node) =>
        node.textContent?.trim(),
      );
      expect(sectionTitles).toContain('Ventilation par Catégories');
      expect(sectionTitles).toContain('Utilisation des Moyens de Paiement');
    });

    it('should inject correct amount text tokens inside data tables structures', async () => {
      await createComponent();

      const targetTableBody = el().querySelector(
        '.analytics-card:first-of-type .danger-theme .data-table tbody',
      );
      expect(targetTableBody).not.toBeNull();

      const rows = targetTableBody!.querySelectorAll('tr');
      expect(rows).toHaveLength(2);

      const firstRowCells = rows[0].querySelectorAll('td');
      expect(firstRowCells[0].textContent).toBe('Courses');
      const amountText = norm(firstRowCells[1].textContent);
      expect(amountText).toMatch(/150[,.]00 €/);
    });

    it('should swap chart elements with placeholder blocks when numeric matrices are empty', async () => {
      mockDashboardService.getAnalytics.mockReturnValue(
        of({
          categoryDistribution: [],
          paymentDistribution: [],
        }),
      );
      await createComponent();

      expect(el().querySelector('apx-chart')).toBeNull();
      expect(el().querySelector('.no-chart-data')).not.toBeNull();
      expect(text('.no-chart-data')).toContain('Aucune dépense (0 €)');
    });
  });
});
