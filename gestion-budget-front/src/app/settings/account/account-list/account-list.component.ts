import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';
import { OpenDialogDirective } from '../../../shared/directives/open-dialog.directive';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { AccountFormComponent } from '../account-form/account-form.component';
import { Account } from '../account.model';
import { AccountService } from '../account.service';

@Component({
  selector: 'app-account-list',
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DragDropModule,
    AccountFormComponent,
    ModalComponent,
    OpenDialogDirective,
  ],
  templateUrl: './account-list.component.html',
  styleUrl: './account-list.component.scss',
})
export class AccountListComponent implements OnInit {
  private accountService = inject(AccountService);
  private toastService = inject(ToastService);

  protected accounts = this.accountService.allAccounts;
  protected accountToSetDefault = signal<Account | null>(null);
  protected accountToDelete = signal<Account | null>(null);
  protected accountToSetActive = signal<Account | null>(null);

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

  protected onDrop(event: CdkDragDrop<Account[]>): void {
    const listeModifiable = [...this.accounts()];

    moveItemInArray(listeModifiable, event.previousIndex, event.currentIndex);

    const listeMiseAJour = listeModifiable.map((category, index) => ({
      ...category,
      position: index,
    }));
    this.accountService.saveAll(listeMiseAJour).subscribe();
  }

  protected onConfirmDefaultAction(action: 'confirm' | 'cancel'): void {
    const account = this.accountToSetDefault();
    if (action === 'confirm' && account) {
      this.toggleAccountByDefault(account);
    } else {
      this.accountToSetDefault.set(null);
    }
  }

  protected onConfirmDeleteAction(action: 'confirm' | 'cancel'): void {
    const account = this.accountToDelete();

    if (action === 'confirm' && account) {
      this.onDelete(account);
    } else {
      this.accountToDelete.set(null);
    }
  }

  protected onSetActiveAccount(account: Account): void {
    if (!account.id) return;

    const updatedAccount: Account = { ...account, isActive: true };

    this.accountService.setAccountActive(account.id, updatedAccount).subscribe({
      next: () => {
        this.toastService.show('Le compte a été réactivé.', 'success');
      },
      error: (err) => this.toastService.show('Erreur lors de la réactivation du compte.', 'error'),
    });
  }

  protected onConfirmSetActiveAction(action: 'confirm' | 'cancel'): void {
    const account = this.accountToSetActive();

    if (action === 'confirm' && account) {
      this.onSetActiveAccount(account);
    } else {
      this.accountToSetActive.set(null);
    }
  }
}
