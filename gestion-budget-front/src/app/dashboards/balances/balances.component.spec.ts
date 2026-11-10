import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { Account, AccountType } from '../../settings/account/account.model';
import { AccountService } from '../../settings/account/account.service';
import { TransactionService } from '../../transaction/transaction.service';
import { DashboardService } from '../dashboard.service';
import { Balance } from './balance.model';
import { BalancesComponent } from './balances.component';
import { of } from 'rxjs';

registerLocaleData(localeFr);

describe('BalancesComponent', () => {
  let fixture: ComponentFixture<BalancesComponent>;
  let component: BalancesComponent;
  let httpMock: HttpTestingController;
  let dashboardService: any;
  let accountsSignal: WritableSignal<Account[]>;
  let balancesSignal: WritableSignal<Balance | null>;

  const balanceUrl = `${environment.apiUrl}/dashboards/balance`;

  const defaultBalance: Balance = {
    id: null,
    label: 'Vue Globale',
    initialBalance: 1500,
    currentBalance: 1234.5,
    projectedBalance: 1600.567,
    firstNegativeDate: null,
  };

  const mockAccounts: Account[] = [
    {
      id: 1,
      label: 'Compte Courant',
      type: AccountType.COURANT,
      initialBalance: 1000,
      isActive: true,
      isDefault: true,
      position: 0,
    },
    {
      id: 2,
      label: 'Livret A',
      type: AccountType.EPARGNE,
      initialBalance: 5000,
      isActive: true,
      isDefault: false,
      position: 1,
    },
    {
      id: 3,
      label: 'Ancien Compte',
      type: AccountType.COURANT,
      initialBalance: 0,
      isActive: false,
      isDefault: false,
      position: 2,
    },
  ];

  const clone = <T>(value: T): T => structuredClone(value);

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

  /** Texte d'un élément, espaces normalisés. */
  const text = (selector: string): string =>
    (el().querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();

  /** Supprime TOUS les espaces (le locale fr utilise des espaces insécables fines). */
  const compact = (value: string): string => value.replace(/\s/g, '');

  /**
   * Crée le composant, répond au premier chargement des soldes déclenché par l'effect,
   * puis laisse le DOM se stabiliser (ngModel est asynchrone).
   */
  const createComponent = async (balance: Balance | null = defaultBalance): Promise<void> => {
    fixture = TestBed.createComponent(BalancesComponent);
    component = fixture.componentInstance;

    if (balance) {
      balancesSignal.set(balance);
    }

    fixture.detectChanges(); // exécute l'effect → 1er GET /balance

    const pending = httpMock.match((r) => r.url.split('?')[0] === balanceUrl);
    pending.forEach((req) => req.flush(clone(balance)));

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  /** Rejoue la détection de changements (effect) puis répond aux requêtes de soldes en attente. */
  const settleBalanceRequests = (balance: Balance | null = defaultBalance) => {
    fixture.detectChanges();
    const pending = httpMock.match((r) => r.url.split('?')[0] === balanceUrl);
    pending.forEach((req) => {
      if (!req.cancelled) {
        req.flush(clone(balance));
      }
    });
    fixture.detectChanges();
    return pending;
  };

  beforeEach(() => {
    accountsSignal = signal<Account[]>(clone(mockAccounts));
    balancesSignal = signal<Balance | null>(clone(defaultBalance));

    const mockDashboardService = {
      selectedYear: signal(2026),
      selectedMonth: signal(10),
      selectedAccountId: signal<number | null>(null),
      isCheckedFilter: signal(false),
      accountType: signal<AccountType | null>(null),
      balances: balancesSignal,

      loadBalances: vi.fn().mockImplementation(() => {
        return of(balancesSignal());
      }),

      getSummary: () =>
        of({
          currentGlobalBalance: 0,
          projectedGlobalBalance: 0,
          accountsDetails: [],
        }),
    };

    const mockAccountService: Partial<AccountService> = { allAccounts: accountsSignal };

    TestBed.configureTestingModule({
      imports: [BalancesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AccountService, useValue: mockAccountService },
        { provide: TransactionService, useValue: {} },
        { provide: LOCALE_ID, useValue: 'fr-FR' },
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    dashboardService = TestBed.inject(DashboardService);

    // Filtres déterministes
    dashboardService.selectedYear.set(2026);
    dashboardService.selectedMonth.set(9);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('should create the component', async () => {
    await createComponent();
    expect(component).toBeTruthy();
  });

  describe('balances loading (effect)', () => {
    it('should load the balances on init with the current filters', () => {
      fixture = TestBed.createComponent(BalancesComponent);
      const spyLoad = vi.spyOn(TestBed.inject(DashboardService), 'loadBalances');

      fixture.detectChanges();

      expect(spyLoad).toHaveBeenCalled();
      expect(dashboardService.balances()).toEqual(defaultBalance);
    });

    it('should not reload again when nothing changed', async () => {
      await createComponent();
      fixture.detectChanges();
      expect(httpMock.match((r) => r.url.split('?')[0] === balanceUrl)).toHaveLength(0);
    });
    it.each([
      {
        name: 'the month',
        apply: () => dashboardService.selectedMonth.set(10),
      },
      {
        name: 'the year',
        apply: () => dashboardService.selectedYear.set(2027),
      },
      {
        name: 'the checked filter',
        apply: () => dashboardService.isCheckedFilter.set(true),
      },
      {
        name: 'the account type',
        apply: () => dashboardService.accountType.set(AccountType.EPARGNE),
      },
      {
        name: 'the selected account',
        apply: () => dashboardService.selectedAccountId.set(4),
      },
    ])('should reload the balances when $name changes', async ({ apply }) => {
      await createComponent();
      const updated: Balance = { ...defaultBalance, currentBalance: 10 };
      balancesSignal.set(updated);

      apply();
      settleBalanceRequests(updated);

      expect(compact(text('.card-real .balance-amount'))).toBe('10,00€');
    });

    it('should log the error and hide the cards when a reload fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await createComponent();
      expect(el().querySelector('.balances-summary')).not.toBeNull();

      dashboardService.selectedMonth.set(10);
      fixture.detectChanges();

      balancesSignal.set(null);
      const pending = httpMock.match((r) => r.url.split('?')[0] === balanceUrl);
      pending.forEach((req) => req.flush('boom', { status: 500, statusText: 'Server Error' }));
      fixture.detectChanges();

      expect(dashboardService.balances()).toBeNull();
      expect(el().querySelector('.balances-summary')).toBeNull();
    });
  });

  describe('balance cards', () => {
    it('should display the real and projected balances formatted in French', async () => {
      await createComponent();

      expect(text('.card-real .balance-title')).toBe('Solde Réel (Pointé)');
      expect(compact(text('.card-real .balance-amount'))).toBe('1234,50€');
      expect(text('.card-projected .balance-title')).toBe('Solde Prévisionnel');
      expect(compact(text('.card-projected .balance-amount'))).toBe('1600,57€');
    });

    it('should display zero balances with two decimals', async () => {
      await createComponent({ ...defaultBalance, currentBalance: 0, projectedBalance: 0 });

      expect(compact(text('.card-real .balance-amount'))).toBe('0,00€');
      expect(compact(text('.card-projected .balance-amount'))).toBe('0,00€');
    });

    it('should not render the cards nor the alert when there are no balances', async () => {
      balancesSignal.set(null);
      await createComponent(null);

      expect(el().querySelector('.balances-summary')).toBeNull();
      expect(el().querySelector('.alert')).toBeNull();
    });
  });

  describe('overdraft alert', () => {
    it('should display the overdraft date when firstNegativeDate is set', async () => {
      await createComponent({
        ...defaultBalance,
        firstNegativeDate: '2026-09-05' as unknown as Date,
      });

      expect(text('.alert')).toContain('Compte à découvert à partir du 05-09-2026');
    });

    it('should not display the alert when firstNegativeDate is null', async () => {
      await createComponent();
      expect(el().querySelector('.alert')).toBeNull();
    });
  });

  describe('account scope selector', () => {
    it('should be displayed by default', async () => {
      await createComponent();

      expect(el().querySelector('.balances-scope')).not.toBeNull();
      expect(el().querySelector('#scopeAccountSelect')).not.toBeNull();
    });

    it('should be hidden when showAccount is false, while the cards stay visible', async () => {
      fixture = TestBed.createComponent(BalancesComponent);
      fixture.componentRef.setInput('showAccount', false);
      fixture.detectChanges();

      const pending = httpMock.match((r) => r.url.split('?')[0] === balanceUrl);
      pending.forEach((req) => req.flush(clone(defaultBalance)));
      fixture.detectChanges();

      expect(el().querySelector('.balances-scope')).toBeNull();
      expect(el().querySelector('.balances-summary')).not.toBeNull();
    });

    it('should list "all accounts" first, then one option per account, flagging archived ones', async () => {
      await createComponent();

      const options = Array.from(el().querySelectorAll('#scopeAccountSelect option')).map((o) =>
        (o.textContent ?? '').replace(/\s+/g, ' ').trim(),
      );

      expect(options).toHaveLength(4);
      expect(options).toContain('Tous les comptes bancaires actifs');
      expect(options.slice(1)).toEqual(['Compte Courant', 'Livret A', 'Ancien Compte (Archivé)']);
    });

    it('should only offer "all accounts" when there is no account', async () => {
      accountsSignal.set([]);
      await createComponent();

      expect(el().querySelectorAll('#scopeAccountSelect option')).toHaveLength(1);
    });

    it('should preselect "all accounts" when no account is selected', async () => {
      await createComponent();

      const select = el().querySelector<HTMLSelectElement>('#scopeAccountSelect')!;
      expect(select.selectedIndex).toBe(0);
    });

    it('should preselect the account stored in the dashboard service', async () => {
      dashboardService.selectedAccountId.set(2);
      await createComponent();

      const select = el().querySelector<HTMLSelectElement>('#scopeAccountSelect')!;
      expect(select.options[select.selectedIndex].textContent?.trim()).toBe('Livret A');
    });

    it('should update the selected account when the user picks one', async () => {
      await createComponent();
      const select = el().querySelector<HTMLSelectElement>('#scopeAccountSelect')!;

      select.selectedIndex = 2; // Livret A
      select.dispatchEvent(new Event('change'));

      expect(dashboardService.selectedAccountId()).toBe(2);
      settleBalanceRequests();
    });

    it('should reset the selected account to null when the user picks "all accounts"', async () => {
      dashboardService.selectedAccountId.set(2);
      await createComponent();
      const select = el().querySelector<HTMLSelectElement>('#scopeAccountSelect')!;

      select.selectedIndex = 0;
      select.dispatchEvent(new Event('change'));

      expect(dashboardService.selectedAccountId()).toBeNull();
      settleBalanceRequests();
    });
  });

  describe('onAccountScopeChange()', () => {
    it.each([
      { input: '1', expected: 1 },
      { input: 2, expected: 2 },
      { input: '42', expected: 42 },
      { input: null, expected: null },
      { input: undefined, expected: null },
      { input: 'null', expected: null },
      { input: 'undefined', expected: null },
      { input: '', expected: null },
      { input: 'abc', expected: null },
    ])('should convert $input to $expected', async ({ input, expected }) => {
      dashboardService.selectedAccountId.set(5);
      await createComponent();

      component['onAccountScopeChange'](input);

      expect(dashboardService.selectedAccountId()).toBe(expected);
      settleBalanceRequests();
    });

    it('should do nothing when the account is already "all accounts"', async () => {
      await createComponent();

      component['onAccountScopeChange'](null);

      expect(dashboardService.selectedAccountId()).toBeNull();
      expect(httpMock.match((r) => r.url.split('?')[0] === balanceUrl)).toHaveLength(0);
    });

    it('should do nothing when the account is already selected', async () => {
      dashboardService.selectedAccountId.set(3);
      await createComponent();

      component['onAccountScopeChange']('3');

      expect(dashboardService.selectedAccountId()).toBe(3);
      expect(httpMock.match((r) => r.url.split('?')[0] === balanceUrl)).toHaveLength(0);
    });

    it('should request the balances of the newly selected account', async () => {
      await createComponent();
      const spyLoad = vi.spyOn(dashboardService, 'loadBalances');

      component['onAccountScopeChange']('2');
      fixture.detectChanges();

      expect(spyLoad).toHaveBeenCalled();
    });

    it('should reload the balances exactly once when the account changes', async () => {
      await createComponent();
      const spyLoad = vi.spyOn(dashboardService, 'loadBalances');

      component['onAccountScopeChange']('2');
      fixture.detectChanges();

      expect(spyLoad).toHaveBeenCalledTimes(1);
    });
  });
});
