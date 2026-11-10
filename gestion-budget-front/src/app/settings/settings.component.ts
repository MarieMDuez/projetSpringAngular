import { Component, ViewEncapsulation } from '@angular/core';
import { AccountListComponent } from './account/account-list/account-list.component';
import { CategoryListComponent } from './category/category-list/category-list.component';
import { PaymentMethodListComponent } from './payment-method/payment-method-list/payment-method-list.component';
import { ProjectedBudgetSettingsListComponent } from './projected-budget-settings/projected-budget-settings-list/projected-budget-settings-list.component';

@Component({
  selector: 'app-settings',
  imports: [
    CategoryListComponent,
    PaymentMethodListComponent,
    AccountListComponent,
    ProjectedBudgetSettingsListComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class SettingsComponent {}
