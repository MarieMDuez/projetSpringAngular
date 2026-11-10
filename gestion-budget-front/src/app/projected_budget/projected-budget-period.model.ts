import { Account } from '../settings/account/account.model';

export interface ProjectedBudgetPeriod {
  id?: number;
  account: Account;
  month: number;
  year: number;
  weeksCount?: number;
}
