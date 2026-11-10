import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';
import { ProjectedBudgetSettings } from '../projected-budget-settings.model';
import { ProjectedBudgetSettingsService } from '../projected-budget-settings.service';
import { DragDropModule } from '@angular/cdk/drag-drop';
import {
  ProjectedBudgetCategoryType,
  ProjectedBudgetCategoryTypeLabels,
} from '../../../projected_budget/projected-budget-items.model';
import { CategoryService } from '../../category/category.service';

@Component({
  selector: 'app-projected-budget-settings-form',
  imports: [ReactiveFormsModule, DragDropModule],
  templateUrl: './projected-budget-settings-form.component.html',
  styleUrl: './projected-budget-settings-form.component.scss',
})
export class ProjectedBudgetSettingsFormComponent implements OnInit {
  protected projectedBudgetSettingsForm!: FormGroup;
  private readonly myFormBuilder = inject(FormBuilder);
  protected projectedBudgetSettingsService = inject(ProjectedBudgetSettingsService);
  protected categoryService = inject(CategoryService);

  private readonly toastService = inject(ToastService);

  protected projectedBudgetSettings =
    this.projectedBudgetSettingsService.allProjectedBudgetSettings;

  protected readonly projectedBudgetCategoryTypeLabels = ProjectedBudgetCategoryTypeLabels;
  protected readonly projectedBudgetCategoryType = Object.values(ProjectedBudgetCategoryType);
  protected categories = this.categoryService.activeCategories;

  protected readonly projectedBudgetSettingsVide: ProjectedBudgetSettings = {
    type: ProjectedBudgetCategoryType.INCOME,
    category: { id: 0 },
  };

  constructor() {
    effect(() => {
      const settings = this.projectedBudgetSettingsService.editingProjectedBudgetSettings();
      if (settings && this.projectedBudgetSettingsForm) {
        this.onEdit(settings);
      }
    });
  }
  ngOnInit() {
    this.initForm();
  }
  initForm() {
    this.projectedBudgetSettingsForm = this.myFormBuilder.group({
      type: ['', [Validators.required]],
      categoryId: ['', Validators.required],
    });
  }

  protected onSubmit(): void {
    if (this.projectedBudgetSettingsForm.invalid) {
      return;
    }

    const formData = this.projectedBudgetSettingsForm.getRawValue();
    const currentId = this.projectedBudgetSettingsService.editingProjectedBudgetSettings()?.id;
    const projectedBudgetSettings: ProjectedBudgetSettings = {
      type: formData.type,
      category: { id: Number(formData.categoryId) },
    };
    if (currentId != null) {
      projectedBudgetSettings.id = currentId;
      this.projectedBudgetSettingsService
        .updateProjectedBudgetSettings(currentId, projectedBudgetSettings)
        .subscribe({
          next: () => {
            this.toastService.show('mapping modifié avec succès !', 'success');
            this.projectedBudgetSettingsService.editingProjectedBudgetSettings.set(null);
            this.projectedBudgetSettingsForm.reset(this.projectedBudgetSettingsVide);
          },
          error: (err: HttpErrorResponse) => {
            this.toastService.show(
              `Une erreur est survenue lors de la modification du mapping`,
              'error',
            );
          },
        });
    } else {
      const newProjectedBudgetSettings: ProjectedBudgetSettings = {
        type: formData.type,
        category: { id: Number(formData.categoryId) },
      };

      this.projectedBudgetSettingsService
        .createProjectedBudgetSettings(newProjectedBudgetSettings)
        .subscribe({
          next: () => {
            this.toastService.show('Mapping effectué avec succès !', 'success');

            this.projectedBudgetSettingsForm.reset(this.projectedBudgetSettingsVide);
          },
          error: (err: HttpErrorResponse) => {
            this.toastService.show(`Une erreur est survenue lors du mapping des données`, 'error');
          },
        });
    }
  }
  protected onEdit(projectedBudgetSettings: ProjectedBudgetSettings): void {
    this.projectedBudgetSettingsForm.markAsUntouched();

    this.projectedBudgetSettingsForm.patchValue({
      type: projectedBudgetSettings.type,
      categoryId: projectedBudgetSettings.category.id,
    });
  }

  public onCancelEdit(): void {
    this.projectedBudgetSettingsService.editingProjectedBudgetSettings.set(null);
    this.projectedBudgetSettingsForm.reset(this.projectedBudgetSettingsVide);
  }
}
