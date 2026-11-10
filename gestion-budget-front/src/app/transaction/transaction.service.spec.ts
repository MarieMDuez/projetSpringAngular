import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { environment } from '../../environments/environment';
import { DashboardService } from '../dashboards/dashboard.service';
import { Account, AccountType } from '../settings/account/account.model';
import { AccountService } from '../settings/account/account.service';
import { Transaction } from './transaction.model';
import { TransactionService } from './transaction.service';

describe('TransactionService', () => {
  let service: TransactionService;
  let httpMock: HttpTestingController;
  let accountsSignal: WritableSignal<Account[]>;
  let selectedAccountIdSignal: WritableSignal<number | null>;
  let loadBalancesMock: Mock;

  const apiUrl = `${environment.apiUrl}/transactions`;

  const defaultAccount: Account = {
    id: 1,
    label: 'Compte Courant',
    type: AccountType.COURANT,
    initialBalance: 1000,
    isActive: true,
    isDefault: true,
    position: 0,
  };

  const mockTransactions: Transaction[] = [
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
  ];

  /** Copie profonde pour isoler chaque test du jeu de données partagé. */
  const fresh = (): Transaction[] => structuredClone(mockTransactions);
  const ids = (list: Transaction[]) => list.map((t) => t.id);
  const serverError = { status: 500, statusText: 'Server Error' };

  /** Place les deux listes dans un état connu (sans passer par HTTP). */
  const seedLists = (): void => {
    service.allTransactionsSignal.set(fresh());
    service.filteredTransactionsSignal.set(fresh());
  };

  beforeEach(() => {
    accountsSignal = signal<Account[]>([defaultAccount]);
    selectedAccountIdSignal = signal<number | null>(null);
    loadBalancesMock = vi.fn().mockReturnValue(of({}));

    const mockAccountService: Partial<AccountService> = { allAccounts: accountsSignal };
    const mockDashboardService: Partial<DashboardService> = {
      selectedAccountId: selectedAccountIdSignal,
      loadBalances: loadBalancesMock,
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

  describe('Initial State & Signals', () => {
    it('should start with empty state', () => {
      expect(service.allTransactionsSignal()).toEqual([]);
      expect(service.filteredTransactionsSignal()).toEqual([]);
      expect(service.uniqueRecurrences()).toEqual([]);
      expect(service.transactionToEdit()).toBeNull();
      expect(service.recurrenceFilter()).toBeNull();
    });

    it('should store and reset the transaction being edited', () => {
      service.transactionToEdit.set(mockTransactions[0]);
      expect(service.transactionToEdit()).toEqual(mockTransactions[0]);

      service.transactionToEdit.set(null);
      expect(service.transactionToEdit()).toBeNull();
    });
  });

  describe('loadAllTransactions()', () => {
    it('should select the default account, refresh balances then load its filtered transactions', () => {
      const filtered = [fresh()[0]];
      let result: Transaction[] | undefined;
      service.loadAllTransactions().subscribe((r) => (result = r));

      const reqAll = httpMock.expectOne(apiUrl);
      expect(reqAll.request.method).toBe('GET');
      reqAll.flush(fresh());

      expect(service.allTransactionsSignal()).toEqual(mockTransactions);
      expect(selectedAccountIdSignal()).toBe(1);
      expect(loadBalancesMock).toHaveBeenCalledTimes(1);

      const reqFilter = httpMock.expectOne(`${apiUrl}/filter?accountId=1`);
      expect(reqFilter.request.method).toBe('GET');
      reqFilter.flush(filtered);

      expect(service.filteredTransactionsSignal()).toEqual(filtered);
      expect(result).toEqual(filtered);
    });

    it.each([
      { name: 'there is no account', accounts: [] as Account[] },
      {
        name: 'no account is the default one',
        accounts: [{ ...defaultAccount, isDefault: false }],
      },
      {
        name: 'the default account is inactive',
        accounts: [{ ...defaultAccount, isActive: false }],
      },
      {
        name: 'the default account has no id',
        accounts: [{ ...defaultAccount, id: undefined }],
      },
    ])('should use all transactions as the filtered list when $name', ({ accounts }) => {
      accountsSignal.set(accounts);

      let result: Transaction[] | undefined;
      service.loadAllTransactions().subscribe((r) => (result = r));

      httpMock.expectOne(apiUrl).flush(fresh());
      // Aucune requête /filter n'est attendue (vérifié par httpMock.verify)

      expect(service.allTransactionsSignal()).toEqual(mockTransactions);
      expect(service.filteredTransactionsSignal()).toEqual(mockTransactions);
      expect(selectedAccountIdSignal()).toBeNull();
      expect(loadBalancesMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTransactions);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      let error: HttpErrorResponse | undefined;
      service.loadAllTransactions().subscribe({ error: (e) => (error = e) });

      httpMock.expectOne(apiUrl).flush('boom', serverError);

      expect(error?.status).toBe(500);
      expect(service.allTransactionsSignal()).toEqual([]);
      expect(service.filteredTransactionsSignal()).toEqual([]);
      expect(loadBalancesMock).not.toHaveBeenCalled();
    });
  });

  describe('loadFilteredTransactions()', () => {
    const expectFilter = () => httpMock.expectOne((r) => r.url === `${apiUrl}/filter`);

    it('should GET /filter with cleaned query params and store the result', () => {
      const activeFilters = { accountId: 2, categoryId: '', type: 'CREDIT', textSearch: null };

      let result: Transaction[] | undefined;
      service.loadFilteredTransactions(activeFilters).subscribe((r) => (result = r));

      const req = expectFilter();
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys().sort()).toEqual(['accountId', 'type']);
      expect(req.request.params.get('accountId')).toBe('2');
      expect(req.request.params.get('type')).toBe('CREDIT');
      req.flush(fresh());

      expect(result).toEqual(mockTransactions);
      expect(service.filteredTransactionsSignal()).toEqual(mockTransactions);
    });

    it('should drop undefined values but keep 0', () => {
      service.loadFilteredTransactions({ accountId: undefined, limit: 0 }).subscribe();

      const req = expectFilter();
      expect(req.request.params.keys()).toEqual(['limit']);
      expect(req.request.params.get('limit')).toBe('0');
      req.flush([]);
    });

    it('should send no query param when there is no filter', () => {
      service.loadFilteredTransactions({}).subscribe();

      const req = expectFilter();
      expect(req.request.params.keys()).toEqual([]);
      req.flush([]);
      expect(service.filteredTransactionsSignal()).toEqual([]);
    });

    it('should propagate the error and leave the filtered list unchanged on failure', () => {
      service.filteredTransactionsSignal.set(fresh());

      let error: HttpErrorResponse | undefined;
      service.loadFilteredTransactions({ type: 'DEBIT' }).subscribe({ error: (e) => (error = e) });
      expectFilter().flush('boom', serverError);

      expect(error?.status).toBe(500);
      expect(service.filteredTransactionsSignal()).toEqual(mockTransactions);
    });
  });

  describe('createTransaction()', () => {
    const newTx: Transaction = {
      ...mockTransactions[0],
      id: undefined,
      emissionDate: '2026-01-03',
    };

    beforeEach(() => seedLists());

    it('should POST, insert the new transaction in both lists (newest first), then refresh balances and recurrences', () => {
      const created: Transaction = { ...newTx, id: 30 };
      let result: unknown;
      let completed = false;
      service.createTransaction(newTx).subscribe({
        next: (r) => (result = r),
        complete: () => (completed = true),
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newTx);
      req.flush(created);

      expect(ids(service.allTransactionsSignal())).toEqual([30, 20, 10]);
      expect(ids(service.filteredTransactionsSignal())).toEqual([30, 20, 10]);
      expect(loadBalancesMock).toHaveBeenCalledTimes(1);

      httpMock.expectOne(`${apiUrl}/recurrences/unique`).flush([1, 3]);

      expect(service.uniqueRecurrences()).toEqual([1, 3]);
      expect(result).toEqual([{}, [1, 3]]);
      expect(completed).toBe(true);
    });

    it('should keep the lists sorted by emission date when the new transaction is the oldest', () => {
      const created: Transaction = { ...newTx, id: 30, emissionDate: '2025-12-31' };
      service.createTransaction({ ...newTx, emissionDate: '2025-12-31' }).subscribe();

      httpMock.expectOne(apiUrl).flush(created);
      httpMock.expectOne(`${apiUrl}/recurrences/unique`).flush([]);

      expect(ids(service.allTransactionsSignal())).toEqual([20, 10, 30]);
      expect(ids(service.filteredTransactionsSignal())).toEqual([20, 10, 30]);
    });

    it('should propagate the error, leave the lists unchanged and skip the refreshes', () => {
      let error: HttpErrorResponse | undefined;
      service.createTransaction(newTx).subscribe({ error: (e) => (error = e) });

      httpMock.expectOne(apiUrl).flush('boom', serverError);

      expect(error?.status).toBe(500);
      expect(service.allTransactionsSignal()).toEqual(mockTransactions);
      expect(service.filteredTransactionsSignal()).toEqual(mockTransactions);
      expect(loadBalancesMock).not.toHaveBeenCalled();
    });
  });

  describe('updateTransaction()', () => {
    beforeEach(() => seedLists());

    it('should PUT, replace the transaction in both lists, refresh balances and emit the result', () => {
      const updated: Transaction = { ...mockTransactions[0], amount: 250 };

      let result: Transaction | undefined;
      service.updateTransaction(10, updated).subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${apiUrl}/10`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updated);
      req.flush(updated);

      expect(result).toEqual(updated);
      expect(service.allTransactionsSignal().find((t) => t.id === 10)).toEqual(updated);
      expect(service.filteredTransactionsSignal().find((t) => t.id === 10)).toEqual(updated);
      // L'autre transaction n'est pas touchée
      expect(service.allTransactionsSignal().find((t) => t.id === 20)).toEqual(mockTransactions[1]);
      expect(service.filteredTransactionsSignal()).toHaveLength(2);
      expect(loadBalancesMock).toHaveBeenCalledTimes(1);
    });

    it('should leave the lists unchanged when the ID does not exist', () => {
      const ghost: Transaction = { ...mockTransactions[0], id: 999 };

      service.updateTransaction(999, ghost).subscribe();
      httpMock.expectOne(`${apiUrl}/999`).flush(ghost);

      expect(service.allTransactionsSignal()).toEqual(mockTransactions);
      expect(service.filteredTransactionsSignal()).toEqual(mockTransactions);
    });

    it('should propagate the error, leave the lists unchanged and skip the balances refresh', () => {
      let error: HttpErrorResponse | undefined;
      service
        .updateTransaction(10, { ...mockTransactions[0], amount: 250 })
        .subscribe({ error: (e) => (error = e) });
      httpMock.expectOne(`${apiUrl}/10`).flush('boom', serverError);

      expect(error?.status).toBe(500);
      expect(service.allTransactionsSignal()).toEqual(mockTransactions);
      expect(service.filteredTransactionsSignal()).toEqual(mockTransactions);
      expect(loadBalancesMock).not.toHaveBeenCalled();
    });
  });

  describe('deleteTransaction()', () => {
    beforeEach(() => seedLists());

    it('should DELETE, remove the transaction from both lists, then refresh recurrences and balances', () => {
      let completed = false;
      service.deleteTransaction(10).subscribe({ complete: () => (completed = true) });

      const reqDelete = httpMock.expectOne(`${apiUrl}/10`);
      expect(reqDelete.request.method).toBe('DELETE');
      reqDelete.flush(null);

      expect(service.allTransactionsSignal()).toEqual([mockTransactions[1]]);
      expect(service.filteredTransactionsSignal()).toEqual([mockTransactions[1]]);
      expect(loadBalancesMock).toHaveBeenCalledTimes(1);

      httpMock.expectOne(`${apiUrl}/recurrences/unique`).flush([2]);

      expect(service.uniqueRecurrences()).toEqual([2]);
      expect(completed).toBe(true);
    });

    it('should leave the lists unchanged when the ID does not exist', () => {
      service.deleteTransaction(999).subscribe();

      httpMock.expectOne(`${apiUrl}/999`).flush(null);
      httpMock.expectOne(`${apiUrl}/recurrences/unique`).flush([]);

      expect(service.allTransactionsSignal()).toEqual(mockTransactions);
      expect(service.filteredTransactionsSignal()).toEqual(mockTransactions);
    });

    it('should propagate the error, leave the lists unchanged and skip the refreshes', () => {
      let error: HttpErrorResponse | undefined;
      service.deleteTransaction(10).subscribe({ error: (e) => (error = e) });
      httpMock.expectOne(`${apiUrl}/10`).flush('boom', { status: 404, statusText: 'Not Found' });

      expect(error?.status).toBe(404);
      expect(service.allTransactionsSignal()).toEqual(mockTransactions);
      expect(service.filteredTransactionsSignal()).toEqual(mockTransactions);
      expect(loadBalancesMock).not.toHaveBeenCalled();
    });
  });

  describe('loadUniqueRecurrences()', () => {
    it('should GET the recurrences and store them', () => {
      let result: number[] | undefined;
      service.loadUniqueRecurrences().subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${apiUrl}/recurrences/unique`);
      expect(req.request.method).toBe('GET');
      req.flush([1, 3, 6]);

      expect(result).toEqual([1, 3, 6]);
      expect(service.uniqueRecurrences()).toEqual([1, 3, 6]);
    });

    it('should filter out null values from the stored list', () => {
      service.loadUniqueRecurrences().subscribe();
      httpMock.expectOne(`${apiUrl}/recurrences/unique`).flush([1, null, 3, null]);

      expect(service.uniqueRecurrences()).toEqual([1, 3]);
    });

    it('should store an empty list', () => {
      service.uniqueRecurrences.set([1, 2]);

      service.loadUniqueRecurrences().subscribe();
      httpMock.expectOne(`${apiUrl}/recurrences/unique`).flush([]);

      expect(service.uniqueRecurrences()).toEqual([]);
    });

    it('should propagate the error and leave the list unchanged on failure', () => {
      service.uniqueRecurrences.set([1, 2]);

      let error: HttpErrorResponse | undefined;
      service.loadUniqueRecurrences().subscribe({ error: (e) => (error = e) });
      httpMock.expectOne(`${apiUrl}/recurrences/unique`).flush('boom', serverError);

      expect(error?.status).toBe(500);
      expect(service.uniqueRecurrences()).toEqual([1, 2]);
    });
  });

  describe('generateRecurrentTransactions()', () => {
    it('should POST month/year then reload all transactions', () => {
      let completed = false;
      service
        .generateRecurrentTransactions(9, 2026)
        .subscribe({ complete: () => (completed = true) });

      const reqGen = httpMock.expectOne((r) => r.url === `${apiUrl}/generate-recurrents`);
      expect(reqGen.request.method).toBe('POST');
      expect(reqGen.request.body).toBeNull();
      expect(reqGen.request.params.get('month')).toBe('9');
      expect(reqGen.request.params.get('year')).toBe('2026');
      reqGen.flush(null);

      httpMock.expectOne(apiUrl).flush(fresh());
      httpMock.expectOne(`${apiUrl}/filter?accountId=1`).flush(fresh());

      expect(completed).toBe(true);
      expect(service.allTransactionsSignal()).toEqual(mockTransactions);
      expect(service.filteredTransactionsSignal()).toEqual(mockTransactions);
    });

    it('should propagate the error and NOT reload transactions when generation fails', () => {
      let error: HttpErrorResponse | undefined;
      service.generateRecurrentTransactions(9, 2026).subscribe({ error: (e) => (error = e) });

      httpMock
        .expectOne((r) => r.url === `${apiUrl}/generate-recurrents`)
        .flush('boom', serverError);

      expect(error?.status).toBe(500);
      expect(service.allTransactionsSignal()).toEqual([]);
      // httpMock.verify() garantit qu'aucun GET de rechargement n'est parti
    });
  });
});
