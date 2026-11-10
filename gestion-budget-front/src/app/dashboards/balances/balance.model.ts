export interface Balance {
  id: number | null;
  label: string;
  initialBalance: number;
  currentBalance: number;
  projectedBalance: number;
  firstNegativeDate: Date | null;
}
