import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category } from './category.model';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/categories`;

  private readonly allCategoriesSignal = signal<Category[]>([]);
  public editingCategory = signal<Category | null>(null);

  public allCategories = computed(() => this.allCategoriesSignal());
  public activeCategories = computed(() => this.allCategoriesSignal().filter((a) => a.isActive));

  getCategories(): Observable<Category[]> {
    return this.http
      .get<Category[]>(this.apiUrl)
      .pipe(tap((data) => this.allCategoriesSignal.set(data)));
  }

  createCategory(category: Category): Observable<Category> {
    return this.http.post<Category>(this.apiUrl, category).pipe(
      tap((createdCategory) => {
        this.allCategoriesSignal.update((current) => [...current, createdCategory]);
      }),
    );
  }

  updateCategory(id: number, category: Category): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}/${id}`, category).pipe(
      tap((result) => {
        this.allCategoriesSignal.update((current) =>
          current.map((a) => (a.id === id ? result : a)),
        );
      }),
    );
  }

  deleteCategory(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.apiUrl}/${id}`).pipe(
      tap((isHardDelete) => {
        if (!isHardDelete) {
          this.allCategoriesSignal.update((current) =>
            current.map((cat) => (cat.id === id ? { ...cat, isActive: false } : cat)),
          );
        } else {
          this.allCategoriesSignal.update((current) => current.filter((cat) => cat.id !== id));
        }
      }),
    );
  }

  setCategoryActive(id: number, category: Category): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}/${id}/set-active`, category).pipe(
      tap((result) => {
        this.allCategoriesSignal.update((current) =>
          current.map((a) => {
            if (a.id === id) {
              return result;
            } else {
              return { ...a };
            }
          }),
        );
      }),
    );
  }

  saveAll(categories: Category[]): Observable<Category[]> {
    return this.http.post<Category[]>(`${this.apiUrl}/saveAll`, categories).pipe(
      tap((result) => {
        this.allCategoriesSignal.set(result);
      }),
    );
  }
}
