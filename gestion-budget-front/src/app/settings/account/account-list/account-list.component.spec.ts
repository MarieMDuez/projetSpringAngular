import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, input, output, signal, WritableSignal } from '@angular/core';
import { AccountListComponent } from './account-list.component';
import { AccountService } from '../account.service';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';
import { Account, AccountType } from '../account.model';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { AccountFormComponent } from '../account-form/account-form.component';
import { ModalComponent } from '../../../shared/modal/modal.component';

registerLocaleData(localeFr, 'fr-FR');

// --- Stubs pour isoler les dépendances enfants complexes ---
@Component({ selector: 'app-account-form', template: '' })
class StubAccountFormComponent {}

@Component({ selector: 'app-modal', template: '' })
class StubModalComponent {
  readonly title = input<string>('');
  readonly options = input<string>('');
  readonly type = input<string>('');
  readonly confirmText = input<string>('');
  readonly cancelText = input<string>('');
  readonly resultAction = output<any>();
}

describe('AccountListComponent', () => {
  let component: AccountListComponent;
  let fixture: ComponentFixture<AccountListComponent>;
  let mockAccountService: any;
  let mockToastService: any;

  let allAccountsSignal: WritableSignal<Account[]>;
  let editingAccountSignal: WritableSignal<Account | null>;

  const getMockAccounts = (): Account[] => [
    {
      id: 1,
      label: 'Compte Principal',
      type: AccountType.COURANT,
      initialBalance: 1200.5,
      isDefault: true,
      isActive: true,
      position: 0,
    },
    {
      id: 2,
      label: 'Livret A',
      type: AccountType.EPARGNE,
      initialBalance: 5000,
      isDefault: false,
      isActive: true,
      position: 1,
    },
    {
      id: 3,
      label: 'Compte Archivé',
      type: AccountType.COURANT,
      initialBalance: 0,
      isDefault: false,
      isActive: false,
      position: 2,
    },
  ];

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const norm = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();
  const text = (selector: string): string => norm(el().querySelector(selector)?.textContent);
  const compact = (value: string): string => value.replace(/\s/g, '');

  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Simuler le scrollIntoView global du DOM pour éviter les crashs de test
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    allAccountsSignal = signal<Account[]>(getMockAccounts());
    editingAccountSignal = signal<Account | null>(null);

    mockAccountService = {
      allAccounts: allAccountsSignal,
      editingAccount: editingAccountSignal,
      deleteAccount: vi.fn().mockReturnValue(of(true)),
      updateAccountByDefault: vi.fn().mockReturnValue(of(true)),
      setAccountActive: vi.fn().mockReturnValue(of(true)),
      saveAll: vi.fn().mockReturnValue(of(true)),
    };

    mockToastService = {
      show: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [AccountListComponent],
      providers: [
        { provide: AccountService, useValue: mockAccountService },
        { provide: ToastService, useValue: mockToastService },
        { provide: LOCALE_ID, useValue: 'fr-FR' },
      ],
    }).overrideComponent(AccountListComponent, {
      remove: {
        // On retire uniquement les vrais formulaires et modales complexes
        imports: [AccountFormComponent, ModalComponent],
      },
      add: {
        // On injecte nos stubs à la place
        imports: [StubAccountFormComponent, StubModalComponent],
      },
    });

    await TestBed.compileComponents();
  });

  const createComponent = async (): Promise<void> => {
    fixture = TestBed.createComponent(AccountListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  describe('Cycle de vie et Signaux Internes', () => {
    it('should query accounts collection signal and bind parameters onto class arrays', async () => {
      await createComponent();

      expect(component['accounts']()).toHaveLength(3);
      expect(component['accounts']()[0].label).toBe('Compte Principal');
      expect(component['accounts']()[2].isActive).toBe(false);
    });

    it('should set active editing signal and scroll to form element upon onEdit trigger', async () => {
      await createComponent();
      const targetAccount = getMockAccounts()[0];
      const spyScroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');

      const fakeForm = document.createElement('div');
      fakeForm.id = 'editForm';
      el().appendChild(fakeForm);

      component['onEdit'](targetAccount);

      expect(editingAccountSignal()).toEqual(targetAccount);
      expect(spyScroll).toHaveBeenCalled();
      fakeForm.remove();
    });
  });

  describe('Tri par boutons directionnels (moveUp / moveDown)', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should return immediately without updates when moveUp hits index 0', () => {
      component.moveUp(getMockAccounts()[0]);
      expect(mockAccountService.saveAll).not.toHaveBeenCalled();
    });

    it('should reverse adjacent elements indexes position configurations on valid moveUp action', () => {
      component.moveUp(getMockAccounts()[1]);

      expect(mockAccountService.saveAll).toHaveBeenCalled();
      const payload = mockAccountService.saveAll.mock.calls[0][0];
      expect(payload[0].id).toBe(2);
      expect(payload[0].position).toBe(0);
    });

    it('should prevent index operations when moveDown boundaries hit lower limits', () => {
      component.moveDown(getMockAccounts()[2]);
      expect(mockAccountService.saveAll).not.toHaveBeenCalled();
    });

    it('should swap positions accurately on valid moveDown actions triggers', () => {
      component.moveDown(getMockAccounts()[0]);

      expect(mockAccountService.saveAll).toHaveBeenCalled();
      const payload = mockAccountService.saveAll.mock.calls[0][0];
      expect(payload[1].id).toBe(1);
    });
  });
  describe('Drag & Drop et Traitement CdkDragDrop', () => {
    it('should calculate new sequence positions accurately and persist changes via saveAll', async () => {
      await createComponent();

      const mockDragDropEvent: any = {
        previousIndex: 1, // Déplacement du Livret A
        currentIndex: 0, // Vers le premier emplacement
      };

      component['onDrop'](mockDragDropEvent);

      expect(mockAccountService.saveAll).toHaveBeenCalled();
      const payload = mockAccountService.saveAll.mock.calls[0][0];
      // Le Livret A doit se retrouver en première position
      expect(payload[0].id).toBe(2);
      expect(payload[0].position).toBe(0);
      expect(payload[1].id).toBe(1);
      expect(payload[1].position).toBe(1);
    });
  });

  describe('Validation des Modales et Actions de Confirmation', () => {
    beforeEach(async () => {
      await createComponent();
    });

    // --- Changement de compte principal ---
    it('should invoke toggleAccountByDefault when confirm is received on principal change modal', () => {
      const targetAccount = getMockAccounts()[1];
      component['accountToSetDefault'].set(targetAccount);

      component['onConfirmDefaultAction']('confirm');

      expect(mockAccountService.updateAccountByDefault).toHaveBeenCalledWith(2, {
        ...targetAccount,
        isDefault: true,
      });
      expect(mockToastService.show).toHaveBeenCalledWith(
        'Le changement de compte principal a été effectué.',
        'success',
      );
    });

    it('should clear default account signal state on cancel action selection', () => {
      component['accountToSetDefault'].set(getMockAccounts()[0]);

      component['onConfirmDefaultAction']('cancel');

      expect(component['accountToSetDefault']()).toBeNull();
      expect(mockAccountService.updateAccountByDefault).not.toHaveBeenCalled();
    });

    // --- Suppression / Archivage de compte ---
    it('should send hard delete toast notice if service returns true', () => {
      const targetAccount = getMockAccounts()[0];
      component['accountToDelete'].set(targetAccount);

      component['onConfirmDeleteAction']('confirm');

      expect(mockAccountService.deleteAccount).toHaveBeenCalledWith(1);
      expect(mockToastService.show).toHaveBeenCalledWith(
        'Le compte a été supprimé avec succès',
        'success',
      );
    });

    it('should send archive warning toast if server rejects hard deletion but updates status', () => {
      mockAccountService.deleteAccount.mockReturnValue(of(false)); // Simule l'archivage
      const targetAccount = getMockAccounts()[0];
      component['accountToDelete'].set(targetAccount);

      component['onConfirmDeleteAction']('confirm');

      expect(mockToastService.show).toHaveBeenCalledWith(
        'Au moins une transaction est rattachée à ce compte : il a été archivé avec succès',
        'success',
      );
    });

    // --- Réactivation de compte ---
    it('should trigger update status and toggle isActive to true upon confirmation', () => {
      const targetAccount = getMockAccounts()[2]; // Compte Archivé
      component['accountToSetActive'].set(targetAccount);

      component['onConfirmSetActiveAction']('confirm');

      expect(mockAccountService.setAccountActive).toHaveBeenCalledWith(3, {
        ...targetAccount,
        isActive: true,
      });
      expect(mockToastService.show).toHaveBeenCalledWith('Le compte a été réactivé.', 'success');
    });
  });

  describe('Intégration du Template DOM et Rendu des Éléments', () => {
    it('should list available accounts entries and toggle specific class attributes if disabled', async () => {
      await createComponent();

      const items = el().querySelectorAll('.data-list .data-item');
      expect(items).toHaveLength(3);

      // Les 2 premiers sont actifs
      expect(items[0].classList.contains('item-disabled')).toBe(false);
      expect(items[1].classList.contains('item-disabled')).toBe(false);

      // Le 3ème est archivé
      expect(items[2].classList.contains('item-disabled')).toBe(true);
      expect(text('.data-list .data-item:last-of-type .badge-archived')).toBe('(Archivé)');
    });

    it('should isolate main row balances parameters using proper localized currency formatting', async () => {
      await createComponent();

      const subText = text('.data-list .data-item:first-of-type .item-sub');

      // Nettoyage des espaces insécables pour la validation
      const compactSubText = subText.replace(/\s/g, '');
      expect(compactSubText).toContain('1200,50€');
    });

    it('should render solid golden badges indicators only for the core main active account', async () => {
      await createComponent();

      const mainAccountBadge = el().querySelector(
        '.data-list .data-item:first-of-type .badge-success-solid',
      );
      expect(mainAccountBadge).not.toBeNull();
      expect(norm(mainAccountBadge?.textContent)).toBe('⭐ Principal');

      const secondaryAccountBadge = el().querySelector(
        '.data-list .data-item:nth-of-type(2) .badge-success-solid',
      );
      expect(secondaryAccountBadge).toBeNull();
    });

    it('should shift rendering loops layout views onto fallback empty messages when arrays drop down to zero', async () => {
      allAccountsSignal.set([]);
      await createComponent();

      expect(el().querySelector('.data-item')).toBeNull();
      const emptyMsg = el().querySelector('.data-list p.text-muted');
      expect(emptyMsg).not.toBeNull();
      expect(norm(emptyMsg?.textContent)).toBe('Aucun compte disponible pour le moment.');
    });
  });
});
