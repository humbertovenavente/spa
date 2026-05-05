import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FamilyService } from '../../services/family.service';

interface PickerRow {
  id: string;
  name: string;
  assigned: number;
  paid: number;
  remaining: number;
}

@Component({
  selector: 'app-picker',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="space-y-4">
      <div class="card text-center">
        <p class="text-xs uppercase tracking-wide text-slate-500">Aportar al presupuesto</p>
        <h2 class="text-2xl font-semibold text-slate-900 mt-1">¿Quién eres?</h2>
        <p class="text-sm text-slate-500 mt-1">
          Elige tu nombre para registrar tus pagos.
        </p>
      </div>

      <ng-container *ngIf="fs.activeBudget(); else noBudget">
        <div class="card">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs text-slate-500">Presupuesto</p>
              <p class="font-medium text-slate-900">{{ fs.activeBudget()!.label }}</p>
            </div>
            <span class="badge-info">{{ fs.activeBudget()!.month }}</span>
          </div>
          <div class="mt-3">
            <p class="text-xs text-slate-500">Total mes</p>
            <p class="text-xl font-semibold text-slate-900">
              {{ fs.activeBudget()!.totalAmount | currency:fs.activeCurrency():'symbol':'1.2-2' }}
            </p>
          </div>
        </div>

        <div class="card" *ngIf="rows().length; else noPeople">
          <ul class="space-y-2">
            <li *ngFor="let r of rows()">
              <a [routerLink]="['/pagar', r.id]"
                 class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:border-brand-400 hover:shadow-sm transition">
                <div class="min-w-0">
                  <p class="font-semibold text-slate-900 truncate">{{ r.name }}</p>
                  <p class="text-xs text-slate-500 mt-0.5">
                    Le toca:
                    <b class="text-slate-700">
                      {{ r.assigned | currency:fs.activeCurrency():'symbol':'1.2-2' }}
                    </b>
                    · Pagado:
                    <b class="text-slate-700">
                      {{ r.paid | currency:fs.activeCurrency():'symbol':'1.2-2' }}
                    </b>
                  </p>
                </div>
                <span [class]="r.remaining <= 0 ? 'badge-success' : 'badge-warning'">
                  {{ r.remaining <= 0 ? 'Listo' : ('Falta ' + (r.remaining | currency:fs.activeCurrency():'symbol':'1.2-2')) }}
                </span>
              </a>
            </li>
          </ul>
        </div>

        <ng-template #noPeople>
          <div class="card text-center text-slate-500 py-8 text-sm">
            Este presupuesto aún no tiene miembros asignados.
          </div>
        </ng-template>
      </ng-container>

      <ng-template #noBudget>
        <div class="card text-center text-slate-500 py-8 text-sm">
          No hay presupuesto activo.
        </div>
      </ng-template>
    </section>
  `
})
export class PickerComponent {
  fs = inject(FamilyService);

  rows = computed<PickerRow[]>(() => {
    const b = this.fs.activeBudget();
    if (!b) return [];
    return b.assignments
      .map((a) => {
        const m = this.fs.getMember(a.memberId);
        if (!m) return null;
        const paid = this.fs.totalPaidByMember(m.id);
        return {
          id: m.id,
          name: m.name,
          assigned: a.amount,
          paid,
          remaining: Math.max(0, a.amount - paid)
        } as PickerRow;
      })
      .filter((r): r is PickerRow => r !== null);
  });
}
