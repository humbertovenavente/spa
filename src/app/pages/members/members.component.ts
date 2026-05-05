import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FamilyService } from '../../services/family.service';
import { CURRENCIES } from '../../models/family.model';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-4">
      <div class="card">
        <h2 class="text-lg font-semibold text-slate-900 mb-4">Agregar miembro</h2>
        <form (ngSubmit)="add()" class="space-y-3">
          <div>
            <label class="label">Nombre</label>
            <input class="input mt-1.5" [(ngModel)]="name" name="name" placeholder="Ej. María" required />
          </div>
          <div>
            <label class="label">Aporte mensual</label>
            <div class="mt-1.5 flex gap-2">
              <select class="input !w-32 shrink-0"
                      [(ngModel)]="currency" name="currency">
                <option *ngFor="let c of currencies" [value]="c.code">{{ c.code }}</option>
              </select>
              <input class="input flex-1" type="number" min="0" step="0.01"
                     [(ngModel)]="contribution" name="contribution" placeholder="0.00" required />
            </div>
          </div>
          <button type="submit" class="btn-primary w-full"
                  [disabled]="!name || contribution === null">
            Agregar
          </button>
        </form>
      </div>

      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold text-slate-900">
            Miembros <span class="text-slate-400 font-normal">({{ fs.members().length }})</span>
          </h2>
        </div>

        <div *ngIf="fs.members().length === 0" class="text-center text-slate-500 py-8 text-sm">
          Aún no hay miembros.
        </div>

        <ul class="divide-y divide-slate-100">
          <li *ngFor="let m of fs.members()" class="py-3 first:pt-0 last:pb-0">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <p class="font-medium text-slate-900 truncate">{{ m.name }}</p>
                <div class="flex flex-wrap gap-2 mt-1.5">
                  <span class="badge-info">
                    {{ m.monthlyContribution | currency:(m.currency || 'USD'):'symbol':'1.2-2' }} /mes
                  </span>
                </div>
              </div>
              <button type="button"
                      class="btn-ghost !px-3 !py-1.5 !min-h-0 text-xs"
                      (click)="remove(m.id)">
                Eliminar
              </button>
            </div>
          </li>
        </ul>
      </div>
    </section>
  `
})
export class MembersComponent {
  fs = inject(FamilyService);
  currencies = CURRENCIES;

  name = '';
  contribution: number | null = null;
  currency = this.fs.activeCurrency();

  add(): void {
    if (!this.name || this.contribution === null) return;
    this.fs.addMember({
      name: this.name.trim(),
      monthlyContribution: Number(this.contribution),
      currency: this.currency
    });
    this.name = '';
    this.contribution = null;
  }

  remove(id: string): void {
    if (confirm('¿Eliminar a este miembro y sus pagos?')) {
      this.fs.removeMember(id);
    }
  }
}
