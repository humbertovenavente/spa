import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import {
  Trip,
  TripDetail,
  TripExpense,
  TripParticipant
} from '../models/trip.model';

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

@Injectable({ providedIn: 'root' })
export class TripService {
  private http = inject(HttpClient);

  private tripsState = signal<Trip[]>([]);
  private detailState = signal<TripDetail | null>(null);

  readonly trips = computed(() => this.tripsState());
  readonly currentTrip = computed(() => this.detailState());
  readonly currentExpenses = computed(() => this.detailState()?.expenses ?? []);

  async refreshList(): Promise<void> {
    try {
      const data = await firstValueFrom(this.http.get<Trip[]>(`${API_BASE_URL}/trips`));
      this.tripsState.set(data ?? []);
    } catch (err) {
      console.error('Error cargando viajes:', err);
    }
  }

  async loadTrip(id: string): Promise<TripDetail | null> {
    try {
      const data = await firstValueFrom(
        this.http.get<TripDetail>(`${API_BASE_URL}/trips/${id}`)
      );
      this.detailState.set(data);
      return data;
    } catch (err) {
      console.error('Error cargando viaje:', err);
      this.detailState.set(null);
      return null;
    }
  }

  async createTrip(data: {
    name: string;
    startDate?: string;
    endDate?: string;
    currency: string;
    participants: TripParticipant[];
  }): Promise<Trip> {
    const t = await firstValueFrom(this.http.post<Trip>(`${API_BASE_URL}/trips`, data));
    this.tripsState.update((list) => [t, ...list]);
    return t;
  }

  async updateTrip(id: string, patch: Partial<Trip>): Promise<Trip> {
    const t = await firstValueFrom(
      this.http.patch<Trip>(`${API_BASE_URL}/trips/${id}`, patch)
    );
    this.tripsState.update((list) => list.map((x) => (x.id === id ? t : x)));
    const cur = this.detailState();
    if (cur && cur.id === id) {
      this.detailState.set({ ...cur, ...t, expenses: cur.expenses });
    }
    return t;
  }

  async deleteTrip(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${API_BASE_URL}/trips/${id}`));
    this.tripsState.update((list) => list.filter((x) => x.id !== id));
    if (this.detailState()?.id === id) this.detailState.set(null);
  }

  async addExpense(
    tripId: string,
    data: Omit<TripExpense, 'id' | 'tripId' | 'createdAt'>
  ): Promise<TripExpense> {
    const e = await firstValueFrom(
      this.http.post<TripExpense>(`${API_BASE_URL}/trips/${tripId}/expenses`, data)
    );
    const cur = this.detailState();
    if (cur && cur.id === tripId) {
      this.detailState.set({ ...cur, expenses: [e, ...cur.expenses] });
    }
    return e;
  }

  async removeExpense(tripId: string, expenseId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${API_BASE_URL}/trips/${tripId}/expenses/${expenseId}`)
    );
    const cur = this.detailState();
    if (cur && cur.id === tripId) {
      this.detailState.set({
        ...cur,
        expenses: cur.expenses.filter((x) => x.id !== expenseId)
      });
    }
  }

  /** Map memberId → net balance (>0 they're owed, <0 they owe). */
  static balances(detail: TripDetail): Map<string, number> {
    const bal = new Map<string, number>();
    for (const p of detail.participants) bal.set(p.memberId, 0);
    for (const exp of detail.expenses) {
      bal.set(exp.payerId, (bal.get(exp.payerId) || 0) + exp.amount);
      for (const s of exp.splits) {
        bal.set(s.memberId, (bal.get(s.memberId) || 0) - s.amount);
      }
    }
    return bal;
  }

  /** Greedy minimum-transfer settlement. */
  static settle(detail: TripDetail): Transfer[] {
    const bal = this.balances(detail);
    const debtors: { id: string; amount: number }[] = [];
    const creditors: { id: string; amount: number }[] = [];
    for (const [id, b] of bal.entries()) {
      if (b < -0.01) debtors.push({ id, amount: -b });
      else if (b > 0.01) creditors.push({ id, amount: b });
    }
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);
    const out: Transfer[] = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const d = debtors[i];
      const c = creditors[j];
      const t = Math.min(d.amount, c.amount);
      out.push({ from: d.id, to: c.id, amount: Math.round(t * 100) / 100 });
      d.amount -= t;
      c.amount -= t;
      if (d.amount < 0.01) i++;
      if (c.amount < 0.01) j++;
    }
    return out;
  }

  static spentByMember(detail: TripDetail, memberId: string): number {
    return detail.expenses
      .flatMap((e) => e.splits)
      .filter((s) => s.memberId === memberId)
      .reduce((sum, s) => sum + s.amount, 0);
  }
}
