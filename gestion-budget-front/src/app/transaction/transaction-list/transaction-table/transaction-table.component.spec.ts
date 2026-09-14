import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { signal } from '@angular/core';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { environment } from '../../../../environments/environment';
import { DashboardService } from '../../../dashboards/dashboard.service';
import { Account } from '../../../settings/account/account.model';
import { AccountService } from '../../../settings/account/account.service';
import { Transaction } from '../../transaction.model';
import { TransactionService } from '../../transaction.service';

describe('TransactionService', () => {
  let service: TransactionService;
  let httpMock: HttpTestingController;
  let mockAccountService: Partial<AccountService>;

  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  const apiUrl = `${environment.apiUrl}/transactions`;

  const mockAccounts: Account[] = [
    {
      id: 1,
      label: 'Compte Courant',
      initialBalance: 1000,
      isActive: true,
      isDefault: true,
      position: 1,
    },
    {
      id: 2,
      label: 'Livret A',
      initialBalance: 5000,
      isActive: true,
      isDefault: false,
      position: 2,
    },
  ];

  const mockTransactions = [
    {
      id: 10,
      amount: 200,
      type: 'CREDIT',
      isChecked: true,
      account: { id: 1 },
      category: { id: 1 },
      paymentMethod: { id: 1 },
      isAlertTriggered: false,
      parentTransactionId: null,
      emissionDate: '2026-01-01',
      description: 'Test',
    },
    {
      id: 20,
      amount: 50,
      type: 'DEBIT',
      isChecked: false,
      account: { id: 1 },
      category: { id: 1 },
      paymentMethod: { id: 1 },
      isAlertTriggered: false,
      parentTransactionId: null,
      emissionDate: '2026-01-02',
      description: 'Test2',
    },
  ] as Transaction[];

  const mockDashboardService: Partial<DashboardService> = {
    loadBalances: vi.fn().mockReturnValue(of({})),
  };

  beforeEach(() => {
    mockAccountService = {
      allAccounts: signal(mockAccounts),
    };

    TestBed.configureTestingModule({
      providers: [
        TransactionService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AccountService, useValue: mockAccountService },
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    });

    service = TestBed.inject(TransactionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all transactions and activate default account filter if present', () => {
    service.loadAllTransactions().subscribe();

    const reqAll = httpMock.expectOne(apiUrl);
    expect(reqAll.request.method).toBe('GET');
    reqAll.flush(mockTransactions);

    expect(service.selectedAccountIdFilter()).toBe(1);

    const reqFilter = httpMock.expectOne(`${apiUrl}/filter?accountId=1`);
    expect(reqFilter.request.method).toBe('GET');
    reqFilter.flush(mockTransactions);
  });

  it('should execute GET with cleaned query params when loading filtered transactions', () => {
    const activeFilters = { accountId: 2, categoryId: '', type: 'CREDIT', textSearch: null };

    service.loadFilteredTransactions(activeFilters).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/filter?accountId=2&type=CREDIT`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should POST a new transaction and prepend it to both signal states', () => {
    const newTx = { amount: 30, description: 'Boulangerie', type: 'DEBIT' } as Transaction;
    const responseTx = { id: 30, ...newTx } as Transaction;

    vi.spyOn(service, 'loadUniqueRecurrences').mockImplementation(() => of([]));
    service.createTransaction(newTx).subscribe();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    req.flush(responseTx);

    expect(service.allTransactionsSignal()[0].id).toBe(30);
    expect(service.filteredTransactionsSignal()[0].id).toBe(30);

    expect(service.loadUniqueRecurrences).toHaveBeenCalled();
    expect(mockDashboardService.loadBalances as Mock).toHaveBeenCalled();
  });

  it('should execute PUT and refresh all collection states on target update', () => {
    service.allTransactionsSignal.set(mockTransactions);
    service.filteredTransactionsSignal.set(mockTransactions);
    const updatedTx = { id: 10, amount: 250, type: 'CREDIT', isChecked: true } as Transaction;

    service.updateTransaction(10, updatedTx).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/10`);
    expect(req.request.method).toBe('PUT');
    req.flush(updatedTx);

    expect(service.allTransactionsSignal().find((t) => t.id === 10)?.amount).toBe(250);
    expect(service.filteredTransactionsSignal().find((t) => t.id === 10)?.amount).toBe(250);
    expect(mockDashboardService.loadBalances as Mock).toHaveBeenCalled();
  });

  it('should execute DELETE and clear item from state arrays upon deletion execution', () => {
    vi.spyOn(service, 'loadUniqueRecurrences').mockImplementation(() => of([]));
    service.allTransactionsSignal.set(mockTransactions);
    service.filteredTransactionsSignal.set(mockTransactions);

    service.deleteTransaction(10).subscribe();

    const reqDelete = httpMock.expectOne(
      (req) => req.url === `${apiUrl}/10` && req.method === 'DELETE',
    );
    reqDelete.flush(null);

    expect(service.allTransactionsSignal()).toHaveLength(1);
    expect(service.allTransactionsSignal().some((t) => t.id === 10)).toBe(false);
  });

  it('should request bulk generation for repeating lines and re-trigger baseline fetch', () => {
    service.generateRecurrentTransactions(9, 2026).subscribe();

    const reqGen = httpMock.expectOne(
      (req) =>
        req.url.includes('/generate-recurrents') &&
        req.params.get('month') === '9' &&
        req.params.get('year') === '2026',
    );
    expect(reqGen.request.method).toBe('POST');
    reqGen.flush(null);

    const reqAll = httpMock.expectOne(apiUrl);
    reqAll.flush(mockTransactions);

    const reqFilter = httpMock.expectOne(
      (req) => req.url.includes('/filter') && req.params.get('accountId') === '1',
    );
    reqFilter.flush(mockTransactions);
  });
});
