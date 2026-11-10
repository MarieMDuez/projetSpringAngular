import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';
import { OpenDialogDirective } from '../../../shared/directives/open-dialog.directive';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { PaymentMethodFormComponent } from '../payment-method-form/payment-method-form.component';
import { PaymentMethod } from '../payment-method.model';
import { PaymentMethodService } from '../payment-method.service';

@Component({
  selector: 'app-payment-method-list',
  imports: [
    ReactiveFormsModule,
    DragDropModule,
    PaymentMethodFormComponent,
    OpenDialogDirective,
    ModalComponent,
  ],
  templateUrl: './payment-method-list.component.html',
  styleUrl: './payment-method-list.component.scss',
})
export class PaymentMethodListComponent {
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly toastService = inject(ToastService);

  protected paymentMethods = this.paymentMethodService.allPaymentMethods;
  protected paymentMethodToDelete = signal<PaymentMethod | null>(null);
  protected paymentMethodToSetActive = signal<PaymentMethod | null>(null);

  onEdit(paymentMethod: PaymentMethod) {
    if (paymentMethod.id != null) this.paymentMethodService.editingPaymentMethod.set(paymentMethod);
    /*Pour remonter au formulaire qui s'auto-rempli*/
    const formElement = document.getElementById('editForm');
    if (formElement) {
      formElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }

  protected onDelete(PaymentMethod: PaymentMethod): void {
    if (!PaymentMethod.id) return;

    this.paymentMethodService.deletePaymentMethod(PaymentMethod.id).subscribe({
      next: (isHardDeleted) => {
        if (isHardDeleted) {
          this.toastService.show('Le moyen de paiement a été supprimé avec succès', 'success');
        } else {
          this.toastService.show(
            'Au moins une transaction est rattachée à ce moyen de paiement : il a été archivé avec succès',
            'success',
          );
        }
      },
      error: (err) =>
        this.toastService.show('Une erreur est survenue lors de la suppression', 'error'),
    });
  }

  onDrop(event: CdkDragDrop<PaymentMethod[]>): void {
    const listeModifiable = [...this.paymentMethods()];

    moveItemInArray(listeModifiable, event.previousIndex, event.currentIndex);

    const listeMiseAJour = listeModifiable.map((paymentMethod, index) => ({
      ...paymentMethod,
      position: index,
    }));
    this.paymentMethodService.saveAll(listeMiseAJour).subscribe();
  }

  protected onConfirmDeleteAction(action: 'confirm' | 'cancel'): void {
    const paymentMethod = this.paymentMethodToDelete();

    if (action === 'confirm' && paymentMethod) {
      this.onDelete(paymentMethod);
    } else {
      this.paymentMethodToDelete.set(null);
    }
  }

  protected onSetActivePaymentMethod(paymentMethod: PaymentMethod): void {
    if (!paymentMethod.id) return;

    const updatedPaymentMethod: PaymentMethod = { ...paymentMethod, isActive: true };

    this.paymentMethodService
      .setPaymentMethodActive(paymentMethod.id, updatedPaymentMethod)
      .subscribe({
        next: () => {
          this.toastService.show('La catégorie a été réactivé.', 'success');
        },
        error: (err) =>
          this.toastService.show('Erreur lors de la réactivation de la catégorie.', 'error'),
      });
  }

  protected onConfirmSetActiveAction(action: 'confirm' | 'cancel'): void {
    const paymentMethod = this.paymentMethodToSetActive();

    if (action === 'confirm' && paymentMethod) {
      this.onSetActivePaymentMethod(paymentMethod);
    } else {
      this.paymentMethodToSetActive.set(null);
    }
  }

  moveUp(pm: PaymentMethod) {
    const listeModifiable = [...this.paymentMethods()];

    const idx = this.paymentMethods().findIndex((item) => item.id === pm.id);
    if (idx <= 0) return;

    const currentItem = listeModifiable[idx];
    const previousItem = listeModifiable[idx - 1];

    const currentPosition = currentItem.position;

    listeModifiable[idx - 1] = { ...currentItem, position: previousItem.position };
    listeModifiable[idx] = { ...previousItem, position: currentPosition };

    this.paymentMethodService.saveAll(listeModifiable).subscribe();
  }
  moveDown(pm: PaymentMethod) {
    const listeModifiable = [...this.paymentMethods()];

    const idx = this.paymentMethods().findIndex((item) => item.id === pm.id);
    if (idx === -1 || idx >= listeModifiable.length - 1) return;

    const currentItem = listeModifiable[idx];
    const nextItem = listeModifiable[idx + 1];

    const currentPosition = currentItem.position;

    listeModifiable[idx] = { ...nextItem, position: nextItem.position };
    listeModifiable[idx + 1] = { ...currentItem, position: currentPosition };

    this.paymentMethodService.saveAll(listeModifiable).subscribe();
  }
}
