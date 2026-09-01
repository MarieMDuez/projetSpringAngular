import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TransactionService } from './transaction.service';
import { AccountService } from '../settings/account/account.service';
import { DashboardService } from '../dashboards/dashboard.service';
import { Transaction } from './transaction.model';
import { signal } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { environment } from '../../environments/environment';

describe('TransactionService', () => {
  let service: TransactionService;
  let httpMock: HttpTestingController;
  let mockAccountService: Partial<AccountService>;

  const apiUrl = `${environment.apiUrl}/transactions`;

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

  // Correction : mockDashboardService doit retourner un Observable pour suivre la nouvelle signature !
  const mockDashboardService: Partial<DashboardService> = {
    loadBalances: vi.fn().mockReturnValue(of({})),
  };

  beforeEach(() => {
    mockAccountService = {
      allAccounts: signal([
        { id: 1, label: 'Compte Courant', initialBalance: 1000, isActive: true, isDefault: true },
      ] as any),
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

    // 1. Premier appel : Récupération brute
    const reqAll = httpMock.expectOne(apiUrl);
    expect(reqAll.request.method).toBe('GET');
    reqAll.flush(mockTransactions);

    // L'accountId par défaut doit être activé
    expect(service.selectedAccountIdFilter()).toBe(1);

    // 2. Deuxième appel déclenché par le concatMap : Filtrage des transactions pour le compte 1
    const reqFilter = httpMock.expectOne(`${apiUrl}/filter?accountId=1`);
    expect(reqFilter.request.method).toBe('GET');
    reqFilter.flush(mockTransactions);
  });

  it('should execute GET with cleaned query params when loading filtered transactions', () => {
    const activeFilters = { accountId: 2, categoryId: '', type: 'CREDIT', textSearch: null };

    // Correction : Il faut ajouter un .subscribe() car la méthode renvoie désormais un Observable !
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

    // Correction : On ajoute bien les parenthèses () ET l'index [0]
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

  it('should execute DELETE and clear item from state arrays upon deletion execution', async () => {
    service.allTransactionsSignal.set(mockTransactions);
    service.filteredTransactionsSignal.set(mockTransactions);

    const deletePromise = firstValueFrom(service.deleteTransaction(10));

    const reqDelete = httpMock.expectOne(
      (req) => req.url === `${apiUrl}/10` && req.method === 'DELETE',
    );
    reqDelete.flush(null);

    // On simule l'appel de récurrences et de balances déclenchés par le forkJoin
    const reqRecurrences = httpMock.expectOne((req) => req.url.includes('/recurrences/unique'));
    reqRecurrences.flush([]);

    await deletePromise;

    expect(service.allTransactionsSignal()).toHaveLength(1);
    expect(service.allTransactionsSignal().some((t) => t.id === 10)).toBe(false);
  });

  it('should request bulk generation for repeating lines and re-trigger baseline fetch', async () => {
    const generatePromise = firstValueFrom(service.generateRecurrentTransactions(9, 2026));

    const reqGen = httpMock.expectOne(
      (req) =>
        req.url.includes('/generate-recurrents') &&
        req.params.get('month') === '9' &&
        req.params.get('year') === '2026',
    );
    reqGen.flush(null);

    // Ordre de cascade du loadAllTransactions déclenché après génération
    const reqAll = httpMock.expectOne(apiUrl);
    reqAll.flush(mockTransactions);

    const reqFilter = httpMock.expectOne(
      (req) => req.url.includes('/filter') && req.params.get('accountId') === '1',
    );
    reqFilter.flush(mockTransactions);

    await generatePromise;
  });
});
