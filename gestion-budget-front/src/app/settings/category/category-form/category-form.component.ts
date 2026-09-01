import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category } from '../category.model';
import { CategoryService } from '../category.service';

@Component({
  selector: 'app-category-form',
  imports: [ReactiveFormsModule],
  templateUrl: './category-form.component.html',
  styleUrl: './category-form.component.scss',
})
export class CategoryFormComponent implements OnInit {
  private myFormBuilder = inject(FormBuilder);
  protected categoryForm!: FormGroup;
  protected errorMessage = signal<string | null>(null);

  protected categoryService = inject(CategoryService);
  protected categories = this.categoryService.allCategories;

  constructor() {
    effect(() => {
      const category = this.categoryService.editingCategory();
      if (category) this.onEdit(category);
    });
  }

  ngOnInit(): void {
    this.initForm();
  }
  initForm() {
    this.categoryForm = this.myFormBuilder.group({
      label: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  protected onSubmit(): void {
    if (this.categoryForm.invalid) {
      return;
    }
    const formData = this.categoryForm.value;
    const currentId = this.categoryService.editingCategory()?.id;
    const cat: Category = {
      label: formData.label,
      isActive: true,
      position: formData.position,
    };
    const categoryVide = { id: null, label: '', isActive: true, position: null };
    if (currentId != null) {
      this.categoryService.updateCategory(currentId, cat).subscribe({
        next: () => {
          this.categoryForm.reset(categoryVide);
          this.categoryService.editingCategory.set(null);
          this.errorMessage.set(null);
        },
      });
    } else {
      cat.position = this.categories().length;
      this.categoryService.createCategory(cat).subscribe({
        next: () => {
          this.categoryForm.reset(categoryVide);
          this.errorMessage.set(null);
        },
        error: (err) => this.errorMessage.set('Erreur lors de la création de la catégorie.'),
      });
    }
  }

  onEdit(category: Category) {
    if (category.id != null) this.categoryService.editingCategory.set(category);

    this.categoryForm.patchValue({
      label: category.label,
      isActive: category.isActive,
    });
  }

  public onCancelEdit(): void {
    const categoryVide = { id: null, label: '', isActive: true, position: null };

    this.categoryService.editingCategory.set(null);
    this.categoryForm.reset(categoryVide);
  }
}
