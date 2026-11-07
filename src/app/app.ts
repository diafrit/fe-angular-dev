import { afterNextRender, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UserStore } from './core/user-store';
import { applyTheme, currentTheme, type ThemeChoice } from './core/theme';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
  ],
  templateUrl: './app.html',
})
export class App {
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(UserStore);

  readonly theme = signal<ThemeChoice>(currentTheme());
  readonly themeLabel = computed(() =>
    this.theme() === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro',
  );

  constructor() {
    afterNextRender(() => applyTheme(this.theme(), false));
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (localStorage.getItem('theme')) {
        return;
      }
      const next = currentTheme();
      this.theme.set(next);
      applyTheme(next, false);
    };
    media?.addEventListener?.('change', onChange);
    this.destroyRef.onDestroy(() => media?.removeEventListener?.('change', onChange));
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.store.setName(value);
  }

  clearSearch(input: HTMLInputElement): void {
    input.value = '';
    this.store.setName('');
  }

  toggleTheme(): void {
    const next: ThemeChoice = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    applyTheme(next, true);
  }
}
