export type TransactionType = 'DEBIT' | 'CREDIT';

export interface DataGroupDto {
  label: string;
  total: number;
  type: TransactionType;
}

export interface AnalyticsDashboardDto {
  categoryDistribution: DataGroupDto[];
  paymentDistribution: DataGroupDto[];
}
