import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AccountService } from './account.service';
import { Account, AccountType } from './account.model';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { environment } from '../../../environments/environment';

describe('AccountService', () => {
  let service: AccountService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/account`;

  const mockAccounts: Account[] = [
    {
      id: 1,
      label: 'Compte Courant',
      type: AccountType.COURANT,
      initialBalance: 1000,
      isActive: true,
      isDefault: true,
      position: 0,
    },
    {
      id: 2,
      label: 'Livret A',
      type: AccountType.EPARGNE,
      initialBalance: 5000,
      isActive: true,
      isDefault: false,
      position: 1,
    },
    {
      id: 3,
      label: 'Ancien Compte',
      type: AccountType.COURANT,
      initialBalance: 0,
      isActive: false,
      isDefault: false,
      position: 2,
    },
  ];

  /** Copie profonde pour isoler chaque test du jeu de données partagé. */
  const fresh = (): Account[] => structuredClone(mockAccounts);

  /** Charge l'état initial du service avec les 3 comptes de test. */
  const loadInitialState = (): void => {
    service.getAccounts().subscribe();
    httpMock.expectOne(apiUrl).flush(fresh());
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AccountService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AccountService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initial State & Signals', () => {
    it('should have empty accounts signals by default', () => {
      expect(service.allAccounts()).toEqual([]);
      expect(service.activeAccounts()).toEqual([]);
      expect(service.editingAccount()).toBeNull();
    });

    it('should filter active accounts correctly via computed signal', () => {
      loadInitialState();

      expect(service.allAccounts()).toHaveLength(3);
      expect(service.activeAccounts()).toHaveLength(2);
      expect(service.activeAccounts().map((a) => a.id)).toEqual([1, 2]);
      expect(service.activeAccounts().some((a) => a.id === 3)).toBe(false);
    });
  });

  describe('editingAccount', () => {
    it('should store and reset the editing account', () => {
      service.editingAccount.set(mockAccounts[0]);
      expect(service.editingAccount()).toEqual(mockAccounts[0]);

      service.editingAccount.set(null);
      expect(service.editingAccount()).toBeNull();
    });
  });

  describe('getAccounts()', () => {
    it('should fetch accounts via GET and populate signals', () => {
      let result: Account[] | undefined;
      service.getAccounts().subscribe((accounts) => (result = accounts));

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush(fresh());

      expect(result).toEqual(mockAccounts);
      expect(service.allAccounts()).toEqual(mockAccounts);
      expect(service.activeAccounts()).toHaveLength(2);
    });

    it('should replace the previous state on a new fetch', () => {
      loadInitialState();

      service.getAccounts().subscribe();
      httpMock.expectOne(apiUrl).flush([mockAccounts[0]]);

      expect(service.allAccounts()).toEqual([mockAccounts[0]]);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      loadInitialState();

      let error: HttpErrorResponse | undefined;
      service.getAccounts().subscribe({ error: (e) => (error = e) });
      httpMock.expectOne(apiUrl).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
      expect(service.allAccounts()).toEqual(mockAccounts);
    });
  });

  describe('createAccount()', () => {
    beforeEach(() => loadInitialState());

    it('should append new account without altering defaults if isDefault is false', () => {
      const newAccount: Account = {
        label: 'PEL',
        type: AccountType.EPARGNE,
        initialBalance: 2000,
        isActive: true,
        isDefault: false,
        position: 3,
      };
      const savedAccount: Account = { id: 4, ...newAccount };

      let result: Account | undefined;
      service.createAccount(newAccount).subscribe((r) => (result = r));

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newAccount);
      req.flush(savedAccount);

      expect(result).toEqual(savedAccount);

      const accounts = service.allAccounts();
      expect(accounts).toHaveLength(4);
      expect(accounts[3]).toEqual(savedAccount);
      // Les comptes existants sont inchangés
      expect(accounts.slice(0, 3)).toEqual(mockAccounts);
      expect(accounts.find((a) => a.id === 1)?.isDefault).toBe(true);
    });

    it('should toggle previous default accounts to false if the new account isDefault is true', () => {
      const newAccount: Account = {
        label: 'Nouveau Principal',
        type: AccountType.COURANT,
        initialBalance: 0,
        isActive: true,
        isDefault: true,
        position: 3,
      };
      const savedAccount: Account = { id: 4, ...newAccount };

      service.createAccount(newAccount).subscribe();

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newAccount);
      req.flush(savedAccount);

      const accounts = service.allAccounts();
      expect(accounts).toHaveLength(4);
      expect(accounts[3]).toEqual(savedAccount);
      expect(accounts.find((a) => a.id === 4)?.isDefault).toBe(true);
      // Un seul compte par défaut, les autres champs sont préservés
      expect(accounts.filter((a) => a.isDefault)).toHaveLength(1);
      expect(accounts.find((a) => a.id === 1)).toEqual({ ...mockAccounts[0], isDefault: false });
      expect(accounts.find((a) => a.id === 2)).toEqual(mockAccounts[1]);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      const newAccount: Account = { ...mockAccounts[0], id: undefined, isDefault: false };

      let error: HttpErrorResponse | undefined;
      service.createAccount(newAccount).subscribe({ error: (e) => (error = e) });
      httpMock.expectOne(apiUrl).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
      expect(service.allAccounts()).toEqual(mockAccounts);
    });
  });

  describe('updateAccount()', () => {
    beforeEach(() => loadInitialState());

    it('should update the target account matching the ID without touching others', () => {
      const updatedAccount: Account = { ...mockAccounts[1], label: 'Livret A Boosté' };

      service.updateAccount(2, updatedAccount).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/2`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updatedAccount);
      req.flush(updatedAccount);

      const accounts = service.allAccounts();
      expect(accounts).toHaveLength(3);
      expect(accounts.find((a) => a.id === 2)?.label).toBe('Livret A Boosté');
      // Branche isDefault: false → les autres comptes restent strictement identiques
      expect(accounts.find((a) => a.id === 1)).toEqual(mockAccounts[0]);
      expect(accounts.find((a) => a.id === 1)?.isDefault).toBe(true);
      expect(accounts.find((a) => a.id === 3)).toEqual(mockAccounts[2]);
    });

    it('should set all other accounts isDefault to false if the updated account becomes the new default', () => {
      const updatedAccount: Account = { ...mockAccounts[1], isDefault: true };

      service.updateAccount(2, updatedAccount).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/2`);
      expect(req.request.body).toEqual(updatedAccount);
      req.flush(updatedAccount);

      const accounts = service.allAccounts();
      expect(accounts.find((a) => a.id === 2)?.isDefault).toBe(true);
      expect(accounts.find((a) => a.id === 1)).toEqual({ ...mockAccounts[0], isDefault: false });
      expect(accounts.find((a) => a.id === 3)?.isDefault).toBe(false);
      expect(accounts.filter((a) => a.isDefault)).toHaveLength(1);
    });

    it('should leave the state unchanged when the ID does not exist', () => {
      const ghost: Account = { ...mockAccounts[1], id: 999, label: 'Fantôme' };

      service.updateAccount(999, ghost).subscribe();
      httpMock.expectOne(`${apiUrl}/999`).flush(ghost);

      expect(service.allAccounts()).toEqual(mockAccounts);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      let error: HttpErrorResponse | undefined;
      service
        .updateAccount(2, { ...mockAccounts[1], label: 'X' })
        .subscribe({ error: (e) => (error = e) });
      httpMock.expectOne(`${apiUrl}/2`).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
      expect(service.allAccounts()).toEqual(mockAccounts);
    });
  });

  describe('updateAccountByDefault()', () => {
    beforeEach(() => loadInitialState());

    it('should switch defaults so that only one account is default in the UI state', () => {
      const updatedAccount2: Account = { ...mockAccounts[1], isDefault: true };

      service.updateAccountByDefault(2, updatedAccount2).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/2/set-default`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updatedAccount2);
      req.flush(updatedAccount2);

      const accounts = service.allAccounts();
      expect(accounts).toHaveLength(3);
      expect(accounts.find((a) => a.id === 2)).toEqual(updatedAccount2);
      expect(accounts.find((a) => a.id === 1)).toEqual({ ...mockAccounts[0], isDefault: false });
      expect(accounts.find((a) => a.id === 3)?.isDefault).toBe(false);
      expect(accounts.filter((a) => a.isDefault)).toHaveLength(1);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      let error: HttpErrorResponse | undefined;
      service
        .updateAccountByDefault(2, { ...mockAccounts[1], isDefault: true })
        .subscribe({ error: (e) => (error = e) });
      httpMock
        .expectOne(`${apiUrl}/2/set-default`)
        .flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
      expect(service.allAccounts()).toEqual(mockAccounts);
      expect(service.allAccounts().find((a) => a.id === 1)?.isDefault).toBe(true);
    });
  });

  describe('deleteAccount()', () => {
    beforeEach(() => loadInitialState());

    it('should remove the account from the signal array when hard delete occurs', () => {
      let result: boolean | undefined;
      service.deleteAccount(1).subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(true);

      expect(result).toBe(true);
      expect(service.allAccounts()).toHaveLength(2);
      expect(service.allAccounts().some((a) => a.id === 1)).toBe(false);
      // Les autres comptes sont conservés tels quels
      expect(service.allAccounts()).toEqual([mockAccounts[1], mockAccounts[2]]);
      expect(service.activeAccounts().map((a) => a.id)).toEqual([2]);
    });

    it('should switch isActive to false when soft delete occurs', () => {
      let result: boolean | undefined;
      service.deleteAccount(1).subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(false);

      expect(result).toBe(false);
      const accounts = service.allAccounts();
      expect(accounts).toHaveLength(3);

      const target = accounts.find((a) => a.id === 1);
      expect(target).toEqual({ ...mockAccounts[0], isActive: false });
      // Les autres comptes sont inchangés
      expect(accounts.find((a) => a.id === 2)).toEqual(mockAccounts[1]);
      expect(accounts.find((a) => a.id === 3)).toEqual(mockAccounts[2]);
      // Le computed est recalculé
      expect(service.activeAccounts().map((a) => a.id)).toEqual([2]);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      let error: HttpErrorResponse | undefined;
      service.deleteAccount(1).subscribe({ error: (e) => (error = e) });
      httpMock.expectOne(`${apiUrl}/1`).flush('boom', { status: 404, statusText: 'Not Found' });

      expect(error?.status).toBe(404);
      expect(service.allAccounts()).toEqual(mockAccounts);
    });
  });

  describe('setAccountActive()', () => {
    beforeEach(() => loadInitialState());

    it('should activate the target account without affecting others', () => {
      const activatedAccount: Account = { ...mockAccounts[2], isActive: true };

      service.setAccountActive(3, activatedAccount).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/3/set-active`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(activatedAccount);
      req.flush(activatedAccount);

      const accounts = service.allAccounts();
      expect(accounts).toHaveLength(3);
      expect(accounts.find((a) => a.id === 3)).toEqual(activatedAccount);
      expect(accounts.find((a) => a.id === 1)).toEqual(mockAccounts[0]);
      expect(accounts.find((a) => a.id === 2)).toEqual(mockAccounts[1]);
      expect(service.activeAccounts().map((a) => a.id)).toEqual([1, 2, 3]);
    });

    it('should deactivate the target account and update activeAccounts', () => {
      const deactivatedAccount: Account = { ...mockAccounts[1], isActive: false };

      service.setAccountActive(2, deactivatedAccount).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/2/set-active`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(deactivatedAccount);
      req.flush(deactivatedAccount);

      const accounts = service.allAccounts();
      expect(accounts.find((a) => a.id === 2)?.isActive).toBe(false);
      expect(accounts.find((a) => a.id === 1)).toEqual(mockAccounts[0]);
      expect(accounts.find((a) => a.id === 3)).toEqual(mockAccounts[2]);
      expect(service.activeAccounts().map((a) => a.id)).toEqual([1]);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      let error: HttpErrorResponse | undefined;
      service
        .setAccountActive(3, { ...mockAccounts[2], isActive: true })
        .subscribe({ error: (e) => (error = e) });
      httpMock
        .expectOne(`${apiUrl}/3/set-active`)
        .flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
      expect(service.allAccounts()).toEqual(mockAccounts);
    });
  });

  describe('saveAll()', () => {
    beforeEach(() => loadInitialState());

    it('should push a complete collection and overwrite state upon saveAll invocation', () => {
      const reorderedCollection: Account[] = [
        { ...mockAccounts[1], position: 0 },
        { ...mockAccounts[0], position: 1 },
      ];

      let result: Account[] | undefined;
      service.saveAll(reorderedCollection).subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${apiUrl}/saveAll`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(reorderedCollection);
      req.flush(structuredClone(reorderedCollection));

      expect(result).toEqual(reorderedCollection);
      expect(service.allAccounts()).toHaveLength(2);
      expect(service.allAccounts().map((a) => a.id)).toEqual([2, 1]);
      expect(service.allAccounts().map((a) => a.position)).toEqual([0, 1]);
    });

    it('should handle an empty collection', () => {
      service.saveAll([]).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/saveAll`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual([]);
      req.flush([]);

      expect(service.allAccounts()).toEqual([]);
      expect(service.activeAccounts()).toEqual([]);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      let error: HttpErrorResponse | undefined;
      service.saveAll([mockAccounts[0]]).subscribe({ error: (e) => (error = e) });
      httpMock
        .expectOne(`${apiUrl}/saveAll`)
        .flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
      expect(service.allAccounts()).toEqual(mockAccounts);
    });
  });
});
