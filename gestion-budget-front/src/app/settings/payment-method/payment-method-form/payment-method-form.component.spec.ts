import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentMethodFormComponent } from './payment-method-form.component';
import { PaymentMethodService } from '../payment-method.service';
import { PaymentMethod } from '../payment-method.model';
import { signal, WritableSignal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';

describe('PaymentMethodFormComponent', () => {
  let component: PaymentMethodFormComponent;
  let fixture: ComponentFixture<PaymentMethodFormComponent>;

  const mockAllPaymentMethods = signal<PaymentMethod[]>([]);
  const mockEditingPaymentMethod: WritableSignal<PaymentMethod | null> =
    signal<PaymentMethod | null>(null);

  const mockToastService: { show: Mock } = { show: vi.fn() };

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
      providers: [
        { provide: PaymentMethodService, useValue: mockPaymentMethodService },
        { provide: ToastService, useValue: mockToastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentMethodFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy();
  });

  it('should create the component and initialize the reactive form', () => {
    expect(component).toBeTruthy();
    expect(component['paymentMethodForm']).toBeDefined();
    expect(component['paymentMethodForm'].get('label')?.value).toBe('');
  });

  it('should validate form constraints (required and minLength)', () => {
    const form = component['paymentMethodForm'];
    expect(form.valid).toBe(false);

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

    mockEditingPaymentMethod.set(targetMethod);

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
    mockAllPaymentMethods.set([]);
    (mockPaymentMethodService.createPaymentMethod as Mock).mockReturnValue(of(mockCreatedMethod));

    component['paymentMethodForm'].patchValue({ label: 'Virement' });
    component['onSubmit']();

    expect(mockPaymentMethodService.createPaymentMethod).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Virement',
        position: 0,
      }),
    );
    expect(component['paymentMethodForm'].get('label')?.value).toBe('');
    expect(mockToastService.show).toHaveBeenCalledWith(
      'Moyen de paiement créé avec succès !',
      'success',
    );
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

    expect(mockPaymentMethodService.updatePaymentMethod).toHaveBeenCalledWith(42, {
      id: 42,
      label: 'Prélèvement SEPA',
      isActive: true,
    });
    expect(mockEditingPaymentMethod()).toBeNull();
  });

  it('should capture backend failure during creation and map it to the UI error signal', () => {
    (mockPaymentMethodService.createPaymentMethod as Mock).mockReturnValue(
      throwError(() => new Error('Server Crash')),
    );

    component['paymentMethodForm'].patchValue({ label: 'Paypal' });
    component['onSubmit']();

    expect(mockToastService.show).toHaveBeenCalledWith(
      'Une erreur est survenue lors de la création du moyen de paiement',
      'error',
    );
  });

  it('should trigger duplicate name error toast upon 409 conflict during creation', () => {
    const errorResponse = { status: 409 };
    (mockPaymentMethodService.createPaymentMethod as Mock).mockReturnValue(
      throwError(() => errorResponse),
    );

    component['paymentMethodForm'].patchValue({ label: 'espèces' });

    component['onSubmit']();

    expect(mockToastService.show).toHaveBeenCalledWith(
      'Une erreur est survenue : ce nom de moyen de paiement existe déjà',
      'error',
    );
  });

  it('should clear form controls and purge editing signal upon edit cancellation', async () => {
    mockEditingPaymentMethod.set({ id: 8, label: 'Chèque', isActive: true, position: 4 });
    await fixture.whenStable();

    component.onCancelEdit();

    expect(mockEditingPaymentMethod()).toBeNull();
    expect(component['paymentMethodForm'].get('label')?.value).toBe(null);
  });
});
