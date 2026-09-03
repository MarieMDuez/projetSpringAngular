import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategoryFormComponent } from './category-form.component';
import { CategoryService } from '../category.service';
import { signal, WritableSignal } from '@angular/core';
import { Category } from '../category.model';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';

describe('CategoryFormComponent', () => {
  let component: CategoryFormComponent;
  let fixture: ComponentFixture<CategoryFormComponent>;

  // Isolation du State global via des stubs de signaux
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
    fixture.detectChanges(); // Déclenche ngOnInit et l'initialisation du formulaire réactif
  });

  it('should create the component and initialize the reactive form', () => {
    expect(component).toBeTruthy();
    expect(component['categoryForm']).toBeDefined();
    expect(component['categoryForm'].get('label')?.value).toBe('');
  });

  it('should validate form constraints (required and minLength)', () => {
    const form = component['categoryForm'];
    expect(form.valid).toBe(false);

    // Insertion d'un libellé trop court
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

    // Simulation de l'action utilisateur "Modifier" depuis le tableau parent
    mockEditingCategory.set(targetCategory);

    // Attente du cycle de propagation de l'effect()
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component['categoryForm'].get('label')?.value).toBe('Santé');
  });

  it('should call createCategory API with append index and reset form upon submission', () => {
    const mockCreatedCategory: Category = { id: 10, label: 'Courses', isActive: true, position: 0 };
    mockAllCategories.set([]); // Liste vide, la nouvelle doit prendre la position 0
    (mockCategoryService.createCategory as Mock).mockReturnValue(of(mockCreatedCategory));

    component['categoryForm'].patchValue({ label: 'Courses' });
    component['onSubmit']();

    expect(mockCategoryService.createCategory).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Courses',
        position: 0,
      }),
    );
    expect(component['categoryForm'].get('label')?.value).toBe(''); // Reset vérifié
    expect(mockToastService.show).toHaveBeenCalledWith('Catégorie créée avec succès !', 'success');
  });

  it('should call updateCategory API and clear state on valid modification submit', async () => {
    const activeCategory: Category = { id: 42, label: 'Loisirs', isActive: true, position: 1 };
    mockEditingCategory.set(activeCategory);
    await fixture.whenStable();

    (mockCategoryService.updateCategory as Mock).mockReturnValue(of(activeCategory));

    component['categoryForm'].patchValue({ label: 'Loisirs & Cinéma' });
    component['onSubmit']();

    expect(mockCategoryService.updateCategory).toHaveBeenCalledWith(42, expect.any(Object));
    expect(mockEditingCategory()).toBeNull(); // Libération de l'état d'édition
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
    // GIVEN : L'API renvoie un statut 409
    const errorResponse = { status: 409 };
    (mockCategoryService.createCategory as Mock).mockReturnValue(throwError(() => errorResponse));

    component['categoryForm'].patchValue({ label: 'Énergie' });

    // WHEN
    component['onSubmit']();

    // THEN
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
    expect(component['categoryForm'].get('label')?.value).toBe('');
  });
});
