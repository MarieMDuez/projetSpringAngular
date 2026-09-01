import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountListComponent } from './account-list.component';
import { AccountService } from '../account.service';
import { Account } from '../account.model';
import { signal, NO_ERRORS_SCHEMA } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';

describe('AccountListComponent', () => {
  let component: AccountListComponent;
  let fixture: ComponentFixture<AccountListComponent>;

  // Isolation du State global via des stubs
  const mockAllAccounts = signal<Account[]>([]);
  const mockEditingAccount = signal<Account | null>(null);
  // Mock global de la fonction scrollIntoView pour éviter les plantages dans Vitest
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  const mockAccountService: Partial<AccountService> = {
    allAccounts: mockAllAccounts,
    editingAccount: mockEditingAccount,
    updateAccountByDefault: vi.fn(),
    deleteAccount: vi.fn(),
    saveAll: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAllAccounts.set([]);
    mockEditingAccount.set(null);

    await TestBed.configureTestingModule({
      imports: [AccountListComponent],
      providers: [{ provide: AccountService, useValue: mockAccountService }],
      schemas: [NO_ERRORS_SCHEMA], // Ignore le composant enfant <app-account-form> lors du rendu du test
    }).compileComponents();

    fixture = TestBed.createComponent(AccountListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the list component', () => {
    expect(component).toBeTruthy();
  });

  it('should propagate account data to editingAccount signal upon edit action', () => {
    const targetAccount: Account = {
      id: 1,
      label: 'Livret A',
      initialBalance: 1000,
      isDefault: false,
      isActive: true,
      position: 0,
    };

    component['onEdit'](targetAccount);

    expect(mockEditingAccount()).toEqual(targetAccount);
  });

  it('should request backend delete and archive gracefully if isHardDeleted is false', () => {
    const targetAccount: Account = {
      id: 42,
      label: 'Compte Joint',
      initialBalance: 500,
      isDefault: false,
      isActive: true,
      position: 1,
    };
    vi.spyOn(window, 'confirm').mockReturnValue(true); // Simulation du clic "OK" sur le confirm()
    (mockAccountService.deleteAccount as Mock).mockReturnValue(of(false)); // Simulation d'un soft-delete (archivage) par le back

    component['onDelete'](targetAccount);

    expect(mockAccountService.deleteAccount).toHaveBeenCalledWith(42);
    expect(component['errorMessage']()).toBeNull();
  });

  it('should handle cancel action on delete dialog without triggering API call', () => {
    const targetAccount: Account = {
      id: 42,
      label: 'Compte Joint',
      initialBalance: 500,
      isDefault: false,
      isActive: true,
      position: 1,
    };
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false); // Simulation du clic "Annuler"

    component['onDelete'](targetAccount);

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockAccountService.deleteAccount).not.toHaveBeenCalled();
  });

  it('should switch isDefault attribute and call updateAccountByDefault API', () => {
    const targetAccount: Account = {
      id: 2,
      label: 'Courant',
      initialBalance: 100,
      isDefault: false,
      isActive: true,
      position: 0,
    };
    (mockAccountService.updateAccountByDefault as Mock).mockReturnValue(of(targetAccount));

    component['toggleAccountByDefault'](targetAccount);

    expect(mockAccountService.updateAccountByDefault).toHaveBeenCalledWith(
      2,
      expect.objectContaining({
        isDefault: true,
      }),
    );
  });

  it('should process drag and drop event, re-index positions and trigger bulk save API', () => {
    const accountA = {
      id: 10,
      label: 'A',
      initialBalance: 0,
      isDefault: false,
      isActive: true,
      position: 0,
    };
    const accountB = {
      id: 20,
      label: 'B',
      initialBalance: 0,
      isDefault: false,
      isActive: true,
      position: 1,
    };
    mockAllAccounts.set([accountA, accountB]);

    (mockAccountService.saveAll as Mock).mockReturnValue(of([accountB, accountA]));

    // Création d'un faux événement CDK Drag&Drop inversant les index 0 et 1
    const mockDragDropEvent = {
      previousIndex: 0,
      currentIndex: 1,
    } as CdkDragDrop<Account[]>;

    component.onDrop(mockDragDropEvent);

    // Vérification que l'API est appelée avec les positions recalculées à la volée (0, 1)
    expect(mockAccountService.saveAll).toHaveBeenCalledWith([
      expect.objectContaining({ id: 20, position: 0 }),
      expect.objectContaining({ id: 10, position: 1 }),
    ]);
  });

  it('should set an error message in case of API failure during default toggle', () => {
    const targetAccount: Account = {
      id: 2,
      label: 'Courant',
      initialBalance: 100,
      isDefault: false,
      isActive: true,
      position: 0,
    };
    (mockAccountService.updateAccountByDefault as Mock).mockReturnValue(
      throwError(() => new Error('Network Error')),
    );

    component['toggleAccountByDefault'](targetAccount);

    expect(component['errorMessage']()).toBe(
      'Erreur lors de la modification du compte par défaut.',
    );
  });
});
