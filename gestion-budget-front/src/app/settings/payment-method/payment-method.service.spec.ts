import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { PaymentMethod } from './payment-method.model';
import { PaymentMethodService } from './payment-method.service';

describe('PaymentMethodService', () => {
  let service: PaymentMethodService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/payment_methods`;

  const mockMethods: PaymentMethod[] = [
    { id: 1, label: 'Carte Bancaire', isActive: true, position: 0 },
    { id: 2, label: 'Chèque', isActive: true, position: 1 },
    { id: 3, label: 'Espèces', isActive: false, position: 2 },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PaymentMethodService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(PaymentMethodService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch payment methods and compute active ones correctly', () => {
    service.getPaymentMethods().subscribe();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockMethods);

    expect(service.allPaymentMethods()).toHaveLength(3);
    expect(service.activePaymentMethods()).toHaveLength(2);
  });

  it('should POST a new payment method and push it to the state array', () => {
    const newMethod: PaymentMethod = { label: 'Virement', isActive: true, position: 3 };
    const savedMethod: PaymentMethod = { id: 4, ...newMethod };

    service['allPaymentMethodsSignal'].set(mockMethods);

    service.createPaymentMethod(newMethod).subscribe((result) => {
      expect(result).toEqual(savedMethod);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    req.flush(savedMethod);

    expect(service.allPaymentMethods()).toHaveLength(4);
    expect(service.allPaymentMethods()[3].id).toBe(4);
  });

  it('should PUT updates for a payment method and update the state array', () => {
    service['allPaymentMethodsSignal'].set(mockMethods);

    const updatedMethod: PaymentMethod = { id: 1, label: 'CB Visa', isActive: true, position: 0 };

    service.updatePaymentMethod(1, updatedMethod).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(updatedMethod);

    const targetMethod = service.allPaymentMethods().find((m) => m.id === 1);
    expect(targetMethod?.label).toBe('CB Visa');
  });

  it('should process soft-delete by switching isActive to false when API returns false', () => {
    service['allPaymentMethodsSignal'].set(mockMethods);

    service.deletePaymentMethod(1).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(false);

    expect(service.allPaymentMethods()).toHaveLength(3);
    const method1 = service.allPaymentMethods().find((m) => m.id === 1);
    expect(method1?.isActive).toBe(false);
    expect(service.activePaymentMethods()).toHaveLength(1);
  });

  it('should process hard-delete by evicting the item when API returns true', () => {
    service['allPaymentMethodsSignal'].set(mockMethods);

    service.deletePaymentMethod(1).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(true);

    expect(service.allPaymentMethods()).toHaveLength(2);
    expect(service.allPaymentMethods().some((m) => m.id === 1)).toBe(false);
  });

  it('should overwrite entire collection state when saveAll bulk API is triggered', () => {
    service['allPaymentMethodsSignal'].set(mockMethods);

    const reorderedCollection: PaymentMethod[] = [
      { id: 2, label: 'Chèque', isActive: true, position: 0 },
      { id: 1, label: 'Carte Bancaire', isActive: true, position: 1 },
    ];

    service.saveAll(reorderedCollection).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/saveAll`);
    expect(req.request.method).toBe('POST');
    req.flush(reorderedCollection);

    expect(service.allPaymentMethods()).toHaveLength(2);
    expect(service.allPaymentMethods()[0].id).toBe(2);
  });
});
