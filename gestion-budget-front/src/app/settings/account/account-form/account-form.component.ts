import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, OnInit, output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';
import { Account, AccountType, AccountTypeLabels } from '../account.model';
import { AccountService } from '../account.service';

@Component({
  selector: 'app-account-form',
  imports: [ReactiveFormsModule],
  templateUrl: './account-form.component.html',
  styleUrl: './account-form.component.scss',
})
export class AccountFormComponent implements OnInit {
  protected accountForm!: FormGroup;
  private readonly myFormBuilder = inject(FormBuilder);
  protected accountService = inject(AccountService);

  private readonly toastService = inject(ToastService);

  protected accounts = this.accountService.allAccounts;
  saveSuccess = output<number>();

  protected readonly accountTypeLabels = AccountTypeLabels;

  protected readonly accountTypes = Object.values(AccountType);

  protected readonly accountVide = {
    label: null,
    type: AccountType.COURANT,
    initialBalance: 0,
    isDefault: false,
    isActive: true,
    position: null,
  };

  constructor() {
    effect(() => {
      const account = this.accountService.editingAccount();
      if (account && this.accountForm) this.onEdit(account);
    });
  }
  ngOnInit() {
    this.initForm();
  }

  private initForm() {
    this.accountForm = this.myFormBuilder.group({
      label: [
        '',
        {
          validators: [Validators.required, Validators.minLength(3)],
        },
      ],
      type: [AccountType.COURANT, [Validators.required]],
      initialBalance: [0, [Validators.required]],
      isDefault: [false],
      isActive: true,
      position: null,
    });
  }

  protected onSubmit(): void {
    if (this.accountForm.invalid) {
      return;
    }

    const formData = this.accountForm.getRawValue();
    const currentId = this.accountService.editingAccount()?.id;
    const account: Account = {
      label: formData.label,
      type: formData.type,
      initialBalance: formData.initialBalance,
      isDefault: formData.isDefault,
      isActive: formData.isActive,
      position: formData.position,
    };
    if (currentId != null) {
      account.id = currentId;
      this.accountService.updateAccount(currentId, account).subscribe({
        next: () => {
          this.toastService.show('Compte modifié avec succès !', 'success');
          this.accountService.editingAccount.set(null);
          this.accountForm.reset(this.accountVide);
        },
        error: (err: HttpErrorResponse) => {
          if (err.status == 409) {
            this.toastService.show(
              `Une erreur est survenue : ce nom de compte existe déjà`,
              'error',
            );
          } else {
            this.toastService.show(
              `Une erreur est survenue lors de la modification du compte`,
              'error',
            );
          }
        },
      });
    } else {
      const newAccount: Account = {
        label: formData.label,
        type: formData.type,
        initialBalance: formData.initialBalance,
        isActive: true,
        isDefault: formData.isDefault,
        position: this.accounts().length,
      };

      this.accountService.createAccount(newAccount).subscribe({
        next: (newAccount: Account) => {
          this.toastService.show('Compte créé avec succès !', 'success');
          this.saveSuccess.emit(newAccount.id!);

          this.accountForm.reset({
            label: '',
            type: AccountType.COURANT,
            initialBalance: 0,
            isDefault: false,
            isActive: true,
            position: null,
          });
        },
        error: (err: HttpErrorResponse) => {
          if (err.status == 409) {
            this.toastService.show(
              `Une erreur est survenue : ce nom de compte existe déjà`,
              'error',
            );
          } else {
            this.toastService.show(
              `Une erreur est survenue lors de la création du compte`,
              'error',
            );
          }
        },
      });
    }
  }
  protected onEdit(account: Account): void {
    this.accountForm.markAsUntouched();
    if (account.id != null) this.accountService.editingAccount.set(account);
    this.accountForm.patchValue({
      label: account.label,
      type: account.type,
      isDefault: account.isDefault,
      isActive: account.isActive,
      initialBalance: account.initialBalance,
      position: account.position,
    });
  }

  public onCancelEdit(): void {
    this.accountService.editingAccount.set(null);
    this.accountForm.reset(this.accountVide);
  }
}
