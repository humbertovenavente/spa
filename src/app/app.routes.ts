import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent) },
  { path: 'familia', loadComponent: () => import('./pages/members/members.component').then((m) => m.MembersComponent) },
  { path: 'presupuesto', loadComponent: () => import('./pages/budget/budget.component').then((m) => m.BudgetComponent) },
  { path: 'personal', loadComponent: () => import('./pages/personal/personal.component').then((m) => m.PersonalComponent) },
  { path: 'viajes', loadComponent: () => import('./pages/trips/trips.component').then((m) => m.TripsComponent) },
  { path: 'viajes/:id', loadComponent: () => import('./pages/trip-detail/trip-detail.component').then((m) => m.TripDetailComponent) },
  { path: 'resumen', loadComponent: () => import('./pages/summary/summary.component').then((m) => m.SummaryComponent) },
  { path: 'aporta', loadComponent: () => import('./pages/picker/picker.component').then((m) => m.PickerComponent) },
  { path: 'gastar', loadComponent: () => import('./pages/expense/expense.component').then((m) => m.ExpenseComponent) },
  { path: 'pagar/:memberId', loadComponent: () => import('./pages/payment/payment.component').then((m) => m.PaymentComponent) },
  { path: 'viaje/:id', loadComponent: () => import('./pages/trip-picker/trip-picker.component').then((m) => m.TripPickerComponent) },
  { path: 'viaje/:id/yo/:memberId', loadComponent: () => import('./pages/trip-person/trip-person.component').then((m) => m.TripPersonComponent) },
  { path: '**', redirectTo: '' }
];
