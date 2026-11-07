import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import {
  resetUserDirectory,
  USER_API_LATENCY,
  USER_SEARCH_DEBOUNCE,
  userApiMock,
} from './core/user-api-mock';

describe('App', () => {
  beforeEach(() => {
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
  });

  it('renders the directory header and search field', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent).toContain('Usuários');
    const search = root.querySelector('#user-search');
    expect(search).toBeTruthy();
    expect(search?.getAttribute('placeholder')).toBe('Pesquisar');
    expect(root.querySelector('[aria-label="Limpar pesquisa"]')).toBeNull();
    expect(root.textContent).toContain('Attus');
    expect(root.textContent).toContain('Procuradoria Digital');
    expect(root.querySelector('[aria-label="Abrir menu"]')?.getAttribute('title')).toBe(
      'Abrir menu',
    );
    expect(root.querySelector('[aria-label="Fechar menu"]')?.getAttribute('title')).toBe('Fechar');
    expect(root.querySelector('[aria-label="Ativar tema escuro"]')).toBeTruthy();

    if (!(search instanceof HTMLInputElement)) {
      throw new Error('Missing search field');
    }
    search.value = 'ana';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(root.querySelector('[aria-label="Limpar pesquisa"]')?.getAttribute('title')).toBe(
      'Limpar pesquisa',
    );
  });
});
