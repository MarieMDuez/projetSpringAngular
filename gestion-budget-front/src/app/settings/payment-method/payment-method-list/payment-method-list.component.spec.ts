import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentMethodListComponent } from './payment-method-list.component';
import { PaymentMethodService } from '../payment-method.service';
import { PaymentMethod } from '../payment-method.model';
import { signal, NO_ERRORS_SCHEMA } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';

describe('PaymentMethodListComponent', () => {
  let component: PaymentMethodListComponent;
  let fixture: ComponentFixture<PaymentMethodListComponent>;

  // Isolation du State global de l'application via des stubs
  const mockAllPaymentMethods = signal<PaymentMethod[]>([]);
  const mockEditingPaymentMethod = signal<PaymentMethod | null>(null);
  // Mock global de la fonction scrollIntoView pour éviter les plantages dans Vitest
  window.HTMLElement.prototype.scrollIntoView = vi.fn();

  const mockToastService: { show: Mock } = { show: vi.fn() };

  const mockPaymentMethodService: Partial<PaymentMethodService> = {
    allPaymentMethods: mockAllPaymentMethods,
    editingPaymentMethod: mockEditingPaymentMethod,
    deletePaymentMethod: vi.fn(),
    saveAll: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAllPaymentMethods.set([]);
    mockEditingPaymentMethod.set(null);

    await TestBed.configureTestingModule({
      imports: [PaymentMethodListComponent],
      providers: [
        { provide: PaymentMethodService, useValue: mockPaymentMethodService },
        { provide: ToastService, useValue: mockToastService },
      ],
      schemas: [NO_ERRORS_SCHEMA], // Évite la compilation intrusive du sous-composant formulaire
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentMethodListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the payment method list component', () => {
    expect(component).toBeTruthy();
  });

  it('should transfer structural reference to editingPaymentMethod signal upon edit trigger', () => {
    const targetMethod: PaymentMethod = {
      id: 7,
      label: 'Carte Bancaire',
      isActive: true,
      position: 0,
    };

    component.onEdit(targetMethod);

    expect(mockEditingPaymentMethod()).toEqual(targetMethod);
  });

  it('should trigger deletePaymentMethod API once user confirms deletion dialog', () => {
    const targetMethod: PaymentMethod = { id: 14, label: 'Espèces', isActive: true, position: 1 };
    vi.spyOn(window, 'confirm').mockReturnValue(true); // Clic simulé sur "OK"
    (mockPaymentMethodService.deletePaymentMethod as Mock).mockReturnValue(of(true)); // Hard delete confirmé par l'API

    component['onDelete'](targetMethod);

    expect(mockPaymentMethodService.deletePaymentMethod).toHaveBeenCalledWith(14);
    expect(mockToastService.show).toHaveBeenCalledWith(
      'Le moyen de paiement a été supprimé avec succès',
      'success',
    );
  });

  it('should interrupt deletion routine and abort API request if user cancels confirm window', () => {
    const targetMethod: PaymentMethod = { id: 14, label: 'Espèces', isActive: true, position: 1 };
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false); // Clic simulé sur "Annuler"

    component['onDelete'](targetMethod);

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockPaymentMethodService.deletePaymentMethod).not.toHaveBeenCalled();
  });

  it('should process drag-and-drop, normalize sequential keys and call saveAll bulk API', () => {
    const methodA = { id: 11, label: 'Chèque', isActive: true, position: 0 };
    const methodB = { id: 22, label: 'Paypal', isActive: true, position: 1 };
    mockAllPaymentMethods.set([methodA, methodB]);

    (mockPaymentMethodService.saveAll as Mock).mockReturnValue(of([methodB, methodA]));

    // Création du faux conteneur d'événement permutant l'index 0 vers l'index 1
    const mockDragDropEvent = {
      previousIndex: 0,
      currentIndex: 1,
    } as CdkDragDrop<PaymentMethod[]>;

    component.onDrop(mockDragDropEvent);

    // Contrôle du recalcul de l'ordonnancement par indexation linéaire
    expect(mockPaymentMethodService.saveAll).toHaveBeenCalledWith([
      expect.objectContaining({ id: 22, position: 0 }),
      expect.objectContaining({ id: 11, position: 1 }),
    ]);
  });

  it('should affect error state signal when backend delete sequence fails', () => {
    const targetMethod: PaymentMethod = { id: 9, label: 'Virement', isActive: true, position: 0 };
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    (mockPaymentMethodService.deletePaymentMethod as Mock).mockReturnValue(
      throwError(() => new Error('DBMS Constraint Violation')),
    );

    component['onDelete'](targetMethod);
    expect(mockToastService.show).toHaveBeenCalledWith(
      'Une erreur est survenue lors de la suppression',
      'error',
    );
  });
});
