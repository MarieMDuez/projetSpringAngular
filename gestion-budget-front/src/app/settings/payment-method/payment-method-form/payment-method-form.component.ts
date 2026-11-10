import { Component, effect, inject, OnInit, output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';
import { PaymentMethod } from '../payment-method.model';
import { PaymentMethodService } from '../payment-method.service';

@Component({
  selector: 'app-payment-method-form',
  imports: [ReactiveFormsModule],
  templateUrl: './payment-method-form.component.html',
  styleUrl: './payment-method-form.component.scss',
})
export class PaymentMethodFormComponent implements OnInit {
  protected paymentMethodService = inject(PaymentMethodService);
  private readonly myFormBuilder = inject(FormBuilder);
  private readonly toastService = inject(ToastService);

  protected paymentMethods = this.paymentMethodService.allPaymentMethods;

  protected paymentMethodForm!: FormGroup;

  saveSuccess = output<number>();

  constructor() {
    effect(() => {
      const paymentMethod = this.paymentMethodService.editingPaymentMethod();
      if (paymentMethod && this.paymentMethodForm) this.onEdit(paymentMethod);
    });
  }
  ngOnInit(): void {
    this.initForm();
  }
  initForm() {
    this.paymentMethodForm = this.myFormBuilder.group({
      label: [
        '',
        {
          validators: [Validators.required, Validators.minLength(3)],
        },
      ],
      position: [null],
    });
  }

  onEdit(paymentMethod: PaymentMethod) {
    this.paymentMethodForm.patchValue({
      label: paymentMethod.label,
      isActive: paymentMethod.isActive,
      position: paymentMethod.position,
    });
  }

  protected onSubmit(): void {
    if (this.paymentMethodForm.invalid) {
      return;
    }

    const formData = this.paymentMethodForm.getRawValue();
    const currentId = this.paymentMethodService.editingPaymentMethod()?.id;
    const paymentMethod: PaymentMethod = {
      label: formData.label,
      isActive: true,
      position: formData.position,
    };

    const emptyPaymentMethod = {
      label: null,
      isActive: true,
      position: null,
    };

    if (currentId != null) {
      paymentMethod.id = currentId;
      this.paymentMethodService.updatePaymentMethod(currentId, paymentMethod).subscribe({
        next: () => {
          this.toastService.show('Moyen de paiement modifié avec succès !', 'success');
          this.paymentMethodForm.reset(emptyPaymentMethod);
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
              `Une erreur est survenue lors de la modification du moyen de paiement`,
              'error',
            );
          }
        },
      });
    } else {
      paymentMethod.position = this.paymentMethods().length;
      this.paymentMethodService.createPaymentMethod(paymentMethod).subscribe({
        next: (paymentMethodCreated) => {
          this.toastService.show('Moyen de paiement créé avec succès !', 'success');
          this.saveSuccess.emit(paymentMethodCreated.id!);
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
    const emptyPaymentMethod = {
      label: null,
      isActive: true,
      position: null,
    };
    this.paymentMethodForm.reset(emptyPaymentMethod);
    this.paymentMethodService.editingPaymentMethod.set(null);
  }
}
