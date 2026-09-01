import { Component, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { CategoryListComponent } from './category/category-list/category-list.component';
import { PaymentMethodListComponent } from './payment-method/payment-method-list/payment-method-list.component';
import { AccountListComponent } from './account/account-list/account-list.component';
import { AccountService } from './account/account.service';

@Component({
  selector: 'app-settings',
  imports: [CategoryListComponent, PaymentMethodListComponent, AccountListComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class SettingsComponent implements OnInit {
  ngOnInit(): void {}
}
