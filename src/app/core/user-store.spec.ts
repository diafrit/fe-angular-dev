import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  resetUserDirectory,
  USER_API_LATENCY,
  USER_SEARCH_DEBOUNCE,
  userApiMock,
} from './user-api-mock';
import { UserStore } from './user-store';

describe('UserStore', () => {
  beforeEach(() => {
    localStorage.removeItem('attus-users-unavailable');
    resetUserDirectory();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([userApiMock])),
        { provide: USER_API_LATENCY, useValue: 0 },
        { provide: USER_SEARCH_DEBOUNCE, useValue: 0 },
      ],
    });
  });

  async function readyStore(): Promise<UserStore> {
    const store = TestBed.inject(UserStore);
    await vi.waitFor(() => expect(store.list().status).toBe('ready'));
    return store;
  }

  it('loads the directory and paginates six users per page', async () => {
    const store = await readyStore();
    expect(store.total()).toBe(8);
    expect(store.visible()).toHaveLength(6);
    expect(store.visible()[0]?.name).toBe('Beatriz Köhler');

    store.setPage(1);
    expect(store.visible().map((user) => user.name)).toEqual(['Otávio Nunes', 'Rafael Pacheco']);
  });

  it('debounces the name filter and reports a failed load', async () => {
    vi.useFakeTimers();
    try {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(withInterceptors([userApiMock])),
          { provide: USER_API_LATENCY, useValue: 0 },
          { provide: USER_SEARCH_DEBOUNCE, useValue: 300 },
        ],
      });
      const store = TestBed.inject(UserStore);
      await vi.waitFor(() => expect(store.list().status).toBe('ready'));

      store.setName('Giana');
      expect(store.visible().some((user) => user.name === 'Caio Ferreira')).toBe(true);
      await vi.advanceTimersByTimeAsync(300);
      await vi.waitFor(() =>
        expect(store.visible().map((user) => user.name)).toEqual(['Giana Sandrini']),
      );

      localStorage.setItem('attus-users-unavailable', '1');
      store.retry();
      await vi.waitFor(() => expect(store.list().status).toBe('error'));
      expect(store.list()).toEqual({
        status: 'error',
        message: 'Não foi possível carregar os usuários.',
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
