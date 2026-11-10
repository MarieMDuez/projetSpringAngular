import { CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { DashboardService } from '../../dashboard.service';
import { Summary } from './summary.model';

@Component({
  selector: 'app-summary',
  imports: [CurrencyPipe],
  templateUrl: './summary.component.html',
  styleUrl: './summary.component.scss',
})
export class SummaryComponent implements OnInit {
  protected dashboardService = inject(DashboardService);
  summaryData = signal<Summary | null>(null);
  isLoading = signal<boolean>(true);

  ngOnInit(): void {
    this.dashboardService.getSummary().subscribe({
      next: (data) => {
        this.summaryData.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Erreur lors du chargement du résumé', err);
        this.isLoading.set(false);
      },
    });
  }
}
