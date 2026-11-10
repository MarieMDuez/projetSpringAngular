import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardService } from '../../dashboard.service';
import { SummaryComponent } from './summary.component';
import { Summary } from './summary.model';

registerLocaleData(localeFr, 'fr-FR');

describe('SummaryComponent', () => {
  let component: SummaryComponent;
  let fixture: ComponentFixture<SummaryComponent>;
  let mockDashboardService: any;

  const mockSummary: Summary = {
    currentGlobalBalance: 4500.5,
    projectedGlobalBalance: 5200.75,
    accountsDetails: [
      { id: 1, label: 'Compte Courant', currentBalance: 1500.5, projectedBalance: 1700.75 } as any,
      { id: 2, label: 'Livret A', currentBalance: 3000, projectedBalance: 3500 } as any,
    ],
  };

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const norm = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mockDashboardService = {
      getSummary: vi.fn().mockReturnValue(of(mockSummary)),
    };

    TestBed.configureTestingModule({
      imports: [SummaryComponent],
      providers: [{ provide: DashboardService, useValue: mockDashboardService }],
    });
  });

  const createComponent = async (): Promise<void> => {
    fixture = TestBed.createComponent(SummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  describe('Cycle de vie et Hydratation API', () => {
    it('should query getSummary on ngOnInit, populate signals state, and toggle loading to false', async () => {
      await createComponent();

      expect(mockDashboardService.getSummary).toHaveBeenCalled();
      expect(component.summaryData()).toEqual(mockSummary);
      expect(component.isLoading()).toBe(false);
    });

    it('should handle API failure safely, log error traceback, and set loading indicator to false', async () => {
      mockDashboardService.getSummary.mockReturnValue(
        throwError(() => new Error('Network Failure')),
      );
      await createComponent();

      expect(component.summaryData()).toBeNull();
      expect(component.isLoading()).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Erreur lors du chargement du résumé',
        expect.any(Error),
      );
    });
  });

  describe('Intégration du Template DOM et Rendu Réel', () => {
    it('should display calculated global summary balances cards using proper formatting layouts', async () => {
      await createComponent();

      const realAmount = norm(
        el().querySelector('.card-real .balance-amount')?.textContent,
      ).replace(/\s+/g, '');
      const projectedAmount = norm(
        el().querySelector('.card-projected .balance-amount')?.textContent,
      ).replace(/\s+/g, '');

      expect(realAmount).toContain('4500,50€');
      expect(projectedAmount).toContain('5200,75€');
    });

    it('should loop over account list matrix details items and build cards UI elements accordingly', async () => {
      await createComponent();

      const accountCards = el().querySelectorAll('.account-item-card');
      expect(accountCards).toHaveLength(2);

      const firstCardTitle = norm(accountCards[0].querySelector('h3')?.textContent);
      expect(firstCardTitle).toBe('Compte Courant');
    });

    it('should inject localized numeric amounts configurations fields inside individual grid rows structures', async () => {
      await createComponent();

      const firstCardRows = el().querySelectorAll('.account-item-card:first-of-type .account-row');

      const realText = norm(firstCardRows[0].textContent).replace(/\s+/g, '');
      const projectedText = norm(firstCardRows[1].textContent).replace(/\s+/g, '');

      expect(realText).toContain('Réel:1500,50€');
      expect(projectedText).toContain('Prévisionnel:1700,75€');
    });
  });
});
