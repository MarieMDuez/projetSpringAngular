import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountService } from '../../../settings/account/account.service';
import { TransactionService } from '../../../transaction/transaction.service';
import { DashboardService } from '../../dashboard.service';
import { MatrixDashboardComponent } from './matrix-dashboard.component';
import { MatrixDashboardDto, PaymentMethodRowDto } from './matrix-dashboard.model';

interface MockAccount {
  id: number;
  label: string;
  isActive: boolean;
}

describe('MatrixDashboardComponent', () => {
  let component: MatrixDashboardComponent;
  let fixture: ComponentFixture<MatrixDashboardComponent>;

  const mockActiveAccounts = signal<MockAccount[]>([
    { id: 1, label: 'Compte Courant', isActive: true },
  ]);

  const mockAccountService = {
    activeAccounts: computed(() => mockActiveAccounts()),
  };

  const mockTransactionService = {
    selectedAccountIdFilter: signal<number | null>(null),
  };
  const mockRows: PaymentMethodRowDto[] = [
    {
      isExpanded: false,
      paymentMethodLabel: 'Carte',
      totalYear: 0,
      categoryRows: [],
      monthlyAmounts: [],
    },
    {
      isExpanded: false,
      paymentMethodLabel: 'Virement',
      totalYear: 0,
      categoryRows: [],
      monthlyAmounts: [],
    },
  ];
  const mockDashboardDto: MatrixDashboardDto = {
    rows: mockRows,
    monthlyTotals: [],
    grandTotal: 0,
  };
  const mockDashboardService = {
    selectedYear: signal<number>(2026),
    isCheckedFilter: signal<boolean>(false),
    getMatrix: vi.fn().mockReturnValue(
      of({
        rows: [
          { isExpanded: false, paymentMethodLabel: 'Carte' },
          { isExpanded: false, paymentMethodLabel: 'Virement' },
        ],
      } as unknown as MatrixDashboardDto),
    ),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatrixDashboardComponent],
      providers: [
        { provide: AccountService, useValue: mockAccountService },
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MatrixDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle expansion state of all matrix rows', () => {
    const initialData: MatrixDashboardDto = {
      rows: [
        {
          isExpanded: false,
          paymentMethodLabel: 'Carte',
          totalYear: 0,
          categoryRows: [],
          monthlyAmounts: [],
        },
        {
          isExpanded: false,
          paymentMethodLabel: 'Virement',
          totalYear: 0,
          categoryRows: [],
          monthlyAmounts: [],
        },
      ],
      monthlyTotals: [],
      grandTotal: 0,
    };
    component['matrixData'].set(initialData);

    component['onToggleAllMatrixRows']();

    expect(component['isMatrixAllExpanded']()).toBe(true);
    expect(component['matrixData']()?.rows?.[0].isExpanded).toBe(true);
    expect(component['matrixData']()?.rows?.[1].isExpanded).toBe(true);
  });
});
