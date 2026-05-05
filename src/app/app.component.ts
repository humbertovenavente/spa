import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FamilyService } from './services/family.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen flex flex-col bg-slate-50">
      <header class="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div class="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <a routerLink="/" class="font-semibold text-slate-900 tracking-tight">
            Gastos Familiares
          </a>
        </div>
        <div *ngIf="fs.loadError() as err"
             class="bg-amber-50 border-t border-amber-200 text-amber-800 text-xs px-4 py-2 text-center">
          {{ err }}. Verifica que el backend esté corriendo en
          <code class="font-mono">localhost:3001</code>.
          <button type="button" class="ml-2 underline font-medium" (click)="fs.refresh()">Reintentar</button>
        </div>
      </header>

      <main class="flex-1">
        <div class="max-w-3xl mx-auto px-3 sm:px-4 py-4 pb-28">
          <router-outlet />
        </div>
      </main>

      <nav class="fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white">
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
}
