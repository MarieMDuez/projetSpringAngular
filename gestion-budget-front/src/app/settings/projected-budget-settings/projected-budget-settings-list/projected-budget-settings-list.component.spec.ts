import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  Component,
  input,
  output,
  signal,
  WritableSignal,
  Pipe,
  PipeTransform,
} from '@angular/core';
import { ProjectedBudgetSettingsListComponent } from './projected-budget-settings-list.component';
import { ProjectedBudgetSettingsService } from '../projected-budget-settings.service';
import { CategoryService } from '../../category/category.service';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';
import { ProjectedBudgetSettings } from '../projected-budget-settings.model';
import { ProjectedBudgetCategoryType } from '../../../projected_budget/projected-budget-items.model';
import { ProjectedBudgetSettingsFormComponent } from '../projected-budget-settings-form/projected-budget-settings-form.component';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { FindByIdPipe } from '../../../shared/pipes/find-by-id-pipe';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';

// --- Stubs d'isolation des dépendances enfants et pipes complexes ---
@Component({ selector: 'app-projected-budget-settings-form', template: '' })
class StubProjectedBudgetSettingsFormComponent {}

@Component({ selector: 'app-modal', template: '' })
class StubModalComponent {
  readonly title = input<string>('');
  readonly options = input<string>('');
  readonly type = input<string>('');
  readonly confirmText = input<string>('');
  readonly cancelText = input<string>('');
  readonly resultAction = output<any>();
}

@Pipe({
  name: 'findById',
  standalone: true,
})
class StubFindByIdPipe implements PipeTransform {
  transform(categories: any[], id: number) {
    return categories.find((c) => c.id === id) || null;
  }
}

