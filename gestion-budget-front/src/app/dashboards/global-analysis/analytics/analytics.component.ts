import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApexOptions, NgApexchartsModule } from 'ng-apexcharts';
import { TransactionService } from '../../../transaction/transaction.service';
import { DashboardService } from '../../dashboard.service';
import { AnalyticsDashboardDto } from './analytics-dashboard.model';

@Component({
  selector: 'app-analytics',
  imports: [CommonModule, NgApexchartsModule, FormsModule],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
})
export class AnalyticsDashboardComponent {
  protected dashboardService = inject(DashboardService);
  protected transactionService = inject(TransactionService);

  protected isLoading = signal<boolean>(false);

  protected analyticsData = signal<AnalyticsDashboardDto | null>(null);

  protected categoryDebits = computed(
    () => this.analyticsData()?.categoryDistribution.filter((item) => item.type === 'DEBIT') || [],
  );
  protected categoryCredits = computed(
    () => this.analyticsData()?.categoryDistribution.filter((item) => item.type === 'CREDIT') || [],
  );
  protected paymentDebits = computed(
    () => this.analyticsData()?.paymentDistribution.filter((item) => item.type === 'DEBIT') || [],
  );
  protected paymentCredits = computed(
    () => this.analyticsData()?.paymentDistribution.filter((item) => item.type === 'CREDIT') || [],
  );

  protected categoryDebitsSeries = computed(() => this.categoryDebits().map((item) => item.total));
  protected categoryDebitsLabels = computed(() => this.categoryDebits().map((item) => item.label));
  protected paymentDebitsSeries = computed(() => this.paymentDebits().map((item) => item.total));
  protected paymentDebitsLabels = computed(() => this.paymentDebits().map((item) => item.label));

  protected categoryCreditsSeries = computed(() =>
    this.categoryCredits().map((item) => item.total),
  );
  protected categoryCreditsLabels = computed(() =>
    this.categoryCredits().map((item) => item.label),
  );
  protected paymentCreditsSeries = computed(() => this.paymentCredits().map((item) => item.total));
  protected paymentCreditsLabels = computed(() => this.paymentCredits().map((item) => item.label));

  protected categoryDebitsTotal = computed(() =>
    this.categoryDebits().reduce((sum, item) => sum + item.total, 0),
  );
  protected categoryCreditsTotal = computed(() =>
    this.categoryCredits().reduce((sum, item) => sum + item.total, 0),
  );
  protected paymentDebitsTotal = computed(() =>
    this.paymentDebits().reduce((sum, item) => sum + item.total, 0),
  );
  protected paymentCreditsTotal = computed(() =>
    this.paymentCredits().reduce((sum, item) => sum + item.total, 0),
  );

  protected categoryDebitsOptions = computed(() =>
    this.buildChartOptions(
      this.categoryDebitsSeries(),
      this.categoryDebitsLabels(),
      this.categoryDebitsTotal(),
      'Dépenses',
    ),
  );
  protected categoryCreditsOptions = computed(() =>
    this.buildChartOptions(
      this.categoryCreditsSeries(),
      this.categoryCreditsLabels(),
      this.categoryCreditsTotal(),
      'Revenus',
    ),
  );
  protected paymentDebitsOptions = computed(() =>
    this.buildChartOptions(
      this.paymentDebitsSeries(),
      this.paymentDebitsLabels(),
      this.paymentDebitsTotal(),
      'Dépenses',
    ),
  );
  protected paymentCreditsOptions = computed(() =>
    this.buildChartOptions(
      this.paymentCreditsSeries(),
      this.paymentCreditsLabels(),
      this.paymentCreditsTotal(),
      'Revenus',
    ),
  );

  private buildChartOptions(
    series: number[],
    labels: string[],
    total: number,
    labelCenter: string,
  ): ApexOptions {
    return {
      series,
      labels,
      chart: { type: 'donut', height: 350 },
      colors: this.chartColors,
      stroke: { show: true, width: 2, colors: ['#ffffff'] },
      plotOptions: {
        pie: {
          donut: {
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '15px',
                fontFamily: 'Helvetica, Arial, sans-serif',
                fontWeight: 600,
                color: '#64748b',
                offsetY: -10,
              },
              value: {
                show: true,
                fontSize: '20px',
                fontFamily: 'Helvetica, Arial, sans-serif',
                fontWeight: 700,
                color: '#0f172a',
                formatter: (val: string) => this.formatCurrency(Number.parseFloat(val)),
              },
              total: {
                show: true,
                showAlways: true,
                label: labelCenter,
                fontSize: '15px',
                fontWeight: 600,
                color: '#64748b',
                formatter: () => this.formatCurrency(total),
              },
            },
          },
        },
      },
      legend: { position: 'bottom', horizontalAlign: 'center' },
    };
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  }

  protected chartColors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#f97316',
    '#14b8a6',
    '#64748b',
    '#a855f7',
    '#84cc16',
    '#eab308',
    '#d946ef',
    '#059669',
    '#2563eb',
    '#dc2626',
    '#9333ea',
    '#4f46e5',
    '#0891b2',
    '#b45309',
    '#047857',
    '#6d28d9',
    '#be185d',
    '#1e293b',
  ];

  constructor() {
    effect(() => {
      this.loadDashboardData();
    });
  }

  private loadDashboardData(): void {
    this.isLoading.set(true);
    this.dashboardService.getAnalytics().subscribe({
      next: (data) => {
        this.analyticsData.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        console.error("Erreur lors du chargement des statistiques de l'analytics");
        this.isLoading.set(false);
      },
    });
  }
}
