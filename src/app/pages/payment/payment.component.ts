import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FamilyService } from '../../services/family.service';
import { PAYMENT_METHODS } from '../../models/family.model';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="space-y-4">
      <ng-container *ngIf="member(); else missing">
        <div class="card">
          <p class="text-xs uppercase tracking-wide text-slate-500">Página personal de pago</p>
          <h2 class="text-2xl font-semibold text-slate-900 mt-1">{{ member()!.name }}</h2>
          <p class="text-sm text-slate-500 mt-1">
            Aquí puedes registrar lo que vas pagando del presupuesto familiar.
          </p>
        </div>

        <div class="card">
          <p class="text-xs text-slate-500">Presupuesto activo</p>
          <p class="font-medium text-slate-900 mt-1">
            {{ fs.activeBudget()?.label || 'Ninguno' }}
          </p>

          <div class="grid grid-cols-2 gap-3 mt-4">
            <div>
              <p class="text-xs text-slate-500">Te toca</p>
              <p class="text-xl font-semibold text-brand-700 mt-1">
                {{ assigned() | currency:currency():'symbol':'1.2-2' }}
              </p>
            </div>
            <div>
              <p class="text-xs text-slate-500">Pagado</p>
              <p class="text-xl font-semibold text-emerald-600 mt-1">
                {{ paid() | currency:currency():'symbol':'1.2-2' }}
              </p>
            </div>
          </div>

          <div class="mt-4">
            <div class="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>Avance</span>
              <span class="font-medium text-slate-700">{{ progress() }}%</span>
            </div>
            <div class="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div class="h-full bg-emerald-500 transition-all" [style.width.%]="progress()"></div>
            </div>
            <p class="mt-2 text-sm">
              <ng-container *ngIf="remaining() > 0; else done">
                <span class="text-slate-700">Falta</span>
                <b class="ml-1 text-slate-900">
                  {{ remaining() | currency:currency():'symbol':'1.2-2' }}
                </b>
              </ng-container>
              <ng-template #done>
                <span class="text-emerald-600 font-medium">Aporte completado</span>
              </ng-template>
            </p>
          </div>
        </div>

        <div class="card">
          <h3 class="text-lg font-semibold text-slate-900 mb-3">Registrar pago</h3>
          <form (ngSubmit)="submit()" class="space-y-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="label">Monto</label>
                <input class="input mt-1.5" type="number" min="0" step="0.01"
                       [(ngModel)]="amount" name="amount" placeholder="0.00" required />
              </div>
              <div>
                <label class="label">Fecha</label>
                <input class="input mt-1.5" type="date" [(ngModel)]="date" name="date" required />
              </div>
            </div>
            <div>
              <label class="label">Método de pago</label>
              <select class="input mt-1.5" [(ngModel)]="method" name="method">
                <option *ngFor="let m of methods" [value]="m">{{ m }}</option>
              </select>
            </div>
            <div>
              <label class="label">Foto del comprobante (opcional)</label>
              <input class="input mt-1.5" type="file" accept="image/*" (change)="onFile($event)" />
              <div *ngIf="photoDataUrl()" class="mt-2">
                <img [src]="photoDataUrl()!" alt="Comprobante"
                     class="rounded-lg max-h-56 border border-slate-200" />
              </div>
            </div>
            <div>
              <label class="label">Nota (opcional)</label>
              <textarea class="input mt-1.5" rows="2" [(ngModel)]="note" name="note"
                        placeholder="Ej. mitad del mes"></textarea>
            </div>
            <button type="submit" class="btn-success w-full" [disabled]="!amount || !date">
              Enviar pago
            </button>
            <p *ngIf="justSent()" class="text-center text-emerald-600 text-sm font-medium">
              Pago registrado
            </p>
          </form>
        </div>

        <div class="card">
          <h3 class="text-lg font-semibold text-slate-900 mb-3">
            Tus pagos <span class="text-slate-400 font-normal">({{ payments().length }})</span>
          </h3>
          <div *ngIf="payments().length === 0" class="text-center text-slate-500 py-6 text-sm">
            Aún no has registrado pagos.
          </div>
          <ul class="space-y-2">
            <li *ngFor="let p of payments()"
                class="rounded-lg border border-slate-200 bg-white p-3">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-semibold text-slate-900">
                    {{ p.amount | currency:currency():'symbol':'1.2-2' }}
                  </p>
                  <p class="text-xs text-slate-500 mt-0.5">{{ p.date }} · {{ p.method }}</p>
                  <p *ngIf="p.note" class="text-xs text-slate-600 mt-1">{{ p.note }}</p>
                </div>
                <button type="button"
                        class="btn-ghost !px-3 !py-1.5 !min-h-0 text-xs"
                        (click)="del(p.id)">Eliminar</button>
              </div>
              <img *ngIf="p.photoDataUrl" [src]="p.photoDataUrl" alt="Comprobante"
                   class="mt-2 rounded-lg max-h-40 border border-slate-200" />
            </li>
          </ul>
        </div>
      </ng-container>

      <ng-template #missing>
        <div class="card text-center">
          <p class="font-semibold text-slate-900">Link inválido</p>
          <p class="text-sm text-slate-500 mt-1">El miembro no existe o fue eliminado.</p>
          <a routerLink="/" class="btn-ghost mt-4 inline-flex">Volver al inicio</a>
        </div>
      </ng-template>
    </section>
  `
})
export class PaymentComponent {
  private route = inject(ActivatedRoute);
  fs = inject(FamilyService);
  methods = PAYMENT_METHODS;

  memberId = signal<string>(this.route.snapshot.paramMap.get('memberId') ?? '');
  member = computed(() => this.fs.getMember(this.memberId()));
  currency = computed(() => this.fs.activeCurrency());

  payments = computed(() => this.fs.paymentsForMember(this.memberId()));
  paid = computed(() => this.fs.totalPaidByMember(this.memberId()));
  assigned = computed(() => this.fs.assignedAmountForMember(this.memberId()));
  remaining = computed(() => Math.max(0, this.assigned() - this.paid()));
  progress = computed(() => {
    const a = this.assigned();
    if (a === 0) return 0;
    return Math.min(100, Math.round((this.paid() / a) * 100));
  });

  amount: number | null = null;
  date = new Date().toISOString().slice(0, 10);
  method = 'Transferencia';
  note = '';
  photoDataUrl = signal<string | null>(null);
  justSent = signal(false);

  constructor() {
    const m = this.member();
    if (m?.paymentMethod) this.method = m.paymentMethod;
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.photoDataUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  submit(): void {
    if (!this.amount || !this.date) return;
    this.fs.addPayment(this.memberId(), {
      amount: Number(this.amount),
      date: this.date,
      method: this.method,
      photoDataUrl: this.photoDataUrl() ?? undefined,
      note: this.note.trim() || undefined
    });
    this.amount = null;
    this.note = '';
    this.photoDataUrl.set(null);
    this.justSent.set(true);
    setTimeout(() => this.justSent.set(false), 2200);
  }

  del(id: string): void {
    if (confirm('¿Eliminar este pago?')) this.fs.removePayment(id);
  }
}
