import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  resetUserDirectory,
  USER_API_LATENCY,
  USER_SEARCH_DEBOUNCE,
  userApiMock,
} from '../../core/user-api-mock';
import { UserList } from './user-list';

describe('UserList', () => {
  let fixture: ComponentFixture<UserList>;

  beforeEach(async () => {
    localStorage.removeItem('attus-users-unavailable');
    resetUserDirectory();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([userApiMock])),
        { provide: USER_API_LATENCY, useValue: 0 },
        { provide: USER_SEARCH_DEBOUNCE, useValue: 0 },
      ],
    });
    fixture = TestBed.createComponent(UserList);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.nativeElement.textContent).toContain('Giana Sandrini'));
  });

  it('renders the first page and moves to the next page', async () => {
    expect(fixture.nativeElement.textContent).toContain('Usuários cadastrados');
    expect(
      fixture.nativeElement
        .querySelector('[aria-label="Adicionar usuário"]')
        ?.getAttribute('title'),
    ).toBe('Adicionar usuário');
    expect(
      fixture.nativeElement
        .querySelector('[aria-label="Editar Giana Sandrini"]')
        ?.getAttribute('title'),
    ).toBe('Editar usuário');
    expect(fixture.nativeElement.textContent).toContain('Beatriz Köhler');
    expect(fixture.nativeElement.textContent).not.toContain('Rafael Pacheco');

    clickButton('Próxima página');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Rafael Pacheco');
    expect(fixture.nativeElement.textContent).not.toContain('Giana Sandrini');
  });

  it('keeps save disabled until the form is valid, then creates and edits a user', async () => {
    clickButton('Adicionar usuário');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(button('Cancelar').type).toBe('button');
    expect(button('Cancelar').title).toBe('Cancelar');
    const save = button('Salvar');
    expect(save.title).toBe('Salvar');
    expect(save.disabled).toBe(true);
    expect(document.body.textContent).toContain('Adicionar novo usuário');
    expect(document.body.textContent).toContain(
      'O usuário receberá uma senha provisória para acesso ao sistema por SMS.',
    );

    setField('user-email', 'not-an-email');
    setField('user-name', 'joao');
    setField('user-cpf', '52998224726');
    setField('user-phone', '119888');
    fixture.detectChanges();
    expect(button('Salvar').disabled).toBe(true);
    expect(document.body.textContent).toContain('Informe um e-mail válido.');
    expect(document.body.textContent).toContain('Informe nome e sobrenome.');

    setField('user-phone', '12312333333');
    fixture.detectChanges();
    expect(document.body.textContent).toContain('Informe um telefone válido.');
    expect(button('Salvar').disabled).toBe(true);

    setField('user-email', 'ana.prado@attornatus.com.br');
    setField('user-name', 'Ana Prado');
    setField('user-cpf', '52998224725');
    setField('user-phone', '11977770101');
    fixture.detectChanges();
    await vi.waitFor(() => expect(button('Salvar').disabled).toBe(false));
    expect(document.body.textContent).toContain('Celular');

    submitForm();
    fixture.detectChanges();
    await vi.waitFor(() => expect(document.body.textContent).toContain('Ana Prado'));
    await vi.waitFor(() =>
      expect(document.body.textContent).not.toContain('Adicionar novo usuário'),
    );

    clickButton('Editar Ana Prado');
    fixture.detectChanges();
    await fixture.whenStable();
    expect((document.getElementById('user-email') as HTMLInputElement).value).toBe(
      'ana.prado@attornatus.com.br',
    );
    expect(document.body.textContent).toContain('Editar usuário');
    expect(document.body.textContent).not.toContain(
      'O usuário receberá uma senha provisória para acesso ao sistema por SMS.',
    );

    setField('user-name', 'Ana Prado Alves');
    fixture.detectChanges();
    submitForm();
    fixture.detectChanges();
    await vi.waitFor(() => expect(document.body.textContent).toContain('Ana Prado Alves'));
  });

  it('shows an empty search and a load error with retry', async () => {
    fixture.componentInstance.store.setName('zzz-nobody');
    fixture.detectChanges();
    await vi.waitFor(() =>
      expect(fixture.nativeElement.textContent).toContain('Nenhum usuário encontrado'),
    );

    fixture.componentInstance.store.setName('');
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.nativeElement.textContent).toContain('Giana Sandrini'));

    localStorage.setItem('attus-users-unavailable', '1');
    fixture.componentInstance.store.retry();
    fixture.detectChanges();
    await vi.waitFor(() =>
      expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar os usuários.'),
    );

    localStorage.removeItem('attus-users-unavailable');
    clickButton('Tentar novamente');
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.nativeElement.textContent).toContain('Giana Sandrini'));
  });
});

function button(name: string): HTMLButtonElement {
  const match = [...document.querySelectorAll('button')].find(
    (candidate) =>
      candidate.getAttribute('aria-label') === name ||
      (candidate.textContent ?? '').trim() === name,
  );
  if (!(match instanceof HTMLButtonElement)) {
    throw new Error(`Missing button ${name}`);
  }
  return match;
}

function clickButton(name: string): void {
  button(name).click();
}

function submitForm(): void {
  const form = document.querySelector('form');
  if (!(form instanceof HTMLFormElement)) {
    throw new Error('Missing user form');
  }
  form.requestSubmit();
}

function setField(id: string, value: string): void {
  const field = document.getElementById(id);
  if (!(field instanceof HTMLInputElement)) {
    throw new Error(`Missing field ${id}`);
  }
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('blur', { bubbles: true }));
}
