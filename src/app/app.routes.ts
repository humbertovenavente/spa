import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent) },
  { path: 'familia', loadComponent: () => import('./pages/members/members.component').then((m) => m.MembersComponent) },
  { path: 'presupuesto', loadComponent: () => import('./pages/budget/budget.component').then((m) => m.BudgetComponent) },
  { path: 'resumen', loadComponent: () => import('./pages/summary/summary.component').then((m) => m.SummaryComponent) },
  { path: 'pagar/:memberId', loadComponent: () => import('./pages/payment/payment.component').then((m) => m.PaymentComponent) },
  { path: '**', redirectTo: '' }
];
