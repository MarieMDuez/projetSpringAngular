import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectedBudgetSettings } from './projected-budget-settings.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectedBudgetSettingsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/projected_budget_settings`;

  private readonly allProjectedBudgetSettingsSignal = signal<ProjectedBudgetSettings[]>([]);

  public allProjectedBudgetSettings = computed(() => this.allProjectedBudgetSettingsSignal());
  public editingProjectedBudgetSettings = signal<ProjectedBudgetSettings | null>(null);

  getProjectedBudgetSettings(): Observable<ProjectedBudgetSettings[]> {
    return this.http
      .get<ProjectedBudgetSettings[]>(this.apiUrl)
      .pipe(tap((data) => this.allProjectedBudgetSettingsSignal.set(data)));
  }

  createProjectedBudgetSettings(
    setting: ProjectedBudgetSettings,
  ): Observable<ProjectedBudgetSettings> {
    return this.http.post<ProjectedBudgetSettings>(this.apiUrl, setting).pipe(
      tap((createdProjectedBudgetSettings) => {
        this.allProjectedBudgetSettingsSignal.update((current) => {
          return [...current, createdProjectedBudgetSettings];
        });
      }),
    );
  }

  updateProjectedBudgetSettings(
    id: number,
    setting: ProjectedBudgetSettings,
  ): Observable<ProjectedBudgetSettings> {
    return this.http.put<ProjectedBudgetSettings>(`${this.apiUrl}/${id}`, setting).pipe(
      tap((result) => {
        this.allProjectedBudgetSettingsSignal.update((current) =>
          current.map((item) => (item.id === id ? result : item)),
        );
      }),
    );
  }

  deleteProjectedBudgetSettings(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.allProjectedBudgetSettingsSignal.update((current) =>
          current.filter((setting) => setting.id !== id),
        );
      }),
    );
  }

  saveAll(
    projectedBudgetSettings: ProjectedBudgetSettings[],
  ): Observable<ProjectedBudgetSettings[]> {
    return this.http
      .post<ProjectedBudgetSettings[]>(`${this.apiUrl}/saveAll`, projectedBudgetSettings)
      .pipe(
        tap((result) => {
          this.allProjectedBudgetSettingsSignal.set(result);
        }),
      );
  }
}
