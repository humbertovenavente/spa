import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FamilyService } from '../../services/family.service';
import { CURRENCIES } from '../../models/family.model';

interface Row {
  memberId: string;
  name: string;
  selected: boolean;
  amount: number | null;
}

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-4">
      <div class="card">
        <h2 class="text-lg font-semibold text-slate-900 mb-4">Crear presupuesto mensual</h2>

        <form (ngSubmit)="create()" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="label">Mes</label>
              <input type="month" class="input mt-1.5"
                     [(ngModel)]="month" name="month" required />
            </div>
            <div>
              <label class="label">Etiqueta</label>
              <input class="input mt-1.5" [(ngModel)]="label" name="label"
                     placeholder="Ej. Mayo 2026" />
            </div>
          </div>

          <div>
            <label class="label">Moneda</label>
            <select class="input mt-1.5" [(ngModel)]="currency" name="currency" required>
              <option *ngFor="let c of currencies" [value]="c.code">{{ c.label }}</option>
            </select>
          </div>

          <div>
            <p class="label mb-2">Miembros y aporte</p>

            <div *ngIf="rows().length === 0"
                 class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 text-center">
              Agrega miembros en la sección Familia primero.
            </div>

            <ul *ngIf="rows().length" class="space-y-2">
              <li *ngFor="let r of rows(); let i = index"
                  class="rounded-lg border border-slate-200 bg-white p-3">
                <div class="flex items-center gap-3">
                  <input type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                         [checked]="r.selected"
                         (change)="toggle(i)" />
                  <span class="flex-1 font-medium text-slate-900 truncate">{{ r.name }}</span>
                </div>
                <div *ngIf="r.selected" class="mt-2 flex items-center gap-2">
                  <span class="text-xs text-slate-500 w-16">Aporte</span>
                  <input type="number" min="0" step="0.01" class="input"
                         [ngModel]="r.amount" (ngModelChange)="setAmount(i, $event)"
                         [name]="'amt_' + r.memberId" placeholder="0.00" />
                </div>
              </li>
            </ul>
          </div>

          <div *ngIf="selectedCount() > 0"
               class="rounded-lg bg-brand-50 border border-brand-200 p-3 text-sm text-slate-700 flex items-center justify-between">
            <span>
              <b>{{ selectedCount() }}</b> miembro(s) ·
              Total <b class="text-brand-700">{{ totalSum() | currency:currency:'symbol':'1.2-2' }}</b>
            </span>
          </div>

          <button type="submit" class="btn-primary w-full"
                  [disabled]="!month || selectedCount() === 0 || totalSum() === 0">
            Crear presupuesto
          </button>
        </form>
      </div>

      <div class="card">
        <h2 class="text-lg font-semibold text-slate-900 mb-3">Presupuestos</h2>

        <div *ngIf="fs.budgets().length === 0" class="text-center text-slate-500 py-6 text-sm">
          Aún no hay presupuestos.
        </div>

        <ul class="space-y-2">
          <li *ngFor="let b of fs.budgets()"
              class="rounded-lg border border-slate-200 bg-white p-3">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <p class="font-medium text-slate-900 truncate">{{ b.label || b.month }}</p>
                  <span *ngIf="b.id === fs.activeBudget()?.id" class="badge-success">Activo</span>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">
                  {{ b.month }} · {{ b.assignments.length }} miembro(s) ·
                  Total {{ b.totalAmount | currency:b.currency:'symbol':'1.2-2' }}
                </p>
              </div>
              <div class="flex gap-2 shrink-0">
                <button *ngIf="b.id !== fs.activeBudget()?.id" type="button"
                        class="btn-ghost !px-3 !py-1.5 !min-h-0 text-xs"
                        (click)="fs.setActiveBudget(b.id)">Activar</button>
                <button type="button"
                        class="btn-ghost !px-3 !py-1.5 !min-h-0 text-xs"
                        (click)="remove(b.id)">Eliminar</button>
              </div>
            </div>

            <div *ngIf="b.id === fs.activeBudget()?.id && b.assignments.length"
                 class="mt-3 rounded-lg bg-brand-50 border border-brand-200 p-3">
              <p class="text-xs font-medium text-brand-700">Link para compartir</p>
              <p class="text-xs text-slate-600 mt-0.5">
                Quien lo abra elige su nombre y registra sus pagos.
              </p>
              <div class="mt-2 flex items-center gap-2 text-xs">
                <input type="text" readonly
                       [value]="generalLink()"
                       class="flex-1 min-w-0 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-slate-700 truncate" />
                <button type="button"
                        class="font-medium text-brand-600 hover:text-brand-700 underline shrink-0"
                        (click)="copyGeneral()">
                  {{ copiedGeneral ? 'Copiado' : 'Copiar' }}
                </button>
              </div>
            </div>

            <details *ngIf="b.assignments.length" class="mt-3">
              <summary class="text-xs text-brand-600 hover:text-brand-700 cursor-pointer select-none">
                Ver desglose
              </summary>
              <ul class="mt-2 divide-y divide-slate-100">
                <li *ngFor="let a of b.assignments"
                    class="py-2 first:pt-0 flex items-center justify-between gap-3">
                  <span class="font-medium text-slate-900 truncate">{{ memberName(a.memberId) }}</span>
                  <span class="text-sm font-medium text-slate-700 shrink-0">
                    {{ a.amount | currency:b.currency:'symbol':'1.2-2' }}
                  </span>
                </li>
              </ul>
            </details>
          </li>
        </ul>
      </div>
    </section>
  `
})
export class BudgetComponent {
  fs = inject(FamilyService);
  currencies = CURRENCIES;

  month = new Date().toISOString().slice(0, 7);
  label = '';
  currency = 'USD';

  rows = signal<Row[]>(this.buildRows());

  selectedCount = computed(() => this.rows().filter((r) => r.selected).length);
  totalSum = computed(() =>
    this.rows()
      .filter((r) => r.selected)
      .reduce((s, r) => s + (Number(r.amount) || 0), 0)
  );

  constructor() {
    // Rebuild rows whenever member list changes.
    effect(() => {
      const members = this.fs.members();
      const current = this.rows();
      const map = new Map(current.map((r) => [r.memberId, r]));
      const next: Row[] = members.map((m) => {
        const existing = map.get(m.id);
        return existing ?? {
          memberId: m.id,
          name: m.name,
          selected: true,
          amount: m.monthlyContribution || null
        };
      });
      // Only update if structurally different (avoid effect ping-pong).
      if (next.length !== current.length || next.some((r, i) => r.memberId !== current[i]?.memberId)) {
        this.rows.set(next);
      } else {
        // Sync names if changed
        const nextSynced = next.map((r, i) => ({ ...r, name: members[i]?.name ?? r.name }));
        const namesChanged = nextSynced.some((r, i) => r.name !== current[i]?.name);
        if (namesChanged) this.rows.set(nextSynced);
      }
    });
  }

  private buildRows(): Row[] {
    return this.fs.members().map((m) => ({
      memberId: m.id,
      name: m.name,
      selected: true,
      amount: m.monthlyContribution || null
    }));
  }

  toggle(i: number): void {
    this.rows.update((rs) => rs.map((r, idx) => (idx === i ? { ...r, selected: !r.selected } : r)));
  }

  setAmount(i: number, value: number | null): void {
    this.rows.update((rs) =>
      rs.map((r, idx) => (idx === i ? { ...r, amount: value === null ? null : Number(value) } : r))
    );
  }

  memberName(id: string): string {
    return this.fs.getMember(id)?.name ?? '—';
  }

  generalLink(): string {
    return `${location.origin}${location.pathname}#/aporta`;
  }

  copiedGeneral = false;
  copyGeneral(): void {
    navigator.clipboard?.writeText(this.generalLink()).then(() => {
      this.copiedGeneral = true;
      setTimeout(() => (this.copiedGeneral = false), 1800);
    });
  }

  create(): void {
    if (!this.month) return;
    const assignments = this.rows()
      .filter((r) => r.selected && (r.amount ?? 0) > 0)
      .map((r) => ({ memberId: r.memberId, amount: Number(r.amount) }));
    if (assignments.length === 0) return;

    const label = this.label.trim() || this.month;
    this.fs.createBudget(this.month, label, this.currency, assignments);
    this.label = '';
    this.rows.set(this.buildRows());
  }

  remove(id: string): void {
    if (confirm('¿Eliminar este presupuesto y sus pagos asociados?')) {
      this.fs.removeBudget(id);
    }
  }
}
