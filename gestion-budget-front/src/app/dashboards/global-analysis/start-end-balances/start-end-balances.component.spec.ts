import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StartEndBalancesComponent } from './start-end-balances.component';
import { DashboardService } from '../../dashboard.service';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError, Subject } from 'rxjs';
import { StartEndBalanceDto } from './start-end-balances.model';

describe('StartEndBalancesComponent', () => {
  let component: StartEndBalancesComponent;
  let fixture: ComponentFixture<StartEndBalancesComponent>;
  let mockDashboardService: any;

  const mockBalancesDto: StartEndBalanceDto = {
    id: null,
    startBalance: 1250.5,
    endBalance: 3400.75,
  };

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const norm = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();

  beforeEach(() => {
    mockDashboardService = {
      getStartEndBalances: vi.fn().mockReturnValue(of(mockBalancesDto)),
    };

    TestBed.configureTestingModule({
      imports: [StartEndBalancesComponent],
      providers: [{ provide: DashboardService, useValue: mockDashboardService }],
    });
  });

  const createComponent = async (): Promise<void> => {
    fixture = TestBed.createComponent(StartEndBalancesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  describe('Cycle de vie et Flux de données (API)', () => {
    it('should trigger getStartEndBalances on initialization via effect and populate signal state', async () => {
      await createComponent();

      expect(mockDashboardService.getStartEndBalances).toHaveBeenCalled();
      expect(component['startEndBalances']()).toEqual(mockBalancesDto);
    });

    it('should swallow API errors quietly without crashing and leave internal signal to null', async () => {
      mockDashboardService.getStartEndBalances.mockReturnValue(
        throwError(() => new Error('Server Down')),
      );
      await createComponent();

      expect(component['startEndBalances']()).toBeNull();
    });
  });

  describe('Intégration du Template DOM et Rendu Réel', () => {
    it('should render empty root template footprint layout when signal data is missing or null', async () => {
      const loadingSubject = new Subject<any>();
      mockDashboardService.getStartEndBalances.mockReturnValue(loadingSubject);

      fixture = TestBed.createComponent(StartEndBalancesComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      // Quand le signal est à null, le bloc @if est faux -> aucun élément summary n'existe dans le DOM
      expect(el().querySelector('.balances-summary')).toBeNull();

      loadingSubject.next(mockBalancesDto);
      loadingSubject.complete();
    });

    it('should compile and display specific balance card layouts with precise text tokens on success', async () => {
      await createComponent();

      const summary = el().querySelector('.balances-summary');
      expect(summary).not.toBeNull();

      const cards = el().querySelectorAll('.balance-card');
      expect(cards).toHaveLength(2);

      expect(norm(el().querySelector('.card-start .balance-title')?.textContent)).toBe(
        'Solde en début de période',
      );
      expect(norm(el().querySelector('.card-end .balance-title')?.textContent)).toBe(
        'Solde en fin de période',
      );
    });

    it('should parse metrics floats numbers and format amounts properly inside currency strings', async () => {
      await createComponent();

      const startAmountText = norm(el().querySelector('.card-start .balance-amount')?.textContent);
      const endAmountText = norm(el().querySelector('.card-end .balance-amount')?.textContent);

      // Validation souple gérant le point ou la virgule selon la locale de l'environnement de test Node
      expect(startAmountText).toMatch(/1[ ,.]250[.,]50 €/);
      expect(endAmountText).toMatch(/3[ ,.]400[.,]75 €/);
    });
  });
});
