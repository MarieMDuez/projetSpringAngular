import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { catchError, EMPTY, of, switchMap, tap } from 'rxjs';
import { DashboardService } from '../../dashboards/dashboard.service';
import { AccountService } from '../../settings/account/account.service';
import { ToastService } from '../../shared/ConfirmationToast/toast.service';
import { ModalComponent } from '../../shared/modal/modal.component';
import { ProjectedBudgetService } from '../projected-budget.service';
import { ProjectedBudgetPeriod } from '../projected-budget-period.model';

@Component({
  selector: 'app-projected-budget-filter',
  imports: [ReactiveFormsModule, FormsModule, TitleCasePipe, ModalComponent, DecimalPipe],
  templateUrl: './projected-budget-filter.component.html',
  styleUrl: './projected-budget-filter.component.scss',
})
export class ProjectedBudgetFilterComponent {
  protected dashboardService = inject(DashboardService);
  protected projectedBudgetService = inject(ProjectedBudgetService);
  protected accountService = inject(AccountService);

  private readonly toastService = inject(ToastService);
  private readonly myModal = viewChild.required<ModalComponent>('copyProjectedBudgetModal');

  protected accounts = this.accountService.activeAccounts;
  readonly accountId = computed(() => this.dashboardService.selectedAccountId());
  readonly month = computed(() => this.dashboardService.selectedMonth());
  readonly year = computed(() => this.dashboardService.selectedYear());

  public availablePeriods = signal<ProjectedBudgetPeriod[]>([]);
  public selectedModelPeriodId = signal<number | null>(null);
  public selectPeriodId = signal<number | null>(null);

  protected availableMonths = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(2000, i, 1)),
  }));

  protected availableYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 3 + i);

  constructor() {
    effect(() => {
      const accountId = this.accountId();
      if (accountId)
        this.projectedBudgetService
          .getAvailablePeriodsForDuplication(accountId)
          .subscribe((periods) => this.availablePeriods.set(periods));
    });
  }

  protected onAccountChange(accountId: number | null): void {
    if (this.dashboardService.selectedAccountId() === accountId) {
      return;
    }
    this.dashboardService.selectedAccountId.set(accountId);
  }
  protected onMonthChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.dashboardService.selectedMonth.set(val ? Number(val) : null);
  }

  protected onYearChange(event: Event): void {
    this.dashboardService.selectedYear.set(Number((event.target as HTMLSelectElement).value));
  }
  readonly isFilterValid = computed(() => {
    return this.accountId() !== null && this.month() !== null && this.year() !== null;
  });

  onLoadBudget(cloneFromId?: number, type?: string): void {
    const currentAccount = this.accountId();
    let currentMonth = this.month();
    let currentYear = this.year();
    if (this.selectPeriodId() != null && type != 'init') {
      let period = this.availablePeriods().find((p) => p.id == this.selectPeriodId());
      if (period) {
        currentMonth = period.month;
        currentYear = period.year;
      }
    }

    if (!this.isFilterValid() || currentAccount === null || currentMonth === null) {
      return;
    }

    this.projectedBudgetService.isLoading.set(true);

    this.projectedBudgetService
      .getProjectedBudgetItems(currentAccount, currentMonth, currentYear)
      .pipe(
        switchMap((items) => {
          if (items.length > 0) {
            this.projectedBudgetService.activePeriod.set(items[0].budgetPeriod);

            if (cloneFromId) {
              this.myModal().open();

              this.projectedBudgetService.isLoading.set(false);
              return EMPTY;
            } else {
              this.toastService.show('Budget prévisionnel chargé avec succès', 'success');
            }

            this.projectedBudgetService.toolboxTransactions.set([]);
            return of(items);
          }

          return this.projectedBudgetService
            .createProjectedBudgetPeriod(currentAccount, currentMonth, currentYear, cloneFromId)
            .pipe(
              tap(() =>
                this.toastService.show(
                  cloneFromId
                    ? 'Budget initialisé par copie avec succès'
                    : 'Nouveau budget initialisé',
                  'success',
                ),
              ),
            );
        }),
        catchError((error) => {
          if (error.status === 409) {
            this.projectedBudgetService.activePeriod.set(error.error.period);
            this.projectedBudgetService.toolboxTransactions.set([]);

            if (cloneFromId) {
              return this.projectedBudgetService.executeDuplicationItems(
                cloneFromId,
                error.error.period.id,
              );
            } else {
              return this.projectedBudgetService.fetchSuggestedTransactions(
                currentAccount,
                currentMonth,
                currentYear,
              );
            }
          }

          this.toastService.show('Erreur lors du traitement du budget', 'error');
          return of(null);
        }),
        tap(() => this.projectedBudgetService.isLoading.set(false)),
      )
      .subscribe();
  }

  executeDuplicationItems(action: 'confirm' | 'cancel'): void {
    if (action !== 'confirm') {
      return;
    }
    const cloneFromId = this.selectedModelPeriodId();
    const periodCible = this.projectedBudgetService.activePeriod();

    if (cloneFromId === null || !periodCible?.id) {
      this.toastService.show('Impossible de dupliquer : informations manquantes.', 'error');
      return;
    }

    this.projectedBudgetService.executeDuplicationItems(cloneFromId, periodCible.id).subscribe({
      next: (updatedItems) => {
        this.toastService.show('Budget écrasé et dupliqué avec succès !', 'success');
      },
      error: () => {
        this.toastService.show('Erreur lors de l’écrasement du budget.', 'error');
      },
    });
  }
}
