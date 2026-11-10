export interface Transaction {
  id?: number;
  amount: number | null;
  emissionDate: string;
  type: 'DEBIT' | 'CREDIT';
  description?: string;
  recurrenceMonths?: number;
  isAlertTriggered: boolean;
  isChecked: boolean;
  parentTransactionId: number | null;

  account: { id: number };
  category: { id: number; label?: string };
  paymentMethod: { id: number; label?: string };
}

export interface TransactionFilters {
  accountId?: number | null;
  categoryId?: string;
  type?: string;
  year?: string;
  month?: string;
  day?: string;
  limit?: number | string;
}
