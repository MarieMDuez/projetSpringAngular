import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaymentMethodService } from '../payment-method.service';
import { PaymentMethod } from '../payment-method.model';

@Component({
  selector: 'app-payment-method-form',
  imports: [ReactiveFormsModule],
  templateUrl: './payment-method-form.component.html',
  styleUrl: './payment-method-form.component.scss',
})
export class PaymentMethodFormComponent implements OnInit {
  protected paymentMethodService = inject(PaymentMethodService);
  private myFormBuilder = inject(FormBuilder);

  protected paymentMethods = this.paymentMethodService.allPaymentMethods;
  protected errorMessage = signal<string | null>(null);

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
          this.paymentMethodForm.reset({ label: '' });
          this.paymentMethodService.editingPaymentMethod.set(null);
          this.errorMessage.set(null);
        },
        error: (err) =>
          this.errorMessage.set('Erreur lors de la modificatioon du moyen de paiement.'),
      });
    } else {
      paymentMethod.position = this.paymentMethods().length;
      this.paymentMethodService.createPaymentMethod(paymentMethod).subscribe({
        next: () => {
          this.paymentMethodForm.reset({ label: '' });
          this.errorMessage.set(null);
        },
        error: (err) => this.errorMessage.set('Erreur lors de la création du moyen de paiement.'),
      });
    }
  }

  public onCancelEdit(): void {
    this.paymentMethodForm.reset({ label: '' });
    this.paymentMethodService.editingPaymentMethod.set(null);
  }
}
