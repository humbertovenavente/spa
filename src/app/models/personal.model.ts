export interface PersonalCategory {
  id: string;
  name: string;
  monthlyAmount: number;
}

export interface PersonalProfile {
  income: number;
  currency: string;
  categories: PersonalCategory[];
}

export interface PersonalExpense {
  id: string;
  categoryId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  note?: string;
}

export interface PersonalState {
  profile: PersonalProfile;
  expenses: PersonalExpense[];
}
