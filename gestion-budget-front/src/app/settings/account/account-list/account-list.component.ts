import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountService } from '../account.service';
import { Account } from '../account.model';
import { CurrencyPipe } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { AccountFormComponent } from '../account-form/account-form.component';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';

@Component({
  selector: 'app-account-list',
  imports: [ReactiveFormsModule, CurrencyPipe, DragDropModule, AccountFormComponent],
  templateUrl: './account-list.component.html',
  styleUrl: './account-list.component.scss',
})
export class AccountListComponent implements OnInit {
  private accountService = inject(AccountService);
  private toastService = inject(ToastService);

  protected accounts = this.accountService.allAccounts;

  protected errorMessage = signal<string | null>(null);

  ngOnInit() {}

  protected onEdit(account: Account): void {
    if (account.id != null) this.accountService.editingAccount.set(account);

    /*Pour remonter au formulaire qui s'auto-rempli*/
    const formElement = document.getElementById('editForm');
    if (formElement) {
      formElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }

  protected onDelete(account: Account): void {
    if (!account.id) return;

    const confirmDelete = confirm(`Voulez-vous supprimer le compte "${account.label}" ?`);
    if (!confirmDelete) return;

    this.accountService.deleteAccount(account.id).subscribe({
      next: (isHardDeleted) => {
        if (isHardDeleted) {
          this.toastService.show('Le compte a été supprimé avec succès', 'success');
        } else {
          this.toastService.show(
            'Au moins une transaction est rattachée à ce compte : il a été archivé avec succès',
            'success',
          );
        }
      },
      error: (err) =>
        this.toastService.show('Une erreur est survenue lors de la suppression', 'error'),
    });
  }

  protected toggleAccountByDefault(account: Account): void {
    if (!account.id) return;

    const updatedAccount: Account = { ...account, isDefault: !account.isDefault };

    this.accountService.updateAccountByDefault(account.id, updatedAccount).subscribe({
      next: () => {
        this.toastService.show('Le changement de compte principal a été effectué.', 'success');
      },
      error: (err) =>
        this.toastService.show('Erreur lors de la modification du compte principal.', 'error'),
    });
  }

  onDrop(event: CdkDragDrop<Account[]>): void {
    const listeModifiable = [...this.accounts()];

    moveItemInArray(listeModifiable, event.previousIndex, event.currentIndex);

    const listeMiseAJour = listeModifiable.map((category, index) => ({
      ...category,
      position: index,
    }));
    this.accountService.saveAll(listeMiseAJour).subscribe();
  }
}