describe('ProjectedBudgetSettingsListComponent', () => {
  let component: ProjectedBudgetSettingsListComponent;
  let fixture: ComponentFixture<ProjectedBudgetSettingsListComponent>;
  let mockSettingsService: any;
  let mockCategoryService: any;
  let mockToastService: any;

  let allSettingsSignal: WritableSignal<ProjectedBudgetSettings[]>;
  let editingSettingsSignal: WritableSignal<ProjectedBudgetSettings | null>;
  let allCategoriesSignal: WritableSignal<any[]>;

  const getMockSettings = (): ProjectedBudgetSettings[] => [
    { id: 1, type: ProjectedBudgetCategoryType.INCOME, category: { id: 10 } },
    { id: 2, type: ProjectedBudgetCategoryType.FIXED_EXPENSE, category: { id: 20 } },
  ];

  const getMockCategories = () => [
    { id: 10, label: 'Salaire', isActive: true },
    { id: 20, label: 'Loyer', isActive: false },
  ];

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const norm = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();
  const text = (selector: string): string => norm(el().querySelector(selector)?.textContent);

  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    allSettingsSignal = signal<ProjectedBudgetSettings[]>(getMockSettings());
    editingSettingsSignal = signal<ProjectedBudgetSettings | null>(null);
    allCategoriesSignal = signal<any[]>(getMockCategories());

    mockSettingsService = {
      allProjectedBudgetSettings: allSettingsSignal,
      editingProjectedBudgetSettings: editingSettingsSignal,
      getProjectedBudgetSettings: vi.fn().mockReturnValue(of(getMockSettings())),
      deleteProjectedBudgetSettings: vi.fn().mockReturnValue(of(true)),
    };

    mockCategoryService = {
      allCategories: allCategoriesSignal,
    };

    mockToastService = {
      show: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProjectedBudgetSettingsListComponent],
      providers: [
        { provide: ProjectedBudgetSettingsService, useValue: mockSettingsService },
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: ToastService, useValue: mockToastService },
      ],
    })
      .overrideComponent(ProjectedBudgetSettingsListComponent, {
        remove: {
          imports: [ProjectedBudgetSettingsFormComponent, ModalComponent, FindByIdPipe],
        },
        add: {
          imports: [StubProjectedBudgetSettingsFormComponent, StubModalComponent, StubFindByIdPipe],
        },
      })
      .compileComponents();
  });

  const createComponent = async (): Promise<void> => {
    fixture = TestBed.createComponent(ProjectedBudgetSettingsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  describe('Cycle de Vie et Initialisation Globale', () => {
    it('should query getProjectedBudgetSettings on init and map state payload', async () => {
      await createComponent();

      expect(mockSettingsService.getProjectedBudgetSettings).toHaveBeenCalled();
      expect(component['projectedBudgetSettings']()).toHaveLength(2);
    });

    it('should update service editing signal and apply smooth scroll on target onEdit triggers', async () => {
      await createComponent();
      const targetSetting = getMockSettings()[0];
      const spyScroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');

      const fakeForm = document.createElement('div');
      fakeForm.id = 'editForm';
      el().appendChild(fakeForm);

      component['onEdit'](targetSetting);

      expect(editingSettingsSignal()).toEqual(targetSetting);
      expect(spyScroll).toHaveBeenCalled();
      fakeForm.remove();
    });
  });
  describe('Gestion des Actions de Confirmation et Modales (onConfirmDeleteAction)', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should invoke deleteProjectedBudgetSettings endpoint upon validation and display success toaster', () => {
      const targetSetting = getMockSettings()[0];
      component['projectedBudgetSettingsToDelete'].set(targetSetting);

      component['onConfirmDeleteAction']('confirm');

      expect(mockSettingsService.deleteProjectedBudgetSettings).toHaveBeenCalledWith(1);
      expect(mockToastService.show).toHaveBeenCalledWith(
        'Le mapping a été supprimé avec succès',
        'success',
      );
    });

    it('should route errors onto specialized toast notice blocks if delete pipeline fails', () => {
      mockSettingsService.deleteProjectedBudgetSettings.mockReturnValue(
        throwError(() => new Error('DB Crash')),
      );
      const targetSetting = getMockSettings()[0];
      component['projectedBudgetSettingsToDelete'].set(targetSetting);

      component['onConfirmDeleteAction']('confirm');

      expect(mockToastService.show).toHaveBeenCalledWith(
        'Une erreur est survenue lors de la suppression',
        'error',
      );
    });

    it('should reset internal deletion pointer references without changes when cancel is triggered', () => {
      component['projectedBudgetSettingsToDelete'].set(getMockSettings()[0]);

      component['onConfirmDeleteAction']('cancel');

      expect(component['projectedBudgetSettingsToDelete']()).toBeNull();
      expect(mockSettingsService.deleteProjectedBudgetSettings).not.toHaveBeenCalled();
    });
  });

  describe('Intégration du Template DOM et Validation Syntaxique', () => {
    it('should compile loop structures rows and format text map directions via pipe injection', async () => {
      await createComponent();

      const items = el().querySelectorAll('.data-list .data-item');
      expect(items).toHaveLength(2);

      // Le premier mapping cible une catégorie active ("Salaire")
      expect(text('.data-list .data-item:first-of-type .item-name')).toBe('Salaire -> Revenus');
    });

    it('should inject specific archived badge wrappers only when mapped entity categories are disabled', async () => {
      await createComponent();

      // Le deuxième mapping cible une catégorie archivée ("Loyer")
      const secondItemText = text('.data-list .data-item:nth-of-type(2) .item-name');
      expect(secondItemText).toContain('Loyer');
      expect(secondItemText).toContain('(Archivé)');

      const badge = el().querySelector('.data-list .data-item:nth-of-type(2) .badge-archived');
      expect(badge).not.toBeNull();
    });

    it('should display baseline text fallback dashes pointers whenever matching target category indicators miss identifiers', async () => {
      // Injection d'un élément pointant vers un ID de catégorie inconnu (ex: 999)
      allSettingsSignal.set([
        { id: 3, type: ProjectedBudgetCategoryType.INCOME, category: { id: 999 } },
      ]);
      await createComponent();

      expect(text('.data-list .data-item .item-name')).toBe('— -> Revenus');
    });

    it('should render structural fallback alert screens layouts when master collections dry out to empty status', async () => {
      allSettingsSignal.set([]);
      await createComponent();

      expect(el().querySelector('.data-item')).toBeNull();
      const emptyLayout = el().querySelector('.data-list p.text-muted');
      expect(emptyLayout).not.toBeNull();
      expect(norm(emptyLayout?.textContent)).toBe('Aucun compte disponible pour le moment.');
    });
  });
});
