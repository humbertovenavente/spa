import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TripService } from '../../services/trip.service';
import { FamilyService } from '../../services/family.service';

@Component({
  selector: 'app-trip-picker',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="space-y-4" *ngIf="trip(); else loading">
      <div class="card text-center">
        <p class="text-xs uppercase tracking-wide text-slate-500">Viaje</p>
        <h2 class="text-2xl font-semibold text-slate-900 mt-1">{{ trip()!.name }}</h2>
        <p class="text-sm text-slate-500 mt-1">¿Quién eres?</p>
      </div>

      <div class="card" *ngIf="trip()!.participants.length; else empty">
        <ul class="space-y-2">
          <li *ngFor="let p of trip()!.participants">
            <a [routerLink]="['/viaje', tripId, 'yo', p.memberId]"
               class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:border-brand-400 hover:shadow-sm transition">
              <div class="min-w-0">
                <p class="font-semibold text-slate-900 truncate">{{ memberName(p.memberId) }}</p>
                <p class="text-xs text-slate-500 mt-0.5"
                   *ngIf="p.budget > 0">
                  Presupuesto: {{ p.budget | currency:trip()!.currency:'symbol':'1.2-2' }}
                </p>
              </div>
              <span class="text-brand-600">→</span>
            </a>
          </li>
        </ul>
      </div>

      <ng-template #empty>
        <div class="card text-center text-slate-500 py-8 text-sm">
          Este viaje aún no tiene participantes.
        </div>
      </ng-template>
    </section>

    <ng-template #loading>
      <div class="card text-center text-slate-500 py-8 text-sm">Cargando viaje…</div>
    </ng-template>
  `
})
export class TripPickerComponent {
  private route = inject(ActivatedRoute);
  ts = inject(TripService);
  fs = inject(FamilyService);

  tripId = this.route.snapshot.paramMap.get('id') || '';
  trip = computed(() => this.ts.currentTrip());

  constructor() {
    void this.ts.loadTrip(this.tripId);
  }

  memberName(id: string): string {
    return this.fs.getMember(id)?.name ?? '—';
  }
}
