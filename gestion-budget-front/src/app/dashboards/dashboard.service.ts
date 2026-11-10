import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AccountType } from '../settings/account/account.model';
import { Balance } from './balances/balance.model';
import { AnalyticsEvolutionDto } from './global-analysis/analytics-evolution/analytics-evolution.model';
import { AnalyticsDashboardDto } from './global-analysis/analytics/analytics-dashboard.model';
import { MatrixMonthlyDto } from './global-analysis/matrix-monthly/matrix-monthly.model';
import { MatrixDashboardDto } from './global-analysis/matrix/matrix-dashboard.model';
import { Summary } from './summaryDashboard/summary/summary.model';
import { StartEndBalanceDto } from './global-analysis/start-end-balances/start-end-balances.model';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly apiUrl = `${environment.apiUrl}/dashboards`;

  private readonly balancesSignal = signal<Balance | null>(null);
  public balances = this.balancesSignal.asReadonly();

  public selectedAccountId = signal<number | null>(null);
  public selectedYear = signal<number>(new Date().getFullYear());
  public selectedMonth = signal<number | null>(new Date().getMonth() + 1);
  public isCheckedFilter = signal<boolean>(false);
  public accountType = signal<AccountType | null>(null);

  constructor(private readonly http: HttpClient) {}

  buildHttpParams(): HttpParams {
    let params = new HttpParams();
    const accountId = this.selectedAccountId();
    const month = this.selectedMonth();
    const year = this.selectedYear();
    const isChecked = this.isCheckedFilter();
    const accountType = this.accountType();

    if (accountId) params = params.set('accountId', accountId.toString());
    if (month) params = params.set('month', month.toString());
    if (year) params = params.set('year', year.toString());
    if (isChecked) params = params.set('isChecked', isChecked);
    if (accountType && accountType !== ('null' as unknown)) {
      params = params.set('accountType', accountType);
    }

    return params;
  }

  public loadBalances(): Observable<Balance> {
    let params = this.buildHttpParams();

    return this.http.get<Balance>(`${this.apiUrl}/balance`, { params }).pipe(
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

  getAnalytics(): Observable<AnalyticsDashboardDto> {
    let params = this.buildHttpParams();
    return this.http.get<AnalyticsDashboardDto>(`${this.apiUrl}/analytics`, { params });
  }

  getEvolution(): Observable<AnalyticsEvolutionDto> {
    let params = this.buildHttpParams();

    return this.http.get<AnalyticsEvolutionDto>(`${this.apiUrl}/evolution`, { params });
  }

  getMatrix(): Observable<MatrixDashboardDto> {
    let params = this.buildHttpParams();

    return this.http.get<MatrixDashboardDto>(`${this.apiUrl}/matrix`, { params });
  }

  getMonthlyMatrix(): Observable<MatrixMonthlyDto> {
    let params = this.buildHttpParams();

    return this.http.get<MatrixMonthlyDto>(`${this.apiUrl}/matrix-monthly`, { params });
  }
  getMonthlyProjectedMatrix(): Observable<MatrixMonthlyDto> {
    let params = this.buildHttpParams();

    return this.http.get<MatrixMonthlyDto>(`${this.apiUrl}/matrix-monthly/projected`, { params });
  }

  getSummary(): Observable<Summary> {
    return this.http.get<Summary>(`${this.apiUrl}/summary`);
  }

  public getStartEndBalances(): Observable<StartEndBalanceDto> {
    let params = this.buildHttpParams();

    return this.http.get<StartEndBalanceDto>(`${this.apiUrl}/start-end-balances`, { params });
  }
}
