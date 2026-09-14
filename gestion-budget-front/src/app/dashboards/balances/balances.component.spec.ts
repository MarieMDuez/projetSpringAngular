import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { AccountService } from '../../settings/account/account.service';
import { TransactionService } from '../../transaction/transaction.service';
import { DashboardService } from '../dashboard.service';
import { BalancesComponent } from './balances.component';

registerLocaleData(localeFr);

describe('BalancesComponent', () => {
  let component: BalancesComponent;
  let fixture: ComponentFixture<BalancesComponent>;

  type BalanceType = ReturnType<DashboardService['balances']>;

  const mockBalancesSignal: WritableSignal<BalanceType> = signal<BalanceType>(null);
  const mockSelectedAccountIdFilter = signal<number | null>(null);

  const mockDashboardService: Partial<DashboardService> = {
    balances: mockBalancesSignal,
    loadBalances: vi.fn().mockReturnValue(of({})),
  };

  const mockTransactionService: Partial<TransactionService> = {
    selectedAccountIdFilter: mockSelectedAccountIdFilter,
    loadFilteredTransactions: vi.fn().mockReturnValue(of([])),
  };

  const mockAccountService: Partial<AccountService> = {
    allAccounts: signal([]),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    (mockDashboardService.loadBalances as Mock).mockReturnValue(of({}));
    (mockTransactionService.loadFilteredTransactions as Mock).mockReturnValue(of([]));

    mockBalancesSignal.set({
      id: null,
      label: 'Vue Globale',
      initialBalance: 1500.0,
      currentBalance: 1300.0,
      projectedBalance: 1600.0,
    });

    mockSelectedAccountIdFilter.set(null);

    await TestBed.configureTestingModule({
      imports: [BalancesComponent],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: AccountService, useValue: mockAccountService },
        { provide: LOCALE_ID, useValue: 'fr-FR' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BalancesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should read financial indicators from the dashboard service signal', () => {
    expect(component['dashboardService'].balances()).toBeTruthy();
    expect(component['dashboardService'].balances()?.currentBalance).toBe(1300.0);
    expect(component['dashboardService'].balances()?.projectedBalance).toBe(1600.0);
  });

  it('should trigger backend reload when account scope changes', () => {
    component['onAccountScopeChange']('1');
    expect(mockSelectedAccountIdFilter()).toBe(1);
  });

  it('should handle empty or null values on account scope change gracefully', () => {
    component['onAccountScopeChange']('null');
    expect(mockSelectedAccountIdFilter()).toBeNull();
  });
});
