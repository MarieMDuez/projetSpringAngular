import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaymentMethodService } from '../payment-method.service';
import { PaymentMethod } from '../payment-method.model';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';

@Component({
  selector: 'app-payment-method-form',
  imports: [ReactiveFormsModule],
  templateUrl: './payment-method-form.component.html',
  styleUrl: './payment-method-form.component.scss',
})
export class PaymentMethodFormComponent implements OnInit {
  protected paymentMethodService = inject(PaymentMethodService);
  private myFormBuilder = inject(FormBuilder);
  private toastService = inject(ToastService);

  protected paymentMethods = this.paymentMethodService.allPaymentMethods;

  protected paymentMethodForm!: FormGroup;

  constructor() {
    effect(() => {
      const paymentMethod = this.paymentMethodService.editingPaymentMethod();
      if (paymentMethod) this.onEdit(paymentMethod);
    });
  }
  ngOnInit(): void {
    this.initForm();
  }
  initForm() {
    this.paymentMethodForm = this.myFormBuilder.group({
      label: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  onEdit(paymentMethod: PaymentMethod) {
    this.paymentMethodForm.patchValue({
      label: paymentMethod.label,
      isActive: paymentMethod.isActive,
    });
  }

  protected onSubmit(): void {
    if (this.paymentMethodForm.invalid) {
      return;
    }

    const formData = this.paymentMethodForm.value;
    const currentId = this.paymentMethodService.editingPaymentMethod()?.id;
    const paymentMethod: PaymentMethod = {
      label: formData.label,
      isActive: true,
      position: formData.position,
    };
    if (currentId != null) {
      paymentMethod.id = currentId;
      this.paymentMethodService.updatePaymentMethod(currentId, paymentMethod).subscribe({
        next: () => {
          this.toastService.show('Moyen de paiement modifié avec succès !', 'success');
          this.paymentMethodForm.reset({ label: '' });
          this.paymentMethodService.editingPaymentMethod.set(null);
        },
        error: (err) => {
          if (err.status == 409) {
            this.toastService.show(
              `Une erreur est survenue : ce nom de moyen de paiement existe déjà`,
              'error',
            );
          } else {
            this.toastService.show(
              `Une erreur est survenue lors de la création du moyen de paiement`,
              'error',
            );
          }
        },
      });
    } else {
      paymentMethod.position = this.paymentMethods().length;
      this.paymentMethodService.createPaymentMethod(paymentMethod).subscribe({
        next: () => {
          this.toastService.show('Moyen de paiement créé avec succès !', 'success');
          this.paymentMethodForm.reset({ label: '' });
        },
        error: (err) => {
          if (err.status == 409) {
            this.toastService.show(
              `Une erreur est survenue : ce nom de moyen de paiement existe déjà`,
              'error',
            );
          } else {
            this.toastService.show(
              `Une erreur est survenue lors de la création du moyen de paiement`,
              'error',
            );
          }
        },
      });
    }
  }

  public onCancelEdit(): void {
    this.paymentMethodForm.reset({ label: '' });
    this.paymentMethodService.editingPaymentMethod.set(null);
  }
}
