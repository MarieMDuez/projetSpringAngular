export interface CategoryRowDto {
  categoryLabel: string;
  monthlyAmounts: number[];
  totalYear: number;
}

export interface PaymentMethodRowDto {
  paymentMethodLabel: string;
  monthlyAmounts: number[];
  totalYear: number;
  categoryRows: CategoryRowDto[];
  isExpanded?: boolean;
}

export interface MatrixDashboardDto {
  rows: PaymentMethodRowDto[];
  monthlyTotals: number[];
  grandTotal: number;
}
