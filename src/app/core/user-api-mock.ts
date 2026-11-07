import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { InjectionToken, inject } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { PhoneType, User, UserDraft } from './user.model';
import { normalizeText } from './user-text';

export const USER_API_LATENCY = new InjectionToken<number>('USER_API_LATENCY', {
  factory: () => 400,
});

export const USER_SEARCH_DEBOUNCE = new InjectionToken<number>('USER_SEARCH_DEBOUNCE', {
  factory: () => 300,
});

const UNAVAILABLE_FLAG = 'attus-users-unavailable';

const seed: User[] = [
  {
    id: 'u-giana',
    name: 'Giana Sandrini',
    email: 'giana@attornatus.com.br',
    cpf: '529.982.247-25',
    phone: '(11) 98821-4401',
    phoneType: 'mobile',
  },
  {
    id: 'u-helena',
    name: 'Helena Duarte',
    email: 'helena.duarte@attornatus.com.br',
    cpf: '390.533.447-05',
    phone: '(21) 99710-2284',
    phoneType: 'mobile',
  },
  {
    id: 'u-caio',
    name: 'Caio Ferreira',
    email: 'caio.ferreira@attornatus.com.br',
    cpf: '153.509.460-56',
    phone: '(31) 3344-9081',
    phoneType: 'work',
  },
  {
    id: 'u-marina',
    name: 'Marina Lopes',
    email: 'marina.lopes@attornatus.com.br',
    cpf: '846.613.530-80',
    phone: '(41) 98800-1122',
    phoneType: 'mobile',
  },
  {
    id: 'u-otavio',
    name: 'Otávio Nunes',
    email: 'otavio.nunes@attornatus.com.br',
    cpf: '746.824.890-70',
    phone: '(51) 3221-4470',
    phoneType: 'home',
  },
  {
    id: 'u-beatriz',
    name: 'Beatriz Köhler',
    email: 'beatriz.kohler@attornatus.com.br',
    cpf: '987.654.321-00',
    phone: '(47) 99120-3344',
    phoneType: 'mobile',
  },
  {
    id: 'u-rafael',
    name: 'Rafael Pacheco',
    email: 'rafael.pacheco@attornatus.com.br',
    cpf: '111.444.777-35',
    phone: '(62) 98111-2200',
    phoneType: 'mobile',
  },
  {
    id: 'u-livia',
    name: 'Lívia Campos',
    email: 'livia.campos@attornatus.com.br',
    cpf: '123.456.789-09',
    phone: '(85) 3456-7788',
    phoneType: 'work',
  },
];

let users = sorted(seed);

export function resetUserDirectory(): void {
  users = sorted(seed);
}

export const userApiMock: HttpInterceptorFn = (request, next) => {
  const parsed = new URL(request.url, 'http://localhost');
  if (parsed.pathname !== '/api/users' && !parsed.pathname.startsWith('/api/users/')) {
    return next(request);
  }
  const latency = inject(USER_API_LATENCY);
  const name = request.params.get('name') ?? parsed.searchParams.get('name') ?? '';
  const response = routeUsers(request.method, parsed, request.body, name);
  return latency > 0 ? response.pipe(delay(latency)) : response;
};

function routeUsers(
  method: string,
  url: URL,
  body: unknown,
  nameQuery: string,
): Observable<HttpResponse<User | User[]>> {
  if (isUnavailable()) {
    return throwError(
      () => new HttpErrorResponse({ status: 0, statusText: 'Offline', url: url.pathname }),
    );
  }

  const id = url.pathname.match(/^\/api\/users\/([^/]+)$/)?.[1];

  if (method === 'GET' && url.pathname === '/api/users') {
    const query = normalizeText(nameQuery);
    const filtered = users.filter((user) => {
      if (!query) {
        return true;
      }
      return normalizeText(user.name).includes(query) || normalizeText(user.email).includes(query);
    });
    return of(new HttpResponse({ status: 200, body: filtered }));
  }

  if (method === 'POST' && url.pathname === '/api/users') {
    const draft = asDraft(body);
    if (emailTaken(draft.email)) {
      return conflict(url.pathname);
    }
    const created: User = { ...draft, id: crypto.randomUUID() };
    users = sorted([...users, created]);
    return of(new HttpResponse({ status: 201, body: created }));
  }

  if (method === 'PUT' && id) {
    const current = users.find((user) => user.id === id);
    if (!current) {
      return throwError(
        () => new HttpErrorResponse({ status: 404, statusText: 'Not Found', url: url.pathname }),
      );
    }
    const draft = asDraft(body);
    if (emailTaken(draft.email, id)) {
      return conflict(url.pathname);
    }
    const updated: User = { ...current, ...draft };
    users = sorted(users.map((user) => (user.id === id ? updated : user)));
    return of(new HttpResponse({ status: 200, body: updated }));
  }

  return throwError(
    () => new HttpErrorResponse({ status: 404, statusText: 'Not Found', url: url.pathname }),
  );
}

function conflict(url: string): Observable<HttpResponse<User>> {
  return throwError(() => new HttpErrorResponse({ status: 409, statusText: 'Conflict', url }));
}

function emailTaken(email: string, ignoreId?: string): boolean {
  const normalized = normalizeText(email);
  return users.some((user) => user.id !== ignoreId && normalizeText(user.email) === normalized);
}

function asDraft(body: unknown): UserDraft {
  const draft = body as Partial<UserDraft>;
  const phoneType: PhoneType =
    draft.phoneType === 'home' || draft.phoneType === 'work' || draft.phoneType === 'mobile'
      ? draft.phoneType
      : 'mobile';
  return {
    name: draft.name ?? '',
    email: draft.email ?? '',
    cpf: draft.cpf ?? '',
    phone: draft.phone ?? '',
    phoneType,
  };
}

function isUnavailable(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem(UNAVAILABLE_FLAG) === '1';
}

function sorted(rows: User[]): User[] {
  return [...rows].sort((left, right) => left.name.localeCompare(right.name, 'pt'));
}
