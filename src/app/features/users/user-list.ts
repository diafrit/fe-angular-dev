import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { initials } from '../../core/user-text';
import { USER_PAGE_SIZE, UserStore } from '../../core/user-store';
import { User } from '../../core/user.model';
import { UserDialogContext, UserFormDialog } from './user-form-dialog';

@Component({
  selector: 'app-user-list',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule,
  ],
  providers: [{ provide: MatPaginatorIntl, useFactory: createUserPaginatorIntl }],
  templateUrl: './user-list.html',
  styleUrl: './user-list.css',
})
export class UserList {
  private readonly dialog = inject(MatDialog);
  readonly store = inject(UserStore);
  protected readonly initials = initials;
  protected readonly pageSize = USER_PAGE_SIZE;

  protected openCreate(): void {
    this.dialog.open(UserFormDialog, {
      ...dialogOptions,
      data: { mode: 'create' } satisfies UserDialogContext,
    });
  }

  protected openEdit(user: User): void {
    this.dialog.open(UserFormDialog, {
      ...dialogOptions,
      data: { mode: 'edit', user } satisfies UserDialogContext,
    });
  }
}

const dialogOptions = {
  width: '42rem',
  maxWidth: 'calc(100vw - 2rem)',
  panelClass: 'user-dialog',
  enterAnimationDuration: '180ms',
  exitAnimationDuration: '150ms',
};

function createUserPaginatorIntl(): MatPaginatorIntl {
  const intl = new MatPaginatorIntl();
  intl.itemsPerPageLabel = 'Itens por página';
  intl.nextPageLabel = 'Próxima página';
  intl.previousPageLabel = 'Página anterior';
  intl.firstPageLabel = 'Primeira página';
  intl.lastPageLabel = 'Última página';
  intl.getRangeLabel = (page, pageSize, length) => {
    if (length === 0 || pageSize === 0) {
      return `0 de ${length}`;
    }
    const start = page * pageSize;
    const end = Math.min(start + pageSize, length);
    return `${start + 1} a ${end} de ${length}`;
  };
  return intl;
}
