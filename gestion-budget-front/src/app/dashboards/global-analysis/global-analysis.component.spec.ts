import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, input, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Account, AccountType, AccountTypeLabels } from '../../settings/account/account.model';
import { AccountService } from '../../settings/account/account.service';
import { TransactionService } from '../../transaction/transaction.service';
import { BalancesComponent } from '../balances/balances.component';
import { DashboardService } from '../dashboard.service';
import { AnalyticsEvolutionComponent } from './analytics-evolution/analytics-evolution.component';
import { AnalyticsDashboardComponent } from './analytics/analytics.component';
import { GlobalAnalysisComponent } from './global-analysis.component';
import { MatrixMonthlyComponent } from './matrix-monthly/matrix-monthly.component';
import { MatrixDashboardComponent } from './matrix/matrix-dashboard.component';
import { StartEndBalancesComponent } from './start-end-balances/start-end-balances.component';

// --- Stubs des composants enfants : on teste le parent, pas ses enfants ---
@Component({ selector: 'app-balances', template: '' })
class StubBalancesComponent {
  readonly showAccount = input<boolean>(true);
}

@Component({ selector: 'app-start-end-balances', template: '' })
class StubStartEndBalancesComponent {}

@Component({ selector: 'app-analytics', template: '' })
class StubAnalyticsComponent {}

@Component({ selector: 'app-matrix-monthly', template: '' })
class StubMatrixMonthlyComponent {}

@Component({ selector: 'app-analytics-evolution', template: '' })
class StubAnalyticsEvolutionComponent {}

@Component({ selector: 'app-matrix-dashboard', template: '' })
class StubMatrixDashboardComponent {}

type SectionKey = Parameters<GlobalAnalysisComponent['toggleSection']>[0];
type FlagName =
  | 'isBalanceExpanded'
  | 'isStartEndBalancesExpanded'
  | 'isAnalyticsExpanded'
  | 'isMatrixMonthlyExpanded'
  | 'isEvolutionExpanded'
  | 'isMatrixExpanded';

interface SectionCase {
  key: SectionKey;
  id: string;
  child: string;
  flag: FlagName;
  title: string;
}

