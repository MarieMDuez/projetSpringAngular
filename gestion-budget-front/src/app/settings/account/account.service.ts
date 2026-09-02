import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Account } from './account.model';

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private http = inject(HttpClient); // 👈 Standard moderne d'entreprise (v16+)
  private apiUrl = `${environment.apiUrl}/account`;

  // Le State brut (privé)
  private allAccountsSignal = signal<Account[]>([]);
  public editingAccount = signal<Account | null>(null);

  // Les Sélecteurs (publics et réactifs)
  public allAccounts = computed(() => this.allAccountsSignal());
  public activeAccounts = computed(() => this.allAccountsSignal().filter((a) => a.isActive));

  getAccounts(): Observable<Account[]> {
    return this.http
      .get<Account[]>(this.apiUrl)
      .pipe(tap((data) => this.allAccountsSignal.set(data)));
  }

  createAccount(account: Account): Observable<Account> {
    return this.http.post<Account>(this.apiUrl, account).pipe(
      tap((createdAccount) => {
        this.allAccountsSignal.update((current) => {
          if (createdAccount.isActive) {
            const cleanedList = current.map((a) => ({ ...a, isDefault: false }));
            return [...cleanedList, createdAccount];
          }
          return [...current, createdAccount];
        });
      }),
    );
  }

  updateAccount(id: number, account: Account): Observable<Account> {
    return this.http.put<Account>(`${this.apiUrl}/${id}`, account).pipe(
      tap((result) => {
        this.allAccountsSignal.update((current) => {
          return current.map((a) => {
            if (a.id === id) {
              return result;
            }
            return result.isDefault ? { ...a, isDefault: false } : a;
          });
        });
      }),
    );
  }

  updateAccountByDefault(id: number, account: Account): Observable<Account> {
    return this.http.put<Account>(`${this.apiUrl}/${id}/set-default`, account).pipe(
      tap((result) => {
        this.allAccountsSignal.update((current) =>
          current.map((a) => {
            if (a.id === id) {
              return result;
            } else {
              return { ...a, isDefault: false };
            }
          }),
        );
      }),
    );
  }

  deleteAccount(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        // Le service nettoie le State global en filtrant l'ID supprimé
        this.allAccountsSignal.update((current) => current.filter((a) => a.id !== id));
      }),
    );
  }

  saveAll(accounts: Account[]): Observable<Account[]> {
    return this.http.post<Account[]>(`${this.apiUrl}/saveAll`, accounts).pipe(
      tap((result) => {
        this.allAccountsSignal.set(result);
      }),
    );
  }
}
