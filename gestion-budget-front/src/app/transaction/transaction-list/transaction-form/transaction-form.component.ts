import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountService } from '../../../settings/account/account.service';
import { CategoryService } from '../../../settings/category/category.service';
import { PaymentMethodService } from '../../../settings/payment-method/payment-method.service';
import { Transaction } from '../../transaction.model';
import { TransactionService } from '../../transaction.service';
import { SelectLoopDirective } from '../../../shared/directives/select-loop.directive';
@Component({
  selector: 'app-transaction-form',
  imports: [ReactiveFormsModule, SelectLoopDirective],
  templateUrl: './transaction-form.component.html',
  styleUrl: './transaction-form.component.scss',
})
export class TransactionFormComponent implements OnInit {
  protected transactionService = inject(TransactionService);
  private accountService = inject(AccountService);
  private paymentMethodsService = inject(PaymentMethodService);
  private categoryService = inject(CategoryService);
  private myFormBuilder = inject(FormBuilder);

  protected errorMessage = signal<string | null>(null);
  protected accounts = this.accountService.activeAccounts;
  protected paymentMethods = this.paymentMethodsService.activePaymentMethods;
  protected categories = this.categoryService.activeCategories;

  protected transactionForm!: FormGroup;

  constructor() {
    effect(() => {
      const tx = this.transactionService.transactionToEdit();
      if (tx) {
        this.transactionForm.patchValue({
          emissionDate: tx.emissionDate,
          description: tx.description,
          amount: tx.amount,
          type: tx.type,

          accountId: tx.account?.id,
          categoryId: tx.category?.id,
          paymentMethodId: tx.paymentMethod?.id,
          isChecked: tx.isChecked,
          recurrenceMonths: tx.recurrenceMonths,
        });
      }
    });
  }

  ngOnInit() {
    this.initForm();
  }
  private initForm(): void {
    this.transactionForm = this.myFormBuilder.group({
      amount: [null, [Validators.required, Validators.min(0.01)]],
      emissionDate: [new Date().toISOString().substring(0, 10), Validators.required],
      type: ['DEBIT', Validators.required],
      description: [''],
      recurrenceMonths: [0, [Validators.min(0)]],
      isChecked: false,

      accountId: ['', Validators.required],
      categoryId: ['', Validators.required],
      paymentMethodId: ['', Validators.required],
    });
  }

  protected onSubmit(): void {
    if (this.transactionForm.invalid) return;

    const formData = this.transactionForm.value;
    const currentTx = this.transactionService.transactionToEdit()?.id;

    const newTransaction: Transaction = {
      amount: formData.amount,
      emissionDate: formData.emissionDate,
      type: formData.type,
      description: formData.description,
      recurrenceMonths: formData.recurrenceMonths,
      isAlertTriggered: false,
      isChecked: formData.isChecked,
      account: { id: Number(formData.accountId) },
      category: { id: Number(formData.categoryId) },
      paymentMethod: { id: Number(formData.paymentMethodId) },
      parentTransactionId: null,
    };

    const todayISO = new Date().toISOString().substring(0, 10);

    const transactionVide: Transaction = {
      amount: 0,
      emissionDate: todayISO,
      type: 'DEBIT',
      description: '',
      recurrenceMonths: 0,
      account: { id: 0 },
      category: { id: 0 },
      paymentMethod: { id: 0 },
      isChecked: false,
      isAlertTriggered: false,
      parentTransactionId: null,
    };

    if (currentTx) {
      newTransaction.id = currentTx;
      this.transactionService.updateTransaction(currentTx, newTransaction).subscribe({
        next: () => {
          this.transactionForm.reset(transactionVide);
          this.transactionService.transactionToEdit.set(null);
          this.errorMessage.set(null);
        },
        error: () => this.errorMessage.set('Erreur lors de la modification de la transaction.'),
      });
    } else {
      this.transactionService.createTransaction(newTransaction).subscribe({
        next: () => {
          this.transactionForm.reset(transactionVide);
          this.transactionService.transactionToEdit.set(null);
          this.errorMessage.set(null);
        },
        error: () => this.errorMessage.set('Erreur lors de la création de la transaction.'),
      });
    }
  }
}
