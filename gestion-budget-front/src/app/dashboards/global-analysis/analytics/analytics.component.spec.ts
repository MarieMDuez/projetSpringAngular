import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsDashboardComponent } from './analytics.component';
import { DashboardService } from '../../dashboard.service';
import { TransactionService } from '../../../transaction/transaction.service';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { AnalyticsDashboardDto } from './analytics-dashboard.model';

describe('AnalyticsDashboardComponent', () => {
  let component: AnalyticsDashboardComponent;
  let fixture: ComponentFixture<AnalyticsDashboardComponent>;

  const mockAnalyticsData: AnalyticsDashboardDto = {
    categoryDistribution: [
      { type: 'DEBIT', label: 'Alimentation', total: 150 },
      { type: 'CREDIT', label: 'Salaire', total: 2000 },
    ],
    paymentDistribution: [
      { type: 'DEBIT', label: 'Carte Bancaire', total: 150 },
      { type: 'CREDIT', label: 'Virement', total: 2000 },
    ],
  };

  const mockTransactionService = {
    selectedAccountIdFilter: signal<number | null>(null),
  };

  const mockDashboardService = {
    selectedMonth: signal<number | null>(9),
    selectedYear: signal<number>(2026),
    isCheckedFilter: signal<boolean>(false),
    getAnalytics: vi.fn().mockReturnValue(of(mockAnalyticsData)),
  };

  beforeEach(async () => {
    mockDashboardService.getAnalytics.mockReturnValue(of(mockAnalyticsData));

    await TestBed.configureTestingModule({
      imports: [AnalyticsDashboardComponent],
      providers: [
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyticsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute category distributions and totals correctly', () => {
    expect(component['categoryDebits']()).toHaveLength(1);
    expect(component['categoryDebits']()[0].label).toBe('Alimentation');
    expect(component['categoryDebitsTotal']()).toBe(150);

    expect(component['categoryCredits']()).toHaveLength(1);
    expect(component['categoryCredits']()[0].label).toBe('Salaire');
    expect(component['categoryCreditsTotal']()).toBe(2000);
  });

  it('should compute payment distributions and totals correctly', () => {
    expect(component['paymentDebits']()).toHaveLength(1);
    expect(component['paymentDebitsTotal']()).toBe(150);

    expect(component['paymentCredits']()).toHaveLength(1);
    expect(component['paymentCreditsTotal']()).toBe(2000);
  });

  it('should build chart options strictly matching ApexOptions structure', () => {
    const options = component['categoryDebitsOptions']();

    expect(options.chart?.type).toBe('donut');
    expect(options.series).toEqual([150]);
    expect(options.labels).toEqual(['Alimentation']);
    expect(options.plotOptions?.pie?.donut?.labels?.total?.label).toBe('Dépenses');
  });

  it('should format currency correctly according to fr-FR locale', () => {
    const formatted = component['formatCurrency'](1250.5);
    expect(formatted.replace(/\s/g, ' ')).toContain('1 250,50 €');
  });

  it('should react and reload data when filter signals change', () => {
    mockTransactionService.selectedAccountIdFilter.set(42);
    fixture.detectChanges();

    expect(mockDashboardService.getAnalytics).toHaveBeenCalledWith(42, 9, 2026, false);
  });

  it('should handle API errors gracefully', () => {
    mockDashboardService.getAnalytics.mockReturnValue(throwError(() => new Error('API Failure')));

    component['loadDashboardData'](null, 9, 2026, false);

    expect(component['isLoading']()).toBe(false);
    expect(component['analyticsData']()).toEqual(mockAnalyticsData);
  });
});
