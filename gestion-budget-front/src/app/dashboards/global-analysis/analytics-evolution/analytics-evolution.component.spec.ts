import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsEvolutionComponent } from './analytics-evolution.component';
import { DashboardService } from '../../dashboard.service';
import { AccountService } from '../../../settings/account/account.service';
import { TransactionService } from '../../../transaction/transaction.service';
import { signal, computed } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { AnalyticsEvolutionDto } from './analytics-evolution.model';

interface MockAccount {
  id: number;
  label: string;
  isActive: boolean;
}

describe('AnalyticsEvolutionComponent', () => {
  let component: AnalyticsEvolutionComponent;
  let fixture: ComponentFixture<AnalyticsEvolutionComponent>;

  const mockEvolutionData: AnalyticsEvolutionDto = {
    globalEvolution: [
      { month: 1, debits: 1200, credits: 2500 },
      { month: 2, debits: 1500, credits: 2300 },
    ],
    categoryEvolution: [],
    paymentEvolution: [],
  };

  const mockAccountsList = signal<MockAccount[]>([
    { id: 1, label: 'Compte Courant', isActive: true },
  ]);

  const mockAccountService = {
    activeAccounts: computed(() => mockAccountsList()),
  };

  const mockTransactionService = {
    selectedAccountIdFilter: signal<number | null>(null),
  };

  const mockDashboardService = {
    selectedYear: signal<number>(2026),
    isCheckedFilter: signal<boolean>(false),
    getEvolution: vi.fn().mockReturnValue(of(mockEvolutionData)),
  };

  beforeEach(async () => {
    mockDashboardService.getEvolution.mockReturnValue(of(mockEvolutionData));

    await TestBed.configureTestingModule({
      imports: [AnalyticsEvolutionComponent],
      providers: [
        { provide: AccountService, useValue: mockAccountService },
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyticsEvolutionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute global series correctly from evolution data', () => {
    const series = component['globalSeries']();

    expect(series).toHaveLength(2);
    expect(series[0].name).toBe('Dépenses (-)');
    expect(series[0].data).toEqual([1200, 1500]);
    expect(series[1].name).toBe('Revenus (+)');
    expect(series[1].data).toEqual([2500, 2300]);
  });

  it('should fallback to empty series arrays when evolution data is null', () => {
    component['evolutionData'].set(null);
    fixture.detectChanges();

    const series = component['globalSeries']();
    expect(series[0].data).toHaveLength(0);
    expect(series[1].data).toHaveLength(0);
  });

  it('should react and load new evolution data when context signals emit', () => {
    mockDashboardService.selectedYear.set(2027);
    fixture.detectChanges();

    expect(mockDashboardService.getEvolution).toHaveBeenCalledWith(null, 2027, false);
  });

  it('should handle api subcription error gracefully without breaking state', () => {
    mockDashboardService.getEvolution.mockReturnValue(
      throwError(() => new Error('Async network failure')),
    );

    component['loadEvolutionData'](null, 2026, false);

    expect(component['evolutionData']()).toEqual(mockEvolutionData);
  });
});
