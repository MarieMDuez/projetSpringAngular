import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatrixMonthlyComponent } from './matrix-monthly.component';
import { DashboardService } from '../../dashboard.service';
import { TransactionService } from '../../../transaction/transaction.service';
import { signal } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError, Subject } from 'rxjs';
import { MatrixMonthlyDto } from './matrix-monthly.model';

// Enregistrement obligatoire de la locale pour le pipe currency du template HTML
registerLocaleData(localeFr, 'fr-FR');

describe('MatrixMonthlyComponent', () => {
  let component: MatrixMonthlyComponent;
  let fixture: ComponentFixture<MatrixMonthlyComponent>;
  let mockDashboardService: any;
  let mockTransactionService: any;

  const mockMonthlyDto: MatrixMonthlyDto = {
    maxWeeksInMonth: 4,
    grandTotal: 500,
    weeklyTotals: [150, -50, 0, 400],
    categoryRows: [],
    rows: [
      {
        paymentMethodLabel: 'Carte Bancaire',
        totalMonth: 500,
        isExpanded: false,
        weeklyAmounts: [150, -50, 0, 400],
        categoryRows: [
          {
            categoryLabel: 'Alimentation',
            totalMonth: 400,
            weeklyAmounts: [100, -50, 0, 350],
          },
          {
            categoryLabel: 'Loisirs',
            totalMonth: 100,
            weeklyAmounts: [50, 0, 0, 50],
          },
        ],
      },
    ],
  };

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const norm = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();
  const text = (selector: string): string => norm(el().querySelector(selector)?.textContent);

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mockDashboardService = {
      getMonthlyMatrix: vi.fn().mockImplementation(() => of(structuredClone(mockMonthlyDto))),
    };
    mockTransactionService = {};

    TestBed.configureTestingModule({
      imports: [MatrixMonthlyComponent],
    }).overrideComponent(MatrixMonthlyComponent, {
      set: {
        providers: [
          { provide: DashboardService, useValue: mockDashboardService },
          { provide: TransactionService, useValue: mockTransactionService },
        ],
      },
    });
  });

  const createComponent = async (): Promise<void> => {
    fixture = TestBed.createComponent(MatrixMonthlyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  describe('Chargement et Cycle de vie (API)', () => {
    it('should query getMonthlyMatrix on init and hydrate local state parameters', async () => {
      await createComponent();

      expect(mockDashboardService.getMonthlyMatrix).toHaveBeenCalled();
      expect(component['isLoading']()).toBe(false);
      expect(component['matrixData']()).toBeTruthy();
      expect(component['weeksArray']()).toEqual([0, 1, 2, 3]);
    });

    it('should fall back gracefully to null and log error trace on API rejection', async () => {
      mockDashboardService.getMonthlyMatrix.mockReturnValue(throwError(() => new Error('Fatal')));
      await createComponent();

      expect(component['isLoading']()).toBe(false);
      expect(component['matrixData']()).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Logique de Bascule des Lignes (Expansion)', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should update all rows isExpanded parameters when triggering onToggleAllRows', () => {
      component['onToggleAllRows']();
      expect(component['isMatrixAllExpanded']()).toBe(true);
      expect(component['matrixData']()?.rows[0].isExpanded).toBe(true);

      component['onToggleAllRows']();
      expect(component['isMatrixAllExpanded']()).toBe(false);
      expect(component['matrixData']()?.rows[0].isExpanded).toBe(false);
    });

    it('should toggle an individual targeted row status when toggleRow is called', () => {
      const targetRow = component['matrixData']()!.rows[0];

      component['toggleRow'](targetRow);
      expect(targetRow.isExpanded).toBe(true);

      component['toggleRow'](targetRow);
      expect(targetRow.isExpanded).toBe(false);
    });
  });
  describe('Intégration du Template DOM et Rendu Réel', () => {
    it('should show the layout loader spinner and hide table structure when matrix is loading', async () => {
      const loadingSubject = new Subject<any>();
      mockDashboardService.getMonthlyMatrix.mockReturnValue(loadingSubject);

      fixture = TestBed.createComponent(MatrixMonthlyComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(el().querySelector('.matrix-loader')).not.toBeNull();
      expect(text('.matrix-loader')).toContain('Analyse des semaines en cours...');
      expect(el().querySelector('.matrix-table')).toBeNull();

      loadingSubject.next(mockMonthlyDto);
      loadingSubject.complete();
    });

    it('should generate headers properly mapping the exact number of weeks available', async () => {
      await createComponent();

      const weekHeaders = Array.from(el().querySelectorAll('.matrix-table thead th')).map((node) =>
        node.textContent?.trim(),
      );

      // 1 (Libellé) + 4 semaines + 1 (Bilan Mois) = 6 colonnes d'en-tête
      expect(weekHeaders).toHaveLength(6);
      expect(weekHeaders[1]).toBe('Semaine 1');
      expect(weekHeaders[4]).toBe('Semaine 4');
      expect(weekHeaders[5]).toBe('Bilan Mois');
    });
    it('should map valid non-zero amounts using proper currency pipe format and apply style color bindings', async () => {
      await createComponent();

      // On cible uniquement les cellules de montants de la ligne principale
      const row = el().querySelector('.matrix-table tbody tr.row-payment-method');
      expect(row).not.toBeNull();

      const cells = row!.querySelectorAll('td.cell-amount');

      // Semaine 1 (Index 0 du tableau weeklyAmounts) : 150
      expect(norm(cells[0].textContent)).toMatch(/150/);
      expect(cells[0].classList.contains('amount-credit')).toBe(true);

      // Semaine 2 (Index 1 du tableau weeklyAmounts) : -50
      expect(norm(cells[1].textContent)).toMatch(/50/);
      expect(cells[1].classList.contains('amount-debit')).toBe(true);
    });

    it('should replace zero value numbers with an em-dash placeholder text token', async () => {
      await createComponent();

      const row = el().querySelector('.matrix-table tbody tr.row-payment-method');
      const cells = row!.querySelectorAll('td.cell-amount');

      // Semaine 3 (Index 2 du tableau weeklyAmounts) : la valeur est 0, donc le pipe affiche '—'
      expect(norm(cells[2].textContent)).toBe('—');
      expect(cells[2].classList.contains('amount-credit')).toBe(false);
      expect(cells[2].classList.contains('amount-debit')).toBe(false);
    });

    it('should mount and list sub-category table elements inside the template layout only when target master row is expanded', async () => {
      await createComponent();

      // Avant le clic : aucune ligne de catégorie
      let categoryRows = el().querySelectorAll('.matrix-table tbody tr.row-category');
      expect(categoryRows).toHaveLength(0);

      // Clic sur le déclencheur de la ligne principale
      const rowTrigger = el().querySelector(
        '.matrix-table tbody tr.row-payment-method',
      ) as HTMLElement;
      rowTrigger.click();
      fixture.detectChanges();

      // Après le clic : les 2 sous-catégories enfants apparaissent
      categoryRows = el().querySelectorAll('.matrix-table tbody tr.row-category');
      expect(categoryRows).toHaveLength(2);

      const firstCatCells = categoryRows[0].querySelectorAll('td');
      expect(norm(firstCatCells[0].textContent)).toContain('Alimentation');
      expect(norm(firstCatCells[firstCatCells.length - 1].textContent)).toMatch(/400[,.]00/);
    });
  });
});
