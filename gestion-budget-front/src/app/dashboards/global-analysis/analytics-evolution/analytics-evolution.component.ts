import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import { AccountService } from '../../../settings/account/account.service';
import { TransactionService } from '../../../transaction/transaction.service';
import { DashboardService } from '../../dashboard.service';
import { AnalyticsEvolutionDto } from './analytics-evolution.model';

@Component({
  selector: 'app-analytics-evolution',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './analytics-evolution.component.html',
  styleUrl: './analytics-evolution.component.scss',
})
export class AnalyticsEvolutionComponent {
  protected dashboardService = inject(DashboardService);
  protected accountService = inject(AccountService);
  protected transactionService = inject(TransactionService);

  protected accounts = this.accountService.activeAccounts;

  protected availableYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 3 + i);
  protected evolutionData = signal<AnalyticsEvolutionDto | null>(null);
  protected chartColors = ['#ef4444', '#10b981'];
  protected xAxisMonths = [
    'Janv',
    'Févr',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juil',
    'Août',
    'Sept',
    'Oct',
    'Nov',
    'Déc',
  ];

  protected globalSeries = computed(() => {
    const data = this.evolutionData()?.globalEvolution || [];
    return [
      {
        name: 'Dépenses (-)',
        data: data.map((item) => item.debits),
      },
      {
        name: 'Revenus (+)',
        data: data.map((item) => item.credits),
      },
    ];
  });

  constructor() {
    effect(() => {
      this.loadEvolutionData();
    });
  }

  private loadEvolutionData(): void {
    this.dashboardService.getEvolution().subscribe({
      next: (data) => this.evolutionData.set(data),
      error: () => console.error("Erreur lors du chargement de l'évolution chronologique"),
    });
  }
}
