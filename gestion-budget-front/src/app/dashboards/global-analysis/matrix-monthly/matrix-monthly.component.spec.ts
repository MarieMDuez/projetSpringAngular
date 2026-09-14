import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, test } from 'vitest';
import { TransactionService } from '../../../transaction/transaction.service';
import { DashboardService } from '../../dashboard.service';
import { MatrixMonthlyComponent } from './matrix-monthly.component';

describe('MatrixMonthlyComponent', () => {
  let component: MatrixMonthlyComponent;
  let fixture: ComponentFixture<MatrixMonthlyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatrixMonthlyComponent],
      providers: [
        {
          provide: TransactionService,
          useValue: {
            selectedAccountIdFilter: signal<number | null>(null),
          },
        },
        {
          provide: DashboardService,
          useValue: {
            selectedYear: signal<number>(new Date().getFullYear()),
            selectedMonth: signal<number>(new Date().getMonth() + 1),
            isCheckedFilter: signal<boolean | null>(null),
            getMonthlyMatrix: vi.fn().mockReturnValue(
              of({
                maxWeeksInMonth: 4,
                rows: [],
              }),
            ),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MatrixMonthlyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  test('should create', () => {
    expect(component).toBeTruthy();
  });
});
