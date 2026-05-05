import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TripService, Transfer } from '../../services/trip.service';
import { FamilyService } from '../../services/family.service';
import { TripDetail, TripParticipant } from '../../models/trip.model';

interface SplitInput {
  memberId: string;
  name: string;
  amount: number;
  selected: boolean;
}

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
              <input class="input mt-1.5" type="date" [(ngModel)]="expDate" name="expDate" required />
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
              <button type="button" class="text-xs text-brand-600 hover:text-brand-700 underline"
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
            <div class="mt-2 text-xs text-slate-500">
              Suma: <b [class.text-rose-600]="!sumOk()">
                {{ splitSum() | currency:trip()!.currency:'symbol':'1.2-2' }}
              </b> /
              {{ (expAmount || 0) | currency:trip()!.currency:'symbol':'1.2-2' }}
            </div>
          </div>

          <button type="submit" class="btn-success w-full"
                  [disabled]="!canSubmit() || sending">
            {{ sending ? 'Enviando…' : 'Registrar gasto' }}
          </button>
          <p *ngIf="error" class="text-xs text-rose-600 text-center">{{ error }}</p>
        </form>
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

  tripId = this.route.snapshot.paramMap.get('id') || '';
  trip = computed(() => this.ts.currentTrip());

  expDesc = '';
  expAmount: number | null = null;
  expDate = new Date().toISOString().slice(0, 10);
  payerId = '';
  shared = false;
  splits = signal<SplitInput[]>([]);
  sending = false;
  error = '';
  copied = false;

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    const t = await this.ts.loadTrip(this.tripId);
    if (t) {
      this.payerId = t.participants[0]?.memberId || '';
      this.rebuildSplits(t);
    }
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
    // Adjust last selected for rounding
    const drift = total - each * sel.length;
    if (Math.abs(drift) > 0.001) {
      this.splits.update((arr) => {
        const idxs = arr
          .map((s, i) => ({ s, i }))
          .filter((x) => x.s.selected)
          .map((x) => x.i);
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
    this.splits.update((arr) =>
      arr.map((s, idx) => (idx === i ? { ...s, amount: Number(value) || 0 } : s))
    );
  }

  async submitExpense(): Promise<void> {
    if (!this.canSubmit()) return;
    this.sending = true;
    this.error = '';
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
    } catch (err: any) {
      this.error = err?.error?.error || err?.message || 'Error al registrar';
    } finally {
      this.sending = false;
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
