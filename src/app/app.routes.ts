import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/users/user-list').then((module) => module.UserList),
  },
  { path: '**', redirectTo: '' },
];
