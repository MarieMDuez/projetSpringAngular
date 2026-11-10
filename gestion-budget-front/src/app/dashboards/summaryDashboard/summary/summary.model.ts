import { Balance } from '../../balances/balance.model';

export interface Summary {
  currentGlobalBalance: number;
  projectedGlobalBalance: number;
  accountsDetails: Balance[];
}
