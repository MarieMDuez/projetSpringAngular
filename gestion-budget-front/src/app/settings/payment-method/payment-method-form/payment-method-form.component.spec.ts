import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { PaymentMethodFormComponent } from './payment-method-form.component';
import { PaymentMethodService } from '../payment-method.service';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';
import { PaymentMethod } from '../payment-method.model';
import { signal, WritableSignal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

describe('PaymentMethodFormComponent', () => {
  let component: PaymentMethodFormComponent;
  let fixture: ComponentFixture<PaymentMethodFormComponent>;
  let mockPaymentMethodService: any;
  let mockToastService: any;

  let allPaymentMethodsSignal: WritableSignal<PaymentMethod[]>;
  let editingPaymentMethodSignal: WritableSignal<PaymentMethod | null>;

  const getMockPaymentMethods = (): PaymentMethod[] => [
    { id: 1, label: 'Carte Bancaire', isActive: true, position: 0 },
  ];

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const norm = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();

  beforeEach(() => {
    allPaymentMethodsSignal = signal<PaymentMethod[]>(getMockPaymentMethods());
    editingPaymentMethodSignal = signal<PaymentMethod | null>(null);

    mockPaymentMethodService = {
      allPaymentMethods: allPaymentMethodsSignal,
      editingPaymentMethod: editingPaymentMethodSignal,
      createPaymentMethod: vi.fn().mockReturnValue(of({ id: 2, label: 'Virement' })),
      updatePaymentMethod: vi.fn().mockReturnValue(of(true)),
    };

    mockToastService = {
      show: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [PaymentMethodFormComponent, ReactiveFormsModule],
      providers: [
        { provide: PaymentMethodService, useValue: mockPaymentMethodService },
        { provide: ToastService, useValue: mockToastService },
      ],
    });
  });

  const createComponent = async (): Promise<void> => {
    fixture = TestBed.createComponent(PaymentMethodFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  describe('Validation des Contrôles et États du Formulaire', () => {
    it('should initialize the form structure with label and hidden position controls', async () => {
      await createComponent();

      expect(component['paymentMethodForm']).toBeDefined();
      expect(component['paymentMethodForm'].get('label')?.value).toBe('');
      expect(component['paymentMethodForm'].get('position')?.value).toBeNull();
    });

    it('should show validation messages only when label requirements drop below 3 characters after blur', async () => {
      await createComponent();
      const labelControl = component['paymentMethodForm'].get('label')!;

      labelControl.setValue('CB');
      labelControl.markAsTouched();
      labelControl.updateValueAndValidity();
      fixture.detectChanges();

      expect(labelControl.invalid).toBe(true);
      expect(el().querySelector('.error-text')).not.toBeNull();
      expect(norm(el().querySelector('.error-text')?.textContent)).toBe('Obligatoire (3 car. min)');
    });
  });

  describe('Mécanique de l Effect Réactif (Mode Édition)', () => {
    it('should hook onto editingPaymentMethod signal transitions and trigger patchValue configurations', async () => {
      await createComponent();
      const targetPm: PaymentMethod = { id: 10, label: 'Espèces', isActive: true, position: 1 };

      editingPaymentMethodSignal.set(targetPm);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component['paymentMethodForm'].get('label')?.value).toBe('Espèces');
      expect(component['paymentMethodForm'].get('position')?.value).toBe(1);
    });
  });
  describe('Soumission du Formulaire et Traitement API (onSubmit)', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should ignore form submission routines if core input values remain invalid', () => {
      component['paymentMethodForm'].patchValue({ label: '' });
      component['onSubmit']();

      expect(mockPaymentMethodService.createPaymentMethod).not.toHaveBeenCalled();
    });

    it('should invoke createPaymentMethod, propagate precise positions metrics, and dispatch saveSuccess', () => {
      const spyEmit = vi.spyOn(component.saveSuccess, 'emit');
      component['paymentMethodForm'].patchValue({ label: 'Paypal Transfer' });

      component['onSubmit']();

      expect(mockPaymentMethodService.createPaymentMethod).toHaveBeenCalledWith({
        label: 'Paypal Transfer',
        isActive: true,
        position: 1,
      });
      expect(mockToastService.show).toHaveBeenCalledWith(
        'Moyen de paiement créé avec succès !',
        'success',
      );
      expect(spyEmit).toHaveBeenCalledWith(2);
      expect(component['paymentMethodForm'].get('label')?.value).toBe('');
    });

    it('should route onto updatePaymentMethod workflows when a valid selection model is active', () => {
      const editingTarget: PaymentMethod = { id: 5, label: 'Chèque', isActive: true, position: 2 };
      editingPaymentMethodSignal.set(editingTarget);
      fixture.detectChanges();

      component['paymentMethodForm'].patchValue({ label: 'Chèque Énergie' });
      component['onSubmit']();

      expect(mockPaymentMethodService.updatePaymentMethod).toHaveBeenCalledWith(5, {
        id: 5,
        label: 'Chèque Énergie',
        isActive: true,
        position: 2,
      });
      expect(mockToastService.show).toHaveBeenCalledWith(
        'Moyen de paiement modifié avec succès !',
        'success',
      );
      expect(editingPaymentMethodSignal()).toBeNull();
    });

    it('should trigger unique payment method conflict alerts when API requests fail with status 409', () => {
      const conflictError = new HttpErrorResponse({ status: 409 });
      mockPaymentMethodService.createPaymentMethod.mockReturnValue(throwError(() => conflictError));

      component['paymentMethodForm'].patchValue({ label: 'Doublon PM' });
      component['onSubmit']();

      expect(mockToastService.show).toHaveBeenCalledWith(
        'Une erreur est survenue : ce nom de moyen de paiement existe déjà',
        'error',
      );
    });

    it('should generic alert blocks when API creation pipelines fail unexpectedly', () => {
      mockPaymentMethodService.createPaymentMethod.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      component['paymentMethodForm'].patchValue({ label: 'Crash Test' });
      component['onSubmit']();

      expect(mockToastService.show).toHaveBeenCalledWith(
        'Une erreur est survenue lors de la création du moyen de paiement',
        'error',
      );
    });
  });

  describe('Annulation de la Procédure (onCancelEdit)', () => {
    it('should flash forms inputs to null states and clean context signals references', async () => {
      await createComponent();
      editingPaymentMethodSignal.set({ id: 5, label: 'Chèque', isActive: true, position: 2 });
      fixture.detectChanges();

      component.onCancelEdit();

      expect(editingPaymentMethodSignal()).toBeNull();
      expect(component['paymentMethodForm'].get('label')?.value).toBeNull();
    });
  });
});
