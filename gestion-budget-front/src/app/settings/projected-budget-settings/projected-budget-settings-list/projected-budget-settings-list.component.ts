import { Component, inject, OnInit, signal } from '@angular/core';
import { ProjectedBudgetCategoryTypeLabels } from '../../../projected_budget/projected-budget-items.model';
import { ToastService } from '../../../shared/ConfirmationToast/toast.service';
import { OpenDialogDirective } from '../../../shared/directives/open-dialog.directive';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { FindByIdPipe } from '../../../shared/pipes/find-by-id-pipe';
import { CategoryService } from '../../category/category.service';
import { ProjectedBudgetSettingsFormComponent } from '../projected-budget-settings-form/projected-budget-settings-form.component';
import { ProjectedBudgetSettings } from '../projected-budget-settings.model';
import { ProjectedBudgetSettingsService } from '../projected-budget-settings.service';

@Component({
  selector: 'app-projected-budget-settings-list',
  imports: [
    ProjectedBudgetSettingsFormComponent,
    ModalComponent,
    OpenDialogDirective,
    FindByIdPipe,
  ],
  templateUrl: './projected-budget-settings-list.component.html',
  styleUrl: './projected-budget-settings-list.component.scss',
})
export class ProjectedBudgetSettingsListComponent implements OnInit {
  protected projectedBudgetSettingsService = inject(ProjectedBudgetSettingsService);

  private readonly toastService = inject(ToastService);
  protected categoryService = inject(CategoryService);
  protected projectedBudgetSettings =
    this.projectedBudgetSettingsService.allProjectedBudgetSettings;

  protected projectedBudgetSettingsToDelete = signal<ProjectedBudgetSettings | null>(null);
  protected readonly projectedBudgetCategoryTypeLabels = ProjectedBudgetCategoryTypeLabels;

  ngOnInit(): void {
    this.projectedBudgetSettingsService.getProjectedBudgetSettings().subscribe();
  }

  protected onEdit(projectedBudgetSettings: ProjectedBudgetSettings): void {
    if (projectedBudgetSettings.id != null)
      this.projectedBudgetSettingsService.editingProjectedBudgetSettings.set(
        projectedBudgetSettings,
      );
    /*Pour remonter au formulaire qui s'auto-rempli*/
    const formElement = document.getElementById('editForm');
    if (formElement) {
      formElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }

  protected onDelete(projectedBudgetSettings: ProjectedBudgetSettings): void {
    if (!projectedBudgetSettings.id) return;

    this.projectedBudgetSettingsService
      .deleteProjectedBudgetSettings(projectedBudgetSettings.id)
      .subscribe({
        next: () => {
          this.toastService.show('Le mapping a été supprimé avec succès', 'success');
        },
        error: (err) =>
          this.toastService.show('Une erreur est survenue lors de la suppression', 'error'),
      });
  }

  protected onConfirmDeleteAction(action: 'confirm' | 'cancel'): void {
    const projectedBudgetSettings = this.projectedBudgetSettingsToDelete();

    if (action === 'confirm' && projectedBudgetSettings) {
      this.onDelete(projectedBudgetSettings);
    } else {
      this.projectedBudgetSettingsToDelete.set(null);
    }
  }
}
