import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, input, output, signal, WritableSignal } from '@angular/core';
import { PaymentMethodListComponent } from './payment-method-list.component';
import { PaymentMethodService } from '../payment-method.service';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';
import { PaymentMethod } from '../payment-method.model';
import { PaymentMethodFormComponent } from '../payment-method-form/payment-method-form.component';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';

// --- Stubs d'isolation des dépendances enfants complexes ---
@Component({ selector: 'app-payment-method-form', template: '' })
class StubPaymentMethodFormComponent {}

@Component({ selector: 'app-modal', template: '' })
class StubModalComponent {
  readonly title = input<string>('');
  readonly options = input<string>('');
  readonly type = input<string>('');
  readonly confirmText = input<string>('');
  readonly cancelText = input<string>('');
  readonly resultAction = output<any>();
}

describe('PaymentMethodListComponent', () => {
  let component: PaymentMethodListComponent;
  let fixture: ComponentFixture<PaymentMethodListComponent>;
  let mockPaymentMethodService: any;
  let mockToastService: any;

  let allPaymentMethodsSignal: WritableSignal<PaymentMethod[]>;
  let editingPaymentMethodSignal: WritableSignal<PaymentMethod | null>;

  const getMockPaymentMethods = (): PaymentMethod[] => [
    { id: 1, label: 'Carte Bancaire', isActive: true, position: 0 },
    { id: 2, label: 'Virement', isActive: true, position: 1 },
    { id: 3, label: 'Espèces (Archivé)', isActive: false, position: 2 },
  ];

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const norm = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();
  const text = (selector: string): string => norm(el().querySelector(selector)?.textContent);

  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Simuler le scrollIntoView global du DOM pour éviter les crashs de test
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    allPaymentMethodsSignal = signal<PaymentMethod[]>(getMockPaymentMethods());
    editingPaymentMethodSignal = signal<PaymentMethod | null>(null);

    mockPaymentMethodService = {
      allPaymentMethods: allPaymentMethodsSignal,
      editingPaymentMethod: editingPaymentMethodSignal,
      deletePaymentMethod: vi.fn().mockReturnValue(of(true)),
      setPaymentMethodActive: vi.fn().mockReturnValue(of(true)),
      saveAll: vi.fn().mockReturnValue(of(true)),
    };

    mockToastService = {
      show: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PaymentMethodListComponent],
      providers: [
        { provide: PaymentMethodService, useValue: mockPaymentMethodService },
        { provide: ToastService, useValue: mockToastService },
      ],
    })
      .overrideComponent(PaymentMethodListComponent, {
        remove: {
          imports: [PaymentMethodFormComponent, ModalComponent],
        },
        add: {
          imports: [StubPaymentMethodFormComponent, StubModalComponent],
        },
      })
      .compileComponents();
  });

  const createComponent = async (): Promise<void> => {
    fixture = TestBed.createComponent(PaymentMethodListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  describe('Cycle de vie initial et Rendu DOM baseline', () => {
    it('should query payment methods signal collection and loop item structures', async () => {
      await createComponent();

      expect(component['paymentMethods']()).toHaveLength(3);
      const items = el().querySelectorAll('.data-list .data-item');
      expect(items).toHaveLength(3);
    });

    it('should trigger scrolling behavior animations on onEdit execution targets', async () => {
      await createComponent();
      const targetPm = getMockPaymentMethods()[0];
      const spyScroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');

      const fakeForm = document.createElement('div');
      fakeForm.id = 'editForm';
      el().appendChild(fakeForm);

      component.onEdit(targetPm);

      expect(editingPaymentMethodSignal()).toEqual(targetPm);
      expect(spyScroll).toHaveBeenCalled();
      fakeForm.remove();
    });
  });

  describe('Algorithmes de Tri et Boutons Directionnels', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should ignore moveUp configurations when element idx matches index 0', () => {
      component.moveUp(getMockPaymentMethods()[0]);
      expect(mockPaymentMethodService.saveAll).not.toHaveBeenCalled();
    });

    it('should shift items indices fields positions correctly inside valid moveUp routines', () => {
      component.moveUp(getMockPaymentMethods()[1]); // Virement monte
      expect(mockPaymentMethodService.saveAll).toHaveBeenCalled();
    });

    it('should bypass lower bound modifications constraints inside moveDown triggers', () => {
      component.moveDown(getMockPaymentMethods()[2]); // index 2 est le dernier
      expect(mockPaymentMethodService.saveAll).not.toHaveBeenCalled();
    });

    it('should reorder neighboring positions payloads fields during moveDown operations', () => {
      component.moveDown(getMockPaymentMethods()[0]);
      expect(mockPaymentMethodService.saveAll).toHaveBeenCalled();
    });
  });

  describe('Persistance et Traitement Drag & Drop (onDrop)', () => {
    it('should re-index sequence collection parameters and submit structural update via saveAll', async () => {
      await createComponent();

      const mockDragDropEvent: any = {
        previousIndex: 1, // Virement
        currentIndex: 0, // Prend la tête
      };

      component.onDrop(mockDragDropEvent);

      expect(mockPaymentMethodService.saveAll).toHaveBeenCalled();
      const calls = mockPaymentMethodService.saveAll.mock.calls[0][0];

      // Virement passe en première position
      expect(calls[0].id).toBe(2);
      expect(calls[0].position).toBe(0);

      // Carte Bancaire glisse en seconde position
      expect(calls[1].id).toBe(1);
      expect(calls[1].position).toBe(1);
    });
  });

  describe('Validation des Modales et Flux de Confirmation', () => {
    beforeEach(async () => {
      await createComponent();
    });

    // --- Suppression définitive ou archivage ---
    it('should push success notifications when payment method handles total deletion', () => {
      const targetPm = getMockPaymentMethods()[0];
      component['paymentMethodToDelete'].set(targetPm);

      component['onConfirmDeleteAction']('confirm');

      expect(mockPaymentMethodService.deletePaymentMethod).toHaveBeenCalledWith(1);
      expect(mockToastService.show).toHaveBeenCalledWith(
        'Le moyen de paiement a été supprimé avec succès',
        'success',
      );
    });

    it('should notify fallback archiving message if server declines full hard delete', () => {
      mockPaymentMethodService.deletePaymentMethod.mockReturnValue(of(false)); // Simule l'archivage
      const targetPm = getMockPaymentMethods()[0];
      component['paymentMethodToDelete'].set(targetPm);

      component['onConfirmDeleteAction']('confirm');

      expect(mockToastService.show).toHaveBeenCalledWith(
        'Au moins une transaction est rattachée à ce moyen de paiement : il a été archivé avec succès',
        'success',
      );
    });

    it('should clear internal context indicators without changes when delete is explicitly canceled', () => {
      component['paymentMethodToDelete'].set(getMockPaymentMethods()[0]);

      component['onConfirmDeleteAction']('cancel');

      expect(component['paymentMethodToDelete']()).toBeNull();
      expect(mockPaymentMethodService.deletePaymentMethod).not.toHaveBeenCalled();
    });

    // --- Réactivation d'un moyen de paiement archivé ---
    it('should update active flag variables fields and notify success toast on reactivate confirmation', () => {
      const targetPm = getMockPaymentMethods()[2]; // Espèces (Archivé)
      component['paymentMethodToSetActive'].set(targetPm);

      component['onConfirmSetActiveAction']('confirm');

      expect(mockPaymentMethodService.setPaymentMethodActive).toHaveBeenCalledWith(3, {
        ...targetPm,
        isActive: true,
      });
      expect(mockToastService.show).toHaveBeenCalledWith('La catégorie a été réactivé.', 'success');
    });
  });

  describe('Intégration du Template DOM Final', () => {
    it('should identify disabled records tags and display specific archive styles modifiers', async () => {
      await createComponent();

      const items = el().querySelectorAll('.data-list .data-item');
      expect(items).toHaveLength(3);

      expect(items[0].classList.contains('item-disabled')).toBe(false);
      expect(items[2].classList.contains('item-disabled')).toBe(true);
      expect(text('.data-list .data-item:last-of-type .badge-archived')).toBe('(Archivé)');
    });

    it('should swap loop rendering layouts blocks onto baseline empty notifications when arrays dry up', async () => {
      allPaymentMethodsSignal.set([]);
      await createComponent();

      expect(el().querySelector('.data-item')).toBeNull();
      const emptyLayout = el().querySelector('.data-list p.text-muted');
      expect(emptyLayout).not.toBeNull();
      expect(norm(emptyLayout?.textContent)).toBe(
        'Aucun moyen de paiement disponible pour le moment.',
      );
    });
  });
});
