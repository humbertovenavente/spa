import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { FamilyService } from './services/family.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen flex flex-col bg-slate-50">
      <header class="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div class="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <ng-container *ngIf="!isPublic(); else publicHeader">
            <a routerLink="/" class="font-semibold text-slate-900 tracking-tight">
              Gastos Familiares
            </a>
          </ng-container>
          <ng-template #publicHeader>
            <span class="font-semibold text-slate-900 tracking-tight">Gastos Familiares</span>
          </ng-template>
        </div>
        <div *ngIf="fs.loadError() as err"
             class="bg-amber-50 border-t border-amber-200 text-amber-800 text-xs px-4 py-2 text-center">
          {{ err }}.
          <button type="button" class="ml-2 underline font-medium" (click)="fs.refresh()">Reintentar</button>
        </div>
      </header>

      <main class="flex-1">
        <div class="max-w-3xl mx-auto px-3 sm:px-4 py-4"
             [class.pb-28]="!isPublic()"
             [class.pb-8]="isPublic()">
          <router-outlet />
        </div>
      </main>

      <nav *ngIf="!isPublic()"
           class="fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white">
        <div class="max-w-3xl mx-auto grid grid-cols-4">
          <a routerLink="/" routerLinkActive="text-brand-600 border-t-2 border-brand-600 -mt-px"
             [routerLinkActiveOptions]="{exact: true}"
             class="flex items-center justify-center py-3 text-sm font-medium text-slate-500 hover:text-slate-900">
            Inicio
          </a>
          <a routerLink="/familia" routerLinkActive="text-brand-600 border-t-2 border-brand-600 -mt-px"
             class="flex items-center justify-center py-3 text-sm font-medium text-slate-500 hover:text-slate-900">
            Familia
          </a>
          <a routerLink="/presupuesto" routerLinkActive="text-brand-600 border-t-2 border-brand-600 -mt-px"
             class="flex items-center justify-center py-3 text-sm font-medium text-slate-500 hover:text-slate-900">
            Presupuesto
          </a>
          <a routerLink="/resumen" routerLinkActive="text-brand-600 border-t-2 border-brand-600 -mt-px"
             class="flex items-center justify-center py-3 text-sm font-medium text-slate-500 hover:text-slate-900">
            Resumen
          </a>
        </div>
      </nav>
    </div>
  `
})
export class AppComponent {
  fs = inject(FamilyService);
  private router = inject(Router);

  private url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  isPublic = computed(() => {
    const u = this.url() || '';
    return u.startsWith('/aporta') || u.startsWith('/pagar/');
  });
}
