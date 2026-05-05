import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FamilyService } from '../../services/family.service';

interface Row {
  id: string;
  name: string;
  assigned: number;
  paid: number;
  remaining: number;
  progress: number;
}

@Component({
  selector: 'app-summary',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="space-y-4">
      <div class="card">
        <h2 class="text-lg font-semibold text-slate-900">Resumen del mes</h2>
        <p class="text-sm text-slate-500 mt-1" *ngIf="fs.activeBudget(); else nob">
          {{ fs.activeBudget()!.label }} · Total
          <b class="text-slate-900">
            {{ fs.activeBudget()!.totalAmount | currency:currency():'symbol':'1.2-2' }}
          </b>
          · {{ fs.activeBudget()!.assignments.length }} miembro(s)
        </p>
        <ng-template #nob>
          <p class="text-sm text-slate-500 mt-1">No hay presupuesto activo.</p>
          <a routerLink="/presupuesto" class="btn-primary mt-3 inline-flex">Crear presupuesto</a>
        </ng-template>
      </div>

      <div class="card" *ngIf="fs.activeBudget()">
        <div class="flex justify-between text-sm mb-1.5">
          <span class="text-slate-500">Total aportado</span>
          <span class="font-medium text-slate-900">
            {{ totalPaid() | currency:currency():'symbol':'1.2-2' }} /
            {{ fs.activeBudget()!.totalAmount | currency:currency():'symbol':'1.2-2' }}
          </span>
        </div>
        <div class="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
          <div class="h-full bg-brand-600 transition-all"
               [style.width.%]="globalProgress()"></div>
        </div>
        <p class="text-xs text-slate-500 mt-2">
          Pendiente:
          <b class="text-amber-700">
            {{ (fs.activeBudget()!.totalAmount - totalPaid()) | currency:currency():'symbol':'1.2-2' }}
          </b>
        </p>
      </div>

      <div class="card" *ngIf="fs.activeBudget() && rows().length">
        <p class="text-xs font-medium text-brand-700">Link general para aportar</p>
        <p class="text-xs text-slate-600 mt-0.5">
          Comparte este link. Cada persona elige su nombre y registra sus pagos.
        </p>
        <div class="mt-2 flex items-center gap-2 text-xs">
          <input type="text" readonly [value]="generalLink()"
                 class="flex-1 min-w-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-700 truncate" />
          <button type="button"
                  class="font-medium text-brand-600 hover:text-brand-700 underline shrink-0"
                  (click)="copyGeneral()">
            {{ copiedGeneral ? 'Copiado' : 'Copiar' }}
          </button>
        </div>
      </div>

      <div class="card" *ngIf="rows().length; else empty">
        <h3 class="text-lg font-semibold text-slate-900 mb-3">Por miembro</h3>
        <ul class="space-y-3">
          <li *ngFor="let r of rows()"
              class="rounded-lg border border-slate-200 bg-white p-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-medium text-slate-900 truncate">{{ r.name }}</p>
                <p class="text-xs text-slate-500 mt-0.5">
                  Le toca: {{ r.assigned | currency:currency():'symbol':'1.2-2' }} ·
                  Pagado: {{ r.paid | currency:currency():'symbol':'1.2-2' }}
                </p>
              </div>
              <span [class]="r.remaining <= 0 ? 'badge-success' : 'badge-warning'">
                {{ r.remaining <= 0 ? 'Listo' : ('Falta ' + (r.remaining | currency:currency():'symbol':'1.2-2')) }}
              </span>
            </div>
            <div class="mt-2">
              <div class="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div class="h-full transition-all"
                     [class.bg-emerald-500]="r.remaining <= 0"
                     [class.bg-brand-600]="r.remaining > 0"
                     [style.width.%]="r.progress"></div>
              </div>
            </div>
            <div class="mt-2">
              <a [routerLink]="['/pagar', r.id]"
                 class="text-xs font-medium text-brand-600 hover:text-brand-700 underline">
                Abrir página de pago
              </a>
            </div>
          </li>
        </ul>
      </div>

      <ng-template #empty>
        <div class="card text-center text-slate-500 py-8 text-sm">
          Crea un presupuesto y asigna miembros para ver el resumen.
        </div>
      </ng-template>
    </section>
  `
})
export class SummaryComponent {
  fs = inject(FamilyService);

  currency = computed(() => this.fs.activeCurrency());

  rows = computed<Row[]>(() => {
    const b = this.fs.activeBudget();
    if (!b) return [];
    return b.assignments
      .map((a) => {
        const m = this.fs.getMember(a.memberId);
        if (!m) return null;
        const paid = this.fs.totalPaidByMember(m.id);
        const remaining = Math.max(0, a.amount - paid);
        const progress = a.amount > 0 ? Math.min(100, Math.round((paid / a.amount) * 100)) : 0;
        return {
          id: m.id,
          name: m.name,
          assigned: a.amount,
          paid,
          remaining,
          progress
        } as Row;
      })
      .filter((r): r is Row => r !== null);
  });

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

  totalPaid = computed(() =>
    this.rows().reduce((s, r) => s + r.paid, 0)
  );

  globalProgress = computed(() => {
    const b = this.fs.activeBudget();
    if (!b || b.totalAmount === 0) return 0;
    return Math.min(100, Math.round((this.totalPaid() / b.totalAmount) * 100));
  });

}
