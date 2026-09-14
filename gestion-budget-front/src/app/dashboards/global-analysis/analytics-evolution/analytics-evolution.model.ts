export interface MonthDataDto {
  month: number;
  debits: number;
  credits: number;
}

export interface CategoryEvolutionDto {
  categoryLabel: string;
  monthlyDetails: MonthDataDto[];
}

export interface PaymentEvolutionDto {
  paymentMethodLabel: string;
  monthlyDetails: MonthDataDto[];
}

export interface AnalyticsEvolutionDto {
  globalEvolution: MonthDataDto[];
  categoryEvolution: CategoryEvolutionDto[];
  paymentEvolution: PaymentEvolutionDto[];
}
