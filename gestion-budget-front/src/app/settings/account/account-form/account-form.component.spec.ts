import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountFormComponent } from './account-form.component';
import { AccountService } from '../account.service';
import { signal, WritableSignal } from '@angular/core';
import { Account } from '../account.model';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';

describe('AccountFormComponent', () => {
  let component: AccountFormComponent;
  let fixture: ComponentFixture<AccountFormComponent>;

  // Isolation du State global via des stubs de signaux
  const mockAllAccounts = signal<Account[]>([]);
  const mockEditingAccount: WritableSignal<Account | null> = signal<Account | null>(null);
  const mockToastService: { show: Mock } = { show: vi.fn() };

  const mockAccountService: Partial<AccountService> = {
    allAccounts: mockAllAccounts,
    editingAccount: mockEditingAccount,
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAllAccounts.set([]);
    mockEditingAccount.set(null);

    await TestBed.configureTestingModule({
      imports: [AccountFormComponent],
      providers: [
        { provide: AccountService, useValue: mockAccountService },
        { provide: ToastService, useValue: mockToastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and initialize the reactive form', () => {
    expect(component).toBeTruthy();
    expect(component['accountForm']).toBeDefined();
    expect(component['accountForm'].get('label')?.value).toBe('');
  });

  it('should validate form constraints (required fields and minLength)', () => {
    const form = component['accountForm'];
    expect(form.valid).toBe(false); // Correction Vitest

    // Insertion d'un label trop court pour valider le validateur minLength
    form.patchValue({ label: 'Ab', initialBalance: 100 });
    expect(form.valid).toBe(false); // Correction Vitest

    form.patchValue({ label: 'Compte Courant' });
    expect(form.valid).toBe(true); // Correction Vitest
  });

  it('should react and pre-populate the form when editingAccount signal updates', async () => {
    const targetAccount: Account = {
      id: 12,
      label: 'Livret A',
      initialBalance: 5000,
      isDefault: false,
      isActive: true,
      position: 0,
    };

    // Simulation de l'action utilisateur "Modifier" depuis la liste parente
    mockEditingAccount.set(targetAccount);

    // Attente du cycle de l'effect() réactif d'Angular
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component['accountForm'].get('label')?.value).toBe('Livret A');
    expect(component['accountForm'].get('initialBalance')?.value).toBe(5000);
  });

  it('should call createAccount API and reset form on a valid creation submit', () => {
    const mockNewAccount: Account = {
      id: 1,
      label: 'Nouveau Compte',
      initialBalance: 200,
      isDefault: false,
      isActive: true,
      position: 0,
    };
    (mockAccountService.createAccount as Mock).mockReturnValue(of(mockNewAccount));

    component['accountForm'].patchValue({
      label: 'Nouveau Compte',
      initialBalance: 200,
      isDefault: false,
    });
    component['onSubmit']();

    expect(mockAccountService.createAccount).toHaveBeenCalled();
    expect(component['accountForm'].get('label')?.value).toBe(''); // Formulaire réinitialisé
    expect(mockToastService.show).toHaveBeenCalledWith('Compte créé avec succès !', 'success');
  });

  it('should call updateAccount API and clear state on a valid edition submit', async () => {
    const activeAccount: Account = {
      id: 99,
      label: 'Compte Pro',
      initialBalance: 1000,
      isDefault: true,
      isActive: true,
      position: 1,
    };
    mockEditingAccount.set(activeAccount);
    await fixture.whenStable();

    (mockAccountService.updateAccount as Mock).mockReturnValue(of(activeAccount));

    component['accountForm'].patchValue({ label: 'Compte Pro Modifié' });
    component['onSubmit']();

    expect(mockAccountService.updateAccount).toHaveBeenCalledWith(99, expect.any(Object));
    expect(mockEditingAccount()).toBeNull(); // Correction Vitest
  });

  it('should capture backend error and map it to the UI error signal', () => {
    (mockAccountService.createAccount as Mock).mockReturnValue(
      throwError(() => new Error('API Error')),
    );

    component['accountForm'].patchValue({ label: 'Erreur Compte', initialBalance: 50 });
    component['onSubmit']();

    expect(mockToastService.show).toHaveBeenCalledWith(
      'Une erreur est survenue lors de la création du compte',
      'error',
    );
  });

  it('should trigger duplicate name error toast upon 409 conflict during creation', () => {
    // GIVEN : L'API renvoie un statut 409
    const errorResponse = { status: 409 };
    (mockAccountService.createAccount as Mock).mockReturnValue(throwError(() => errorResponse));

    component['accountForm'].patchValue({ label: 'livret A' });

    // WHEN
    component['onSubmit']();

    // THEN
    expect(mockToastService.show).toHaveBeenCalledWith(
      'Une erreur est survenue : ce nom de compte existe déjà',
      'error',
    );
  });

  it('should clear form data and reset editing signal on cancellation', async () => {
    mockEditingAccount.set({
      id: 5,
      label: 'Test',
      initialBalance: 10,
      isDefault: false,
      isActive: true,
      position: 3,
    });
    await fixture.whenStable();

    component.onCancelEdit();

    expect(mockEditingAccount()).toBeNull(); // Correction Vitest
    expect(component['accountForm'].get('label')?.value).toBe('');
  });
});
