import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UserApi } from './user-api';
import { User } from './user.model';

const giana: User = {
  id: 'u-giana',
  name: 'Giana Sandrini',
  email: 'giana@attornatus.com.br',
  cpf: '529.982.247-25',
  phone: '(11) 98821-4401',
  phoneType: 'mobile',
};

describe('UserApi', () => {
  let api: UserApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(UserApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists users filtered by name', () => {
    let received: User[] | undefined;
    api.list('Giana').subscribe((users) => (received = users));

    const request = http.expectOne('/api/users?name=Giana');
    expect(request.request.method).toBe('GET');
    request.flush([giana]);

    expect(received).toEqual([giana]);
  });

  it('creates and updates a user', () => {
    const draft = {
      name: 'Helena Duarte',
      email: 'helena.duarte@attornatus.com.br',
      cpf: '390.533.447-05',
      phone: '(21) 99710-2284',
      phoneType: 'mobile' as const,
    };

    api.create(draft).subscribe();
    const created = http.expectOne('/api/users');
    expect(created.request.method).toBe('POST');
    expect(created.request.body).toEqual(draft);
    created.flush({ ...draft, id: 'u-helena' });

    api.update('u-helena', { ...draft, name: 'Helena Duarte Silva' }).subscribe();
    const updated = http.expectOne('/api/users/u-helena');
    expect(updated.request.method).toBe('PUT');
    updated.flush({ ...draft, id: 'u-helena', name: 'Helena Duarte Silva' });
  });
});
