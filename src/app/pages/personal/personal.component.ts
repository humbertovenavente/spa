import { Component, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PersonalService } from '../../services/personal.service';
import { CURRENCIES } from '../../models/family.model';

@Component({
  selector: 'app-personal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-4">
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
                  [disabled]="!catName || catAmount === null">
            Agregar categoría
          </button>
        </form>

        <div *ngIf="ps.categories().length === 0" class="text-center text-slate-500 py-6 text-sm">
          Aún no tienes categorías.
        </div>

        <ul class="space-y-3">
          <li *ngFor="let c of ps.categories()"
              class="rounded-lg border border-slate-200 bg-white p-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-medium text-slate-900 truncate">{{ c.name }}</p>
                <p class="text-xs text-slate-500 mt-0.5">
                  Presupuesto: {{ c.monthlyAmount | currency:ps.currency():'symbol':'1.2-2' }} ·
                  Gastado: {{ ps.spentByCategory(c.id) | currency:ps.currency():'symbol':'1.2-2' }}
                </p>
              </div>
              <button type="button"
                      class="btn-ghost !px-3 !py-1.5 !min-h-0 text-xs"
                      (click)="removeCategory(c.id)">Eliminar</button>
            </div>
            <div class="mt-2">
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
      </div>

      <div class="card" *ngIf="ps.categories().length">
        <p class="text-xs font-medium text-brand-700">Link para registrar gastos</p>
        <p class="text-xs text-slate-600 mt-0.5">
          Ábrelo desde el celular para anotar gastos al instante.
        </p>
        <div class="mt-2 flex items-center gap-2 text-xs">
          <input type="text" readonly [value]="expenseLink()"
                 class="flex-1 min-w-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-700 truncate" />
          <button type="button"
                  class="font-medium text-brand-600 hover:text-brand-700 underline shrink-0"
                  (click)="copyLink()">
            {{ copied ? 'Copiado' : 'Copiar' }}
          </button>
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
    await this.ps.addCategory(this.catName.trim(), Number(this.catAmount));
    this.catName = '';
    this.catAmount = null;
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
