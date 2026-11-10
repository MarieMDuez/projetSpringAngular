import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { AccountFormComponent } from './account-form.component';
import { AccountService } from '../account.service';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';
import { AccountType, Account } from '../account.model';
import { signal, WritableSignal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

describe('AccountFormComponent', () => {
  let component: AccountFormComponent;
  let fixture: ComponentFixture<AccountFormComponent>;
  let mockAccountService: any;
  let mockToastService: any;

  let allAccountsSignal: WritableSignal<Account[]>;
  let editingAccountSignal: WritableSignal<Account | null>;

  const getMockAccounts = (): Account[] => [
    {
      id: 1,
      label: 'Courant',
      type: AccountType.COURANT,
      initialBalance: 100,
      isDefault: true,
      isActive: true,
      position: 0,
    },
  ];

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const norm = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();

  beforeEach(() => {
    allAccountsSignal = signal<Account[]>(getMockAccounts());
    editingAccountSignal = signal<Account | null>(null);

    mockAccountService = {
      allAccounts: allAccountsSignal,
      editingAccount: editingAccountSignal,
      createAccount: vi.fn().mockReturnValue(of({ id: 2, label: 'Nouveau' })),
      updateAccount: vi.fn().mockReturnValue(of(true)),
    };

    mockToastService = {
      show: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [AccountFormComponent, ReactiveFormsModule],
      providers: [
        { provide: AccountService, useValue: mockAccountService },
        { provide: ToastService, useValue: mockToastService },
      ],
    });
  });

  const createComponent = async (): Promise<void> => {
    fixture = TestBed.createComponent(AccountFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  describe('Initialisation et Validation du Formulaire réactif', () => {
    it('should initialize the form group with default values and types', async () => {
      await createComponent();

      expect(component['accountForm']).toBeDefined();
      expect(component['accountForm'].get('label')?.value).toBe('');
      expect(component['accountForm'].get('type')?.value).toBe(AccountType.COURANT);
      expect(component['accountForm'].get('initialBalance')?.value).toBe(0);
      expect(component['accountForm'].get('isDefault')?.value).toBe(false);
    });

    it('should flag the label control as invalid if input length is less than 3 characters', async () => {
      await createComponent();
      const labelControl = component['accountForm'].get('label')!;

      labelControl.setValue('Cc');
      labelControl.markAsTouched();
      fixture.detectChanges();

      expect(labelControl.invalid).toBe(true);
      expect(el().querySelector('.error-text')).not.toBeNull();
      expect(norm(el().querySelector('.error-text')?.textContent)).toBe('Obligatoire (3 car. min)');
    });
  });

  describe('Cycle de Réactivité du Constructeur (Effect Component)', () => {
    it('should catch service editingAccount signal updates and patch form controls values', async () => {
      await createComponent();
      const editingTarget: Account = {
        id: 42,
        label: 'Livret Épargne',
        type: AccountType.EPARGNE,
        initialBalance: 5000,
        isDefault: false,
        isActive: true,
        position: 1,
      };

      editingAccountSignal.set(editingTarget);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component['accountForm'].get('label')?.value).toBe('Livret Épargne');
      expect(component['accountForm'].get('type')?.value).toBe(AccountType.EPARGNE);
      expect(component['accountForm'].get('initialBalance')?.value).toBe(5000);
    });
  });
  describe('Soumission et Persistance (onSubmit)', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should ignore submissions completely if the form state is invalid', () => {
      component['accountForm'].setValue({
        label: '',
        type: AccountType.COURANT,
        initialBalance: 0,
        isDefault: false,
        isActive: true,
        position: null,
      });

      component['onSubmit']();
      expect(mockAccountService.createAccount).not.toHaveBeenCalled();
    });

    it('should dispatch createAccount workflow on nominal creation mode, reset state, and emit saveSuccess', () => {
      const spyEmit = vi.spyOn(component.saveSuccess, 'emit');

      component['accountForm'].setValue({
        label: 'Mon Propre Compte',
        type: AccountType.COURANT,
        initialBalance: 250,
        isDefault: true,
        isActive: true,
        position: null,
      });

      component['onSubmit']();

      expect(mockAccountService.createAccount).toHaveBeenCalledWith({
        label: 'Mon Propre Compte',
        type: AccountType.COURANT,
        initialBalance: 250,
        isActive: true,
        isDefault: true,
        position: 1, // taille de la liste allAccounts() initiale
      });

      expect(mockToastService.show).toHaveBeenCalledWith('Compte créé avec succès !', 'success');
      expect(spyEmit).toHaveBeenCalledWith(2); // ID retourné par le mock de création
      expect(component['accountForm'].get('label')?.value).toBe('');
    });

    it('should dispatch updateAccount workflow when an active editingAccount is provided', () => {
      const editingTarget: Account = {
        id: 10,
        label: 'Compte Pro',
        type: AccountType.COURANT,
        initialBalance: 500,
        isDefault: false,
        isActive: true,
        position: 2,
      };
      editingAccountSignal.set(editingTarget);
      fixture.detectChanges();

      component['accountForm'].patchValue({ label: 'Compte Pro Modifié' });
      component['onSubmit']();

      expect(mockAccountService.updateAccount).toHaveBeenCalledWith(10, {
        id: 10,
        label: 'Compte Pro Modifié',
        type: AccountType.COURANT,
        initialBalance: 500,
        isDefault: false,
        isActive: true,
        position: 2,
      });

      expect(mockToastService.show).toHaveBeenCalledWith('Compte modifié avec succès !', 'success');
      expect(editingAccountSignal()).toBeNull();
    });

    it('should trigger unique error toaster notifications when backend creation responds with a HTTP 409 conflict', () => {
      const conflictError = new HttpErrorResponse({ status: 409 });
      mockAccountService.createAccount.mockReturnValue(throwError(() => conflictError));

      component['accountForm'].setValue({
        label: 'Doublon Détecté',
        type: AccountType.COURANT,
        initialBalance: 10,
        isDefault: false,
        isActive: true,
        position: null,
      });

      component['onSubmit']();
      expect(mockToastService.show).toHaveBeenCalledWith(
        'Une erreur est survenue : ce nom de compte existe déjà',
        'error',
      );
    });

    it('should trigger generic error toaster notifications when backend update fails unexpectedly', () => {
      mockAccountService.updateAccount.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      const editingTarget: Account = {
        id: 10,
        label: 'Compte Pro',
        type: AccountType.COURANT,
        initialBalance: 500,
        isDefault: false,
        isActive: true,
        position: 2,
      };
      editingAccountSignal.set(editingTarget);
      fixture.detectChanges();

      component['onSubmit']();
      expect(mockToastService.show).toHaveBeenCalledWith(
        'Une erreur est survenue lors de la modification du compte',
        'error',
      );
    });
  });

  describe('Annulation de l Édition (onCancelEdit)', () => {
    it('should clear editing references and return fields states to baseline empty configurations', async () => {
      await createComponent();
      const editingTarget: Account = {
        id: 10,
        label: 'Compte Pro',
        type: AccountType.COURANT,
        initialBalance: 500,
        isDefault: false,
        isActive: true,
        position: 2,
      };
      editingAccountSignal.set(editingTarget);
      fixture.detectChanges();

      component.onCancelEdit();

      expect(editingAccountSignal()).toBeNull();
      expect(component['accountForm'].get('label')?.value).toBeNull(); // Suite au reset(accountVide)
    });
  });
});
