import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { concatMap, forkJoin, map, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { DashboardService } from '../dashboards/dashboard.service';
import { AccountService } from '../settings/account/account.service';
import { Transaction, TransactionFilters } from './transaction.model';
@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/transactions`;
  private readonly accountService = inject(AccountService);
  private readonly dashboardService = inject(DashboardService);
  public allTransactionsSignal = signal<Transaction[]>([]);

  public transactionToEdit = signal<Transaction | null>(null);

  public filteredTransactionsSignal = signal<Transaction[]>([]);
  public recurrenceFilter = signal<number | null>(null);

  public loadAllTransactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(this.apiUrl).pipe(
      tap((data) => {
        this.allTransactionsSignal.set(data);
      }),
      concatMap((data) => {
        const defaultAccount = this.accountService
          .allAccounts()
          .find((acc) => acc.isDefault === true && acc.isActive);

        if (defaultAccount?.id) {
          this.dashboardService.selectedAccountId.set(defaultAccount.id);
          return this.dashboardService
            .loadBalances()
            .pipe(concatMap(() => this.loadFilteredTransactions({ accountId: defaultAccount.id })));
        } else {
          this.filteredTransactionsSignal.set(data);
          return this.dashboardService.loadBalances().pipe(map(() => data));
        }
      }),
    );
  }

  private insertInOrder(newTx: Transaction, list: Transaction[]): Transaction[] {
    const updatedList = [...list, newTx];
    return updatedList.sort(
      (a, b) => new Date(b.emissionDate).getTime() - new Date(a.emissionDate).getTime(),
    );
  }

  public createTransaction(transaction: Transaction): Observable<unknown> {
    return this.http.post<Transaction>(this.apiUrl, transaction).pipe(
      tap((createdTx) => {
        this.allTransactionsSignal.update((currentList) =>
          this.insertInOrder(createdTx, currentList),
        );
        this.filteredTransactionsSignal.update((currentList) =>
          this.insertInOrder(createdTx, currentList),
        );
      }),
      concatMap(() => {
        return forkJoin([this.dashboardService.loadBalances(), this.loadUniqueRecurrences()]);
      }),
    );
  }

  public loadFilteredTransactions(filters: TransactionFilters): Observable<Transaction[]> {
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, val]) => val !== null && val !== undefined && val !== ''),
    ) as Record<string, string | number | boolean>;
    const params = new HttpParams({ fromObject: cleanFilters });
    return this.http
      .get<Transaction[]>(`${this.apiUrl}/filter`, { params })
      .pipe(tap((data) => this.filteredTransactionsSignal.set(data)));
  }

  public updateTransaction(id: number, updatedTx: Transaction): Observable<Transaction> {
    return this.http.put<Transaction>(`${this.apiUrl}/${id}`, updatedTx).pipe(
      tap((result) => {
        this.allTransactionsSignal.update((current) =>
          current.map((tx) => (tx.id === id ? result : tx)),
        );
        this.filteredTransactionsSignal.update((current) =>
          current.map((tx) => (tx.id === id ? result : tx)),
        );
      }),
      concatMap((result) => {
        return this.dashboardService.loadBalances().pipe(map(() => result));
      }),
    );
  }

  public deleteTransaction(id: number): Observable<unknown> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.allTransactionsSignal.update((current) => current.filter((a) => a.id !== id));
        this.filteredTransactionsSignal.update((current) => current.filter((tx) => tx.id !== id));
      }),
      concatMap(() => {
        return forkJoin([this.loadUniqueRecurrences(), this.dashboardService.loadBalances()]);
      }),
    );
  }

  public uniqueRecurrences = signal<number[]>([]);
  public loadUniqueRecurrences(): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/recurrences/unique`).pipe(
      tap((data) => {
        const cleanData = data.filter((value) => value !== null && value !== undefined);
        this.uniqueRecurrences.set(cleanData);
      }),
    );
  }

  public generateRecurrentTransactions(month: number, year: number): Observable<unknown> {
    const params = new HttpParams().set('month', month).set('year', year);

    return this.http
      .post<void>(`${this.apiUrl}/generate-recurrents`, null, { params })
      .pipe(concatMap(() => this.loadAllTransactions()));
  }
}
