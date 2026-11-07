import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Observable,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  merge,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { USER_SEARCH_DEBOUNCE } from './user-api-mock';
import { UserApi } from './user-api';
import { User, UserDraft } from './user.model';
import { readApiError } from './user-text';

export const USER_PAGE_SIZE = 6;

export type UserListState =
  { status: 'loading' } | { status: 'ready'; users: User[] } | { status: 'error'; message: string };

@Injectable({ providedIn: 'root' })
export class UserStore {
  private readonly api = inject(UserApi);
  private readonly debounceMs = inject(USER_SEARCH_DEBOUNCE);
  private readonly search$ = new Subject<string>();
  private readonly reload$ = new Subject<void>();

  readonly name = signal('');
  readonly page = signal(0);
  readonly list = signal<UserListState>({ status: 'loading' });
  readonly saving = signal(false);

  readonly total = computed(() => {
    const current = this.list();
    return current.status === 'ready' ? current.users.length : 0;
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / USER_PAGE_SIZE)));

  readonly visible = computed(() => {
    const current = this.list();
    if (current.status !== 'ready') {
      return [];
    }
    const start = this.page() * USER_PAGE_SIZE;
    return current.users.slice(start, start + USER_PAGE_SIZE);
  });

  constructor() {
    merge(
      this.reload$.pipe(map(() => this.name())),
      this.search$.pipe(debounceTime(this.debounceMs), distinctUntilChanged()),
    )
      .pipe(
        switchMap((name) => {
          this.list.set({ status: 'loading' });
          return this.api.list(name).pipe(
            map((users) => ({ status: 'ready' as const, users })),
            catchError((error: unknown) =>
              of({
                status: 'error' as const,
                message: readApiError(error, 'Não foi possível carregar os usuários.'),
              }),
            ),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((next) => {
        this.list.set(next);
        if (this.page() > this.totalPages() - 1) {
          this.page.set(0);
        }
      });

    this.reload$.next();
  }

  setName(value: string): void {
    this.name.set(value);
    this.page.set(0);
    this.search$.next(value);
  }

  setPage(page: number): void {
    const last = this.totalPages() - 1;
    this.page.set(Math.min(Math.max(page, 0), last));
  }

  retry(): void {
    this.reload$.next();
  }

  create(draft: UserDraft): Observable<User> {
    return this.persist(this.api.create(draft));
  }

  update(id: string, draft: UserDraft): Observable<User> {
    return this.persist(this.api.update(id, draft));
  }

  private persist(request: Observable<User>): Observable<User> {
    this.saving.set(true);
    return request.pipe(
      tap(() => this.reload$.next()),
      finalize(() => this.saving.set(false)),
    );
  }
}
