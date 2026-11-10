import { Component, effect, inject, signal } from '@angular/core';
import { DashboardService } from '../../dashboard.service';
import { StartEndBalanceDto } from './start-end-balances.model';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-start-end-balances',
  imports: [DecimalPipe],
  templateUrl: './start-end-balances.component.html',
  styleUrl: './start-end-balances.component.scss',
})
export class StartEndBalancesComponent {
  private readonly dashboardService = inject(DashboardService);
  protected startEndBalances = signal<StartEndBalanceDto | null>(null);

  constructor() {
    effect(() => {
      this.loadStartEndBalances();
    });
  }

  private loadStartEndBalances(): void {
    this.dashboardService.getStartEndBalances().subscribe({
      next: (data) => {
        this.startEndBalances.set(data);
      },
      error: () => {},
    });
  }
}
