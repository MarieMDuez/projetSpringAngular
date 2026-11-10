import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CategoryFormComponent } from './category-form.component';
import { CategoryService } from '../category.service';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';
import { Category } from '../category.model';
import { signal, WritableSignal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

describe('CategoryFormComponent', () => {
  let component: CategoryFormComponent;
  let fixture: ComponentFixture<CategoryFormComponent>;
  let mockCategoryService: any;
  let mockToastService: any;

  let allCategoriesSignal: WritableSignal<Category[]>;
  let editingCategorySignal: WritableSignal<Category | null>;

  const getMockCategories = (): Category[] => [
    { id: 1, label: 'Alimentation', isActive: true, position: 0 },
  ];

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const norm = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();

  beforeEach(() => {
    allCategoriesSignal = signal<Category[]>(getMockCategories());
    editingCategorySignal = signal<Category | null>(null);

    mockCategoryService = {
      allCategories: allCategoriesSignal,
      editingCategory: editingCategorySignal,
      createCategory: vi.fn().mockReturnValue(of({ id: 2, label: 'Loisirs' })),
      updateCategory: vi.fn().mockReturnValue(of(true)),
    };

    mockToastService = {
      show: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [CategoryFormComponent, ReactiveFormsModule],
      providers: [
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: ToastService, useValue: mockToastService },
      ],
    });
  });

  const createComponent = async (): Promise<void> => {
    fixture = TestBed.createComponent(CategoryFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  describe('Validation Métier et États du Formulaire', () => {
    it('should initialize the reactive group containing label and position fields', async () => {
      await createComponent();

      expect(component['categoryForm']).toBeDefined();
      expect(component['categoryForm'].get('label')?.value).toBe('');
      expect(component['categoryForm'].get('position')?.value).toBeNull();
    });

    it('should show detailed validation error blocks if label drops under length rules', async () => {
      await createComponent();
      const labelControl = component['categoryForm'].get('label')!;

      labelControl.setValue('Ab');
      labelControl.markAsTouched();
      // Simule la perte de focus exigée par updateOn: 'blur'
      labelControl.updateValueAndValidity();
      fixture.detectChanges();

      expect(labelControl.invalid).toBe(true);
      expect(el().querySelector('.error-text')).not.toBeNull();
      expect(norm(el().querySelector('.error-text')?.textContent)).toBe('Obligatoire (3 car. min)');
    });
  });

  describe('Mécanique de l Effect Réactif (Mode Édition)', () => {
    it('should automatically catch signal updates and populate inputs values via patchValue', async () => {
      await createComponent();
      const targetCat: Category = {
        id: 10,
        label: 'Factures Énergie',
        isActive: true,
        position: 1,
      };

      editingCategorySignal.set(targetCat);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component['categoryForm'].get('label')?.value).toBe('Factures Énergie');
      expect(component['categoryForm'].get('position')?.value).toBe(1);
    });
  });
  describe('Soumission du Formulaire et Traitement API (onSubmit)', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should ignore form submission routines if core input values remain invalid', () => {
      component['categoryForm'].patchValue({ label: '' });
      component['onSubmit']();

      expect(mockCategoryService.createCategory).not.toHaveBeenCalled();
    });

    it('should invoke createCategory, propagate precise positions metrics, and dispatch saveSuccess', () => {
      const spyEmit = vi.spyOn(component.saveSuccess, 'emit');
      component['categoryForm'].patchValue({ label: 'Abonnements Stream' });

      component['onSubmit']();

      expect(mockCategoryService.createCategory).toHaveBeenCalledWith({
        label: 'Abonnements Stream',
        isActive: true,
        position: 1,
      });
      expect(mockToastService.show).toHaveBeenCalledWith(
        'Catégorie créée avec succès !',
        'success',
      );
      expect(spyEmit).toHaveBeenCalledWith(2);
      expect(component['categoryForm'].get('label')?.value).toBeNull();
    });

    it('should route onto updateCategory workflows when a valid selection model is active', () => {
      const editingTarget: Category = { id: 5, label: 'Transports', isActive: true, position: 2 };
      editingCategorySignal.set(editingTarget);
      fixture.detectChanges();

      component['categoryForm'].patchValue({ label: 'Transports Communs' });
      component['onSubmit']();

      expect(mockCategoryService.updateCategory).toHaveBeenCalledWith(5, {
        label: 'Transports Communs',
        isActive: true,
        position: 2,
      });
      expect(mockToastService.show).toHaveBeenCalledWith(
        'Catégorie modifié avec succès !',
        'success',
      );
      expect(editingCategorySignal()).toBeNull();
    });

    it('should trigger unique category conflict alerts when API requests fail with status 409', () => {
      const conflictError = new HttpErrorResponse({ status: 409 });
      mockCategoryService.createCategory.mockReturnValue(throwError(() => conflictError));

      component['categoryForm'].patchValue({ label: 'Doublon Catégorie' });
      component['onSubmit']();

      expect(mockToastService.show).toHaveBeenCalledWith(
        'Une erreur est survenue : ce nom de catégorie existe déjà',
        'error',
      );
    });

    it('should generic alert blocks when API creation pipelines fail unexpectedly', () => {
      mockCategoryService.createCategory.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      component['categoryForm'].patchValue({ label: 'Crash Test' });
      component['onSubmit']();

      expect(mockToastService.show).toHaveBeenCalledWith(
        'Une erreur est survenue lors de la création de la catégorie',
        'error',
      );
    });
  });

  describe('Annulation de la Procédure (onCancelEdit)', () => {
    it('should flash forms inputs to null states and clean context signals references', async () => {
      await createComponent();
      editingCategorySignal.set({ id: 5, label: 'Transports', isActive: true, position: 2 });
      fixture.detectChanges();

      component.onCancelEdit();

      expect(editingCategorySignal()).toBeNull();
      expect(component['categoryForm'].get('label')?.value).toBeNull();
    });
  });
});
