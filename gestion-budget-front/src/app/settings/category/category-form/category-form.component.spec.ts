import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';
import { Category } from '../category.model';
import { CategoryService } from '../category.service';
import { CategoryFormComponent } from './category-form.component';

describe('CategoryFormComponent', () => {
  let component: CategoryFormComponent;
  let fixture: ComponentFixture<CategoryFormComponent>;

  const mockAllCategories = signal<Category[]>([]);
  const mockEditingCategory: WritableSignal<Category | null> = signal<Category | null>(null);

  const mockCategoryService: Partial<CategoryService> = {
    allCategories: mockAllCategories,
    editingCategory: mockEditingCategory,
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
  };

  const mockToastService: { show: Mock } = { show: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockToastService.show.mockReset();
    mockAllCategories.set([]);
    mockEditingCategory.set(null);

    await TestBed.configureTestingModule({
      imports: [CategoryFormComponent],
      providers: [
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: ToastService, useValue: mockToastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and initialize the reactive form', () => {
    expect(component).toBeTruthy();
    expect(component['categoryForm']).toBeDefined();
    expect(component['categoryForm'].get('label')?.value).toBe('');
  });

  it('should validate form constraints (required and minLength)', () => {
    const form = component['categoryForm'];
    expect(form.valid).toBe(false);

    form.patchValue({ label: 'Do' });
    expect(form.valid).toBe(false);

    form.patchValue({ label: 'Domotique' });
    expect(form.valid).toBe(true);
  });

  it('should react and pre-populate the form when editingCategory signal updates', async () => {
    const targetCategory: Category = {
      id: 5,
      label: 'Santé',
      isActive: true,
      position: 2,
    };

    mockEditingCategory.set(targetCategory);

    await fixture.whenStable();
    fixture.detectChanges();

    expect(component['categoryForm'].get('label')?.value).toBe('Santé');
  });

  it('should call createCategory API with append index and reset form upon submission', () => {
    const mockCreatedCategory: Category = { id: 10, label: 'Courses', isActive: true, position: 0 };
    mockAllCategories.set([]);
    (mockCategoryService.createCategory as Mock).mockReturnValue(of(mockCreatedCategory));

    component['categoryForm'].patchValue({ label: 'Courses' });
    component['onSubmit']();

    expect(mockCategoryService.createCategory).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Courses',
        position: 0,
      }),
    );
    expect(component['categoryForm'].get('label')?.value).toBeNull();
    expect(mockToastService.show).toHaveBeenCalledWith('Catégorie créée avec succès !', 'success');
  });

  it('should call updateCategory API and clear state on valid modification submit', async () => {
    const activeCategory: Category = { id: 42, label: 'Loisirs', isActive: true, position: 1 };
    mockEditingCategory.set(activeCategory);
    await fixture.whenStable();

    (mockCategoryService.updateCategory as Mock).mockReturnValue(of(activeCategory));

    component['categoryForm'].patchValue({ label: 'Loisirs & Cinéma' });
    component['onSubmit']();

    expect(mockCategoryService.updateCategory).toHaveBeenCalledWith(42, {
      label: 'Loisirs & Cinéma',
      isActive: true,
      position: undefined,
    });
    expect(mockEditingCategory()).toBeNull();
  });

  it('should capture backend failure during creation and map it to the UI error signal', () => {
    (mockCategoryService.createCategory as Mock).mockReturnValue(
      throwError(() => new Error('DB Crash')),
    );

    component['categoryForm'].patchValue({ label: 'Énergie' });
    component['onSubmit']();

    expect(mockToastService.show).toHaveBeenCalledWith(
      'Une erreur est survenue lors de la création de la catégorie',
      'error',
    );
  });
  it('should trigger duplicate name error toast upon 409 conflict during creation', () => {
    const errorResponse = { status: 409 };
    (mockCategoryService.createCategory as Mock).mockReturnValue(throwError(() => errorResponse));

    component['categoryForm'].patchValue({ label: 'Énergie' });

    component['onSubmit']();

    expect(mockToastService.show).toHaveBeenCalledWith(
      'Une erreur est survenue : ce nom de catégorie existe déjà',
      'error',
    );
  });

  it('should clear form controls and purge editing signal upon edit cancellation', async () => {
    mockEditingCategory.set({ id: 8, label: 'Cadeaux', isActive: true, position: 4 });
    await fixture.whenStable();

    component.onCancelEdit();

    expect(mockEditingCategory()).toBeNull();
    expect(component['categoryForm'].get('label')?.value).toBeNull();
  });
});
