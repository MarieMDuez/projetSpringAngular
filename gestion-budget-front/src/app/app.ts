import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AccountService } from './settings/account/account.service';
import { CategoryService } from './settings/category/category.service';
import { PaymentMethodService } from './settings/payment-method/payment-method.service';
import { TransactionService } from './transaction/transaction.service';
import { concatMap, forkJoin } from 'rxjs'; // <-- N'oublie pas les imports !

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private accountService = inject(AccountService);
  private categoryService = inject(CategoryService);
  private paymentMethodService = inject(PaymentMethodService);
  private transactionService = inject(TransactionService);

  ngOnInit() {
    forkJoin([
      this.accountService.getAccounts(),
      this.categoryService.getCategories(),
      this.paymentMethodService.getPaymentMethods(),
    ])
      .pipe(concatMap(() => this.transactionService.loadAllTransactions()))
      .subscribe({
        next: () => {
          console.log(
            "🎯 Initialisation de l'application réussie : toutes les données sont synchronisées !",
          );
        },
        error: (err) => {
          console.error("Erreur critique lors du chargement initial de l'application", err);
        },
      });
  }
}
