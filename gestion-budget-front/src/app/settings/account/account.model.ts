export interface Account {
  id?: number;
  label: string;
  initialBalance: number;
  isActive: boolean;
  isDefault: boolean;
  position: number;
}
