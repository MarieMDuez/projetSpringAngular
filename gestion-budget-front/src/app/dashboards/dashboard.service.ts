import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { balanceDto } from './balances/balance.model';
import { AnalyticsEvolutionDto } from './global-analysis/analytics-evolution/analytics-evolution.model';
import { AnalyticsDashboardDto } from './global-analysis/analytics/analytics-dashboard.model';
import { MatrixMonthlyDto } from './global-analysis/matrix-monthly/matrix-monthly.model';
import { MatrixDashboardDto } from './global-analysis/matrix/matrix-dashboard.model';
import { summaryDto } from './summaryDashboard/summary/summary.model';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/dashboards`;

  private balancesSignal = signal<balanceDto | null>(null);
  public balances = this.balancesSignal.asReadonly();

  public selectedYear = signal<number>(new Date().getFullYear());
  public selectedMonth = signal<number | null>(new Date().getMonth() + 1);
  public isCheckedFilter = signal<boolean>(false);

  constructor(private http: HttpClient) {}

  public loadBalances(accountId?: number | null): Observable<balanceDto> {
    let params = new HttpParams();
    if (accountId) params = params.set('accountId', accountId.toString());

    return this.http.get<balanceDto>(`${this.apiUrl}/balance`, { params }).pipe(
      tap({
        next: (data) => {
          this.balancesSignal.set(data);
        },
        error: (err) => {
          console.error('Erreur lors du chargement des soldes du dashboard', err);
          this.balancesSignal.set(null);
        },
      }),
    );
  }

  getAnalytics(
    accountId?: number | null,
    month?: number | null,
    year?: number | null,
    isChecked?: boolean | null,
  ): Observable<AnalyticsDashboardDto> {
    let params = new HttpParams();

    if (accountId) params = params.set('accountId', accountId.toString());
    if (month) params = params.set('month', month.toString());
    if (year) params = params.set('year', year.toString());
    if (isChecked) params = params.set('isChecked', isChecked);

    return this.http.get<AnalyticsDashboardDto>(`${this.apiUrl}/analytics`, { params });
  }

  getEvolution(
    accountId: number | null,
    year: number,
    isChecked: boolean | null,
  ): Observable<AnalyticsEvolutionDto> {
    let params = new HttpParams().set('year', year.toString());
    if (accountId) {
      params = params.set('accountId', accountId.toString());
    }
    if (isChecked) params = params.set('isChecked', isChecked);
    return this.http.get<AnalyticsEvolutionDto>(`${this.apiUrl}/evolution`, { params });
  }

  getMatrix(
    accountId: number | null,
    year: number,
    isChecked: boolean | null,
  ): Observable<MatrixDashboardDto> {
    let params = new HttpParams().set('year', year.toString());

    if (accountId !== null && accountId !== undefined) {
      params = params.set('accountId', accountId.toString());
    }

    if (isChecked === true) {
      params = params.set('isChecked', 'true');
    }

    return this.http.get<MatrixDashboardDto>(`${this.apiUrl}/matrix`, { params });
  }

  getMonthlyMatrix(
    accountId: number | null,
    year: number,
    month: number | null,
    isChecked: boolean | null,
  ): Observable<MatrixMonthlyDto> {
    let params = new HttpParams().set('year', year.toString()).set('month', month!.toString());

    if (accountId !== null) {
      params = params.set('accountId', accountId.toString());
    }
    if (isChecked === true) {
      params = params.set('isChecked', 'true');
    }

    return this.http.get<MatrixMonthlyDto>(`${this.apiUrl}/matrix-monthly`, { params });
  }

  getSummary(): Observable<summaryDto> {
    return this.http.get<summaryDto>(`${this.apiUrl}/summary`);
  }
}
