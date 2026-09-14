import { Component, computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AccountService } from '../../settings/account/account.service';
import { TransactionService } from '../../transaction/transaction.service';
import { BalancesComponent } from '../balances/balances.component';
import { DashboardService } from '../dashboard.service';
import { AnalyticsEvolutionComponent } from './analytics-evolution/analytics-evolution.component';
import { AnalyticsDashboardComponent } from './analytics/analytics.component';
import { GlobalAnalysisComponent } from './global-analysis.component';
import { MatrixMonthlyComponent } from './matrix-monthly/matrix-monthly.component';
import { MatrixDashboardComponent } from './matrix/matrix-dashboard.component';

@Component({ selector: 'app-balances', template: '', standalone: true })
class MockBalancesComponent {}

@Component({ selector: 'app-analytics', template: '', standalone: true })
class MockAnalyticsDashboardComponent {}

@Component({ selector: 'app-matrix-monthly', template: '', standalone: true })
class MockMatrixMonthlyComponent {}

@Component({ selector: 'app-analytics-evolution', template: '', standalone: true })
class MockAnalyticsEvolutionComponent {}

@Component({ selector: 'app-matrix-dashboard', template: '', standalone: true })
class MockMatrixDashboardComponent {}

interface MockAccount {
  id: number;
  label: string;
  isActive: boolean;
}

describe('GlobalAnalysisComponent', () => {
  let component: GlobalAnalysisComponent;
  let fixture: ComponentFixture<GlobalAnalysisComponent>;

  const testAccounts = [
    { id: 1, label: 'Compte Courant', isActive: true },
    { id: 2, label: 'Livret A', isActive: true },
  ];

  const mockActiveAccounts = signal<MockAccount[]>(testAccounts);

  const mockAccountService = {
    activeAccounts: computed(() => mockActiveAccounts()),
  };

  const mockTransactionService = {
    selectedAccountIdFilter: signal<number | null>(null),
  };

  const mockDashboardService = {
    selectedYear: signal<number>(2026),
    selectedMonth: signal<number | null>(9),
    isCheckedFilter: signal<boolean>(false),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalAnalysisComponent],
      providers: [
        provideRouter([]),
        { provide: AccountService, useValue: mockAccountService },
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    })
      .overrideComponent(GlobalAnalysisComponent, {
        remove: {
          imports: [
            BalancesComponent,
            AnalyticsDashboardComponent,
            MatrixMonthlyComponent,
            AnalyticsEvolutionComponent,
            MatrixDashboardComponent,
          ],
        },
        add: {
          imports: [
            MockBalancesComponent,
            MockAnalyticsDashboardComponent,
            MockMatrixMonthlyComponent,
            MockAnalyticsEvolutionComponent,
            MockMatrixDashboardComponent,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(GlobalAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle a specific section state', () => {
    expect(component.isBalanceExpanded()).toBe(true);
    component.toggleSection('balance');
    expect(component.isBalanceExpanded()).toBe(false);
  });

  it('should toggle all sections together when onAllExpand is called', () => {
    expect(component.isAllExpand()).toBe(true);

    component['onAllExpand']();
    expect(component.isAllExpand()).toBe(false);
    expect(component.isBalanceExpanded()).toBe(false);
    expect(component.isAnalyticsExpanded()).toBe(false);

    component['onAllExpand']();
    expect(component.isAllExpand()).toBe(true);
    expect(component.isBalanceExpanded()).toBe(true);
  });

  it('should update transaction filter when a new account is chosen', () => {
    component['onAccountChange'](1);
    expect(mockTransactionService.selectedAccountIdFilter()).toBe(1);
  });

  it('should change the dashboard signal when month selection changes', () => {
    const mockEvent = {
      target: { value: '5' },
    } as unknown as Event;

    component['onMonthChange'](mockEvent);
    expect(mockDashboardService.selectedMonth()).toBe(5);
  });

  it('should change the dashboard signal when year selection changes', () => {
    const mockEvent = {
      target: { value: '2027' },
    } as unknown as Event;

    component['onYearChange'](mockEvent);
    expect(mockDashboardService.selectedYear()).toBe(2027);
  });
});
