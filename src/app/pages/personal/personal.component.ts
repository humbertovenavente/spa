import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PersonalService } from '../../services/personal.service';
import { CURRENCIES } from '../../models/family.model';
import { PersonalCategory } from '../../models/personal.model';

interface CategoryStat {
  id: string;
  name: string;
  amount: number;
  pct: number;
}

interface DayStat {
  date: string;
  amount: number;
  pct: number;
  label: string;
}

interface Strategy {
  kind: 'good' | 'warn' | 'danger' | 'info';
  text: string;
}

@Component({
  selector: 'app-personal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-4">
      <div class="card">
        <p class="text-xs font-medium text-brand-700">Tu link de gastos</p>
        <p class="text-xs text-slate-600 mt-0.5">
          Ábrelo desde el celular para registrar gastos al instante.
        </p>
        <div class="mt-2 flex items-center gap-2 text-xs">
          <input type="text" readonly [value]="expenseLink()"
                 class="flex-1 min-w-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-700 truncate" />
          <a [href]="expenseLink()" target="_blank"
             class="font-medium text-brand-600 hover:text-brand-700 underline shrink-0">Abrir</a>
          <button type="button"
                  class="font-medium text-brand-600 hover:text-brand-700 underline shrink-0"
                  (click)="copyLink()">
            {{ copied ? 'Copiado' : 'Copiar' }}
          </button>
        </div>
      </div>

      <div class="card">
        <h2 class="text-lg font-semibold text-slate-900 mb-4">Ingreso mensual</h2>
        <form (ngSubmit)="saveIncome()" class="space-y-3">
          <div>
            <label class="label">Moneda</label>
            <select class="input mt-1.5" [(ngModel)]="currency" name="currency">
              <option *ngFor="let c of currencies" [value]="c.code">{{ c.label }}</option>
            </select>
          </div>
          <div>
            <label class="label">Cuánto ganas al mes</label>
            <input class="input mt-1.5" type="number" min="0" step="0.01"
                   [(ngModel)]="income" name="income" placeholder="0.00" />
          </div>
          <button type="submit" class="btn-primary w-full" [disabled]="savingIncome">
            {{ savingIncome ? 'Guardando…' : 'Guardar' }}
          </button>
        </form>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="card">
          <p class="text-xs text-slate-500">Gastado este mes</p>
          <p class="text-xl font-semibold text-slate-900 mt-1">
            {{ ps.totalSpent() | currency:ps.currency():'symbol':'1.2-2' }}
          </p>
        </div>
        <div class="card">
          <p class="text-xs text-slate-500">Restante</p>
          <p class="text-xl font-semibold mt-1"
             [class.text-emerald-600]="ps.remaining() >= 0"
             [class.text-rose-600]="ps.remaining() < 0">
            {{ ps.remaining() | currency:ps.currency():'symbol':'1.2-2' }}
          </p>
        </div>
      </div>

      <!-- Plan y ahorro -->
      <div class="card">
        <h2 class="text-lg font-semibold text-slate-900 mb-3">Plan y ahorro</h2>

        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-lg border border-slate-200 p-3">
            <p class="text-xs text-slate-500">Ingreso</p>
            <p class="text-base font-semibold text-slate-900 mt-0.5">
              {{ ps.income() | currency:ps.currency():'symbol':'1.2-2' }}
            </p>
          </div>
          <div class="rounded-lg border border-slate-200 p-3">
            <p class="text-xs text-slate-500">Total presupuesto</p>
            <p class="text-base font-semibold text-slate-900 mt-0.5">
              {{ ps.totalBudget() | currency:ps.currency():'symbol':'1.2-2' }}
            </p>
            <p class="text-xs text-slate-500 mt-0.5">{{ plan().categoriesCount }} categorías</p>
          </div>
          <div class="rounded-lg border p-3"
               [class.border-emerald-200]="plan().targetSaving >= 0"
               [class.bg-emerald-50]="plan().targetSaving >= 0"
               [class.border-rose-200]="plan().targetSaving < 0"
               [class.bg-rose-50]="plan().targetSaving < 0">
            <p class="text-xs"
               [class.text-emerald-700]="plan().targetSaving >= 0"
               [class.text-rose-700]="plan().targetSaving < 0">
              Ahorro objetivo
            </p>
            <p class="text-base font-semibold mt-0.5"
               [class.text-emerald-700]="plan().targetSaving >= 0"
               [class.text-rose-700]="plan().targetSaving < 0">
              {{ plan().targetSaving | currency:ps.currency():'symbol':'1.2-2' }}
            </p>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ plan().targetRate | number:'1.0-0' }}% del ingreso
            </p>
          </div>
          <div class="rounded-lg border p-3"
               [class.border-emerald-200]="plan().realSaving >= 0"
               [class.bg-emerald-50]="plan().realSaving >= 0"
               [class.border-rose-200]="plan().realSaving < 0"
               [class.bg-rose-50]="plan().realSaving < 0">
            <p class="text-xs"
               [class.text-emerald-700]="plan().realSaving >= 0"
               [class.text-rose-700]="plan().realSaving < 0">
              Ahorro real
            </p>
            <p class="text-base font-semibold mt-0.5"
               [class.text-emerald-700]="plan().realSaving >= 0"
               [class.text-rose-700]="plan().realSaving < 0">
              {{ plan().realSaving | currency:ps.currency():'symbol':'1.2-2' }}
            </p>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ plan().realRate | number:'1.0-0' }}% del ingreso
            </p>
          </div>
        </div>

        <div class="mt-4" *ngIf="ps.income() > 0">
          <p class="text-xs text-slate-500 mb-1.5">Tu ingreso</p>
          <div class="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
            <div class="h-full bg-rose-400" [style.width.%]="plan().spentPctOfIncome"
                 [title]="'Gastado: ' + (ps.totalSpent() | currency:ps.currency():'symbol':'1.2-2')"></div>
            <div class="h-full bg-amber-300" [style.width.%]="plan().budgetedRemainingPct"
                 [title]="'Presupuestado pendiente'"></div>
            <div class="h-full bg-emerald-400 flex-1"
                 [title]="'Disponible / ahorro'"></div>
          </div>
          <div class="flex justify-between text-[10px] text-slate-500 mt-1">
            <span><span class="inline-block w-2 h-2 rounded-sm bg-rose-400 mr-1"></span>Gastado</span>
            <span><span class="inline-block w-2 h-2 rounded-sm bg-amber-300 mr-1"></span>Presupuestado pendiente</span>
            <span><span class="inline-block w-2 h-2 rounded-sm bg-emerald-400 mr-1"></span>Ahorro</span>
          </div>
        </div>
      </div>

      <!-- Estrategias -->
      <div class="card">
        <h2 class="text-lg font-semibold text-slate-900 mb-3">Estrategias</h2>
        <ul class="space-y-2">
          <li *ngFor="let s of strategies()"
              class="rounded-lg border p-3 text-sm"
              [class.border-emerald-200]="s.kind === 'good'"
              [class.bg-emerald-50]="s.kind === 'good'"
              [class.text-emerald-800]="s.kind === 'good'"
              [class.border-amber-200]="s.kind === 'warn'"
              [class.bg-amber-50]="s.kind === 'warn'"
              [class.text-amber-800]="s.kind === 'warn'"
              [class.border-rose-200]="s.kind === 'danger'"
              [class.bg-rose-50]="s.kind === 'danger'"
              [class.text-rose-800]="s.kind === 'danger'"
              [class.border-slate-200]="s.kind === 'info'"
              [class.bg-slate-50]="s.kind === 'info'"
              [class.text-slate-700]="s.kind === 'info'">
            {{ s.text }}
          </li>
        </ul>
      </div>

      <div class="card">
        <h2 class="text-lg font-semibold text-slate-900 mb-3">Categorías del presupuesto</h2>
        <form (ngSubmit)="addCategory()" class="space-y-3 mb-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="label">Nombre</label>
              <input class="input mt-1.5" [(ngModel)]="catName" name="catName"
                     placeholder="Ej. Comida" required />
            </div>
            <div>
              <label class="label">Monto al mes</label>
              <input class="input mt-1.5" type="number" min="0" step="0.01"
                     [(ngModel)]="catAmount" name="catAmount" placeholder="0.00" required />
            </div>
          </div>
          <button type="submit" class="btn-primary w-full"
                  [disabled]="!catName || catAmount === null || addingCategory">
            {{ addingCategory ? 'Agregando…' : 'Agregar categoría' }}
          </button>
          <p *ngIf="addError" class="text-xs text-rose-600 text-center">{{ addError }}</p>
        </form>

        <div *ngIf="ps.categories().length === 0" class="text-center text-slate-500 py-6 text-sm">
          Aún no tienes categorías.
        </div>

        <ul class="space-y-3">
          <li *ngFor="let c of visibleCategories()"
              class="rounded-lg border border-slate-200 bg-white p-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="font-medium text-slate-900 truncate">{{ c.name }}</p>

                <ng-container *ngIf="!editing[c.id]; else editMode">
                  <p class="text-xs text-slate-500 mt-0.5">
                    Presupuesto: {{ c.monthlyAmount | currency:ps.currency():'symbol':'1.2-2' }} ·
                    Gastado: {{ ps.spentByCategory(c.id) | currency:ps.currency():'symbol':'1.2-2' }}
                  </p>
                </ng-container>

                <ng-template #editMode>
                  <div class="mt-2 flex items-center gap-2">
                    <input type="number" min="0" step="0.01" class="input"
                           [(ngModel)]="editAmount[c.id]" [name]="'edit_' + c.id" />
                    <button type="button" class="btn-success !px-3 !py-1.5 !min-h-0 text-xs"
                            (click)="saveEdit(c.id)" [disabled]="savingId === c.id">
                      {{ savingId === c.id ? '…' : 'Guardar' }}
                    </button>
                    <button type="button" class="btn-ghost !px-3 !py-1.5 !min-h-0 text-xs"
                            (click)="cancelEdit(c.id)">Cancelar</button>
                  </div>
                </ng-template>
              </div>

              <div class="flex flex-col gap-2 shrink-0" *ngIf="!editing[c.id]">
                <button type="button"
                        class="btn-ghost !px-3 !py-1.5 !min-h-0 text-xs"
                        (click)="startEdit(c)">Editar</button>
                <button type="button"
                        class="btn-ghost !px-3 !py-1.5 !min-h-0 text-xs"
                        (click)="removeCategory(c.id)">Eliminar</button>
              </div>
            </div>

            <div class="mt-2" *ngIf="!editing[c.id]">
              <div class="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div class="h-full transition-all"
                     [class.bg-emerald-500]="progress(c.id) <= 80"
                     [class.bg-amber-500]="progress(c.id) > 80 && progress(c.id) <= 100"
                     [class.bg-rose-500]="progress(c.id) > 100"
                     [style.width.%]="Math.min(100, progress(c.id))"></div>
              </div>
              <p class="text-xs text-slate-500 mt-1">{{ progress(c.id) }}% del presupuesto</p>
            </div>
          </li>
        </ul>

        <button *ngIf="ps.categories().length > 3" type="button"
                class="mt-3 w-full text-sm font-medium text-brand-600 hover:text-brand-700 underline"
                (click)="showAllCategories.set(!showAllCategories())">
          {{ showAllCategories()
              ? 'Ver menos'
              : 'Ver más (' + (ps.categories().length - 3) + ' más)' }}
        </button>
      </div>

      <!-- Estadísticas del mes -->
      <div class="card" *ngIf="ps.expenses().length">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold text-slate-900">Resumen estadístico</h2>
          <span class="badge-info">{{ ps.currentMonth() }}</span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="rounded-lg border border-slate-200 p-3">
            <p class="text-xs text-slate-500">Transacciones</p>
            <p class="text-lg font-semibold text-slate-900 mt-0.5">{{ stats().count }}</p>
          </div>
          <div class="rounded-lg border border-slate-200 p-3">
            <p class="text-xs text-slate-500">Promedio</p>
            <p class="text-lg font-semibold text-slate-900 mt-0.5">
              {{ stats().avg | currency:ps.currency():'symbol':'1.2-2' }}
            </p>
          </div>
          <div class="rounded-lg border border-slate-200 p-3">
            <p class="text-xs text-slate-500">Por día</p>
            <p class="text-lg font-semibold text-slate-900 mt-0.5">
              {{ stats().avgPerDay | currency:ps.currency():'symbol':'1.2-2' }}
            </p>
          </div>
          <div class="rounded-lg border border-slate-200 p-3">
            <p class="text-xs text-slate-500">Mayor gasto</p>
            <p class="text-lg font-semibold text-slate-900 mt-0.5">
              {{ stats().maxAmount | currency:ps.currency():'symbol':'1.2-2' }}
            </p>
          </div>
        </div>

        <div class="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm flex items-center justify-between"
             *ngIf="prevMonth().count > 0">
          <span class="text-slate-700">
            vs mes anterior ({{ prevMonth().month }}):
            <b>{{ prevMonth().total | currency:ps.currency():'symbol':'1.2-2' }}</b>
          </span>
          <span [class.text-emerald-600]="diff() < 0"
                [class.text-rose-600]="diff() > 0"
                [class.text-slate-600]="diff() === 0"
                class="font-semibold">
            {{ diff() > 0 ? '▲' : (diff() < 0 ? '▼' : '–') }}
            {{ Math.abs(diff()) | currency:ps.currency():'symbol':'1.2-2' }}
            <span class="text-xs">({{ diffPct() }}%)</span>
          </span>
        </div>

        <div class="mt-5" *ngIf="stats().topCategories.length">
          <h3 class="text-sm font-semibold text-slate-700 mb-2">Top categorías</h3>
          <ul class="space-y-2">
            <li *ngFor="let s of stats().topCategories" class="text-sm">
              <div class="flex justify-between gap-3">
                <span class="text-slate-700 truncate">{{ s.name }}</span>
                <span class="font-medium text-slate-900 shrink-0">
                  {{ s.amount | currency:ps.currency():'symbol':'1.2-2' }}
                  <span class="text-xs text-slate-500 ml-1">({{ s.pct }}%)</span>
                </span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1">
                <div class="h-full bg-brand-500" [style.width.%]="s.pct"></div>
              </div>
            </li>
          </ul>
        </div>

        <div class="mt-5" *ngIf="byDay().length">
          <h3 class="text-sm font-semibold text-slate-700 mb-2">Distribución por día</h3>
          <div class="flex items-end gap-1 h-24">
            <div *ngFor="let d of byDay()"
                 class="flex-1 flex flex-col items-center justify-end gap-1 min-w-0">
              <div class="w-full bg-brand-500 rounded-sm transition-all"
                   [style.height.%]="d.pct"
                   [title]="d.label + ': ' + (d.amount | currency:ps.currency():'symbol':'1.2-2')">
              </div>
            </div>
          </div>
          <div class="flex gap-1 mt-1">
            <div *ngFor="let d of byDay()"
                 class="flex-1 text-[10px] text-slate-500 text-center min-w-0 truncate">
              {{ d.label }}
            </div>
          </div>
        </div>
      </div>

      <div class="card" *ngIf="ps.expenses().length">
        <h3 class="text-lg font-semibold text-slate-900 mb-3">
          Gastos recientes
          <span class="text-slate-400 font-normal">({{ ps.expenses().length }})</span>
        </h3>
        <ul class="divide-y divide-slate-100">
          <li *ngFor="let e of ps.expenses() | slice:0:30" class="py-2.5 first:pt-0 last:pb-0">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="font-medium text-slate-900 truncate">
                  {{ ps.categoryName(e.categoryId) }}
                </p>
                <p class="text-xs text-slate-500 mt-0.5">
                  {{ e.date }}<span *ngIf="e.note"> · {{ e.note }}</span>
                </p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="font-semibold text-slate-900">
                  {{ e.amount | currency:ps.currency():'symbol':'1.2-2' }}
                </span>
                <button type="button"
                        class="btn-ghost !px-2.5 !py-1 !min-h-0 text-xs"
                        (click)="removeExpense(e.id)">×</button>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </section>
  `
})
export class PersonalComponent {
  ps = inject(PersonalService);
  currencies = CURRENCIES;
  Math = Math;

  income = this.ps.income();
  currency = this.ps.currency();
  catName = '';
  catAmount: number | null = null;
  copied = false;
  savingIncome = false;
  addingCategory = false;
  addError = '';

  editing: Record<string, boolean> = {};
  editAmount: Record<string, number> = {};
  savingId: string | null = null;

  showAllCategories = signal(false);
  visibleCategories = computed(() => {
    const all = this.ps.categories();
    return this.showAllCategories() ? all : all.slice(0, 3);
  });

  private synced = false;
  constructor() {
    effect(() => {
      if (this.synced || !this.ps.loaded()) return;
      const p = this.ps.profile();
      this.income = p.income || 0;
      this.currency = p.currency || 'USD';
      this.synced = true;
    });
  }

  plan = computed(() => {
    const income = this.ps.income();
    const totalBudget = this.ps.totalBudget();
    const totalSpent = this.ps.totalSpent();
    const targetSaving = income - totalBudget;
    const realSaving = income - totalSpent;
    const targetRate = income > 0 ? (targetSaving / income) * 100 : 0;
    const realRate = income > 0 ? (realSaving / income) * 100 : 0;

    const spentPctOfIncome = income > 0
      ? Math.min(100, Math.max(0, (totalSpent / income) * 100))
      : 0;
    const budgetedPending = Math.max(0, totalBudget - totalSpent);
    const budgetedRemainingPct = income > 0
      ? Math.min(100 - spentPctOfIncome, (budgetedPending / income) * 100)
      : 0;

    return {
      income,
      totalBudget,
      totalSpent,
      targetSaving,
      targetRate,
      realSaving,
      realRate,
      categoriesCount: this.ps.categories().length,
      spentPctOfIncome,
      budgetedRemainingPct
    };
  });

  strategies = computed<Strategy[]>(() => {
    const items: Strategy[] = [];
    const p = this.plan();
    const cur = this.ps.currency();

    if (p.income === 0) {
      items.push({ kind: 'info', text: 'Define tu ingreso mensual para ver tu plan de ahorro y recomendaciones.' });
      return items;
    }

    if (p.totalBudget > p.income) {
      items.push({
        kind: 'danger',
        text: `Tu presupuesto supera tu ingreso por ${this.fmt(p.totalBudget - p.income, cur)}. Reduce alguna categoría.`
      });
    }

    if (p.categoriesCount === 0) {
      items.push({ kind: 'info', text: 'Crea categorías de presupuesto para distribuir tu ingreso.' });
    } else {
      if (p.targetRate >= 20) {
        items.push({
          kind: 'good',
          text: `Buen plan: apuntas a ahorrar ${Math.round(p.targetRate)}% de tu ingreso.`
        });
      } else if (p.targetRate >= 10) {
        items.push({
          kind: 'warn',
          text: `Tu plan ahorra ${Math.round(p.targetRate)}% de tu ingreso. Lo recomendado es al menos 20% (regla 50/30/20).`
        });
      } else if (p.targetRate >= 0) {
        items.push({
          kind: 'warn',
          text: `Solo ahorras ${Math.round(p.targetRate)}% de tu ingreso. Aspira al 20% o más.`
        });
      }
    }

    if (p.realRate < 0) {
      items.push({
        kind: 'danger',
        text: `Llevas gastado ${this.fmt(-p.realSaving, cur)} más de lo que ganas este mes. Frena gastos.`
      });
    } else if (p.realRate >= 20 && p.totalSpent > 0) {
      items.push({
        kind: 'good',
        text: `Vas bien: este mes estás ahorrando ${Math.round(p.realRate)}% de tu ingreso.`
      });
    }

    const overBudget = this.ps.categories()
      .filter((c) => c.monthlyAmount > 0 && this.ps.spentByCategory(c.id) > c.monthlyAmount)
      .map((c) => ({
        name: c.name,
        over: this.ps.spentByCategory(c.id) - c.monthlyAmount
      }));

    for (const c of overBudget) {
      items.push({
        kind: 'danger',
        text: `${c.name}: te pasaste por ${this.fmt(c.over, cur)} este mes.`
      });
    }

    const atRisk = this.ps.categories()
      .filter((c) => {
        if (c.monthlyAmount <= 0) return false;
        const pct = (this.ps.spentByCategory(c.id) / c.monthlyAmount) * 100;
        return pct >= 80 && pct <= 100;
      })
      .map((c) => ({
        name: c.name,
        pct: Math.round((this.ps.spentByCategory(c.id) / c.monthlyAmount) * 100)
      }));

    for (const c of atRisk) {
      items.push({
        kind: 'warn',
        text: `${c.name}: estás al ${c.pct}% del presupuesto. Modera el ritmo.`
      });
    }

    const top = this.stats().topCategories[0];
    if (top && top.pct >= 40 && this.stats().count >= 3) {
      items.push({
        kind: 'info',
        text: `${top.name} concentra ${top.pct}% de tus gastos. Si recortas un 10% ahorras ${this.fmt(top.amount * 0.1, cur)} al mes.`
      });
    }

    if (items.length === 0) {
      items.push({ kind: 'info', text: 'Sigue registrando gastos para recibir más recomendaciones.' });
    }

    return items;
  });

  private fmt(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch {
      return amount.toFixed(2);
    }
  }

  stats = computed(() => {
    const expenses = this.ps.monthExpenses();
    const total = this.ps.totalSpent();
    const count = expenses.length;
    const avg = count > 0 ? total / count : 0;
    const maxAmount = expenses.reduce((m, e) => Math.max(m, e.amount), 0);

    const byDayMap = new Map<string, number>();
    for (const e of expenses) {
      byDayMap.set(e.date, (byDayMap.get(e.date) || 0) + e.amount);
    }
    const avgPerDay = byDayMap.size > 0 ? total / byDayMap.size : 0;

    const byCatMap = new Map<string, number>();
    for (const e of expenses) {
      byCatMap.set(e.categoryId, (byCatMap.get(e.categoryId) || 0) + e.amount);
    }
    const topCategories: CategoryStat[] = [...byCatMap.entries()]
      .map(([id, amount]) => ({
        id,
        name: this.ps.categoryName(id),
        amount,
        pct: total > 0 ? Math.round((amount / total) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return { total, count, avg, avgPerDay, maxAmount, topCategories };
  });

  byDay = computed<DayStat[]>(() => {
    const expenses = this.ps.monthExpenses();
    const month = this.ps.currentMonth(); // YYYY-MM
    const [y, m] = month.split('-').map(Number);
    if (!y || !m) return [];
    const lastDay = new Date(y, m, 0).getDate();

    const map = new Map<string, number>();
    for (const e of expenses) map.set(e.date, (map.get(e.date) || 0) + e.amount);

    const days: { date: string; amount: number }[] = [];
    for (let d = 1; d <= lastDay; d++) {
      const date = `${month}-${String(d).padStart(2, '0')}`;
      days.push({ date, amount: map.get(date) || 0 });
    }
    const max = Math.max(0, ...days.map((d) => d.amount));
    return days.map((d) => ({
      date: d.date,
      amount: d.amount,
      pct: max > 0 ? Math.round((d.amount / max) * 100) : 0,
      label: String(parseInt(d.date.slice(-2), 10))
    }));
  });

  prevMonth = computed(() => {
    const cur = this.ps.currentMonth();
    const [y, m] = cur.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    const expenses = this.ps.expenses().filter((e) => e.date?.startsWith(prevMonth));
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    return { month: prevMonth, total, count: expenses.length };
  });

  diff = computed(() => this.ps.totalSpent() - this.prevMonth().total);
  diffPct = computed(() => {
    const prev = this.prevMonth().total;
    if (prev === 0) return 0;
    return Math.round((this.diff() / prev) * 100);
  });

  progress(catId: string): number {
    const c = this.ps.categories().find((x) => x.id === catId);
    if (!c || c.monthlyAmount === 0) return 0;
    return Math.round((this.ps.spentByCategory(catId) / c.monthlyAmount) * 100);
  }

  async saveIncome(): Promise<void> {
    this.savingIncome = true;
    try {
      await this.ps.setIncome(Number(this.income) || 0, this.currency);
    } finally {
      this.savingIncome = false;
    }
  }

  async addCategory(): Promise<void> {
    if (!this.catName || this.catAmount === null) return;
    this.addError = '';
    this.addingCategory = true;
    try {
      await this.ps.addCategory(this.catName.trim(), Number(this.catAmount));
      this.catName = '';
      this.catAmount = null;
    } catch (err: any) {
      this.addError =
        err?.error?.error || err?.message || 'No se pudo agregar la categoría';
    } finally {
      this.addingCategory = false;
    }
  }

  startEdit(c: PersonalCategory): void {
    this.editing[c.id] = true;
    this.editAmount[c.id] = c.monthlyAmount;
  }

  cancelEdit(id: string): void {
    delete this.editing[id];
  }

  async saveEdit(id: string): Promise<void> {
    const amount = this.editAmount[id];
    if (amount == null || isNaN(Number(amount))) return;
    this.savingId = id;
    try {
      await this.ps.updateCategory(id, { monthlyAmount: Number(amount) });
      delete this.editing[id];
    } finally {
      this.savingId = null;
    }
  }

  async removeCategory(id: string): Promise<void> {
    if (confirm('¿Eliminar esta categoría?')) {
      await this.ps.removeCategory(id);
    }
  }

  async removeExpense(id: string): Promise<void> {
    if (confirm('¿Eliminar este gasto?')) {
      await this.ps.removeExpense(id);
    }
  }

  expenseLink(): string {
    return `${location.origin}${location.pathname}#/gastar`;
  }

  copyLink(): void {
    navigator.clipboard?.writeText(this.expenseLink()).then(() => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 1800);
    });
  }
}
