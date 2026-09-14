import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';
import { OpenDialogDirective } from '../../../shared/directives/open-dialog.directive';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { CategoryFormComponent } from '../category-form/category-form.component';
import { Category } from '../category.model';
import { CategoryService } from '../category.service';
@Component({
  selector: 'app-category-list',
  imports: [DragDropModule, CategoryFormComponent, OpenDialogDirective, ModalComponent],
  templateUrl: './category-list.component.html',
  styleUrl: './category-list.component.scss',
})
export class CategoryListComponent implements OnInit {
  protected categoryService = inject(CategoryService);
  private toastService = inject(ToastService);

  protected categories = this.categoryService.allCategories;

  protected selectedCategory = signal<Category | null>(null);
  protected categoryToDelete = signal<Category | null>(null);
  protected categoryToSetActive = signal<Category | null>(null);

  ngOnInit(): void {}

  protected onDelete(category: Category): void {
    if (!category.id) return;

    this.categoryService.deleteCategory(category.id).subscribe({
      next: (isHardDeleted) => {
        if (isHardDeleted) {
          this.toastService.show('La catégorie a été supprimé avec succès', 'success');
        } else {
          this.toastService.show(
            'Au moins une transaction est rattachée à cette catégorie : elle a été archivée avec succès',
            'success',
          );
        }
      },
      error: (err) =>
        this.toastService.show('Une erreur est survenue lors de la suppression', 'error'),
    });
  }

  onDrop(event: CdkDragDrop<Category[]>): void {
    const listeModifiable = [...this.categories()];

    moveItemInArray(listeModifiable, event.previousIndex, event.currentIndex);

    const listeMiseAJour = listeModifiable.map((category, index) => ({
      ...category,
      position: index,
    }));
    this.categoryService.saveAll(listeMiseAJour).subscribe();
  }

  onEdit(category: Category) {
    if (category.id) this.categoryService.editingCategory.set(category);

    /*Pour remonter au formulaire qui s'auto-rempli*/
    const formElement = document.getElementById('editForm');
    if (formElement) {
      formElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }

  protected onConfirmDeleteAction(action: 'confirm' | 'cancel'): void {
    const category = this.categoryToDelete();

    if (action === 'confirm' && category) {
      this.onDelete(category);
    } else {
      this.categoryToDelete.set(null);
    }
  }

  protected onSetActiveCategory(category: Category): void {
    if (!category.id) return;

    const updatedCategory: Category = { ...category, isActive: true };

    this.categoryService.setCategoryActive(category.id, updatedCategory).subscribe({
      next: () => {
        this.toastService.show('La catégorie a été réactivé.', 'success');
      },
      error: (err) =>
        this.toastService.show('Erreur lors de la réactivation de la catégorie.', 'error'),
    });
  }

  protected onConfirmSetActiveAction(action: 'confirm' | 'cancel'): void {
    const category = this.categoryToSetActive();

    if (action === 'confirm' && category) {
      this.onSetActiveCategory(category);
    } else {
      this.categoryToSetActive.set(null);
    }
  }
}
