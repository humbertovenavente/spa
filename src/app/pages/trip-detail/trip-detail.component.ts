import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TripService, Transfer } from '../../services/trip.service';
import { FamilyService } from '../../services/family.service';

@Component({
  selector: 'app-trip-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="space-y-4" *ngIf="trip(); else loading">
      <div class="card">
        <a routerLink="/viajes" class="text-xs text-brand-600 hover:text-brand-700 underline">← Viajes</a>
        <h2 class="text-2xl font-semibold text-slate-900 mt-1">{{ trip()!.name }}</h2>
        <p class="text-sm text-slate-500 mt-1">
          <span *ngIf="trip()!.startDate">{{ trip()!.startDate }}</span>
          <span *ngIf="trip()!.endDate"> → {{ trip()!.endDate }}</span>
          · {{ trip()!.currency }}
          · {{ trip()!.participants.length }} participantes
        </p>

        <div class="mt-4 grid grid-cols-2 gap-3">
          <div class="rounded-lg border border-slate-200 p-3">
            <p class="text-xs text-slate-500">Gastado</p>
            <p class="text-lg font-semibold text-slate-900 mt-0.5">
              {{ totalSpent() | currency:trip()!.currency:'symbol':'1.2-2' }}
            </p>
          </div>
          <div class="rounded-lg border border-slate-200 p-3">
            <p class="text-xs text-slate-500">Presupuesto total</p>
            <p class="text-lg font-semibold text-slate-900 mt-0.5">
              {{ totalBudget() | currency:trip()!.currency:'symbol':'1.2-2' }}
            </p>
          </div>
        </div>

        <button type="button" class="btn-danger w-full mt-4" (click)="deleteTrip()">
          Eliminar viaje
        </button>
      </div>

      <!-- Participantes: presupuesto editable + estadísticas -->
      <div class="card" *ngIf="participantStats().length">
        <h3 class="text-lg font-semibold text-slate-900 mb-3">Participantes</h3>
        <ul class="space-y-3">
          <li *ngFor="let p of participantStats()"
              class="rounded-lg border border-slate-200 bg-white p-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="font-medium text-slate-900 truncate">{{ p.name }}</p>
                <div class="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500">
                  <span>Pagó: <b class="text-slate-700">{{ p.paid | currency:trip()!.currency:'symbol':'1.2-2' }}</b></span>
                  <span>Gastó: <b class="text-slate-700">{{ p.spent | currency:trip()!.currency:'symbol':'1.2-2' }}</b></span>
                  <ng-container *ngIf="!editing[p.memberId]">
                    <span class="col-span-2">
                      Presupuesto:
                      <b class="text-slate-700">
                        {{ p.budget | currency:trip()!.currency:'symbol':'1.2-2' }}
                      </b>
                    </span>
                  </ng-container>
                </div>

                <div *ngIf="editing[p.memberId]" class="mt-2 flex items-center gap-2">
                  <span class="text-xs text-slate-500 w-20">Presupuesto</span>
                  <input type="number" min="0" step="0.01" class="input"
                         [(ngModel)]="editBudget[p.memberId]"
                         [name]="'edit_' + p.memberId" />
                  <button type="button"
                          class="btn-success !px-3 !py-1.5 !min-h-0 text-xs"
                          (click)="saveBudget(p.memberId)"
                          [disabled]="savingBudget === p.memberId">
                    {{ savingBudget === p.memberId ? '…' : 'Guardar' }}
                  </button>
                  <button type="button"
                          class="btn-ghost !px-3 !py-1.5 !min-h-0 text-xs"
                          (click)="cancelEditBudget(p.memberId)">Cancelar</button>
                </div>
              </div>

              <div class="flex flex-col items-end gap-2 shrink-0">
                <span [class]="p.over > 0 ? 'badge-warning !bg-rose-50 !text-rose-700 !border-rose-200'
                                : (p.budget > 0 ? 'badge-success' : 'badge')">
                  <ng-container *ngIf="p.over > 0; else okBadge">
                    Excede {{ p.over | currency:trip()!.currency:'symbol':'1.2-2' }}
                  </ng-container>
                  <ng-template #okBadge>
                    <ng-container *ngIf="p.budget > 0; else noBudget">
                      Disponible {{ p.remaining | currency:trip()!.currency:'symbol':'1.2-2' }}
                    </ng-container>
                    <ng-template #noBudget>—</ng-template>
                  </ng-template>
                </span>
                <button *ngIf="!editing[p.memberId]" type="button"
                        class="btn-ghost !px-3 !py-1.5 !min-h-0 text-xs"
                        (click)="startEditBudget(p.memberId, p.budget)">Editar</button>
              </div>
            </div>

            <div class="mt-2" *ngIf="!editing[p.memberId] && (p.budget > 0 || p.spent > 0)">
              <div class="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div class="h-full transition-all"
                     [class.bg-emerald-500]="p.pct <= 80"
                     [class.bg-amber-500]="p.pct > 80 && p.pct <= 100"
                     [class.bg-rose-500]="p.pct > 100"
                     [style.width.%]="Math.min(100, p.pct)"></div>
              </div>
              <div class="flex justify-between text-xs mt-1">
                <span [class.text-slate-500]="p.pct <= 100"
                      [class.text-rose-600]="p.pct > 100">
                  {{ p.pct | number:'1.0-0' }}% del presupuesto
                </span>
                <span [class.text-emerald-700]="p.balance >= 0"
                      [class.text-rose-700]="p.balance < 0"
                      class="font-medium">
                  {{ p.balance >= 0 ? 'Saldo a favor ' : 'Saldo en contra ' }}
                  {{ Math.abs(p.balance) | currency:trip()!.currency:'symbol':'1.2-2' }}
                </span>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <div class="card">
        <p class="text-xs font-medium text-brand-700">Link para compartir</p>
        <p class="text-xs text-slate-600 mt-0.5">
          Cada participante elige su nombre y registra los gastos.
        </p>
        <div class="mt-2 flex items-center gap-2 text-xs">
          <input type="text" readonly [value]="publicLink()"
                 class="flex-1 min-w-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-700 truncate" />
          <a [href]="publicLink()" target="_blank"
             class="font-medium text-brand-600 hover:text-brand-700 underline shrink-0">Abrir</a>
          <button type="button"
                  class="font-medium text-brand-600 hover:text-brand-700 underline shrink-0"
                  (click)="copyLink()">{{ copied ? 'Copiado' : 'Copiar' }}</button>
        </div>
      </div>

      <!-- Balances -->
      <div class="card" *ngIf="transfers().length || trip()!.expenses.length">
        <h3 class="text-lg font-semibold text-slate-900 mb-3">Quién le debe a quién</h3>
        <div *ngIf="transfers().length === 0" class="text-sm text-slate-500 text-center py-2">
          Todo cuadrado.
        </div>
        <ul class="space-y-2">
          <li *ngFor="let t of transfers()"
              class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm flex items-center justify-between gap-3">
            <span class="text-slate-700 truncate">
              <b class="text-slate-900">{{ memberName(t.from) }}</b> debe a
              <b class="text-slate-900">{{ memberName(t.to) }}</b>
            </span>
            <span class="font-semibold text-amber-800 shrink-0">
              {{ t.amount | currency:trip()!.currency:'symbol':'1.2-2' }}
            </span>
          </li>
        </ul>
      </div>

      <!-- Expenses list -->
      <div class="card" *ngIf="trip()!.expenses.length">
        <h3 class="text-lg font-semibold text-slate-900 mb-3">
          Gastos <span class="text-slate-400 font-normal">({{ trip()!.expenses.length }})</span>
        </h3>
        <ul class="divide-y divide-slate-100">
          <li *ngFor="let e of trip()!.expenses" class="py-3 first:pt-0 last:pb-0">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-medium text-slate-900 truncate">
                  {{ e.description || 'Gasto' }}
                </p>
                <p class="text-xs text-slate-500 mt-0.5">
                  {{ e.date }} · Pagó <b>{{ memberName(e.payerId) }}</b>
                  <span *ngIf="e.shared"> · compartido</span>
                </p>
                <ul *ngIf="e.shared" class="mt-1 space-y-0.5">
                  <li *ngFor="let s of e.splits"
                      class="text-xs text-slate-600">
                    {{ memberName(s.memberId) }}:
                    {{ s.amount | currency:trip()!.currency:'symbol':'1.2-2' }}
                  </li>
                </ul>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="font-semibold text-slate-900">
                  {{ e.amount | currency:trip()!.currency:'symbol':'1.2-2' }}
                </span>
                <button type="button"
                        class="btn-ghost !px-2.5 !py-1 !min-h-0 text-xs"
                        (click)="deleteExpense(e.id)">×</button>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <ng-template #loading>
      <div class="card text-center text-slate-500 py-8 text-sm">Cargando viaje…</div>
    </ng-template>
  `
})
export class TripDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  ts = inject(TripService);
  fs = inject(FamilyService);
  Math = Math;

  tripId = this.route.snapshot.paramMap.get('id') || '';
  trip = computed(() => this.ts.currentTrip());

  copied = false;

  editing: Record<string, boolean> = {};
  editBudget: Record<string, number> = {};
  savingBudget: string | null = null;

  constructor() {
    void this.ts.loadTrip(this.tripId);
  }

  memberName(id: string): string {
    return this.fs.getMember(id)?.name ?? '—';
  }

  totalSpent = computed(() =>
    (this.trip()?.expenses ?? []).reduce((s, e) => s + e.amount, 0)
  );

  totalBudget = computed(() =>
    (this.trip()?.participants ?? []).reduce((s, p) => s + (p.budget || 0), 0)
  );

  transfers = computed<Transfer[]>(() => {
    const t = this.trip();
    return t ? TripService.settle(t) : [];
  });

  participantStats = computed(() => {
    const t = this.trip();
    if (!t) return [];
    return t.participants.map((p) => {
      const budget = p.budget || 0;
      const spent = TripService.spentByMember(t, p.memberId);
      const paid = t.expenses
        .filter((e) => e.payerId === p.memberId)
        .reduce((s, e) => s + e.amount, 0);
      const balance = paid - spent;
      const remaining = Math.max(0, budget - spent);
      const over = Math.max(0, spent - budget);
      const pct = budget > 0 ? (spent / budget) * 100 : spent > 0 ? 100 : 0;
      return {
        memberId: p.memberId,
        name: this.memberName(p.memberId),
        budget,
        spent,
        paid,
        balance,
        remaining,
        over,
        pct
      };
    });
  });

  startEditBudget(memberId: string, current: number): void {
    this.editing[memberId] = true;
    this.editBudget[memberId] = current;
  }

  cancelEditBudget(memberId: string): void {
    delete this.editing[memberId];
  }

  async saveBudget(memberId: string): Promise<void> {
    const trip = this.trip();
    if (!trip) return;
    const newAmount = Number(this.editBudget[memberId]) || 0;
    this.savingBudget = memberId;
    try {
      const updated = trip.participants.map((p) =>
        p.memberId === memberId ? { ...p, budget: newAmount } : p
      );
      await this.ts.updateTrip(trip.id, { participants: updated });
      delete this.editing[memberId];
    } finally {
      this.savingBudget = null;
    }
  }

  async deleteExpense(id: string): Promise<void> {
    if (confirm('¿Eliminar este gasto?')) {
      await this.ts.removeExpense(this.tripId, id);
    }
  }

  async deleteTrip(): Promise<void> {
    if (confirm('¿Eliminar este viaje y todos sus gastos?')) {
      await this.ts.deleteTrip(this.tripId);
      this.router.navigateByUrl('/viajes');
    }
  }

  publicLink(): string {
    return `${location.origin}${location.pathname}#/viaje/${this.tripId}`;
  }

  copyLink(): void {
    navigator.clipboard?.writeText(this.publicLink()).then(() => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 1800);
    });
  }
}
