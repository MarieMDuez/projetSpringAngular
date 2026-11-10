import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatrixDashboardComponent } from './matrix-dashboard.component';
import { DashboardService } from '../../dashboard.service';
import { AccountService } from '../../../settings/account/account.service';
import { TransactionService } from '../../../transaction/transaction.service';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError, Subject } from 'rxjs';
import { MatrixDashboardDto } from './matrix-dashboard.model';

import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

registerLocaleData(localeFr, 'fr-FR');

describe('MatrixDashboardComponent', () => {
  let component: MatrixDashboardComponent;
  let fixture: ComponentFixture<MatrixDashboardComponent>;
  let mockDashboardService: any;
  let mockAccountService: any;
  let mockTransactionService: any;

  const mockMatrixDto: MatrixDashboardDto = {
    rows: [
      {
        paymentMethodLabel: 'Carte Bancaire',
        monthlyAmounts: [100, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
        totalYear: 320,
        isExpanded: false,
        categoryRows: [
          {
            categoryLabel: 'Alimentation',
            monthlyAmounts: [],
            totalYear: 200,
          },
          {
            categoryLabel: 'Loisirs',
            monthlyAmounts: [],
            totalYear: 120,
          },
        ],
      },
      {
        paymentMethodLabel: 'Virement',
        monthlyAmounts: [1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalYear: 1000,
        categoryRows: [],
      },
    ],
    monthlyTotals: [1100, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
    grandTotal: 1320,
  };

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const norm = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();
  const text = (selector: string): string => norm(el().querySelector(selector)?.textContent);

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mockDashboardService = {
      getMatrix: vi.fn().mockImplementation(() => of(structuredClone(mockMatrixDto))),
    };
    mockAccountService = { activeAccounts: signal([]) };
    mockTransactionService = {};

    TestBed.configureTestingModule({
      imports: [MatrixDashboardComponent],
    }).overrideComponent(MatrixDashboardComponent, {
      set: {
        providers: [
          { provide: DashboardService, useValue: mockDashboardService },
          { provide: AccountService, useValue: mockAccountService },
          { provide: TransactionService, useValue: mockTransactionService },
        ],
      },
    });
  });

  const createComponent = async (): Promise<void> => {
    fixture = TestBed.createComponent(MatrixDashboardComponent);
    component = fixture.componentInstance;

    // On laisse le effect s'exécuter et on force la détection
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  describe('Cycle de vie et Récupération des Données (API)', () => {
    it('should query getMatrix on init, reset row expansions to false, and handle success state', async () => {
      await createComponent();

      expect(mockDashboardService.getMatrix).toHaveBeenCalled();
      expect(component['isLoading']()).toBe(false);
      expect(component['matrixData']()).toBeTruthy();

      const states = component['matrixData']()?.rows.map((r) => r.isExpanded);
      expect(states).not.toContain(true);
      expect(component['isMatrixAllExpanded']()).toBe(false);
    });

    it('should capture HTTP errors, clean local matrix data, and log safely', async () => {
      mockDashboardService.getMatrix.mockReturnValue(
        throwError(() => new Error('Fatal SQL Error')),
      );
      await createComponent();

      expect(component['isLoading']()).toBe(false);
      expect(component['matrixData']()).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Algorithme de Bascule Globale (Toggle Expand)', () => {
    it('should set all lines isExpanded fields to true when onToggleAllMatrixRows is triggered from false state', async () => {
      await createComponent();
      component['onToggleAllMatrixRows']();
      fixture.detectChanges();

      expect(component['isMatrixAllExpanded']()).toBe(true);
      const rowStates = component['matrixData']()?.rows.map((r) => r.isExpanded);
      expect(rowStates).not.toContain(false);
    });

    it('should reverse all lines expansion parameters back to false when executed a second time', async () => {
      await createComponent();
      component['onToggleAllMatrixRows'](); // true
      component['onToggleAllMatrixRows'](); // false
      fixture.detectChanges();

      expect(component['isMatrixAllExpanded']()).toBe(false);
      const rowStates = component['matrixData']()?.rows.map((r) => r.isExpanded);
      expect(rowStates).not.toContain(true);
    });
  });
  describe('Intégration du Template DOM et Rendu des Tableaux', () => {
    it('should show the layout loader structure and hide grid content when matrix is fetching data', async () => {
      const loadingSubject = new Subject<any>();
      mockDashboardService.getMatrix.mockReturnValue(loadingSubject);

      fixture = TestBed.createComponent(MatrixDashboardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(el().querySelector('.matrix-loader')).not.toBeNull();
      expect(text('.matrix-loader')).toContain('Calcul de la matrice annuelle en cours...');
      expect(el().querySelector('.matrix-table')).toBeNull();

      loadingSubject.next(mockMatrixDto);
      loadingSubject.complete();
    });

    it('should generate headers properly mapping the twelve custom months labels dynamically', async () => {
      await createComponent();

      const monthHeaders = Array.from(
        el().querySelectorAll('.matrix-table thead .month-header'),
      ).map((node) => node.textContent?.trim());

      expect(monthHeaders).toHaveLength(12);
      expect(monthHeaders[0]).toBe('janv.');
      expect(monthHeaders[11]).toBe('déc.');
    });

    it('should loop over main rows and correctly render root levels data elements', async () => {
      await createComponent();

      const methodRows = el().querySelectorAll('.matrix-table tbody .row-payment-method');
      expect(methodRows).toHaveLength(2);

      const firstRowLabel = norm(methodRows[0].querySelector('.cell-label')?.textContent);
      expect(firstRowLabel).toContain('Carte Bancaire');

      // Modifié de 300 à 320 pour matcher la nouvelle fixture propre
      const firstRowTotal = norm(methodRows[0].querySelector('.total-col')?.textContent);
      expect(firstRowTotal).toMatch(/320[,.]00/);
    });

    it('should expand hidden sub-category tables immediately when clicking on a master layout row item', async () => {
      await createComponent();

      let categoryRows = el().querySelectorAll('.matrix-table tbody .row-category');
      expect(categoryRows).toHaveLength(0);

      const firstRowTrigger = el().querySelectorAll(
        '.matrix-table tbody .row-payment-method',
      )[0] as HTMLElement;
      firstRowTrigger.click();
      fixture.detectChanges();

      categoryRows = el().querySelectorAll('.matrix-table tbody .row-category');
      expect(categoryRows).toHaveLength(2);
      expect(norm(categoryRows[0].querySelector('.cell-label')?.textContent)).toContain(
        '↳ Alimentation',
      );
      expect(norm(categoryRows[1].querySelector('.cell-label')?.textContent)).toContain(
        '↳ Loisirs',
      );
    });

    it('should sync main button text token correctly bound to the isMatrixAllExpanded signal changes', async () => {
      await createComponent();

      const actionButton = el().querySelector('.matrix-actions-header button') as HTMLElement;
      expect(norm(actionButton.textContent)).toContain('📂 Tout déplier');

      actionButton.click();
      fixture.detectChanges();

      expect(norm(actionButton.textContent)).toContain('📂Tout replier');
      expect(el().querySelectorAll('.matrix-table tbody .row-category')).toHaveLength(2);
    });

    it('should process total calculations aggregates and project final bottom grand totals cells values', async () => {
      await createComponent();

      const grandTotalRow = el().querySelector('.matrix-table tbody .row-grand-totals');
      expect(grandTotalRow).not.toBeNull();

      const rowText = norm(grandTotalRow!.textContent).replace(/\s+/g, '');

      expect(rowText).toContain('TotalGénéral');
      expect(rowText).toContain('1100,00€');
      expect(rowText).toContain('1320,00€');
    });

    it('should fall back onto placeholder screen blocks when dataset collections return empty', async () => {
      mockDashboardService.getMatrix.mockReturnValue(of(null));
      await createComponent();

      expect(el().querySelector('.matrix-table')).toBeNull();
      expect(el().querySelector('.matrix-empty')).not.toBeNull();
      expect(text('.matrix-empty')).toContain(
        'Aucune donnée disponible pour les filtres sélectionnés.',
      );
    });
  });
});
