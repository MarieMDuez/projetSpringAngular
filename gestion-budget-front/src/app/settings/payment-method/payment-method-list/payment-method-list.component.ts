import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaymentMethodService } from '../payment-method.service';
import { PaymentMethod } from '../payment-method.model';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { PaymentMethodFormComponent } from '../payment-method-form/payment-method-form.component';

@Component({
  selector: 'app-payment-method-list',
  imports: [ReactiveFormsModule, DragDropModule, PaymentMethodFormComponent],
  templateUrl: './payment-method-list.component.html',
  styleUrl: './payment-method-list.component.scss',
})
export class PaymentMethodListComponent {
  private paymentMethodService = inject(PaymentMethodService);

  protected paymentMethods = this.paymentMethodService.allPaymentMethods;

  protected errorMessage = signal<string | null>(null);

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

    const confirmDelete = confirm(
      `Voulez-vous supprimer le moyen de paiement "${PaymentMethod.label}" ?`,
    );
    if (!confirmDelete) return;

    this.paymentMethodService.deletePaymentMethod(PaymentMethod.id).subscribe({
      next: (isHardDeleted) => {
        if (isHardDeleted) {
          console.log('Le compte a été supprimé physiquement de la BDD.');
        } else {
          console.log('Le compte contenant des transactions a été archivé proprement.');
        }
      },
      error: (err) => this.errorMessage.set('Erreur lors de la suppression du compte.'),
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
}
