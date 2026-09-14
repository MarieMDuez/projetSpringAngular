import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';
import { Category } from '../category.model';
import { CategoryService } from '../category.service';
import { CategoryListComponent } from './category-list.component';

describe('CategoryListComponent', () => {
  let component: CategoryListComponent;
  let fixture: ComponentFixture<CategoryListComponent>;

  const mockAllCategories = signal<Category[]>([]);
  const mockEditingCategory = signal<Category | null>(null);
  const mockToastService: { show: Mock } = { show: vi.fn() };

  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  const mockCategoryService: Partial<CategoryService> = {
    allCategories: mockAllCategories,
    editingCategory: mockEditingCategory,
    deleteCategory: vi.fn(),
    saveAll: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAllCategories.set([]);
    mockEditingCategory.set(null);

    await TestBed.configureTestingModule({
      imports: [CategoryListComponent],
      providers: [
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: ToastService, useValue: mockToastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the category list component', () => {
    expect(component).toBeTruthy();
  });

  it('should transfer category reference to editingCategory state upon edit trigger', () => {
    const targetCategory: Category = { id: 10, label: 'Loisirs', isActive: true, position: 0 };

    component.onEdit(targetCategory);

    expect(mockEditingCategory()).toEqual(targetCategory);
  });

  it('should call deleteCategory API when user confirms deletion via window dialog', () => {
    const targetCategory: Category = { id: 3, label: 'Alimentation', isActive: true, position: 1 };
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    (mockCategoryService.deleteCategory as Mock).mockReturnValue(of(true));

    component['onDelete'](targetCategory);

    expect(mockCategoryService.deleteCategory).toHaveBeenCalledWith(3);
    expect(mockToastService.show).toHaveBeenCalledWith(
      'La catégorie a été supprimé avec succès',
      'success',
    );
  });

  it('should abort deletion protocol if user cancels the native confirm window', () => {
    const targetCategory: Category = { id: 3, label: 'Alimentation', isActive: true, position: 1 };
    component['categoryToDelete'].set(targetCategory);
    component['onConfirmDeleteAction']('cancel');
    expect(component['categoryToDelete']()).toBeNull();

    expect(mockCategoryService.deleteCategory).not.toHaveBeenCalled();
  });

  it('should map new sequential indexes and execute saveAll API during drop sequence', () => {
    const catA = { id: 100, label: 'Courses', isActive: true, position: 0 };
    const catB = { id: 200, label: 'Abonnements', isActive: true, position: 1 };
    mockAllCategories.set([catA, catB]);

    (mockCategoryService.saveAll as Mock).mockReturnValue(of([catB, catA]));

    const mockDragDropEvent = {
      previousIndex: 0,
      currentIndex: 1,
    } as CdkDragDrop<Category[]>;

    component.onDrop(mockDragDropEvent);

    expect(mockCategoryService.saveAll).toHaveBeenCalledWith([
      expect.objectContaining({ id: 200, position: 0 }),
      expect.objectContaining({ id: 100, position: 1 }),
    ]);
  });

  it('should set error message signal if deletion request fails on the backend', () => {
    const targetCategory: Category = { id: 5, label: 'Santé', isActive: true, position: 0 };
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    (mockCategoryService.deleteCategory as Mock).mockReturnValue(
      throwError(() => new Error('DB Connection Timeout')),
    );

    component['onDelete'](targetCategory);

    expect(mockToastService.show).toHaveBeenCalledWith(
      'Une erreur est survenue lors de la suppression',
      'error',
    );
  });
});
