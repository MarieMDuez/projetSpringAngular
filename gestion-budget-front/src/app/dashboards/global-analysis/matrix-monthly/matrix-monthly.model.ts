export interface CategoryMonthlyRowDto {
  categoryLabel: string;
  weeklyAmounts: number[];
  totalMonth: number;
}

export interface PaymentMethodMonthlyRowDto {
  paymentMethodLabel: string;
  weeklyAmounts: number[];
  totalMonth: number;
  categoryRows: CategoryMonthlyRowDto[];
  isExpanded?: boolean;
}

export interface MatrixMonthlyDto {
  rows: PaymentMethodMonthlyRowDto[];
  categoryRows: CategoryMonthlyRowDto[];
  maxWeeksInMonth: number;
  weeklyTotals: number[];
  grandTotal: number;
}
