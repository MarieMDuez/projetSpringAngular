import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ProjectedBudgetSettingsFormComponent } from './projected-budget-settings-form.component';
import { ProjectedBudgetSettingsService } from '../projected-budget-settings.service';
import { CategoryService } from '../../category/category.service';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';
import { ProjectedBudgetCategoryType } from '../../../projected_budget/projected-budget-items.model';
import { ProjectedBudgetSettings } from '../projected-budget-settings.model';
import { signal, WritableSignal, Directive } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

// Stub de la directive appSelectLoop présente dans ton HTML pour éviter les erreurs de compilation
@Directive({
  selector: '[appSelectLoop]',
  standalone: true,
})
class StubSelectLoopDirective {}

describe('ProjectedBudgetSettingsFormComponent', () => {
  let component: ProjectedBudgetSettingsFormComponent;
  let fixture: ComponentFixture<ProjectedBudgetSettingsFormComponent>;
  let mockSettingsService: any;
  let mockCategoryService: any;
  let mockToastService: any;

  let editingSettingsSignal: WritableSignal<ProjectedBudgetSettings | null>;
  let categoriesSignal: WritableSignal<any[]>;

  beforeEach(() => {
    editingSettingsSignal = signal<ProjectedBudgetSettings | null>(null);
    categoriesSignal = signal<any[]>([
      { id: 1, label: 'Loyer' },
      { id: 2, label: 'Courses' },
    ]);

    mockSettingsService = {
      editingProjectedBudgetSettings: editingSettingsSignal,
      allProjectedBudgetSettings: signal([]),
      createProjectedBudgetSettings: vi.fn().mockReturnValue(of({})),
      updateProjectedBudgetSettings: vi.fn().mockReturnValue(of({})),
    };

    mockCategoryService = {
      activeCategories: categoriesSignal,
    };

    mockToastService = {
      show: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [ProjectedBudgetSettingsFormComponent, ReactiveFormsModule, StubSelectLoopDirective],
      providers: [
        { provide: ProjectedBudgetSettingsService, useValue: mockSettingsService },
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: ToastService, useValue: mockToastService },
      ],
    });
  });

  const createComponent = async (): Promise<void> => {
    fixture = TestBed.createComponent(ProjectedBudgetSettingsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  describe('Initialisation et Validation Logique du Formulaire', () => {
    it('should initialize reactive form components with baseline empty values', async () => {
      await createComponent();

      expect(component['projectedBudgetSettingsForm']).toBeDefined();
      expect(component['projectedBudgetSettingsForm'].get('type')?.value).toBe('');
      expect(component['projectedBudgetSettingsForm'].get('categoryId')?.value).toBe('');
    });

    it('should validate form constraints and reject empty selections configurations', async () => {
      await createComponent();
      const form = component['projectedBudgetSettingsForm'];

      form.get('type')?.setValue('');
      form.get('categoryId')?.setValue('');

      expect(form.invalid).toBe(true);
    });
  });

  describe('Cycle Réactif et Remplissage (Mode Édition)', () => {
    it('should populate form controls reactively when target editing data changes', async () => {
      await createComponent();

      const targetSettings: WritableSignal<any> = editingSettingsSignal;
      const targetData: ProjectedBudgetSettings = {
        id: 100,
        type: ProjectedBudgetCategoryType.FIXED_EXPENSE,
        category: { id: 2 },
      };

      // Simule l'activation du mode édition
      component['onEdit'](targetData);
      fixture.detectChanges();

      expect(component['projectedBudgetSettingsForm'].get('type')?.value).toBe(
        ProjectedBudgetCategoryType.FIXED_EXPENSE,
      );
      expect(component['projectedBudgetSettingsForm'].get('categoryId')?.value).toBe(2);
    });
  });
  describe('Soumission des Données et Traitement API (onSubmit)', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should block submissions operations completely if form statuses are invalid', () => {
      component['projectedBudgetSettingsForm'].patchValue({ type: '', categoryId: '' });
      component['onSubmit']();

      expect(mockSettingsService.createProjectedBudgetSettings).not.toHaveBeenCalled();
    });

    it('should invoke createProjectedBudgetSettings endpoints upon nominal addition submittal and reset form structures', () => {
      component['projectedBudgetSettingsForm'].patchValue({
        type: ProjectedBudgetCategoryType.INCOME,
        categoryId: '1',
      });

      component['onSubmit']();

      expect(mockSettingsService.createProjectedBudgetSettings).toHaveBeenCalledWith({
        type: ProjectedBudgetCategoryType.INCOME,
        category: { id: 1 },
      });
      expect(mockToastService.show).toHaveBeenCalledWith(
        'Mapping effectué avec succès !',
        'success',
      );

      // Doit réinitialiser avec l'objet vide baseline
      expect(component['projectedBudgetSettingsForm'].get('type')?.value).toBe(
        ProjectedBudgetCategoryType.INCOME,
      );
    });

    it('should invoke updateProjectedBudgetSettings workflow when an active editing identifier context is matched', () => {
      const activeEditData: ProjectedBudgetSettings = {
        id: 42,
        type: ProjectedBudgetCategoryType.FIXED_EXPENSE,
        category: { id: 2 },
      };
      mockSettingsService.editingProjectedBudgetSettings.set(activeEditData);
      fixture.detectChanges();

      component['projectedBudgetSettingsForm'].patchValue({
        type: ProjectedBudgetCategoryType.VARIABLE_EXPENSE,
        categoryId: '1',
      });

      component['onSubmit']();

      expect(mockSettingsService.updateProjectedBudgetSettings).toHaveBeenCalledWith(42, {
        id: 42,
        type: ProjectedBudgetCategoryType.VARIABLE_EXPENSE,
        category: { id: 1 },
      });
      expect(mockToastService.show).toHaveBeenCalledWith(
        'mapping modifié avec succès !',
        'success',
      );
      expect(mockSettingsService.editingProjectedBudgetSettings()).toBeNull();
    });

    it('should route errors onto failure toasters components when creation back-end pipelines fail', () => {
      mockSettingsService.createProjectedBudgetSettings.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      component['projectedBudgetSettingsForm'].patchValue({
        type: ProjectedBudgetCategoryType.INCOME,
        categoryId: '1',
      });

      component['onSubmit']();
      expect(mockToastService.show).toHaveBeenCalledWith(
        `Une erreur est survenue lors du mapping des données`,
        'error',
      );
    });
  });

  describe('Annulation de l Action Contextuelle (onCancelEdit)', () => {
    it('should clear reference targets signals and flash input entries fields to fallback states', async () => {
      await createComponent();
      mockSettingsService.editingProjectedBudgetSettings.set({
        id: 42,
        type: ProjectedBudgetCategoryType.INCOME,
        category: { id: 1 },
      });
      fixture.detectChanges();

      component.onCancelEdit();

      expect(mockSettingsService.editingProjectedBudgetSettings()).toBeNull();
      expect(component['projectedBudgetSettingsForm'].get('type')?.value).toBe(
        ProjectedBudgetCategoryType.INCOME,
      );
    });
  });
});
