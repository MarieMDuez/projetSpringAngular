import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { balanceDto } from './balances/balance.model';
import { environment } from '../../environments/environment';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/dashboards`;

  private balancesSignal = signal<balanceDto | null>(null);
  public balances = this.balancesSignal.asReadonly();

  constructor(private http: HttpClient) {}

  /**
   * Charge les soldes depuis le DTO Back-end et met à jour le signal
   */
  public loadBalances(accountId?: number | null): Observable<balanceDto> {
    let params = new HttpParams();
    if (accountId) params = params.set('accountId', accountId.toString());

    return this.http.get<balanceDto>(`${this.apiUrl}/balance`, { params }).pipe(
      tap({
        next: (data) => this.balancesSignal.set(data),
        error: (err) => {
          console.error('Erreur lors du chargement des soldes du dashboard', err);
          this.balancesSignal.set(null);
        },
      }),
    );
  }
}
