import { Routes } from '@angular/router';
import { SettingsComponent } from './settings/settings.component';
import { TransactionListComponent } from './transaction/transaction-list/transaction-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'accounts', pathMatch: 'full' },

  { path: 'settings', component: SettingsComponent },
  { path: 'transactions', component: TransactionListComponent },
];
