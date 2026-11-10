import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectedBudgetTableComponent } from './projected-budget-table.component';
import { CategoryService } from '../../settings/category/category.service';
import { PaymentMethodService } from '../../settings/payment-method/payment-method.service';
import { ProjectedBudgetItems } from '../projected-budget-items.model';
import { signal } from '@angular/core';
import localeFr from '@angular/common/locales/fr';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerLocaleData } from '@angular/common';

registerLocaleData(localeFr, 'fr-FR');

describe('ProjectedBudgetTableComponent', () => {
  let component: ProjectedBudgetTableComponent;
  let fixture: ComponentFixture<ProjectedBudgetTableComponent>;
  let mockCategoryService: any;
  let mockPaymentMethodService: any;

  const mockItems = (): ProjectedBudgetItems[] => [
    {
      accountAmount: 1500,
      cashAmount: 200,
      comment: 'Ligne Un',
      category: { id: 1, label: 'Alimentation' },
      paymentMethod: { id: 1, label: 'Carte' },
      type: 'FIXED_EXPENSE' as any,
    },
    {
      accountAmount: 500,
      cashAmount: 50,
      comment: 'Ligne Deux',
      category: { id: 2, label: 'Loisirs' },
      paymentMethod: { id: 2, label: 'Espèces' },
      type: 'FIXED_EXPENSE' as any,
    },
  ];

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const norm = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();

  beforeEach(() => {
    mockCategoryService = {
      activeCategories: signal([
        { id: 1, label: 'Alimentation' },
        { id: 2, label: 'Loisirs' },
      ]),
    };

    mockPaymentMethodService = {
      activePaymentMethods: signal([
        { id: 1, label: 'Carte' },
        { id: 2, label: 'Espèces' },
      ]),
    };

    TestBed.configureTestingModule({
      imports: [ProjectedBudgetTableComponent],
      providers: [
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: PaymentMethodService, useValue: mockPaymentMethodService },
      ],
    });
  });

  const createComponent = async (title: string, items: ProjectedBudgetItems[]): Promise<void> => {
    fixture = TestBed.createComponent(ProjectedBudgetTableComponent);
    component = fixture.componentInstance;

    // Renseignement obligatoire des inputs requis avant le cycle initial de détection
    fixture.componentRef.setInput('title', title);
    fixture.componentRef.setInput('formArray', items);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  describe('Validation des Calculs des Signaux (Computed)', () => {
    it('should aggregate account and cash values accurately using data reductions', async () => {
      await createComponent('Charges', mockItems());

      // totalAccount = 1500 + 500 = 2000
      expect(component['totalAccount']()).toBe(2000);
      // totalCash = 200 + 50 = 250
      expect(component['totalCash']()).toBe(250);
      // globalTableTotal = 2000 + 250 = 2250
      expect(component['globalTableTotal']()).toBe(2250);
    });

    it('should fallback securely onto zero values when inputs datasets arrays are initialized empty', async () => {
      await createComponent('Charges', []);

      expect(component['totalAccount']()).toBe(0);
      expect(component['totalCash']()).toBe(0);
      expect(component['globalTableTotal']()).toBe(0);
    });
  });

  describe('Émissions des Événements et Signaux de Sortie (Outputs)', () => {
    beforeEach(async () => {
      await createComponent('Charges', mockItems());
    });

    it('should emit addRequested structural signal workflow when onAdd is executed', () => {
      const spyEmit = vi.spyOn(component.addRequested, 'emit');
      component.onAdd();
      expect(spyEmit).toHaveBeenCalled();
    });

    it('should route targeted row index signature into deletedRequested output channel upon onDelete trigger', () => {
      const spyEmit = vi.spyOn(component.deletedRequested, 'emit');
      component.onDelete(1);
      expect(spyEmit).toHaveBeenCalledWith(1);
    });

    it('should dispatch tableUpdated notify tokens when table interaction callbacks fire', () => {
      const spyEmit = vi.spyOn(component.tableUpdated, 'emit');
      component['onTableInteraction']();
      expect(spyEmit).toHaveBeenCalled();
    });
  });
  describe('Intégration du Template DOM et Saisie Formulaire', () => {
    it('should project the table header text bound to the custom title input signal', async () => {
      await createComponent('Revenus Spécifiques', mockItems());
      expect(norm(el().querySelector('h3')?.textContent)).toBe('Revenus Spécifiques');
    });

    it('should iterate correctly and draw input form elements per available row entry', async () => {
      await createComponent('Charges', mockItems());

      const inputRows = el().querySelectorAll('tbody tr');
      expect(inputRows).toHaveLength(2);

      // On s'assure que les valeurs initiales alimentent bien les champs inputs
      const firstRowComment = inputRows[0].querySelector('input[type="text"]') as HTMLInputElement;
      expect(firstRowComment.value).toBe('Ligne Un');

      const secondRowAccount = inputRows[1].querySelector(
        'input[type="number"]',
      ) as HTMLInputElement;
      expect(Number(secondRowAccount.value)).toBe(500);
    });

    it('should populate select option fields with datasets categories labels', async () => {
      await createComponent('Charges', mockItems());

      // On cible le premier select de catégorie du tableau
      const selectCategory = el().querySelector('tbody tr select') as HTMLSelectElement;
      expect(selectCategory).not.toBeNull();

      const options = Array.from(selectCategory.options).map((o) => norm(o.textContent));
      expect(options).toContain('Alimentation');
      expect(options).toContain('Loisirs');
    });

    it('should trigger onTableInteraction execution whenever DOM table interactions dispatch input/change events', async () => {
      await createComponent('Charges', mockItems());
      const spyInteraction = vi.spyOn(component as any, 'onTableInteraction');

      const tableElement = el().querySelector('table');
      expect(tableElement).not.toBeNull();

      tableElement!.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();

      expect(spyInteraction).toHaveBeenCalled();
    });

    it('should display formatting structures currency values into the tabular summary footer rows', async () => {
      await createComponent('Charges', mockItems());

      const totalLabelCells = el().querySelectorAll('tfoot tr.table-totals-row td.total-amount');
      expect(totalLabelCells).toHaveLength(2);

      // totalAccount = 2000 -> 2 000,00 € (en nettoyant les espaces insécables)
      const accountText = norm(totalLabelCells[0].textContent).replace(/\s+/g, '');
      expect(accountText).toContain('2000,00€');

      // globalTableTotal = 2250 -> 2 250,00 €
      const globalValueCell = el().querySelector('tfoot tr.category-total-row td.category-value');
      const globalText = norm(globalValueCell?.textContent).replace(/\s+/g, '');
      expect(globalText).toContain('2250,00€');
    });

    it('should trigger placeholder layout lines structure when input dataset lists drop into empty states', async () => {
      await createComponent('Charges', []);

      const emptyRow = el().querySelector('tbody tr td.empty-message');
      expect(emptyRow).not.toBeNull();
      expect(norm(emptyRow?.textContent)).toBe(
        'Aucune ligne pour le moment. Cliquez sur le bouton pour commencer.',
      );
    });
  });
});
