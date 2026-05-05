import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PersonalService } from '../../services/personal.service';

@Component({
  selector: 'app-expense',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="space-y-4">
      <div class="card text-center">
        <p class="text-xs uppercase tracking-wide text-slate-500">Gastos personales</p>
        <h2 class="text-2xl font-semibold text-slate-900 mt-1">Registrar gasto</h2>
      </div>

      <div class="card" *ngIf="ps.categories().length; else noCats">
        <form (ngSubmit)="submit()" class="space-y-3">
          <div>
            <label class="label">Categoría</label>
            <select class="input mt-1.5" [(ngModel)]="categoryId" name="categoryId" required>
              <option value="" disabled>— Elige una —</option>
              <option *ngFor="let c of ps.categories()" [value]="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Monto</label>
              <input class="input mt-1.5" type="number" min="0" step="0.01"
                     [(ngModel)]="amount" name="amount" placeholder="0.00" required />
            </div>
            <div>
              <label class="label">Fecha</label>
              <input class="input mt-1.5" type="date" [(ngModel)]="date" name="date" required />
            </div>
          </div>
          <div>
            <label class="label">Nota (opcional)</label>
            <textarea class="input mt-1.5" rows="2" [(ngModel)]="note" name="note"
                      placeholder="Ej. almuerzo"></textarea>
          </div>
          <button type="submit" class="btn-success w-full"
                  [disabled]="!categoryId || !amount || !date || sending()">
            {{ sending() ? 'Enviando…' : 'Registrar gasto' }}
          </button>
          <p *ngIf="justSent()" class="text-center text-emerald-600 text-sm font-medium">
            Gasto registrado
          </p>
        </form>
      </div>

      <div class="card" *ngIf="ps.expenses().length">
        <h3 class="text-lg font-semibold text-slate-900 mb-3">Tus gastos</h3>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p class="text-xs text-slate-500">Gastado este mes</p>
            <p class="font-semibold text-slate-900">
              {{ ps.totalSpent() | currency:ps.currency():'symbol':'1.2-2' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-slate-500">Restante</p>
            <p class="font-semibold"
               [class.text-emerald-600]="ps.remaining() >= 0"
               [class.text-rose-600]="ps.remaining() < 0">
              {{ ps.remaining() | currency:ps.currency():'symbol':'1.2-2' }}
            </p>
          </div>
        </div>
        <ul class="divide-y divide-slate-100">
          <li *ngFor="let e of ps.expenses() | slice:0:15" class="py-2.5 first:pt-0 last:pb-0">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="font-medium text-slate-900 truncate">
                  {{ ps.categoryName(e.categoryId) }}
                </p>
                <p class="text-xs text-slate-500 mt-0.5">
                  {{ e.date }}<span *ngIf="e.note"> · {{ e.note }}</span>
                </p>
              </div>
              <span class="font-semibold text-slate-900 shrink-0">
                {{ e.amount | currency:ps.currency():'symbol':'1.2-2' }}
              </span>
            </div>
          </li>
        </ul>
      </div>

      <ng-template #noCats>
        <div class="card text-center text-slate-500 py-8 text-sm">
          Aún no hay categorías de presupuesto.
        </div>
      </ng-template>
    </section>
  `
})
export class ExpenseComponent {
  ps = inject(PersonalService);

  categoryId = '';
  amount: number | null = null;
  date = new Date().toISOString().slice(0, 10);
  note = '';
  sending = signal(false);
  justSent = signal(false);

  async submit(): Promise<void> {
    if (!this.categoryId || !this.amount || !this.date) return;
    this.sending.set(true);
    try {
      await this.ps.addExpense({
        categoryId: this.categoryId,
        amount: Number(this.amount),
        date: this.date,
        note: this.note.trim() || undefined
      });
      this.amount = null;
      this.note = '';
      this.justSent.set(true);
      setTimeout(() => this.justSent.set(false), 2200);
    } finally {
      this.sending.set(false);
    }
  }
}
