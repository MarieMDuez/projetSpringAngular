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
  private paymentMethodService = inject(PaymentMethodService);
  private toastService = inject(ToastService);

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

    const listeMiseAJour = listeModifiable.map((category, index) => ({
      ...category,
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
}
