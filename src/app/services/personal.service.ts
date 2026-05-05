import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import {
  PersonalCategory,
  PersonalExpense,
  PersonalProfile,
  PersonalState
} from '../models/personal.model';

const EMPTY: PersonalState = {
  profile: { income: 0, currency: 'USD', categories: [] },
  expenses: []
};

@Injectable({ providedIn: 'root' })
export class PersonalService {
  private http = inject(HttpClient);
  private state = signal<PersonalState>(EMPTY);

  readonly loaded = signal(false);

  readonly profile = computed(() => this.state().profile);
  readonly expenses = computed(() => this.state().expenses);
  readonly categories = computed(() => this.state().profile.categories);
  readonly currency = computed(() => this.state().profile.currency || 'USD');
  readonly income = computed(() => this.state().profile.income || 0);

  readonly currentMonth = signal(new Date().toISOString().slice(0, 7));

  readonly monthExpenses = computed(() => {
    const m = this.currentMonth();
    return this.state().expenses.filter((e) => e.date?.startsWith(m));
  });

  readonly totalBudget = computed(() =>
    this.categories().reduce((s, c) => s + (c.monthlyAmount || 0), 0)
  );

  readonly totalSpent = computed(() =>
    this.monthExpenses().reduce((s, e) => s + (e.amount || 0), 0)
  );

  readonly remaining = computed(() => this.income() - this.totalSpent());

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<PersonalState>(`${API_BASE_URL}/personal`)
      );
      this.state.set({
        profile: {
          income: data.profile?.income ?? 0,
          currency: data.profile?.currency ?? 'USD',
          categories: data.profile?.categories ?? []
        },
        expenses: data.expenses ?? []
      });
    } catch (err) {
      console.error('Error cargando personal:', err);
    } finally {
      this.loaded.set(true);
    }
  }

  async setIncome(income: number, currency: string): Promise<void> {
    const profile = await firstValueFrom(
      this.http.put<PersonalProfile>(`${API_BASE_URL}/personal`, { income, currency })
    );
    this.state.update((s) => ({ ...s, profile }));
  }

  async addCategory(name: string, monthlyAmount: number): Promise<PersonalCategory> {
    const cat = await firstValueFrom(
      this.http.post<PersonalCategory>(`${API_BASE_URL}/personal/categories`, {
        name,
        monthlyAmount
      })
    );
    this.state.update((s) => ({
      ...s,
      profile: { ...s.profile, categories: [...s.profile.categories, cat] }
    }));
    return cat;
  }

  async updateCategory(id: string, patch: Partial<PersonalCategory>): Promise<PersonalCategory> {
    const cat = await firstValueFrom(
      this.http.patch<PersonalCategory>(`${API_BASE_URL}/personal/categories/${id}`, patch)
    );
    this.state.update((s) => ({
      ...s,
      profile: {
        ...s.profile,
        categories: s.profile.categories.map((c) => (c.id === id ? cat : c))
      }
    }));
    return cat;
  }

  async removeCategory(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${API_BASE_URL}/personal/categories/${id}`)
    );
    this.state.update((s) => ({
      ...s,
      profile: {
        ...s.profile,
        categories: s.profile.categories.filter((c) => c.id !== id)
      }
    }));
  }

  async addExpense(data: Omit<PersonalExpense, 'id'>): Promise<PersonalExpense> {
    const e = await firstValueFrom(
      this.http.post<PersonalExpense>(`${API_BASE_URL}/personal/expenses`, data)
    );
    this.state.update((s) => ({ ...s, expenses: [e, ...s.expenses] }));
    return e;
  }

  async removeExpense(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${API_BASE_URL}/personal/expenses/${id}`)
    );
    this.state.update((s) => ({
      ...s,
      expenses: s.expenses.filter((e) => e.id !== id)
    }));
  }

  spentByCategory(categoryId: string): number {
    return this.monthExpenses()
      .filter((e) => e.categoryId === categoryId)
      .reduce((s, e) => s + e.amount, 0);
  }

  categoryName(id: string): string {
    return this.categories().find((c) => c.id === id)?.name ?? '—';
  }
}
