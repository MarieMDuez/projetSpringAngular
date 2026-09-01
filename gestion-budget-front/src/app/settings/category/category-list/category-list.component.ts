import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category } from '../category.model';
import { CategoryService } from '../category.service';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CategoryFormComponent } from '../category-form/category-form.component';
@Component({
  selector: 'app-category-list',
  imports: [DragDropModule, CategoryFormComponent],
  templateUrl: './category-list.component.html',
  styleUrl: './category-list.component.scss',
})
export class CategoryListComponent implements OnInit {
  protected categoryService = inject(CategoryService);

  protected categories = this.categoryService.allCategories;

  protected errorMessage = signal<string | null>(null);
  protected selectedCategory = signal<Category | null>(null);
  ngOnInit(): void {}

  protected onDelete(category: Category): void {
    if (!category.id) return;

    const confirmDelete = confirm(`Voulez-vous supprimer la catégorie "${category.label}" ?`);
    if (!confirmDelete) return;

    this.categoryService.deleteCategory(category.id).subscribe({
      next: (isHardDeleted) => {
        if (isHardDeleted) {
          console.log('Le compte a été supprimé physiquement de la BDD.');
        } else {
          console.log('Le compte contenant des transactions a été archivé proprement.');
        }
      },
      error: (err) => this.errorMessage.set('Erreur lors de la suppression du compte.'),
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
}
