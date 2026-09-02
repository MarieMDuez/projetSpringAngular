import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Account } from '../account.model';
import { AccountService } from '../account.service';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-account-form',
  imports: [ReactiveFormsModule],
  templateUrl: './account-form.component.html',
  styleUrl: './account-form.component.scss',
})
export class AccountFormComponent implements OnInit {
  protected accountForm!: FormGroup;
  private myFormBuilder = inject(FormBuilder);
  protected accountService = inject(AccountService);

  private toastService = inject(ToastService);

  protected accounts = this.accountService.allAccounts;
  protected errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      const category = this.accountService.editingAccount();
      if (category) this.onEdit(category);
    });
  }
  ngOnInit() {
    this.initForm();
  }

  private initForm() {
    this.accountForm = this.myFormBuilder.group({
      label: ['', [Validators.required, Validators.minLength(3)]],
      initialBalance: [0, [Validators.required]],
      isDefault: [false],
    });
  }
  protected onSubmit(): void {
    if (this.accountForm.invalid) {
      return;
    }

    const formData = this.accountForm.value;
    const currentId = this.accountService.editingAccount()?.id;
    const account: Account = {
      label: formData.label,
      initialBalance: formData.initialBalance,
      isDefault: formData.isDefault,
      isActive: formData.isActive,
      position: formData.position,
    };

    const accountVide = {
      id: undefined,
      label: '',
      initialBalance: 0,
      isDefault: false,
      isActive: true,
      position: undefined,
    };
    if (currentId != null) {
      account.id = currentId;
      this.accountService.updateAccount(currentId, account).subscribe({
        next: () => {
          this.toastService.show('Compte modifié avec succès !', 'success');
          this.accountService.editingAccount.set(null);
          this.accountForm.reset(accountVide);
          this.errorMessage.set(null);
        },
        error: (err: HttpErrorResponse) => {
          if (err.status == 409) {
            this.toastService.show(
              `Une erreur est survenue : ce nom de compte existe déjà`,
              'error',
            );
          } else {
            this.toastService.show(`Une erreur est survenuelors de la création du compte`, 'error');
          }
        },
      });
    } else {
      const newAccount: Account = {
        label: formData.label,
        initialBalance: formData.initialBalance,
        isActive: true,
        isDefault: formData.isDefault,
        position: this.accounts().length,
      };

      this.accountService.createAccount(newAccount).subscribe({
        next: () => {
          this.toastService.show('Compte créé avec succès !', 'success');

          this.accountForm.reset({
            label: '',
            initialBalance: 0,
            isDefault: false,
            isActive: true,
            position: null,
          });
          this.errorMessage.set(null);
        },
        error: (err: HttpErrorResponse) => {
          if (err.status == 409) {
            this.toastService.show(
              `Une erreur est survenue : ce nom de compte existe déjà`,
              'error',
            );
          } else {
            this.toastService.show(`Une erreur est survenuelors de la création du compte`, 'error');
          }
        },
      });
    }
  }
  protected onEdit(account: Account): void {
    if (account.id != null) this.accountService.editingAccount.set(account);

    this.accountForm.patchValue({
      label: account.label,
      isDefault: account.isDefault,
      isActive: account.isActive,
      initialBalance: account.initialBalance,
    });
  }

  public onCancelEdit(): void {
    const accountVide = {
      id: null,
      label: '',
      initialBalance: 0,
      isDefault: false,
      isActive: true,
      position: null,
    };
    this.accountService.editingAccount.set(null);
    this.accountForm.reset(accountVide);
  }
}
