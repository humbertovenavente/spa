export interface Member {
  id: string;
  name: string;
  monthlyContribution: number;
  currency: string;
  paymentMethod?: string;
  shareLink?: string;
}

export interface Payment {
  id: string;
  memberId: string;
  budgetId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  method: string;
  photoDataUrl?: string;
  note?: string;
}

export interface BudgetAssignment {
  memberId: string;
  amount: number;
}

export interface Budget {
  id: string;
  month: string; // "2026-05"
  label: string;
  totalAmount: number; // sum of assignments
  currency: string; // ISO 4217 (USD, EUR, MXN, ...)
  assignments: BudgetAssignment[];
  createdAt: string;
}

export interface AppState {
  members: Member[];
  payments: Payment[];
  budgets: Budget[];
  activeBudgetId?: string;
}

export const CURRENCIES: { code: string; label: string }[] = [
  { code: 'USD', label: 'USD - Dólar' },
  { code: 'EUR', label: 'EUR - Euro' },
  { code: 'MXN', label: 'MXN - Peso mexicano' },
  { code: 'PEN', label: 'PEN - Sol peruano' },
  { code: 'COP', label: 'COP - Peso colombiano' },
  { code: 'ARS', label: 'ARS - Peso argentino' },
  { code: 'CLP', label: 'CLP - Peso chileno' },
  { code: 'GTQ', label: 'GTQ - Quetzal' },
  { code: 'BRL', label: 'BRL - Real' },
  { code: 'GBP', label: 'GBP - Libra' },
  { code: 'CAD', label: 'CAD - Dólar canadiense' }
];

export const PAYMENT_METHODS: string[] = [
  'Efectivo',
  'Transferencia',
  'Tarjeta',
  'Yape/Plin',
  'PayPal',
  'Otro'
];
