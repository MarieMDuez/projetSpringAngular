import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AccountService } from './settings/account/account.service';
import { CategoryService } from './settings/category/category.service';
import { PaymentMethodService } from './settings/payment-method/payment-method.service';
import { TransactionService } from './transaction/transaction.service';
import { concatMap, forkJoin } from 'rxjs';
import { ToastContainerComponent } from './shared/ConfirmationToast/toast-container.component';
import { ToastService } from './shared/ConfirmationToast/toast.service';
import { ThemeService } from './theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected themeService = inject(ThemeService);

  private readonly accountService = inject(AccountService);
  private readonly categoryService = inject(CategoryService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly transactionService = inject(TransactionService);
  protected toastService = inject(ToastService);

  public isMenuOpen = signal<boolean>(false);

  public toggleMenu(): void {
    this.isMenuOpen.update((open) => !open);
  }

  public closeMenu(): void {
    this.isMenuOpen.set(false);
  }

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
            "Initialisation de l'application réussie : toutes les données sont synchronisées !",
          );
        },
        error: (err) => {
          console.error("Erreur critique lors du chargement initial de l'application", err);
        },
      });
  }
}
