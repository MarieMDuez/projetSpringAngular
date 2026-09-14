import { balanceDto } from '../../balances/balance.model';

export interface summaryDto {
  currentGlobalBalance: number;
  projectedGlobalBalance: number;
  accountsDetails: balanceDto[];
}
