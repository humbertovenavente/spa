import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AppState, Budget, BudgetAssignment, Member, Payment } from '../models/family.model';
import { API_BASE_URL } from '../api.config';

@Injectable({ providedIn: 'root' })
export class FamilyService {
  private http = inject(HttpClient);

  private state = signal<AppState>({ members: [], payments: [], budgets: [] });

  readonly loaded = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly members = computed(() => this.state().members);
  readonly payments = computed(() => this.state().payments);
  readonly budgets = computed(() => this.state().budgets);

  readonly activeBudget = computed<Budget | undefined>(() => {
    const s = this.state();
    return s.budgets.find((b) => b.id === s.activeBudgetId) ?? s.budgets[0];
  });

  readonly totalContributed = computed(() =>
    this.state().members.reduce((s, m) => s + (m.monthlyContribution || 0), 0)
  );

  readonly assignedMembers = computed<Member[]>(() => {
    const b = this.activeBudget();
    if (!b) return [];
    const ids = new Set(b.assignments.map((a) => a.memberId));
    return this.state().members.filter((m) => ids.has(m.id));
  });

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    try {
      const data = await firstValueFrom(this.http.get<AppState>(`${API_BASE_URL}/state`));
      this.state.set({
        members: data.members ?? [],
        budgets: data.budgets ?? [],
        payments: data.payments ?? [],
        activeBudgetId: data.activeBudgetId
      });
      this.loadError.set(null);
    } catch (err: any) {
      console.error('Error al cargar el estado:', err);
      this.loadError.set('No se pudo conectar con el servidor');
    } finally {
      this.loaded.set(true);
    }
  }

  // Members
  async addMember(data: Omit<Member, 'id' | 'shareLink'>): Promise<Member> {
    const m = await firstValueFrom(
      this.http.post<Member>(`${API_BASE_URL}/members`, data)
    );
    this.state.update((s) => ({ ...s, members: [...s.members, m] }));
    return m;
  }

  async removeMember(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${API_BASE_URL}/members/${id}`));
    await this.refresh();
  }

  getMember(id: string): Member | undefined {
    return this.state().members.find((m) => m.id === id);
  }

  // Budgets
  async createBudget(
    month: string,
    label: string,
    currency: string,
    assignments: BudgetAssignment[]
  ): Promise<Budget> {
    const b = await firstValueFrom(
      this.http.post<Budget>(`${API_BASE_URL}/budgets`, {
        month,
        label,
        currency,
        assignments
      })
    );
    this.state.update((s) => ({
      ...s,
      budgets: [b, ...s.budgets],
      activeBudgetId: b.id
    }));
    return b;
  }

  async setActiveBudget(id: string): Promise<void> {
    await firstValueFrom(this.http.post(`${API_BASE_URL}/active-budget/${id}`, {}));
    this.state.update((s) => ({ ...s, activeBudgetId: id }));
  }

  async removeBudget(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${API_BASE_URL}/budgets/${id}`));
    await this.refresh();
  }

  activeCurrency(): string {
    return this.activeBudget()?.currency || 'USD';
  }

  assignedAmountForMember(memberId: string): number {
    const b = this.activeBudget();
    if (!b) return 0;
    return b.assignments.find((a) => a.memberId === memberId)?.amount ?? 0;
  }

  // Payments
  async addPayment(memberId: string, data: Omit<Payment, 'id' | 'memberId' | 'budgetId'>): Promise<Payment> {
    const budget = this.activeBudget();
    if (!budget) throw new Error('No hay presupuesto activo');
    const p = await firstValueFrom(
      this.http.post<Payment>(`${API_BASE_URL}/payments`, {
        memberId,
        budgetId: budget.id,
        ...data
      })
    );
    this.state.update((s) => ({ ...s, payments: [p, ...s.payments] }));
    return p;
  }

  async removePayment(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${API_BASE_URL}/payments/${id}`));
    this.state.update((s) => ({
      ...s,
      payments: s.payments.filter((p) => p.id !== id)
    }));
  }

  paymentsForMember(memberId: string): Payment[] {
    const b = this.activeBudget();
    return this.state()
      .payments
      .filter((p) => p.memberId === memberId)
      .filter((p) => (b ? p.budgetId === b.id : true));
  }

  totalPaidByMember(memberId: string): number {
    return this.paymentsForMember(memberId).reduce((s, p) => s + p.amount, 0);
  }
}
