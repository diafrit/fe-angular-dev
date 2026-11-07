import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { UserApi } from './user-api';
import { resetUserDirectory, USER_API_LATENCY, userApiMock } from './user-api-mock';

describe('userApiMock', () => {
  let api: UserApi;

  beforeEach(() => {
    localStorage.removeItem('attus-users-unavailable');
    resetUserDirectory();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([userApiMock])),
        { provide: USER_API_LATENCY, useValue: 0 },
      ],
    });
    api = TestBed.inject(UserApi);
  });

  it('filters by name, creates a user, and rejects a duplicate email', async () => {
    const matches = await firstValueFrom(api.list('giana'));
    expect(matches.map((user) => user.name)).toEqual(['Giana Sandrini']);

    const created = await firstValueFrom(
      api.create({
        name: 'Nina Prado',
        email: 'nina.prado@attornatus.com.br',
        cpf: '529.982.247-25',
        phone: '(11) 97777-0101',
        phoneType: 'mobile',
      }),
    );
    expect(created.id).toBeTruthy();

    const listed = await firstValueFrom(api.list('Nina'));
    expect(listed.map((user) => user.email)).toEqual(['nina.prado@attornatus.com.br']);

    const byEmail = await firstValueFrom(api.list('helena.duarte@'));
    expect(byEmail.map((user) => user.name)).toEqual(['Helena Duarte']);

    await expect(
      firstValueFrom(
        api.create({
          name: 'Outra Nina',
          email: 'nina.prado@attornatus.com.br',
          cpf: '390.533.447-05',
          phone: '(11) 98888-0101',
          phoneType: 'mobile',
        }),
      ),
    ).rejects.toBeInstanceOf(HttpErrorResponse);
  });

  it('updates an existing user and fails when the directory is unavailable', async () => {
    const updated = await firstValueFrom(
      api.update('u-giana', {
        name: 'Giana Sandrini Lopes',
        email: 'giana@attornatus.com.br',
        cpf: '529.982.247-25',
        phone: '(11) 98821-4401',
        phoneType: 'mobile',
      }),
    );
    expect(updated.name).toBe('Giana Sandrini Lopes');

    localStorage.setItem('attus-users-unavailable', '1');
    await expect(firstValueFrom(api.list(''))).rejects.toMatchObject({ status: 0 });
  });
});
