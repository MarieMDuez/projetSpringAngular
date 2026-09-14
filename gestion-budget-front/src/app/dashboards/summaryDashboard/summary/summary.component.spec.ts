import { ComponentFixture, TestBed } from '@angular/core/testing';

import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { By } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';
import { MockInstance } from 'vitest';
import { DashboardService } from '../../dashboard.service';
import { SummaryComponent } from './summary.component';
import { summaryDto } from './summary.model';

registerLocaleData(localeFr);

describe('SummaryComponent', () => {
  let component: SummaryComponent;
  let fixture: ComponentFixture<SummaryComponent>;
  let mockDashboardService: {
    getSummary: MockInstance<() => Observable<summaryDto>>;
  };

  const fakeSummaryData: summaryDto = {
    currentGlobalBalance: 1300.0,
    projectedGlobalBalance: 1600.0,
    accountsDetails: [
      {
        id: 1,
        initialBalance: 0,
        label: 'Compte Principal LCL',
        currentBalance: 800.0,
        projectedBalance: 1100.0,
      },
      {
        id: 2,
        initialBalance: 0,
        label: 'Livret A',
        currentBalance: 500.0,
        projectedBalance: 500.0,
      },
    ],
  };

  beforeEach(async () => {
    mockDashboardService = {
      getSummary: vi.fn().mockReturnValue(
        of({
          currentGlobalBalance: 0,
          projectedGlobalBalance: 0,
          accountsDetails: [],
        } as summaryDto),
      ),
    };
    mockDashboardService.getSummary.mockReturnValue(of(fakeSummaryData));

    await TestBed.configureTestingModule({
      imports: [SummaryComponent],
      providers: [{ provide: DashboardService, useValue: mockDashboardService }],
    }).compileComponents();

    fixture = TestBed.createComponent(SummaryComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  test('should create the component and call the service on init', () => {
    expect(component).toBeTruthy();
    expect(mockDashboardService.getSummary).toHaveBeenCalledTimes(1);
  });

  test('should store data correctly inside the Angular Signal', () => {
    const data = component.summaryData();
    expect(data).toBeTruthy();
    expect(data?.currentGlobalBalance).toBe(1300.0);
    expect(data?.accountsDetails.length).toBe(2);
  });

  test('should render the global balances inside your custom SCSS cards', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const realAmountText = compiled.querySelector('.card-real .balance-amount')?.textContent;
    const projectedAmountText = compiled.querySelector(
      '.card-projected .balance-amount',
    )?.textContent;

    expect(realAmountText).toBeTruthy();
    expect(projectedAmountText).toBeTruthy();

    const cleanReal = realAmountText!.replace(/\s/g, '');
    const cleanProjected = projectedAmountText!.replace(/\s/g, '');

    expect(cleanReal).toContain('1300,00€');
    expect(cleanProjected).toContain('1600,00€');
  });

  test('should render the correct number of account cards in the grid', () => {
    const accountCards = fixture.debugElement.queryAll(By.css('.account-item-card'));
    expect(accountCards.length).toBe(2);

    const firstCardTitle = accountCards[0].query(By.css('h3'))?.nativeElement.textContent;
    expect(firstCardTitle).toBe('Compte Principal LCL');
  });
});
