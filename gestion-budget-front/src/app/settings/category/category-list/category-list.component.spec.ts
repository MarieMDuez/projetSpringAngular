import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, input, output, signal, WritableSignal } from '@angular/core';
import { CategoryListComponent } from './category-list.component';
import { CategoryService } from '../category.service';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';
import { Category } from '../category.model';
import { CategoryFormComponent } from '../category-form/category-form.component';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';

// --- Stubs d'isolation des dépendances enfants complexes ---
@Component({ selector: 'app-category-form', template: '' })
class StubCategoryFormComponent {}

@Component({ selector: 'app-modal', template: '' })
class StubModalComponent {
  readonly title = input<string>('');
  readonly options = input<string>('');
  readonly type = input<string>('');
  readonly confirmText = input<string>('');
  readonly cancelText = input<string>('');
  readonly resultAction = output<any>();
}

describe('CategoryListComponent', () => {
  let component: CategoryListComponent;
  let fixture: ComponentFixture<CategoryListComponent>;
  let mockCategoryService: any;
  let mockToastService: any;

  let allCategoriesSignal: WritableSignal<Category[]>;
  let editingCategorySignal: WritableSignal<Category | null>;

  const getMockCategories = (): Category[] => [
    { id: 1, label: 'Alimentation', isActive: true, position: 0 },
    { id: 2, label: 'Loisirs', isActive: true, position: 1 },
    { id: 3, label: 'Factures (Archivé)', isActive: false, position: 2 },
  ];

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const norm = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();
  const text = (selector: string): string => norm(el().querySelector(selector)?.textContent);

  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Simuler le scrollIntoView global du DOM pour éviter les crashs de test
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    allCategoriesSignal = signal<Category[]>(getMockCategories());
    editingCategorySignal = signal<Category | null>(null);

    mockCategoryService = {
      allCategories: allCategoriesSignal,
      editingCategory: editingCategorySignal,
      deleteCategory: vi.fn().mockReturnValue(of(true)),
      setCategoryActive: vi.fn().mockReturnValue(of(true)),
      saveAll: vi.fn().mockReturnValue(of(true)),
    };

    // Aligner la référence du signal de service sur celle du mock
    mockCategoryService.editingCategory = editingCategorySignal;

    mockToastService = {
      show: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CategoryListComponent],
      providers: [
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: ToastService, useValue: mockToastService },
      ],
    })
      .overrideComponent(CategoryListComponent, {
        remove: {
          imports: [CategoryFormComponent, ModalComponent],
        },
        add: {
          imports: [StubCategoryFormComponent, StubModalComponent],
        },
      })
      .compileComponents();
  });

  const createComponent = async (): Promise<void> => {
    fixture = TestBed.createComponent(CategoryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  describe('Cycle de vie initial et Rendu DOM baseline', () => {
    it('should query categories signal collection and loop item structures', async () => {
      await createComponent();

      expect(component['categories']()).toHaveLength(3);
      const items = el().querySelectorAll('.data-list .data-item');
      expect(items).toHaveLength(3);
    });

    it('should trigger scrolling behavior animations on onEdit execution targets', async () => {
      await createComponent();
      const targetCat = getMockCategories()[0];
      const spyScroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');

      const fakeForm = document.createElement('div');
      fakeForm.id = 'editForm';
      el().appendChild(fakeForm);

      component.onEdit(targetCat);

      expect(editingCategorySignal()).toEqual(targetCat);
      expect(spyScroll).toHaveBeenCalled();
      fakeForm.remove();
    });
  });

  describe('Algorithmes de Tri et Boutons Directionnels', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should ignore moveUp configurations when element idx matches index 0', () => {
      component.moveUp(getMockCategories()[0]);
      expect(mockCategoryService.saveAll).not.toHaveBeenCalled();
    });

    it('should shift items indices fields positions correctly inside valid moveUp routines', () => {
      component.moveUp(getMockCategories()[1]); // Loisirs (index 1) monte
      expect(mockCategoryService.saveAll).toHaveBeenCalled();
    });

    it('should bypass lower bound modifications constraints inside moveDown triggers', () => {
      component.moveDown(getMockCategories()[2]); // index 2 est le dernier
      expect(mockCategoryService.saveAll).not.toHaveBeenCalled();
    });

    it('should reorder neighboring positions payloads fields during moveDown operations', () => {
      component.moveDown(getMockCategories()[0]);
      expect(mockCategoryService.saveAll).toHaveBeenCalled();
    });
  });
  describe('Persistance et Traitement Drag & Drop (onDrop)', () => {
    it('should re-index sequence collection parameters and submit structural update via saveAll', async () => {
      await createComponent();

      const mockDragDropEvent: any = {
        previousIndex: 1, // Loisirs
        currentIndex: 0, // Prend la tête
      };

      component.onDrop(mockDragDropEvent);

      expect(mockCategoryService.saveAll).toHaveBeenCalled();
      const calls = mockCategoryService.saveAll.mock.calls[0][0];

      // Loisirs passe en première position
      expect(calls[0].id).toBe(2);
      expect(calls[0].position).toBe(0);

      // Alimentation glisse en seconde position
      expect(calls[1].id).toBe(1);
      expect(calls[1].position).toBe(1);
    });
  });

  describe('Validation des Modales et Flux de Confirmation', () => {
    beforeEach(async () => {
      await createComponent();
    });

    // --- Suppression définitive ou archivage ---
    it('should push success notifications when category handles total deletion', () => {
      const targetCat = getMockCategories()[0];
      component['categoryToDelete'].set(targetCat);

      component['onConfirmDeleteAction']('confirm');

      expect(mockCategoryService.deleteCategory).toHaveBeenCalledWith(1);
      expect(mockToastService.show).toHaveBeenCalledWith(
        'La catégorie a été supprimé avec succès',
        'success',
      );
    });

    it('should notify fallback archiving message if server declines full hard delete', () => {
      mockCategoryService.deleteCategory.mockReturnValue(of(false)); // Simule le fallback d'archivage
      const targetCat = getMockCategories()[0];
      component['categoryToDelete'].set(targetCat);

      component['onConfirmDeleteAction']('confirm');

      expect(mockToastService.show).toHaveBeenCalledWith(
        'Au moins une transaction est rattachée à cette catégorie : elle a été archivée avec succès',
        'success',
      );
    });

    it('should clear internal context indicators without changes when delete is explicitly canceled', () => {
      component['categoryToDelete'].set(getMockCategories()[0]);

      component['onConfirmDeleteAction']('cancel');

      expect(component['categoryToDelete']()).toBeNull();
      expect(mockCategoryService.deleteCategory).not.toHaveBeenCalled();
    });

    // --- Réactivation d'une catégorie archivée ---
    it('should update active flag variables fields and notify success toast on reactivate confirmation', () => {
      const targetCat = getMockCategories()[2]; // Catégorie Archivée
      component['categoryToSetActive'].set(targetCat);

      component['onConfirmSetActiveAction']('confirm');

      expect(mockCategoryService.setCategoryActive).toHaveBeenCalledWith(3, {
        ...targetCat,
        isActive: true,
      });
      expect(mockToastService.show).toHaveBeenCalledWith('La catégorie a été réactivé.', 'success');
    });
  });

  describe('Intégration du Template DOM Final', () => {
    it('should identify disabled records tags and display specific archive styles modifiers', async () => {
      await createComponent();

      const items = el().querySelectorAll('.data-list .data-item');
      expect(items).toHaveLength(3);

      expect(items[0].classList.contains('item-disabled')).toBe(false);
      expect(items[2].classList.contains('item-disabled')).toBe(true);
      expect(text('.data-list .data-item:last-of-type .badge-archived')).toBe('(Archivé)');
    });

    it('should swap loop rendering layouts blocks onto baseline empty notifications when arrays dry up', async () => {
      allCategoriesSignal.set([]);
      await createComponent();

      expect(el().querySelector('.data-item')).toBeNull();
      const emptyLayout = el().querySelector('.data-list p.text-muted');
      expect(emptyLayout).not.toBeNull();
      expect(norm(emptyLayout?.textContent)).toBe('Aucune catégorie disponible pour le moment.');
    });
  });
});
