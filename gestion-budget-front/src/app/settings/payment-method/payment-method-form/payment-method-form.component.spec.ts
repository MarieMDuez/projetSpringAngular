import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentMethodFormComponent } from './payment-method-form.component';
import { PaymentMethodService } from '../payment-method.service';
import { PaymentMethod } from '../payment-method.model';
import { signal, WritableSignal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';

describe('PaymentMethodFormComponent', () => {
  let component: PaymentMethodFormComponent;
  let fixture: ComponentFixture<PaymentMethodFormComponent>;

  // Isolation du State global via des stubs de signaux
  const mockAllPaymentMethods = signal<PaymentMethod[]>([]);
  const mockEditingPaymentMethod: WritableSignal<PaymentMethod | null> =
    signal<PaymentMethod | null>(null);

  const mockPaymentMethodService: Partial<PaymentMethodService> = {
    allPaymentMethods: mockAllPaymentMethods,
    editingPaymentMethod: mockEditingPaymentMethod,
    createPaymentMethod: vi.fn(),
    updatePaymentMethod: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAllPaymentMethods.set([]);
    mockEditingPaymentMethod.set(null);

    await TestBed.configureTestingModule({
      imports: [PaymentMethodFormComponent],
      providers: [{ provide: PaymentMethodService, useValue: mockPaymentMethodService }],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentMethodFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Déclenche ngOnInit et l'initialisation du formulaire réactif
  });

  it('should create the component and initialize the reactive form', () => {
    expect(component).toBeTruthy();
    expect(component['paymentMethodForm']).toBeDefined();
    expect(component['paymentMethodForm'].get('label')?.value).toBe('');
  });

  it('should validate form constraints (required and minLength)', () => {
    const form = component['paymentMethodForm'];
    expect(form.valid).toBe(false);

    // Insertion d'un libellé trop court
    form.patchValue({ label: 'CB' });
    expect(form.valid).toBe(false);

    form.patchValue({ label: 'Carte Bancaire' });
    expect(form.valid).toBe(true);
  });

  it('should react and pre-populate the form when editingPaymentMethod signal updates', async () => {
    const targetMethod: PaymentMethod = {
      id: 3,
      label: 'Espèces',
      isActive: true,
      position: 1,
    };

    // Simulation de l'action utilisateur "Modifier" depuis le tableau parent
    mockEditingPaymentMethod.set(targetMethod);

    // Attente du cycle de propagation de l'effect() réactif
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component['paymentMethodForm'].get('label')?.value).toBe('Espèces');
  });

  it('should call createPaymentMethod API with append index and reset form upon submission', () => {
    const mockCreatedMethod: PaymentMethod = {
      id: 10,
      label: 'Virement',
      isActive: true,
      position: 0,
    };
    mockAllPaymentMethods.set([]); // Liste vide, l'élément prendra la position 0
    (mockPaymentMethodService.createPaymentMethod as Mock).mockReturnValue(of(mockCreatedMethod));

    component['paymentMethodForm'].patchValue({ label: 'Virement' });
    component['onSubmit']();

    expect(mockPaymentMethodService.createPaymentMethod).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Virement',
        position: 0,
      }),
    );
    expect(component['paymentMethodForm'].get('label')?.value).toBe(''); // Formulaire réinitialisé
    expect(component['errorMessage']()).toBeNull();
  });

  it('should call updatePaymentMethod API and clear state on valid modification submit', async () => {
    const activeMethod: PaymentMethod = {
      id: 42,
      label: 'Prélèvement',
      isActive: true,
      position: 2,
    };
    mockEditingPaymentMethod.set(activeMethod);
    await fixture.whenStable();

    (mockPaymentMethodService.updatePaymentMethod as Mock).mockReturnValue(of(activeMethod));

    component['paymentMethodForm'].patchValue({ label: 'Prélèvement SEPA' });
    component['onSubmit']();

    expect(mockPaymentMethodService.updatePaymentMethod).toHaveBeenCalledWith(
      42,
      expect.any(Object),
    );
    expect(mockEditingPaymentMethod()).toBeNull(); // Libération de l'état d'édition
  });

  it('should capture backend failure during creation and map it to the UI error signal', () => {
    (mockPaymentMethodService.createPaymentMethod as Mock).mockReturnValue(
      throwError(() => new Error('Server Crash')),
    );

    component['paymentMethodForm'].patchValue({ label: 'Paypal' });
    component['onSubmit']();

    expect(component['errorMessage']()).toBe('Erreur lors de la création du moyen de paiement.');
  });

  it('should clear form controls and purge editing signal upon edit cancellation', async () => {
    mockEditingPaymentMethod.set({ id: 8, label: 'Chèque', isActive: true, position: 4 });
    await fixture.whenStable();

    component.onCancelEdit();

    expect(mockEditingPaymentMethod()).toBeNull();
    expect(component['paymentMethodForm'].get('label')?.value).toBe('');
  });
});
