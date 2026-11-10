import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
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

  /** Copie profonde pour isoler chaque test du jeu de données partagé. */
  const fresh = (): PaymentMethod[] => structuredClone(mockMethods);

  /** Charge l'état initial du service avec les 3 moyens de paiement de test. */
  const loadInitialState = (): void => {
    service.getPaymentMethods().subscribe();
    httpMock.expectOne(apiUrl).flush(fresh());
  };

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

  describe('Initial State & Signals', () => {
    it('should have empty signals by default', () => {
      expect(service.allPaymentMethods()).toEqual([]);
      expect(service.activePaymentMethods()).toEqual([]);
      expect(service.editingPaymentMethod()).toBeNull();
    });

    it('should store and reset the editing payment method', () => {
      service.editingPaymentMethod.set(mockMethods[0]);
      expect(service.editingPaymentMethod()).toEqual(mockMethods[0]);

      service.editingPaymentMethod.set(null);
      expect(service.editingPaymentMethod()).toBeNull();
    });
  });

  describe('getPaymentMethods()', () => {
    it('should fetch payment methods via GET and compute active ones correctly', () => {
      let result: PaymentMethod[] | undefined;
      service.getPaymentMethods().subscribe((m) => (result = m));

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush(fresh());

      expect(result).toEqual(mockMethods);
      expect(service.allPaymentMethods()).toEqual(mockMethods);
      expect(service.activePaymentMethods().map((m) => m.id)).toEqual([1, 2]);
    });

    it('should replace the previous state on a new fetch', () => {
      loadInitialState();

      service.getPaymentMethods().subscribe();
      httpMock.expectOne(apiUrl).flush([mockMethods[0]]);

      expect(service.allPaymentMethods()).toEqual([mockMethods[0]]);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      loadInitialState();

      let error: HttpErrorResponse | undefined;
      service.getPaymentMethods().subscribe({ error: (e) => (error = e) });
      httpMock.expectOne(apiUrl).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
      expect(service.allPaymentMethods()).toEqual(mockMethods);
    });
  });

  describe('createPaymentMethod()', () => {
    beforeEach(() => loadInitialState());

    it('should POST a new payment method and append it to the state array', () => {
      const newMethod: PaymentMethod = { label: 'Virement', isActive: true, position: 3 };
      const savedMethod: PaymentMethod = { id: 4, ...newMethod };

      let result: PaymentMethod | undefined;
      service.createPaymentMethod(newMethod).subscribe((r) => (result = r));

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newMethod);
      req.flush(savedMethod);

      expect(result).toEqual(savedMethod);
      const methods = service.allPaymentMethods();
      expect(methods).toHaveLength(4);
      expect(methods[3]).toEqual(savedMethod);
      expect(methods.slice(0, 3)).toEqual(mockMethods);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      let error: HttpErrorResponse | undefined;
      service
        .createPaymentMethod({ label: 'Virement', isActive: true, position: 3 })
        .subscribe({ error: (e) => (error = e) });
      httpMock.expectOne(apiUrl).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
      expect(service.allPaymentMethods()).toEqual(mockMethods);
    });
  });

  describe('updatePaymentMethod()', () => {
    beforeEach(() => loadInitialState());

    it('should PUT updates and replace only the matching payment method', () => {
      const updated: PaymentMethod = { id: 1, label: 'CB Visa', isActive: true, position: 0 };

      service.updatePaymentMethod(1, updated).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updated);
      req.flush(updated);

      const methods = service.allPaymentMethods();
      expect(methods).toHaveLength(3);
      expect(methods.find((m) => m.id === 1)).toEqual(updated);
      expect(methods.find((m) => m.id === 2)).toEqual(mockMethods[1]);
      expect(methods.find((m) => m.id === 3)).toEqual(mockMethods[2]);
    });

    it('should leave the state unchanged when the ID does not exist', () => {
      const ghost: PaymentMethod = { id: 999, label: 'Fantôme', isActive: true, position: 9 };

      service.updatePaymentMethod(999, ghost).subscribe();
      httpMock.expectOne(`${apiUrl}/999`).flush(ghost);

      expect(service.allPaymentMethods()).toEqual(mockMethods);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      let error: HttpErrorResponse | undefined;
      service
        .updatePaymentMethod(1, { ...mockMethods[0], label: 'X' })
        .subscribe({ error: (e) => (error = e) });
      httpMock.expectOne(`${apiUrl}/1`).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
      expect(service.allPaymentMethods()).toEqual(mockMethods);
    });
  });

  describe('deletePaymentMethod()', () => {
    beforeEach(() => loadInitialState());

    it('should process soft-delete by switching isActive to false when API returns false', () => {
      let result: boolean | undefined;
      service.deletePaymentMethod(1).subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(false);

      expect(result).toBe(false);
      const methods = service.allPaymentMethods();
      expect(methods).toHaveLength(3);
      expect(methods.find((m) => m.id === 1)).toEqual({ ...mockMethods[0], isActive: false });
      expect(methods.find((m) => m.id === 2)).toEqual(mockMethods[1]);
      expect(methods.find((m) => m.id === 3)).toEqual(mockMethods[2]);
      expect(service.activePaymentMethods().map((m) => m.id)).toEqual([2]);
    });

    it('should process hard-delete by evicting the item when API returns true', () => {
      let result: boolean | undefined;
      service.deletePaymentMethod(1).subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(true);

      expect(result).toBe(true);
      expect(service.allPaymentMethods()).toEqual([mockMethods[1], mockMethods[2]]);
      expect(service.activePaymentMethods().map((m) => m.id)).toEqual([2]);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      let error: HttpErrorResponse | undefined;
      service.deletePaymentMethod(1).subscribe({ error: (e) => (error = e) });
      httpMock.expectOne(`${apiUrl}/1`).flush('boom', { status: 404, statusText: 'Not Found' });

      expect(error?.status).toBe(404);
      expect(service.allPaymentMethods()).toEqual(mockMethods);
    });
  });

  describe('setPaymentMethodActive()', () => {
    beforeEach(() => loadInitialState());

    it('should activate the target payment method without affecting others', () => {
      const activated: PaymentMethod = { ...mockMethods[2], isActive: true };

      service.setPaymentMethodActive(3, activated).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/3/set-active`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(activated);
      req.flush(activated);

      const methods = service.allPaymentMethods();
      expect(methods).toHaveLength(3);
      expect(methods.find((m) => m.id === 3)).toEqual(activated);
      expect(methods.find((m) => m.id === 1)).toEqual(mockMethods[0]);
      expect(methods.find((m) => m.id === 2)).toEqual(mockMethods[1]);
      expect(service.activePaymentMethods().map((m) => m.id)).toEqual([1, 2, 3]);
    });

    it('should deactivate the target payment method and update activePaymentMethods', () => {
      const deactivated: PaymentMethod = { ...mockMethods[1], isActive: false };

      service.setPaymentMethodActive(2, deactivated).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/2/set-active`);
      expect(req.request.body).toEqual(deactivated);
      req.flush(deactivated);

      expect(service.allPaymentMethods().find((m) => m.id === 2)?.isActive).toBe(false);
      expect(service.activePaymentMethods().map((m) => m.id)).toEqual([1]);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      let error: HttpErrorResponse | undefined;
      service
        .setPaymentMethodActive(3, { ...mockMethods[2], isActive: true })
        .subscribe({ error: (e) => (error = e) });
      httpMock
        .expectOne(`${apiUrl}/3/set-active`)
        .flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
      expect(service.allPaymentMethods()).toEqual(mockMethods);
    });
  });

  describe('saveAll()', () => {
    beforeEach(() => loadInitialState());

    it('should POST the collection and overwrite the entire state', () => {
      const reordered: PaymentMethod[] = [
        { id: 2, label: 'Chèque', isActive: true, position: 0 },
        { id: 1, label: 'Carte Bancaire', isActive: true, position: 1 },
      ];

      let result: PaymentMethod[] | undefined;
      service.saveAll(reordered).subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${apiUrl}/saveAll`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(reordered);
      req.flush(structuredClone(reordered));

      expect(result).toEqual(reordered);
      expect(service.allPaymentMethods().map((m) => m.id)).toEqual([2, 1]);
      expect(service.allPaymentMethods().map((m) => m.position)).toEqual([0, 1]);
    });

    it('should handle an empty collection', () => {
      service.saveAll([]).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/saveAll`);
      expect(req.request.body).toEqual([]);
      req.flush([]);

      expect(service.allPaymentMethods()).toEqual([]);
      expect(service.activePaymentMethods()).toEqual([]);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      let error: HttpErrorResponse | undefined;
      service.saveAll([mockMethods[0]]).subscribe({ error: (e) => (error = e) });
      httpMock
        .expectOne(`${apiUrl}/saveAll`)
        .flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
      expect(service.allPaymentMethods()).toEqual(mockMethods);
    });
  });
});
