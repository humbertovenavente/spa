import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TripService, Transfer } from '../../services/trip.service';
import { FamilyService } from '../../services/family.service';
import { TripDetail } from '../../models/trip.model';

interface SplitInput {
  memberId: string;
  name: string;
  amount: number;
  selected: boolean;
}

@Component({
  selector: 'app-trip-person',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="space-y-4" *ngIf="trip() && member(); else loading">
      <div class="card">
        <a [routerLink]="['/viaje', tripId]"
           class="text-xs font-medium text-brand-600 hover:text-brand-700 underline">
          ← Cambiar de persona
        </a>
        <h2 class="text-2xl font-semibold text-slate-900 mt-2">{{ member()!.name }}</h2>
        <p class="text-sm text-slate-500 mt-1">{{ trip()!.name }}</p>

        <div class="grid grid-cols-2 gap-3 mt-4">
          <div class="rounded-lg border p-3"
               [class.border-emerald-200]="balance() >= 0"
               [class.bg-emerald-50]="balance() >= 0"
               [class.border-rose-200]="balance() < 0"
               [class.bg-rose-50]="balance() < 0">
            <p class="text-xs"
               [class.text-emerald-700]="balance() >= 0"
               [class.text-rose-700]="balance() < 0">
              {{ balance() >= 0 ? 'Te deben' : 'Debes' }}
            </p>
            <p class="text-lg font-semibold mt-0.5"
               [class.text-emerald-700]="balance() >= 0"
               [class.text-rose-700]="balance() < 0">
              {{ Math.abs(balance()) | currency:trip()!.currency:'symbol':'1.2-2' }}
            </p>
          </div>
          <div class="rounded-lg border p-3"
               [class.border-rose-200]="myOver() > 0"
               [class.bg-rose-50]="myOver() > 0"
               [class.border-slate-200]="myOver() === 0">
            <p class="text-xs"
               [class.text-rose-700]="myOver() > 0"
               [class.text-slate-500]="myOver() === 0">
              Tu parte gastada
            </p>
            <p class="text-lg font-semibold mt-0.5"
               [class.text-rose-700]="myOver() > 0"
               [class.text-slate-900]="myOver() === 0">
              {{ mySpent() | currency:trip()!.currency:'symbol':'1.2-2' }}
              <span *ngIf="myBudget() > 0" class="text-sm font-normal text-slate-500">
                / {{ myBudget() | currency:trip()!.currency:'symbol':'1.2-2' }}
              </span>
            </p>
          </div>
        </div>

        <!-- Estado del presupuesto personal -->
        <div class="mt-4" *ngIf="myBudget() > 0 || mySpent() > 0">
          <div class="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div class="h-full transition-all"
                 [class.bg-emerald-500]="myPct() <= 80"
                 [class.bg-amber-500]="myPct() > 80 && myPct() <= 100"
                 [class.bg-rose-500]="myPct() > 100"
                 [style.width.%]="Math.min(100, myPct())"></div>
          </div>
          <div class="flex justify-between text-xs mt-1.5">
            <span class="text-slate-500">{{ myPct() | number:'1.0-0' }}% del presupuesto</span>
            <span *ngIf="myOver() > 0" class="font-semibold text-rose-700">
              Excede por {{ myOver() | currency:trip()!.currency:'symbol':'1.2-2' }}
            </span>
            <span *ngIf="myOver() === 0 && myBudget() > 0" class="font-medium text-emerald-700">
              Disponible {{ myRemaining() | currency:trip()!.currency:'symbol':'1.2-2' }}
            </span>
          </div>
        </div>
      </div>

      <!-- My settlements -->
      <div class="card" *ngIf="myTransfers().length">
        <h3 class="text-lg font-semibold text-slate-900 mb-3">Tus saldos</h3>
        <ul class="space-y-2">
          <li *ngFor="let t of myTransfers()"
              class="rounded-lg border p-3 text-sm flex items-center justify-between gap-3"
              [class.border-rose-200]="t.from === memberId"
              [class.bg-rose-50]="t.from === memberId"
              [class.border-emerald-200]="t.to === memberId"
              [class.bg-emerald-50]="t.to === memberId">
            <span class="text-slate-700 truncate">
              <ng-container *ngIf="t.from === memberId">
                Le debes a <b class="text-slate-900">{{ memberName(t.to) }}</b>
              </ng-container>
              <ng-container *ngIf="t.to === memberId">
                <b class="text-slate-900">{{ memberName(t.from) }}</b> te debe
              </ng-container>
            </span>
            <span class="font-semibold shrink-0"
                  [class.text-rose-700]="t.from === memberId"
                  [class.text-emerald-700]="t.to === memberId">
              {{ t.amount | currency:trip()!.currency:'symbol':'1.2-2' }}
            </span>
          </li>
        </ul>
      </div>

      <!-- Add expense -->
      <div class="card">
        <h3 class="text-lg font-semibold text-slate-900 mb-3">Registrar gasto</h3>
        <form (ngSubmit)="submitExpense()" class="space-y-3">
          <div>
            <label class="label">Descripción</label>
            <input class="input mt-1.5" [(ngModel)]="expDesc" name="expDesc"
                   placeholder="Ej. Cena, Hotel" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Monto total</label>
              <input class="input mt-1.5" type="number" min="0" step="0.01"
                     [(ngModel)]="expAmount" name="expAmount"
                     (ngModelChange)="onAmountChange()" placeholder="0.00" required />
            </div>
            <div>
              <label class="label">Fecha</label>
              <input class="input mt-1.5" type="date"
                     [(ngModel)]="expDate" name="expDate" required />
            </div>
          </div>
          <div>
            <label class="label">¿Quién pagó?</label>
            <select class="input mt-1.5" [(ngModel)]="payerId" name="payerId" required>
              <option *ngFor="let p of trip()!.participants" [value]="p.memberId">
                {{ memberName(p.memberId) }}
              </option>
            </select>
          </div>

          <label class="flex items-center gap-2 select-none">
            <input type="checkbox" [(ngModel)]="shared" name="shared"
                   class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                   (change)="onSharedToggle()" />
            <span class="text-sm font-medium text-slate-700">Gasto compartido</span>
          </label>

          <div *ngIf="shared">
            <div class="flex items-center justify-between mb-2">
              <p class="label">¿Cuánto le toca a cada uno?</p>
              <button type="button"
                      class="text-xs text-brand-600 hover:text-brand-700 underline"
                      (click)="splitEqual()">Dividir parejo</button>
            </div>
            <ul class="space-y-2">
              <li *ngFor="let s of splits(); let i = index"
                  class="rounded-lg border border-slate-200 bg-white p-2 flex items-center gap-2">
                <input type="checkbox"
                       class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                       [checked]="s.selected" (change)="toggleSplit(i)" />
                <span class="flex-1 text-sm font-medium text-slate-900 truncate">{{ s.name }}</span>
                <input type="number" min="0" step="0.01"
                       class="input !w-28 !py-1.5"
                       [disabled]="!s.selected"
                       [ngModel]="s.amount"
                       (ngModelChange)="setSplitAmount(i, $event)"
                       [name]="'sp_' + s.memberId" />
              </li>
            </ul>
            <div class="mt-2 text-xs">
              <span class="text-slate-500">Suma:</span>
              <b [class.text-emerald-600]="sumOk()"
                 [class.text-rose-600]="!sumOk()">
                {{ splitSum() | currency:trip()!.currency:'symbol':'1.2-2' }}
              </b>
              <span class="text-slate-500">
                / {{ (expAmount || 0) | currency:trip()!.currency:'symbol':'1.2-2' }}
              </span>
              <span *ngIf="(expAmount || 0) - splitSum() > 0.01" class="text-amber-600 ml-1">
                · Falta {{ ((expAmount || 0) - splitSum()) | currency:trip()!.currency:'symbol':'1.2-2' }}
              </span>
              <span *ngIf="splitSum() - (expAmount || 0) > 0.01" class="text-rose-600 ml-1">
                · Excede por {{ (splitSum() - (expAmount || 0)) | currency:trip()!.currency:'symbol':'1.2-2' }}
              </span>
            </div>
          </div>

          <button type="submit" class="btn-success w-full"
                  [disabled]="!canSubmit() || sending()">
            {{ sending() ? 'Enviando…' : 'Registrar gasto' }}
          </button>
          <p *ngIf="error()" class="text-xs text-rose-600 text-center">{{ error() }}</p>
          <p *ngIf="justSent()" class="text-xs text-emerald-600 text-center font-medium">
            Gasto registrado
          </p>
        </form>
      </div>

      <div class="card" *ngIf="trip()!.expenses.length">
        <h3 class="text-lg font-semibold text-slate-900 mb-3">
          Gastos del viaje
          <span class="text-slate-400 font-normal">({{ trip()!.expenses.length }})</span>
        </h3>
        <ul class="divide-y divide-slate-100">
          <li *ngFor="let e of trip()!.expenses | slice:0:30"
              class="py-3 first:pt-0 last:pb-0">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-medium text-slate-900 truncate">
                  {{ e.description || 'Gasto' }}
                </p>
                <p class="text-xs text-slate-500 mt-0.5">
                  {{ e.date }} · Pagó <b>{{ memberName(e.payerId) }}</b>
                  <span *ngIf="e.shared"> · compartido</span>
                </p>
              </div>
              <span class="font-semibold text-slate-900 shrink-0">
                {{ e.amount | currency:trip()!.currency:'symbol':'1.2-2' }}
              </span>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <ng-template #loading>
      <div class="card text-center text-slate-500 py-8 text-sm">Cargando…</div>
    </ng-template>
  `
})
export class TripPersonComponent {
  private route = inject(ActivatedRoute);
  ts = inject(TripService);
  fs = inject(FamilyService);
  Math = Math;

  tripId = this.route.snapshot.paramMap.get('id') || '';
  memberId = this.route.snapshot.paramMap.get('memberId') || '';

  trip = computed(() => this.ts.currentTrip());
  member = computed(() => this.fs.getMember(this.memberId));

  expDesc = '';
  expAmount: number | null = null;
  expDate = new Date().toISOString().slice(0, 10);
  payerId = this.memberId;
  shared = false;
  splits = signal<SplitInput[]>([]);

  sending = signal(false);
  error = signal('');
  justSent = signal(false);

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    const t = await this.ts.loadTrip(this.tripId);
    if (t) this.rebuildSplits(t);
  }

  private rebuildSplits(t: TripDetail): void {
    this.splits.set(
      t.participants.map((p) => ({
        memberId: p.memberId,
        name: this.memberName(p.memberId),
        amount: 0,
        selected: true
      }))
    );
  }

  memberName(id: string): string {
    return this.fs.getMember(id)?.name ?? '—';
  }

  balance = computed(() => {
    const t = this.trip();
    if (!t) return 0;
    return TripService.balances(t).get(this.memberId) || 0;
  });

  mySpent = computed(() => {
    const t = this.trip();
    if (!t) return 0;
    return TripService.spentByMember(t, this.memberId);
  });

  myBudget = computed(() => {
    const t = this.trip();
    if (!t) return 0;
    return t.participants.find((p) => p.memberId === this.memberId)?.budget || 0;
  });

  myRemaining = computed(() => Math.max(0, this.myBudget() - this.mySpent()));
  myOver = computed(() => Math.max(0, this.mySpent() - this.myBudget()));
  myPct = computed(() => {
    const b = this.myBudget();
    if (b === 0) return this.mySpent() > 0 ? 100 : 0;
    return (this.mySpent() / b) * 100;
  });

  myTransfers = computed<Transfer[]>(() => {
    const t = this.trip();
    if (!t) return [];
    return TripService.settle(t).filter(
      (x) => x.from === this.memberId || x.to === this.memberId
    );
  });

  splitSum = computed(() =>
    this.splits()
      .filter((s) => s.selected)
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
  );

  sumOk(): boolean {
    const total = Number(this.expAmount) || 0;
    return Math.abs(this.splitSum() - total) < 0.01;
  }

  canSubmit(): boolean {
    if (!this.expAmount || this.expAmount <= 0) return false;
    if (!this.expDate || !this.payerId) return false;
    if (this.shared && !this.sumOk()) return false;
    if (this.shared && this.splits().filter((s) => s.selected).length === 0) return false;
    return true;
  }

  onAmountChange(): void {
    if (this.shared) this.splitEqual();
  }

  onSharedToggle(): void {
    if (this.shared) this.splitEqual();
  }

  splitEqual(): void {
    const total = Number(this.expAmount) || 0;
    const sel = this.splits().filter((s) => s.selected);
    if (sel.length === 0) return;
    const each = Math.round((total / sel.length) * 100) / 100;
    this.splits.update((arr) =>
      arr.map((s) => (s.selected ? { ...s, amount: each } : { ...s, amount: 0 }))
    );
    const drift = total - each * sel.length;
    if (Math.abs(drift) > 0.001) {
      this.splits.update((arr) => {
        const idxs = arr.map((s, i) => ({ s, i })).filter((x) => x.s.selected).map((x) => x.i);
        const lastIdx = idxs[idxs.length - 1];
        return arr.map((s, i) =>
          i === lastIdx ? { ...s, amount: Math.round((s.amount + drift) * 100) / 100 } : s
        );
      });
    }
  }

  toggleSplit(i: number): void {
    this.splits.update((arr) =>
      arr.map((s, idx) =>
        idx === i ? { ...s, selected: !s.selected, amount: !s.selected ? s.amount : 0 } : s
      )
    );
    if (this.shared) this.splitEqual();
  }

  setSplitAmount(i: number, value: number): void {
    const total = Number(this.expAmount) || 0;
    this.splits.update((arr) => {
      const others = arr.reduce(
        (s, x, idx) => (idx !== i && x.selected ? s + (Number(x.amount) || 0) : s),
        0
      );
      const maxAllowed = Math.max(0, total - others);
      const next = Math.max(0, Math.min(Number(value) || 0, maxAllowed));
      return arr.map((s, idx) => (idx === i ? { ...s, amount: next } : s));
    });
  }

  async submitExpense(): Promise<void> {
    if (!this.canSubmit()) return;
    this.sending.set(true);
    this.error.set('');
    try {
      const splits = this.shared
        ? this.splits()
            .filter((s) => s.selected)
            .map((s) => ({ memberId: s.memberId, amount: Number(s.amount) || 0 }))
        : [{ memberId: this.payerId, amount: Number(this.expAmount) || 0 }];
      await this.ts.addExpense(this.tripId, {
        payerId: this.payerId,
        amount: Number(this.expAmount) || 0,
        date: this.expDate,
        description: this.expDesc.trim() || undefined,
        shared: this.shared,
        splits
      });
      this.expDesc = '';
      this.expAmount = null;
      this.shared = false;
      const t = this.trip();
      if (t) this.rebuildSplits(t);
      this.justSent.set(true);
      setTimeout(() => this.justSent.set(false), 2200);
    } catch (err: any) {
      this.error.set(err?.error?.error || err?.message || 'Error al registrar');
    } finally {
      this.sending.set(false);
    }
  }
}
