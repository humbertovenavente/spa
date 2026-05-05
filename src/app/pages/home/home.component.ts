import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FamilyService } from '../../services/family.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="space-y-4">
      <div class="card">
        <h2 class="text-xl font-semibold text-slate-900">Hola</h2>
        <p class="text-sm text-slate-500 mt-1">
          Lleva los gastos de tu familia, registra cuánto aporta cada uno y verifica los pagos.
        </p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="card">
          <p class="text-xs text-slate-500">Miembros</p>
          <p class="text-2xl font-semibold text-slate-900 mt-1">{{ memberCount() }}</p>
        </div>
        <div class="card">
          <p class="text-xs text-slate-500">Asignados al mes</p>
          <p class="text-2xl font-semibold text-slate-900 mt-1">{{ assignedCount() }}</p>
        </div>
      </div>

      <div class="card">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs text-slate-500">Presupuesto activo</p>
            <p class="text-lg font-semibold text-slate-900 mt-1">
              {{ activeBudget()?.label || 'Sin presupuesto' }}
            </p>
          </div>
          <span *ngIf="activeBudget()" class="badge-info">{{ activeBudget()!.month }}</span>
        </div>

        <ng-container *ngIf="activeBudget(); else noBudget">
          <div class="mt-4">
            <p class="text-xs text-slate-500">Total mes</p>
            <p class="text-2xl font-semibold text-slate-900 mt-1">
              {{ activeBudget()!.totalAmount | currency:currency():'symbol':'1.2-2' }}
            </p>
          </div>

          <div class="mt-4">
            <div class="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>Pagado</span>
              <span class="font-medium text-slate-700">{{ progress() }}%</span>
            </div>
            <div class="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div class="h-full bg-brand-600 transition-all" [style.width.%]="progress()"></div>
            </div>
          </div>
        </ng-container>

        <ng-template #noBudget>
          <p class="text-sm text-slate-500 mt-3">Crea un presupuesto mensual para empezar.</p>
          <a routerLink="/presupuesto" class="btn-primary mt-3 inline-flex">Crear presupuesto</a>
        </ng-template>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <a routerLink="/familia"
           class="card hover:border-brand-400 hover:shadow-md transition flex flex-col items-start gap-1">
          <p class="font-semibold text-slate-900">Gestionar familia</p>
          <p class="text-xs text-slate-500">Agrega miembros y su aporte mensual.</p>
        </a>
        <a routerLink="/presupuesto"
           class="card hover:border-brand-400 hover:shadow-md transition flex flex-col items-start gap-1">
          <p class="font-semibold text-slate-900">Presupuesto del mes</p>
          <p class="text-xs text-slate-500">Elige miembros y cuánto aporta cada uno.</p>
        </a>
        <a routerLink="/resumen"
           class="card hover:border-brand-400 hover:shadow-md transition flex flex-col items-start gap-1">
          <p class="font-semibold text-slate-900">Ver resumen</p>
          <p class="text-xs text-slate-500">Quién pagó y quién falta.</p>
        </a>
      </div>
    </section>
  `
})
export class HomeComponent {
  private fs = inject(FamilyService);

  memberCount = computed(() => this.fs.members().length);
  assignedCount = computed(() => this.fs.activeBudget()?.assignments.length ?? 0);
  activeBudget = computed(() => this.fs.activeBudget());
  currency = computed(() => this.fs.activeCurrency());

  progress = computed(() => {
    const b = this.fs.activeBudget();
    if (!b || b.totalAmount === 0) return 0;
    const total = b.assignments.reduce(
      (s, a) => s + this.fs.totalPaidByMember(a.memberId),
      0
    );
    return Math.min(100, Math.round((total / b.totalAmount) * 100));
  });
}
