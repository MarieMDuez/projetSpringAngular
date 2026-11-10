export interface Account {
  id?: number;
  label: string;
  type: AccountType;
  initialBalance: number;
  isActive: boolean;
  isDefault: boolean;
  position: number;
}
export enum AccountType {
  COURANT = 'COURANT',
  EPARGNE = 'EPARGNE',
}
export const AccountTypeLabels: Record<AccountType, string> = {
  [AccountType.COURANT]: 'Compte Courant',
  [AccountType.EPARGNE]: 'Épargne',
};
