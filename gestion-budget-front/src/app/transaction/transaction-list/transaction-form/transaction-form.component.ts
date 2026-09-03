import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountService } from '../../../settings/account/account.service';
import { CategoryService } from '../../../settings/category/category.service';
import { PaymentMethodService } from '../../../settings/payment-method/payment-method.service';
import { Transaction } from '../../transaction.model';
import { TransactionService } from '../../transaction.service';
import { SelectLoopDirective } from '../../../shared/directives/select-loop.directive';
import { TitleCasePipe } from '@angular/common';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';
@Component({
  selector: 'app-transaction-form',
  imports: [ReactiveFormsModule, SelectLoopDirective, TitleCasePipe],
  templateUrl: './transaction-form.component.html',
  styleUrl: './transaction-form.component.scss',
})
export class TransactionFormComponent implements OnInit {
  protected transactionService = inject(TransactionService);
  private accountService = inject(AccountService);
  private paymentMethodsService = inject(PaymentMethodService);
  private categoryService = inject(CategoryService);
  private myFormBuilder = inject(FormBuilder);
  private toastService = inject(ToastService);

  protected accounts = this.accountService.activeAccounts;
  protected paymentMethods = this.paymentMethodsService.activePaymentMethods;
  protected categories = this.categoryService.activeCategories;

  protected transactionForm!: FormGroup;

  protected availableMonths = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(2000, i, 1)),
  }));

  protected defaultMonth: string = '';
  protected defaultYear: number = 0;

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
    const today = new Date();

    const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    // 3. On extrait le nom du mois (ou son index) et l'année
    // .toLocaleString('fr-FR', { month: 'long' }) renverra "octobre"
    this.defaultMonth = nextMonthDate.toLocaleString('fr-FR', { month: 'long' });
    this.defaultYear = nextMonthDate.getFullYear();
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
          (this.toastService.show('Transaction mise à jour !', 'success'),
            this.transactionForm.reset(transactionVide));
          this.transactionService.transactionToEdit.set(null);
        },
        error: () =>
          this.toastService.show('Erreur lors de la mise à jour de la transaction', 'error'),
      });
    } else {
      this.transactionService.createTransaction(newTransaction).subscribe({
        next: () => {
          (this.toastService.show('Transaction enregistrée !', 'success'),
            this.transactionForm.reset(transactionVide));
          this.transactionService.transactionToEdit.set(null);
        },
        error: () =>
          this.toastService.show("Erreur lors de l'enregistrement de la transaction", 'error'),
      });
    }
  }

  onCancelEdit() {
    this.transactionForm.reset({});
    this.transactionService.transactionToEdit.set(null);
  }

  protected readonly Number = Number;

  protected generateRecurrent(month: number, year: number): void {
    if (month && year && year.toString().length === 4) {
      const totalAvant = this.transactionService.allTransactionsSignal().length;

      this.transactionService.generateRecurrentTransactions(month, year).subscribe({
        next: () => {
          const totalApres = this.transactionService.allTransactionsSignal().length;

          // 3. On calcule la différence
          const nbCreees = totalApres - totalAvant;

          if (nbCreees > 0) {
            this.toastService.show(
              `${nbCreees} transactions récurrentes ont été générées !`,
              'success',
            );
          } else {
            this.toastService.show(
              'Toutes les transactions récurrentes existent déjà pour ce mois',
              'info',
            );
          }
        },
        error: () => {
          this.toastService.show('Erreur lors de la génération automatique', 'error');
        },
      });
    }
  }
}
