import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaymentMethod } from './payment-method.model';

@Injectable({
  providedIn: 'root',
})
export class PaymentMethodService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/payment_methods`;

  private readonly allPaymentMethodsSignal = signal<PaymentMethod[]>([]);

  public editingPaymentMethod = signal<PaymentMethod | null>(null);

  public allPaymentMethods = computed(() => this.allPaymentMethodsSignal());
  public activePaymentMethods = computed(() =>
    this.allPaymentMethodsSignal().filter((a) => a.isActive),
  );

  getPaymentMethods(): Observable<PaymentMethod[]> {
    return this.http
      .get<PaymentMethod[]>(this.apiUrl)
      .pipe(tap((data) => this.allPaymentMethodsSignal.set(data)));
  }

  createPaymentMethod(paymentMethod: PaymentMethod): Observable<PaymentMethod> {
    return this.http.post<PaymentMethod>(this.apiUrl, paymentMethod).pipe(
      tap((createdPaymentMethod) => {
        this.allPaymentMethodsSignal.update((current) => [...current, createdPaymentMethod]);
      }),
    );
  }

  updatePaymentMethod(id: number, paymentMethod: PaymentMethod): Observable<PaymentMethod> {
    return this.http.put<PaymentMethod>(`${this.apiUrl}/${id}`, paymentMethod).pipe(
      tap((result) => {
        this.allPaymentMethodsSignal.update((current) =>
          current.map((a) => (a.id === id ? result : a)),
        );
      }),
    );
  }

  deletePaymentMethod(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.apiUrl}/${id}`).pipe(
      tap((isHardDelete) => {
        if (!isHardDelete) {
          this.allPaymentMethodsSignal.update((current) =>
            current.map((paymentMethod) =>
              paymentMethod.id === id ? { ...paymentMethod, isActive: false } : paymentMethod,
            ),
          );
        } else {
          this.allPaymentMethodsSignal.update((current) =>
            current.filter((paymentMethod) => paymentMethod.id !== id),
          );
        }
      }),
    );
  }

  setPaymentMethodActive(id: number, paymentMethod: PaymentMethod): Observable<PaymentMethod> {
    return this.http.put<PaymentMethod>(`${this.apiUrl}/${id}/set-active`, paymentMethod).pipe(
      tap((result) => {
        this.allPaymentMethodsSignal.update((current) =>
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

  saveAll(paymentMethods: PaymentMethod[]): Observable<PaymentMethod[]> {
    return this.http.post<PaymentMethod[]>(`${this.apiUrl}/saveAll`, paymentMethods).pipe(
      tap((result) => {
        this.allPaymentMethodsSignal.set(result);
      }),
    );
  }
}
