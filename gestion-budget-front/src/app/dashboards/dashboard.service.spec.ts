import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { DashboardService } from './dashboard.service';
import { balanceDto } from './balances/balance.model';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { environment } from '../../environments/environment';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  const mockApiUrl = `${environment.apiUrl}/dashboards/balance`;

  const mockBalanceResponse: balanceDto = {
    id: 1,
    label: 'Compte Courant',
    initialBalance: 1000,
    currentBalance: 850,
    provisionalBalance: 1200,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DashboardService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with a null balance signal', () => {
    expect(service.balances()).toBeNull();
  });

  it('should fetch financial balances and update the read-only signal', () => {
    service.loadBalances(null).subscribe();

    const req = httpMock.expectOne(mockApiUrl);
    expect(req.request.method).toBe('GET');

    req.flush(mockBalanceResponse);

    expect(service.balances()).toEqual(mockBalanceResponse);
    expect(service.balances()?.currentBalance).toBe(850);
  });

  it('should append accountId query parameter when provided', () => {
    const targetAccountId = 42;
    service.loadBalances(targetAccountId).subscribe();

    const req = httpMock.expectOne(
      (request) => request.url === mockApiUrl && request.params.get('accountId') === '42',
    );

    expect(req.request.method).toBe('GET');
    req.flush(mockBalanceResponse);
  });

  it('should handle HTTP error gracefully without crashing the signal state', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    service.loadBalances(null).subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne(mockApiUrl);
    req.flush('Internal Server Error', { status: 500, statusText: 'Server Error' });

    expect(service.balances()).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
