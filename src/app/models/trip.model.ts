export interface TripParticipant {
  memberId: string;
  budget: number;
}

export interface ExpenseSplit {
  memberId: string;
  amount: number;
}

export interface TripExpense {
  id: string;
  tripId: string;
  payerId: string;
  amount: number;
  date: string;
  description?: string;
  shared: boolean;
  splits: ExpenseSplit[];
  createdAt?: string;
}

export interface Trip {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  currency: string;
  participants: TripParticipant[];
  createdAt?: string;
}

export interface TripDetail extends Trip {
  expenses: TripExpense[];
}