describe('GlobalAnalysisComponent', () => {
  let fixture: ComponentFixture<GlobalAnalysisComponent>;
  let component: GlobalAnalysisComponent;
  let httpMock: HttpTestingController;
  let dashboardService: DashboardService;
  let accountsSignal: WritableSignal<Account[]>;

  const currentYear = new Date().getFullYear();

  const activeAccounts: Account[] = [
    {
      id: 1,
      label: 'Compte Courant',
      type: AccountType.COURANT,
      initialBalance: 1000,
      isActive: true,
      isDefault: true,
      position: 0,
    },
    {
      id: 2,
      label: 'Livret A',
      type: AccountType.EPARGNE,
      initialBalance: 5000,
      isActive: true,
      isDefault: false,
      position: 1,
    },
  ];

  const sections: SectionCase[] = [
    {
      key: 'balance',
      id: 'balance-section',
      child: 'app-balances',
      flag: 'isBalanceExpanded',
      title: 'Soldes actuels',
    },
    {
      key: 'start-end-balances',
      id: 'start-end-balances-section',
      child: 'app-start-end-balances',
      flag: 'isStartEndBalancesExpanded',
      title: 'Soldes sur la période',
    },
    {
      key: 'analytics',
      id: 'analytics-section',
      child: 'app-analytics',
      flag: 'isAnalyticsExpanded',
      title: 'Répartition & Analyse mensuelle',
    },
    {
      key: 'matrix-monthly',
      id: 'matrix-monthly-section',
      child: 'app-matrix-monthly',
      flag: 'isMatrixMonthlyExpanded',
      title: 'Répartition par semaine',
    },
    {
      key: 'evolution',
      id: 'evolution-section',
      child: 'app-analytics-evolution',
      flag: 'isEvolutionExpanded',
      title: 'Évolution Annuelle',
    },
    {
      key: 'matrix',
      id: 'matrix-section',
      child: 'app-matrix-dashboard',
      flag: 'isMatrixExpanded',
      title: 'Tableau croisé annuel',
    },
  ];

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const norm = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();
  const text = (selector: string): string => norm(el().querySelector(selector)?.textContent);
  const select = (id: string): HTMLSelectElement =>
    el().querySelector<HTMLSelectElement>(`#${id}`)!;
  const optionTexts = (id: string): string[] =>
    Array.from(select(id).options).map((o) => norm(o.textContent));
  const choose = (id: string, index: number): void => {
    const element = select(id);
    element.selectedIndex = index;
    element.dispatchEvent(new Event('change'));
  };
  const monthEvent = (value: string) => ({ target: { value } }) as unknown as Event;

  /** Crée le composant et laisse ngModel (asynchrone) se stabiliser. */
  const createComponent = async (): Promise<void> => {
    fixture = TestBed.createComponent(GlobalAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    accountsSignal = signal<Account[]>(structuredClone(activeAccounts));

    const mockAccountService: Partial<AccountService> = { activeAccounts: accountsSignal };

    await TestBed.configureTestingModule({
      imports: [GlobalAnalysisComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AccountService, useValue: mockAccountService },
        { provide: TransactionService, useValue: {} },
      ],
    })
      .overrideComponent(GlobalAnalysisComponent, {
        remove: {
          imports: [
            BalancesComponent,
            StartEndBalancesComponent,
            AnalyticsDashboardComponent,
            MatrixMonthlyComponent,
            AnalyticsEvolutionComponent,
            MatrixDashboardComponent,
          ],
        },
        add: {
          imports: [
            StubBalancesComponent,
            StubStartEndBalancesComponent,
            StubAnalyticsComponent,
            StubMatrixMonthlyComponent,
            StubAnalyticsEvolutionComponent,
            StubMatrixDashboardComponent,
          ],
        },
      })
      .compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    dashboardService = TestBed.inject(DashboardService);

    // Filtres déterministes
    dashboardService.selectedYear.set(currentYear);
    dashboardService.selectedMonth.set(9);
    dashboardService.selectedAccountId.set(null);
    dashboardService.accountType.set(null);
    dashboardService.isCheckedFilter.set(false);
  });

  afterEach(() => {
    // Les enfants sont stubbés : aucune requête ne doit partir depuis ce composant
    httpMock.verify();
  });

  it('should create', async () => {
    await createComponent();

    expect(component).toBeTruthy();
  });

  describe('sections', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should display every section expanded by default with its title and child component', () => {
      for (const section of sections) {
        expect(text(`#${section.id} .section-title`)).toBe(section.title);
        expect(text(`#${section.id} .section-chevron`)).toBe('▼');
        expect(el().querySelector(`#${section.id} ${section.child}`)).not.toBeNull();
      }
    });

    it('should hide the balances account selector of the child component', () => {
      const balances = fixture.debugElement.query(By.directive(StubBalancesComponent));

      expect(balances.componentInstance.showAccount()).toBe(false);
    });

    it.each(sections)(
      'should collapse then re-expand "$title" when its header is clicked',
      ({ id, child }) => {
        const trigger = el().querySelector<HTMLElement>(`#${id} .section-trigger`)!;

        trigger.click();
        fixture.detectChanges();
        expect(el().querySelector(`#${id} ${child}`)).toBeNull();
        expect(text(`#${id} .section-chevron`)).toBe('►');

        trigger.click();
        fixture.detectChanges();
        expect(el().querySelector(`#${id} ${child}`)).not.toBeNull();
        expect(text(`#${id} .section-chevron`)).toBe('▼');
      },
    );

    it.each(sections)('toggleSection("$key") should only flip its own flag', ({ key, flag }) => {
      component.toggleSection(key);

      for (const other of sections) {
        expect(component[other.flag]()).toBe(other.flag !== flag);
      }

      component.toggleSection(key);

      for (const other of sections) {
        expect(component[other.flag]()).toBe(true);
      }
    });

    it('should collapse then expand every section with the "all" button', () => {
      const button = el().querySelector<HTMLElement>('.arriane .btn-matrix-toggle')!;
      expect(norm(button.textContent)).toBe('Tout replier');

      button.click();
      fixture.detectChanges();

      expect(component.isAllExpand()).toBe(false);
      expect(norm(button.textContent)).toBe('Tout déplier');
      for (const section of sections) {
        expect(el().querySelector(`#${section.id} ${section.child}`)).toBeNull();
        expect(component[section.flag]()).toBe(false);
      }

      button.click();
      fixture.detectChanges();

      expect(component.isAllExpand()).toBe(true);
      expect(norm(button.textContent)).toBe('Tout replier');
      for (const section of sections) {
        expect(el().querySelector(`#${section.id} ${section.child}`)).not.toBeNull();
      }
    });
  });

  describe('filters panel', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should be displayed by default', () => {
      expect(text('.cockpit-filter-area .btn-matrix-toggle')).toBe('Cacher les filtres');
      expect(el().querySelector('.filter-form')).not.toBeNull();
      expect(el().querySelector('.arriane')).not.toBeNull();
    });

    it('should hide and show the filters with the toggle button', () => {
      const button = el().querySelector<HTMLElement>('.cockpit-filter-area .btn-matrix-toggle')!;

      button.click();
      fixture.detectChanges();

      expect(component.isFilterHide()).toBe(true);
      expect(norm(button.textContent)).toBe('Afficher les filtres');
      expect(el().querySelector('.filter-form')).toBeNull();
      expect(el().querySelector('.arriane')).toBeNull();

      button.click();
      fixture.detectChanges();

      expect(component.isFilterHide()).toBe(false);
      expect(el().querySelector('.filter-form')).not.toBeNull();
    });

    it('should keep the sections visible when the filters are hidden', () => {
      component.toggleHideFilter();
      fixture.detectChanges();

      expect(el().querySelectorAll('.cockpit-section-block')).toHaveLength(sections.length);
    });

    it('should display one anchor link per main section', () => {
      const links = Array.from(el().querySelectorAll<HTMLAnchorElement>('.anchor-link'));

      expect(links.map((a) => norm(a.textContent))).toEqual([
        'Soldes',
        'Analyse mensuelle',
        'Analyse par semaine',
        'Évolution annuelle',
        "Tableau croisé sur l'année",
      ]);
      expect(links.map((a) => a.getAttribute('href')?.split('#')[1])).toEqual([
        'balance-section',
        'analytics-section',
        'matrix-monthly-section',
        'evolution-section',
        'matrix-section',
      ]);
    });
  });

  describe('account filter', () => {
    it('should list "all accounts" first, then the active accounts', async () => {
      await createComponent();

      expect(optionTexts('filter-account')).toEqual([
        '— Tous les comptes —',
        'Compte Courant',
        'Livret A',
      ]);
    });

    it('should only offer "all accounts" when there is no active account', async () => {
      accountsSignal.set([]);
      await createComponent();

      expect(optionTexts('filter-account')).toEqual(['— Tous les comptes —']);
    });

    it('should preselect "all accounts" by default', async () => {
      await createComponent();
      expect(dashboardService.selectedAccountId()).toBeNull();
    });

    it('should preselect the account stored in the dashboard service', async () => {
      dashboardService.selectedAccountId.set(2);
      await createComponent();
      expect(dashboardService.selectedAccountId()).toBe(2);
    });

    it('should update the selected account when the user picks one', async () => {
      await createComponent();

      choose('filter-account', 1);

      expect(dashboardService.selectedAccountId()).toBe(1);
    });

    it('should go back to "all accounts" when the user picks the first option', async () => {
      dashboardService.selectedAccountId.set(2);
      await createComponent();

      choose('filter-account', 0);

      expect(dashboardService.selectedAccountId()).toBeNull();
    });

    it('should reset the account type when the user picks an account', async () => {
      dashboardService.accountType.set(AccountType.COURANT);
      await createComponent();

      choose('filter-account', 1);

      expect(dashboardService.selectedAccountId()).toBe(1);
      expect(dashboardService.accountType()).toBeNull();
    });
  });

  describe('account type filter', () => {
    it('should list "all types" first, then every account type with its label', async () => {
      await createComponent();

      expect(optionTexts('accountTypeFilter')).toEqual([
        'Tous les types',
        AccountTypeLabels[AccountType.COURANT],
        AccountTypeLabels[AccountType.EPARGNE],
      ]);
    });

    it('should preselect "all types" by default', async () => {
      await createComponent();

      expect(select('accountTypeFilter').selectedIndex).toBe(0);
    });

    it('should preselect the account type stored in the dashboard service', async () => {
      dashboardService.accountType.set(AccountType.EPARGNE);
      await createComponent();

      expect(select('accountTypeFilter').value).toBe(AccountType.EPARGNE);
    });

    it('should update the account type when the user picks one', async () => {
      await createComponent();

      choose('accountTypeFilter', 2);

      expect(dashboardService.accountType()).toBe(AccountType.EPARGNE);
    });

    it('should clear the selected account when the user picks a type', async () => {
      dashboardService.selectedAccountId.set(2);
      await createComponent();

      choose('accountTypeFilter', 1);

      expect(dashboardService.accountType()).toBe(AccountType.COURANT);
      expect(dashboardService.selectedAccountId()).toBeNull();
    });
  });

  describe('month filter', () => {
    it('should list "whole year" first, then the 12 months capitalised', async () => {
      await createComponent();

      const options = optionTexts('filter-month');
      expect(options).toHaveLength(13);
      expect(options[0]).toBe("— Toute l'année —");
      expect(options[1]).toBe('Janvier');
      expect(options[2]).toBe('Février');
      expect(options[12]).toBe('Décembre');
    });

    it('should preselect the month stored in the dashboard service', async () => {
      await createComponent();

      expect(select('filter-month').selectedIndex).toBe(9);
    });

    it('should update the selected month when the user picks one', async () => {
      await createComponent();

      const element = select('filter-month');
      element.value = '5';
      element.dispatchEvent(new Event('change'));

      expect(dashboardService.selectedMonth()).toBe(5);
    });

    it('should set the month to null when the user picks "whole year"', async () => {
      await createComponent();

      choose('filter-month', 0);

      expect(dashboardService.selectedMonth()).toBeNull();
    });
  });

  describe('year filter', () => {
    it('should offer five years, from three years ago to next year', async () => {
      await createComponent();

      expect(optionTexts('filter-year')).toEqual([
        String(currentYear - 3),
        String(currentYear - 2),
        String(currentYear - 1),
        String(currentYear),
        String(currentYear + 1),
      ]);
    });

    it('should preselect the year stored in the dashboard service', async () => {
      await createComponent();

      expect(select('filter-year').selectedIndex).toBe(3);
    });

    it('should update the selected year when the user picks one', async () => {
      await createComponent();

      const element = select('filter-year');
      element.value = String(currentYear + 1);
      element.dispatchEvent(new Event('change'));

      expect(dashboardService.selectedYear()).toBe(currentYear + 1);
    });
  });

  describe('checked-only filter', () => {
    it('should be unchecked by default', async () => {
      await createComponent();

      const checkbox = el().querySelector<HTMLInputElement>('.filter-checkbox input')!;
      expect(checkbox.checked).toBe(false);
      expect(text('.filter-checkbox')).toBe('Uniquement les transactions pointées');
    });

    it('should reflect the value stored in the dashboard service', async () => {
      dashboardService.isCheckedFilter.set(true);
      await createComponent();

      const checkbox = el().querySelector<HTMLInputElement>('.filter-checkbox input')!;
      expect(checkbox.checked).toBe(true);
    });

    it('should update the dashboard service when the user ticks and unticks it', async () => {
      await createComponent();
      const checkbox = el().querySelector<HTMLInputElement>('.filter-checkbox input')!;

      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      expect(dashboardService.isCheckedFilter()).toBe(true);

      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change'));
      expect(dashboardService.isCheckedFilter()).toBe(false);
    });
  });

  describe('handlers', () => {
    beforeEach(async () => {
      await createComponent();
    });

    describe('onAccountChange()', () => {
      it('should select the account and reset the account type', () => {
        dashboardService.accountType.set(AccountType.COURANT);

        component['onAccountChange'](1);

        expect(dashboardService.selectedAccountId()).toBe(1);
        expect(dashboardService.accountType()).toBeNull();
      });

      it('should clear the account without touching the account type when given null', () => {
        dashboardService.selectedAccountId.set(1);
        dashboardService.accountType.set(AccountType.EPARGNE);

        component['onAccountChange'](null);

        expect(dashboardService.selectedAccountId()).toBeNull();
        expect(dashboardService.accountType()).toBe(AccountType.EPARGNE);
      });

      it('should do nothing when the account is already selected', () => {
        dashboardService.selectedAccountId.set(2);
        dashboardService.accountType.set(AccountType.EPARGNE);

        component['onAccountChange'](2);

        expect(dashboardService.selectedAccountId()).toBe(2);
        expect(dashboardService.accountType()).toBe(AccountType.EPARGNE);
      });
    });

    describe('onTypeChange()', () => {
      it('should set the account type and clear the selected account', () => {
        dashboardService.selectedAccountId.set(2);

        component['onTypeChange'](AccountType.EPARGNE);

        expect(dashboardService.accountType()).toBe(AccountType.EPARGNE);
        expect(dashboardService.selectedAccountId()).toBeNull();
      });

      it('should clear the account type without touching the selected account when given null', () => {
        dashboardService.selectedAccountId.set(2);
        dashboardService.accountType.set(AccountType.EPARGNE);

        component['onTypeChange'](null);

        expect(dashboardService.accountType()).toBeNull();
        expect(dashboardService.selectedAccountId()).toBe(2);
      });
    });

    describe('onMonthChange()', () => {
      it.each([
        { value: '5', expected: 5 },
        { value: '12', expected: 12 },
        { value: '', expected: null },
      ])('should convert "$value" to $expected', ({ value, expected }) => {
        component['onMonthChange'](monthEvent(value));

        expect(dashboardService.selectedMonth()).toBe(expected);
      });
    });

    describe('onYearChange()', () => {
      it('should convert the selected value to a number', () => {
        component['onYearChange'](monthEvent('2027'));

        expect(dashboardService.selectedYear()).toBe(2027);
      });
    });
  });

  describe('robustesse et cas aux limites', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('should handle undefined or malformed input without crashing inside handlers', () => {
      expect(() => component['onAccountChange'](undefined as any)).not.toThrow();
      expect(() => component['onTypeChange'](undefined as any)).not.toThrow();
    });

    it('should remain fully functional when the filter DOM layout is hidden', () => {
      component.isFilterHide.set(true);
      fixture.detectChanges();

      expect(() => component.toggleHideFilter()).not.toThrow();
      expect(component.isFilterHide()).toBe(false);
    });

    it('should generate bounds accurately from current year minus 3 up to plus 1', () => {
      const generatedYears = component['availableYears'];
      expect(generatedYears[0]).toBe(currentYear - 3);
      expect(generatedYears[generatedYears.length - 1]).toBe(currentYear + 1);
    });
  });
});
