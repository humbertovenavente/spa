import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TripService } from '../../services/trip.service';
import { FamilyService } from '../../services/family.service';
import { CURRENCIES } from '../../models/family.model';

interface Row {
  memberId: string;
  name: string;
  selected: boolean;
  budget: number | null;
}

@Component({
  selector: 'app-trips',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="space-y-4">
      <div class="card">
        <h2 class="text-lg font-semibold text-slate-900 mb-4">Crear viaje</h2>
        <form (ngSubmit)="create()" class="space-y-3">
          <div>
            <label class="label">Nombre del viaje</label>
            <input class="input mt-1.5" [(ngModel)]="name" name="name"
                   placeholder="Ej. Cancún 2026" required />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="label">Inicio</label>
              <input type="date" class="input mt-1.5"
                     [(ngModel)]="startDate" name="startDate" />
            </div>
            <div>
              <label class="label">Fin</label>
              <input type="date" class="input mt-1.5"
                     [(ngModel)]="endDate" name="endDate" />
            </div>
          </div>
          <div>
            <label class="label">Moneda</label>
            <select class="input mt-1.5" [(ngModel)]="currency" name="currency">
              <option *ngFor="let c of currencies" [value]="c.code">{{ c.label }}</option>
            </select>
          </div>

          <div>
            <p class="label mb-2">Participantes y presupuesto</p>
            <div *ngIf="rows().length === 0"
                 class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500 text-center">
              Agrega miembros en Familia primero.
            </div>
            <ul *ngIf="rows().length" class="space-y-2">
              <li *ngFor="let r of rows(); let i = index"
                  class="rounded-lg border border-slate-200 bg-white p-3">
                <div class="flex items-center gap-3">
                  <input type="checkbox"
                         class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                         [checked]="r.selected" (change)="toggle(i)" />
                  <span class="flex-1 font-medium text-slate-900 truncate">{{ r.name }}</span>
                </div>
                <div *ngIf="r.selected" class="mt-2 flex items-center gap-2">
                  <span class="text-xs text-slate-500 w-20">Presup.</span>
                  <input type="number" min="0" step="0.01" class="input"
                         [ngModel]="r.budget" (ngModelChange)="setBudget(i, $event)"
                         [name]="'b_' + r.memberId" placeholder="0.00" />
                </div>
              </li>
            </ul>
          </div>

          <button type="submit" class="btn-primary w-full"
                  [disabled]="!name || selectedCount() === 0 || creating">
            {{ creating ? 'Creando…' : 'Crear viaje' }}
          </button>
        </form>
      </div>

      <div class="card">
        <h2 class="text-lg font-semibold text-slate-900 mb-3">Mis viajes</h2>
        <div *ngIf="ts.trips().length === 0" class="text-center text-slate-500 py-6 text-sm">
          Aún no tienes viajes.
        </div>
        <ul class="space-y-2">
          <li *ngFor="let t of ts.trips()"
              class="rounded-lg border border-slate-200 bg-white p-3">
            <a [routerLink]="['/viajes', t.id]" class="block">
              <p class="font-medium text-slate-900 truncate">{{ t.name }}</p>
              <p class="text-xs text-slate-500 mt-0.5">
                {{ t.participants.length }} participantes
                <span *ngIf="t.startDate"> · {{ t.startDate }}</span>
                <span *ngIf="t.endDate"> → {{ t.endDate }}</span>
              </p>
            </a>
          </li>
        </ul>
      </div>
    </section>
  `
})
export class TripsComponent {
  ts = inject(TripService);
  fs = inject(FamilyService);
  currencies = CURRENCIES;

  name = '';
  startDate = '';
  endDate = '';
  currency = 'USD';
  creating = false;

  rows = signal<Row[]>(this.buildRows());
  selectedCount = computed(() => this.rows().filter((r) => r.selected).length);

  constructor() {
    void this.ts.refreshList();
    // Rebuild rows when members change
    setTimeout(() => this.rows.set(this.buildRows()), 0);
  }

  private buildRows(): Row[] {
    return this.fs.members().map((m) => ({
      memberId: m.id,
      name: m.name,
      selected: false,
      budget: null
    }));
  }

  toggle(i: number): void {
    this.rows.update((rs) =>
      rs.map((r, idx) => (idx === i ? { ...r, selected: !r.selected } : r))
    );
  }

  setBudget(i: number, value: number | null): void {
    this.rows.update((rs) =>
      rs.map((r, idx) =>
        idx === i ? { ...r, budget: value === null ? null : Number(value) } : r
      )
    );
  }

  async create(): Promise<void> {
    if (!this.name) return;
    const participants = this.rows()
      .filter((r) => r.selected)
      .map((r) => ({ memberId: r.memberId, budget: Number(r.budget) || 0 }));
    if (!participants.length) return;
    this.creating = true;
    try {
      await this.ts.createTrip({
        name: this.name.trim(),
        startDate: this.startDate || undefined,
        endDate: this.endDate || undefined,
        currency: this.currency,
        participants
      });
      this.name = '';
      this.startDate = '';
      this.endDate = '';
      this.rows.set(this.buildRows());
    } finally {
      this.creating = false;
    }
  }
}
