import { Component, inject, OnInit } from '@angular/core';
import { TransactionService } from '../../transaction.service';

import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AccountService } from '../../../settings/account/account.service';
import { CategoryService } from '../../../settings/category/category.service';
import { PaymentMethodService } from '../../../settings/payment-method/payment-method.service';
import { FindByIdPipe } from '../../../shared/pipes/find-by-id-pipe';
import { Transaction } from '../../transaction.model';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';

@Component({
  selector: 'app-transaction-table',
  imports: [ReactiveFormsModule, FindByIdPipe, CommonModule, DatePipe],
  templateUrl: './transaction-table.component.html',
  styleUrl: './transaction-table.component.scss',
})
export class TransactionTableComponent implements OnInit {
  protected transactionService = inject(TransactionService);
  protected accountService = inject(AccountService);
  protected categoryService = inject(CategoryService);
  protected paymentMethodService = inject(PaymentMethodService);
  private toastService = inject(ToastService);

  protected accounts = this.accountService.allAccounts;
  protected categories = this.categoryService.allCategories;
  protected paymentMethods = this.paymentMethodService.allPaymentMethods;

  ngOnInit(): void {}

  public onEdit(transaction: Transaction): void {
    this.transactionService.transactionToEdit.set(transaction);

    /*Pour remonter au formulaire qui s'auto-rempli*/
    const formElement = document.getElementById('editForm');
    if (formElement) {
      formElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }

  protected onDeleteTransaction(id: number | undefined): void {
    if (!id) return;

    if (confirm('Voulez-vous vraiment supprimer définitivement cette transaction ?')) {
      this.transactionService.deleteTransaction(id).subscribe({
        next: () => {
          this.toastService.show('Transaction supprimée avec succès !', 'success');
        },
        error: (err) =>
          this.toastService.show('Une erreur est survenue lors de la suppression', 'error'),
      });
    }
  }

  public onToggleCheck(transaction: Transaction): void {
    const updatedTx = {
      ...transaction,
      isChecked: !transaction.isChecked,
    };

    if (transaction.id)
      this.transactionService.updateTransaction(transaction.id, updatedTx).subscribe({
        error: () =>
          this.toastService.show(
            'Une erreur est survenue lors du pointage de la transaction',
            'error',
          ),
      });
  }
}
