import { Component, inject, OnInit } from '@angular/core';
import { TransactionService } from '../../transaction.service';

import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AccountService } from '../../../settings/account/account.service';
import { CategoryService } from '../../../settings/category/category.service';
import { PaymentMethodService } from '../../../settings/payment-method/payment-method.service';
import { FindByIdPipe } from '../../../shared/pipes/find-by-id-pipe';
import { Transaction } from '../../transaction.model';

@Component({
  selector: 'app-transaction-table',
  imports: [ReactiveFormsModule, FindByIdPipe, CommonModule],
  templateUrl: './transaction-table.component.html',
  styleUrl: './transaction-table.component.scss',
})
export class TransactionTableComponent implements OnInit {
  protected transactionService = inject(TransactionService);
  protected accountService = inject(AccountService);
  protected categoryService = inject(CategoryService);
  protected paymentMethodService = inject(PaymentMethodService);

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
        next: () => {},
        error: (err) => console.error('Erreur lors de la suppression', err),
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
        error: () => console.error('Erreur lors du pointage de la transaction'),
      });
  }
}
