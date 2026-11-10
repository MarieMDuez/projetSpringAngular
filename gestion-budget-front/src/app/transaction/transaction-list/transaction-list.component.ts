import { Component, ViewEncapsulation } from '@angular/core';

import { BalancesComponent } from '../../dashboards/balances/balances.component';
import { TransactionsFilters } from '../transactions-filters/transactions-filters';
import { TransactionFormComponent } from './transaction-form/transaction-form.component';
import { TransactionTableComponent } from './transaction-table/transaction-table.component';

@Component({
  selector: 'app-transaction-list',
  imports: [
    TransactionTableComponent,
    TransactionsFilters,
    TransactionFormComponent,
    BalancesComponent,
  ],
  templateUrl: './transaction-list.component.html',
  styleUrl: './transaction-list.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class TransactionListComponent {}
