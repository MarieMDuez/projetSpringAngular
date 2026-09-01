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
        // C'est le service qui met à jour le State global !
        this.allAccountsSignal.update((current) => [...current, createdAccount]);
      }),
    );
  }

  updateAccount(id: number, account: Account): Observable<Account> {
    return this.http.put<Account>(`${this.apiUrl}/${id}`, account).pipe(
      tap((result) => {
        this.allAccountsSignal.update((current) => current.map((a) => (a.id === id ? result : a)));
      }),
    );
  }

  updateAccountByDefault(id: number, account: Account): Observable<Account> {
    return this.http.put<Account>(`${this.apiUrl}/${id}/set-default`, account).pipe(
      tap((result) => {
        this.allAccountsSignal.update((current) =>
          current.map((a) => {
            if (a.id === id) {
              return result; // Le nouveau compte par défaut (reçu du Back avec isDefault = true)
            } else {
              return { ...a, isDefault: false }; // Tous les autres passent automatiquement à false dans l'UI !
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
