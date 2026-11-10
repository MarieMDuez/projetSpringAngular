import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../environments/environment';
import { AccountType } from '../settings/account/account.model';
import { Balance } from './balances/balance.model';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/dashboards`;

  const mockBalanceResponse: Balance = {
    id: 1,
    label: 'Compte Courant',
    initialBalance: 1000,
    currentBalance: 850,
    projectedBalance: 1200,
    firstNegativeDate: null,
  };

  /** Attend un GET sur `${baseUrl}${path}` (sans tenir compte des query params). */
  const expectGet = (path: string) =>
    httpMock.expectOne((r) => r.method === 'GET' && r.url === `${baseUrl}${path}`);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DashboardService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initial State & Signals', () => {
    it('should initialize with a null balance signal', () => {
      expect(service.balances()).toBeNull();
    });

    it('should initialize the filters with their default values', () => {
      const now = new Date();

      expect(service.selectedAccountId()).toBeNull();
      expect(service.selectedYear()).toBe(now.getFullYear());
      expect(service.selectedMonth()).toBe(now.getMonth() + 1);
      expect(service.isCheckedFilter()).toBe(false);
      expect(service.accountType()).toBeNull();
    });

    it('should expose balances as a read-only signal', () => {
      expect('set' in service.balances).toBe(false);
    });
  });

  describe('buildHttpParams()', () => {
    beforeEach(() => {
      // Base déterministe : seuls month et year sont renseignés
      service.selectedMonth.set(3);
      service.selectedYear.set(2026);
    });

    it('should only include month and year when no other filter is set', () => {
      const params = service.buildHttpParams();

      expect(params.keys().sort()).toEqual(['month', 'year']);
      expect(params.get('month')).toBe('3');
      expect(params.get('year')).toBe('2026');
    });

    it('should include accountId when provided', () => {
      service.selectedAccountId.set(42);

      expect(service.buildHttpParams().get('accountId')).toBe('42');
    });

    it('should omit month when it is null', () => {
      service.selectedMonth.set(null);

      const params = service.buildHttpParams();
      expect(params.has('month')).toBe(false);
      expect(params.get('year')).toBe('2026');
    });

    it('should omit year when it is falsy', () => {
      service.selectedYear.set(0);

      expect(service.buildHttpParams().has('year')).toBe(false);
    });

    it('should include isChecked only when the filter is enabled', () => {
      service.isCheckedFilter.set(true);
      expect(service.buildHttpParams().get('isChecked')).toBe('true');

      service.isCheckedFilter.set(false);
      expect(service.buildHttpParams().has('isChecked')).toBe(false);
    });

    it('should include accountType when it has a real value', () => {
      service.accountType.set(AccountType.EPARGNE);

      expect(service.buildHttpParams().get('accountType')).toBe('EPARGNE');
    });

    it('should omit accountType when it is null', () => {
      service.accountType.set(null);

      expect(service.buildHttpParams().has('accountType')).toBe(false);
    });

    it('should omit accountType when it is the literal string "null"', () => {
      service.accountType.set('null' as unknown as AccountType);

      expect(service.buildHttpParams().has('accountType')).toBe(false);
    });

    it('should combine every active filter', () => {
      service.selectedAccountId.set(7);
      service.isCheckedFilter.set(true);
      service.accountType.set(AccountType.COURANT);

      const params = service.buildHttpParams();
      expect(params.keys().sort()).toEqual([
        'accountId',
        'accountType',
        'isChecked',
        'month',
        'year',
      ]);
      expect(params.get('accountId')).toBe('7');
      expect(params.get('accountType')).toBe('COURANT');
    });
  });

  describe('loadBalances()', () => {
    it('should fetch financial balances and update the read-only signal', () => {
      let result: Balance | undefined;
      service.loadBalances().subscribe((r) => (result = r));

      const req = expectGet('/balance');
      expect(req.request.method).toBe('GET');
      req.flush(mockBalanceResponse);

      expect(result).toEqual(mockBalanceResponse);
      expect(service.balances()).toEqual(mockBalanceResponse);
      expect(service.balances()?.currentBalance).toBe(850);
    });

    it('should send the current filters as query params', () => {
      service.selectedAccountId.set(42);
      service.selectedMonth.set(5);
      service.selectedYear.set(2025);
      service.loadBalances().subscribe();

      const req = expectGet('/balance');
      expect(req.request.params.get('accountId')).toBe('42');
      expect(req.request.params.get('month')).toBe('5');
      expect(req.request.params.get('year')).toBe('2025');
      req.flush(mockBalanceResponse);
    });

    it('should log the error, reset the signal to null and propagate the error', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // On part d'un état valide pour prouver que l'erreur le remet bien à null
      service.loadBalances().subscribe();
      expectGet('/balance').flush(mockBalanceResponse);
      expect(service.balances()).toEqual(mockBalanceResponse);

      let error: HttpErrorResponse | undefined;
      service.loadBalances().subscribe({ error: (e) => (error = e) });
      expectGet('/balance').flush('Internal Server Error', {
        status: 500,
        statusText: 'Server Error',
      });

      expect(error?.status).toBe(500);
      expect(service.balances()).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('endpoints with filters', () => {
    const payload = { some: 'payload' };

    const endpoints: { name: string; path: string; call: () => Observable<unknown> }[] = [
      { name: 'getAnalytics()', path: '/analytics', call: () => service.getAnalytics() },
      { name: 'getEvolution()', path: '/evolution', call: () => service.getEvolution() },
      { name: 'getMatrix()', path: '/matrix', call: () => service.getMatrix() },
      {
        name: 'getMonthlyMatrix()',
        path: '/matrix-monthly',
        call: () => service.getMonthlyMatrix(),
      },
      {
        name: 'getMonthlyProjectedMatrix()',
        path: '/matrix-monthly/projected',
        call: () => service.getMonthlyProjectedMatrix(),
      },
      {
        name: 'getStartEndBalances()',
        path: '/start-end-balances',
        call: () => service.getStartEndBalances(),
      },
    ];

    it.each(endpoints)('$name should GET $path with the current filters', ({ path, call }) => {
      service.selectedAccountId.set(42);
      service.selectedMonth.set(3);
      service.selectedYear.set(2026);
      service.accountType.set(AccountType.COURANT);

      let result: unknown;
      call().subscribe((r) => (result = r));

      const req = expectGet(path);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('accountId')).toBe('42');
      expect(req.request.params.get('month')).toBe('3');
      expect(req.request.params.get('year')).toBe('2026');
      expect(req.request.params.get('accountType')).toBe('COURANT');
      req.flush(payload);

      expect(result).toEqual(payload);
    });

    it.each(endpoints)('$name should propagate HTTP errors', ({ path, call }) => {
      let error: HttpErrorResponse | undefined;
      call().subscribe({ error: (e) => (error = e) });

      expectGet(path).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
    });
  });

  describe('getSummary()', () => {
    it('should GET /summary without any query params, even when filters are set', () => {
      service.selectedAccountId.set(42);
      service.isCheckedFilter.set(true);

      let result: unknown;
      service.getSummary().subscribe((r) => (result = r));

      const req = expectGet('/summary');
      expect(req.request.params.keys()).toEqual([]);
      req.flush({ total: 1 });

      expect(result).toEqual({ total: 1 });
    });

    it('should propagate HTTP errors', () => {
      let error: HttpErrorResponse | undefined;
      service.getSummary().subscribe({ error: (e) => (error = e) });

      expectGet('/summary').flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
    });
  });
});
