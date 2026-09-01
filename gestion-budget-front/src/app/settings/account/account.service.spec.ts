import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AccountService } from './account.service';
import { Account } from './account.model';
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
      initialBalance: 1000,
      isActive: true,
      isDefault: true,
      position: 0,
    },
    {
      id: 2,
      label: 'Livret A',
      initialBalance: 5000,
      isActive: true,
      isDefault: false,
      position: 1,
    },
    {
      id: 3,
      label: 'Ancien Compte',
      initialBalance: 0,
      isActive: false,
      isDefault: false,
      position: 2,
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AccountService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AccountService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Validation de la fermeture de tous les canaux HTTP ouverts
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch accounts and populate signals', () => {
    service.getAccounts().subscribe();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockAccounts);

    // Assertions sur les computed signals (sélecteurs réactifs)
    expect(service.allAccounts()).toHaveLength(3);
    expect(service.activeAccounts()).toHaveLength(2); // Filtre isActive === true
  });

  it('should POST a new account and append it to the global state', () => {
    const newAccount: Account = {
      label: 'PEL',
      initialBalance: 2000,
      isActive: true,
      isDefault: false,
      position: 3,
    };
    const savedAccount: Account = { id: 4, ...newAccount };

    // Hydratation initiale du state privé
    service['allAccountsSignal'].set(mockAccounts);

    service.createAccount(newAccount).subscribe((result) => {
      expect(result).toEqual(savedAccount);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    req.flush(savedAccount);

    expect(service.allAccounts()).toHaveLength(4);
    expect(service.allAccounts()[3].id).toBe(4);
  });

  it('should switch defaults so that only one account is default in the UI state', () => {
    service['allAccountsSignal'].set(mockAccounts);

    const updatedAccount2: Account = { ...mockAccounts[1], isDefault: true };

    service.updateAccountByDefault(2, updatedAccount2).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/2/set-default`);
    expect(req.request.method).toBe('PUT');
    req.flush(updatedAccount2);

    const currentAccounts = service.allAccounts();
    const account1 = currentAccounts.find((a) => a.id === 1);
    const account2 = currentAccounts.find((a) => a.id === 2);

    // Vérification de la permutation exclusive de la propriété isDefault
    expect(account2?.isDefault).toBe(true);
    expect(account1?.isDefault).toBe(false);
  });

  it('should DELETE an account and remove it from the signal array', () => {
    service['allAccountsSignal'].set(mockAccounts);

    service.deleteAccount(1).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(true);

    expect(service.allAccounts()).toHaveLength(2);
    expect(service.allAccounts().some((a) => a.id === 1)).toBe(false);
  });

  it('should push a complete collection and overwrite state upon saveAll invocation', () => {
    service['allAccountsSignal'].set(mockAccounts);

    const reorderedCollection: Account[] = [
      {
        id: 2,
        label: 'Livret A',
        initialBalance: 5000,
        isActive: true,
        isDefault: false,
        position: 0,
      },
      {
        id: 1,
        label: 'Compte Courant',
        initialBalance: 1000,
        isActive: true,
        isDefault: true,
        position: 1,
      },
    ];

    service.saveAll(reorderedCollection).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/saveAll`);
    expect(req.request.method).toBe('POST');
    req.flush(reorderedCollection);

    // Validation de l'écrasement global (utilisé pour le Drag and Drop)
    expect(service.allAccounts()).toHaveLength(2);
    expect(service.allAccounts()[0].id).toBe(2);
  });
});
