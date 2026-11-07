# Respostas do desafio Attus

## 1. TypeScript e Qualidade de Código

### 1.1. Refatoração

O código original apaga a checagem com `any`, repete a mesma busca nos dois métodos, compara com `==` e lê `produto.id` mesmo quando o id não existe. `Produto` não tem comportamento, então um tipo imutável basta. A descrição precisa do produto. A pergunta de estoque tem resposta natural quando o id não existe: não há estoque.

`Greengrocer` é a verdureira. `getProductDescription` e `hasProductInStock` cobrem `getDescricaoProduto` e `hasEstoqueProduto`. Maçã, laranja e limão continuam com os estoques 20, 0 e 20.

```ts
export interface Product {
  readonly id: number;
  readonly description: string;
  readonly stockQuantity: number;
}

export class Greengrocer {
  private readonly products: readonly Product[] = [
    { id: 1, description: 'Maçã', stockQuantity: 20 },
    { id: 2, description: 'Laranja', stockQuantity: 0 },
    { id: 3, description: 'Limão', stockQuantity: 20 },
  ];

  getProductDescription(productId: number): string {
    const product = this.findProduct(productId);
    if (!product) {
      throw new Error(`Product ${productId} was not found`);
    }
    return `${product.id} - ${product.description} (${product.stockQuantity}x)`;
  }

  hasProductInStock(productId: number): boolean {
    return (this.findProduct(productId)?.stockQuantity ?? 0) > 0;
  }

  private findProduct(productId: number): Product | undefined {
    return this.products.find((product) => product.id === productId);
  }
}
```

`getProductDescription(1)` devolve `1 - Maçã (20x)`. `hasProductInStock(2)` é `false`. `hasProductInStock(99)` também é `false`. `getProductDescription(99)` lança erro, porque não existe descrição para montar.

### 1.2. Generics e tipos utilitários

`page` começa em 1. `pageSize` é o tamanho da página. A função filtra primeiro, conta o total filtrado e só então recorta a página. Ela não altera o array recebido. Página além do fim devolve `items` vazio e o `total` real. Página ou tamanho inválidos lançam `RangeError`, para um `slice` não esconder o erro.

```ts
export interface PaginaParams {
  page: number;
  pageSize: number;
}

export interface Pagina<T> {
  items: readonly T[];
  total: number;
}

export function filtrarEPaginar<T>(
  data: readonly T[],
  filterFn: (item: T) => boolean,
  params: PaginaParams,
): Pagina<T> {
  if (!Number.isInteger(params.page) || params.page < 1) {
    throw new RangeError('page must be an integer greater than or equal to 1');
  }
  if (!Number.isInteger(params.pageSize) || params.pageSize < 1) {
    throw new RangeError('pageSize must be an integer greater than or equal to 1');
  }

  const filtered = data.filter(filterFn);
  const start = (params.page - 1) * params.pageSize;
  return {
    items: filtered.slice(start, start + params.pageSize),
    total: filtered.length,
  };
}
```

Uso com usuários, filtro por nome e página de dois itens. A comparação ignora maiúsculas e minúsculas em pt-BR. Os quatro nomes contêm `a`, então o total filtrado é 4 e a primeira página traz Ana e Bruno.

```ts
interface User {
  id: number;
  name: string;
}

const users: readonly User[] = [
  { id: 1, name: 'Ana Souza' },
  { id: 2, name: 'Bruno Moraes' },
  { id: 3, name: 'Carla Nunes' },
  { id: 4, name: 'Daniela Alves' },
];

function nameIncludes(term: string): (user: User) => boolean {
  const normalized = term.toLocaleLowerCase('pt-BR');
  return (user) => user.name.toLocaleLowerCase('pt-BR').includes(normalized);
}

const firstPage = filtrarEPaginar(users, nameIncludes('a'), {
  page: 1,
  pageSize: 2,
});
```

`firstPage.total` é `4`. `firstPage.items` é Ana Souza e Bruno Moraes. A página 2 traz Carla Nunes e Daniela Alves.

## 2. Angular, fundamentos e reatividade

### 2.1. Change Detection e OnPush

O nome não aparece porque a view está em `OnPush` e a atribuição `this.texto = ...` não marca o componente para verificação. `OnPush` verifica o componente quando uma referência de `@Input` muda, quando um evento do template nasce ali, quando o `async` pipe emite, quando um signal lido no template muda, ou quando `markForCheck` ou `detectChanges` é chamado.

`delay(500)` agenda a emissão num timer. Com Zone.js, esse timer dispara um ciclo a partir da raiz. A view `OnPush` entra nesse ciclo só se já estiver suja. O `subscribe` cru não a suja. `setInterval` também não: `contador` nem está no template, e o incremento não chama `markForCheck`. Por isso o timer não faz o nome aparecer.

A correção mantém `OnPush`, não mexe em `PessoaService` e não tira o `setInterval`. Depois de gravar o texto, `markForCheck` marca esta view e os ancestrais. O ciclo seguinte pinta `Nome: João`. `takeUntilDestroyed` encerra o observable se o componente cair antes dos 500 ms. `clearInterval` encerra o timer que a questão mandou conservar.

```ts
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  Injectable,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { of, Subscription } from 'rxjs';
import { delay } from 'rxjs/operators';

@Injectable()
class PessoaService {
  /** @description Mock de uma busca em API com retorno em 0.5 segundos */
  buscarPorId(id: number) {
    return of({ id, nome: 'João' }).pipe(delay(500));
  }
}

@Component({
  selector: 'app-root',
  providers: [PessoaService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1>{{ texto }}</h1>`,
})
export class AppComponent implements OnInit, OnDestroy {
  texto = '';
  contador = 0;
  private intervaloId?: ReturnType<typeof setInterval>;
  private readonly destroyRef = inject(DestroyRef);
  private readonly pessoaService = inject(PessoaService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.pessoaService
      .buscarPorId(1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((pessoa) => {
        this.texto = `Nome: ${pessoa.nome}`;
        this.changeDetectorRef.markForCheck();
      });

    this.intervaloId = setInterval(() => this.contador++, 1000);
  }

  ngOnDestroy(): void {
    if (this.intervaloId !== undefined) {
      clearInterval(this.intervaloId);
    }
  }
}
```

`Subscription` fica importado só se algum código antigo ainda guardar a assinatura. Nesta correção o `takeUntilDestroyed` dispensa o campo. O import pode sair junto com o campo. O serviço permanece o da questão.

### 2.2. RxJS, eliminando subscriptions aninhadas

As duas chamadas usam `pessoaId`, que já está em memória. Nenhuma precisa do corpo da outra. `forkJoin` assina as duas ao mesmo tempo e emite um único objeto quando as duas completam. Se uma falhar, o conjunto falha e o `async` pipe não recebe texto parcial.

`switchMap` seria a escolha se a quantidade de familiares dependesse de um campo que só existe em `pessoa`. Ele esperaria a pessoa, abriria a segunda requisição e cancelaria uma interna anterior. Aqui isso só acrescentaria latência.

O `async` pipe assina no template e cancela na destruição do componente. Não há `subscribe` aninhado nem `Subscription` manual.

```ts
import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';

interface Pessoa {
  id: number;
  nome: string;
}

interface PessoaService {
  buscarPorId(id: number): Observable<Pessoa>;
  buscarQuantidadeFamiliares(id: number): Observable<number>;
}

@Component({
  selector: 'app-pessoa',
  imports: [AsyncPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>{{ texto$ | async }}</p>`,
})
export class PessoaComponent {
  private readonly pessoaService = inject(PessoaService);
  private readonly pessoaId = 1;

  readonly texto$: Observable<string> = forkJoin({
    pessoa: this.pessoaService.buscarPorId(this.pessoaId),
    familiares: this.pessoaService.buscarQuantidadeFamiliares(this.pessoaId),
  }).pipe(
    map(({ pessoa, familiares }) => `Nome: ${pessoa.nome} | familiares: ${familiares}`),
  );
}
```

`PessoaService` aqui é o contrato que o trecho original já chama. Não há implementação nova de API.

### 2.3. RxJS, busca com debounce

O fluxo espera 500 ms sem novas teclas, descarta termo repetido depois do `trim` e troca a requisição anterior com `switchMap`. O `HttpClient` cancela o GET ao perder a assinatura, então a resposta velha não cobre a nova. O `async` pipe é o único assinante, então não há vazamento. O carregamento viaja no mesmo observable: `startWith` liga o indicador, o `map` final desliga, e um termo vazio nem chama a rede.

A URL é fictícia. Não existe servidor por trás dela.

```ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, Injectable } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators';

export interface UserHit {
  id: number;
  name: string;
}

interface SearchView {
  results: readonly UserHit[];
  loading: boolean;
}

const idleView: SearchView = { results: [], loading: false };

@Injectable({ providedIn: 'root' })
export class UserSearchService {
  private readonly http = inject(HttpClient);

  /** Client contract only. example.invalid is a stand-in URL, not a server. */
  search(term: string): Observable<UserHit[]> {
    const params = new HttpParams().set('q', term);
    return this.http.get<UserHit[]>('https://example.invalid/api/users', { params });
  }
}

@Component({
  selector: 'app-user-search',
  imports: [AsyncPipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label>
      Pesquisar
      <input type="search" [formControl]="term" />
    </label>

    @if (view$ | async; as view) {
      @if (view.loading) {
        <p>Carregando...</p>
      }
      <ul>
        @for (user of view.results; track user.id) {
          <li>{{ user.name }}</li>
        }
      </ul>
    }
  `,
})
export class UserSearchComponent {
  private readonly userSearchService = inject(UserSearchService);
  readonly term = new FormControl('', { nonNullable: true });

  readonly view$: Observable<SearchView> = this.term.valueChanges.pipe(
    debounceTime(500),
    map((value) => value.trim()),
    distinctUntilChanged(),
    switchMap((term) => this.load(term)),
    startWith(idleView),
  );

  private load(term: string): Observable<SearchView> {
    if (term.length === 0) {
      return of(idleView);
    }

    return this.userSearchService.search(term).pipe(
      map((results) => ({ results, loading: false })),
      startWith({ results: [], loading: true }),
      catchError(() => of(idleView)),
    );
  }
}
```

O `startWith(idleView)` externo entrega a tela inicial antes do primeiro debounce. Cada termo novo substitui o interno: o `startWith` desse interno acende o loading na hora, e o cancelamento do GET anterior acontece no `switchMap`.

### 2.4. Performance, OnPush e trackBy

`@for` e `ngFor` precisam saber qual nó já representa qual item. Sem uma chave estável, a identidade é a referência do objeto. Uma lista nova vinda de HTTP, filtro ou atualização imutável troca todas as referências. O Angular então derruba os nós e cria outros, mesmo quando os ids continuam os mesmos. Estado local da linha, foco e custo de criar centenas de nós se perdem junto.

A chave certa é um id estável do item. O índice quebra quando a lista é reordenada, filtrada ou recebe um item no topo: o DOM da posição 0 passa a ser outra pessoa, com o estado da pessoa anterior. A função de `trackBy` recebe o índice e o item e devolve só o id.

```ts
trackUser(_index: number, user: UserHit): number {
  return user.id;
}
```

```html
@for (user of users; track user.id) {
  <app-user-row [user]="user" />
}
```

```html
<li *ngFor="let user of users; trackBy: trackUser">{{ user.name }}</li>
```

`track user.id` é o `trackBy` do `@for`. A expressão precisa ser pura e estável para o mesmo item.

`ChangeDetectionStrategy.OnPush` tira o componente e a subárvore dos ciclos em que nada mudou para eles. Numa lista de centenas de linhas, cada linha `OnPush` só é verificada de novo se o `@Input` chegar com outra referência, se um evento sair do template dela, se um signal ou `async` pipe lido ali emitir, ou se alguém chamar `markForCheck`. Uma tecla num campo que não é ancestral dessas linhas não reavalia o template de cada linha. Junto com `track` por id, a linha cujo objeto não mudou conserva o componente e o nó.

A estratégia `Default` verifica o componente em todo ciclo disparado na aplicação: evento, timer, HTTP e verificação do pai. Cada ciclo percorre as centenas de templates e os bindings deles. O `trackBy` ainda evita recriar DOM, mas não evita essa caminhada. O custo cresce com o tamanho da lista e com a quantidade de bindings. A tela continua correta, e o trabalho de detecção deixa de ter relação com o que de fato mudou.

## 3. Gerenciamento de Estado

### 3.1. Angular Signals, estado local

O carrinho guarda os itens num `signal`, deriva o total num `computed` e avisa o pai por `output()` dentro de um `effect`. O `effect` lê só `total`. Ele roda de novo quando esse valor muda, inclusive na primeira leitura, que emite `0`. Somar de novo até o mesmo número não emite outra vez.

`addItem` soma a quantidade quando o id já existe e conserva o preço da linha. `removeItem` tira a linha daquele id. As duas atualizações trocam o array, então o `computed` e o `@for` veem uma referência nova.

```ts
import { ChangeDetectionStrategy, Component, computed, effect, output, signal } from '@angular/core';

export interface CartItem {
  readonly id: number;
  readonly name: string;
  readonly price: number;
  readonly quantity: number;
}

@Component({
  selector: 'app-cart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul>
      @for (item of items(); track item.id) {
        <li>
          {{ item.name }}: {{ item.quantity }} x {{ item.price }}
          <button type="button" (click)="removeItem(item.id)">Remover</button>
        </li>
      }
    </ul>
    <p>Total: {{ total() }}</p>
  `,
})
export class CartComponent {
  readonly items = signal<readonly CartItem[]>([]);

  readonly total = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity * item.price, 0),
  );

  readonly totalChanged = output<number>();

  private readonly publishTotal = effect(() => {
    this.totalChanged.emit(this.total());
  });

  addItem(item: CartItem): void {
    this.items.update((current) => {
      const existing = current.find((entry) => entry.id === item.id);
      if (!existing) {
        return [...current, item];
      }
      return current.map((entry) =>
        entry.id === item.id ? { ...entry, quantity: entry.quantity + item.quantity } : entry,
      );
    });
  }

  removeItem(id: number): void {
    this.items.update((current) => current.filter((entry) => entry.id !== id));
  }
}
```

O total é a soma de quantidade vezes preço de cada linha. Dois itens `id: 1`, preço `10`, quantidades `2` e `3`, ficam numa linha de quantidade `5` e total `50`.

### 3.2. Gerenciamento de Estado com NgRx (Feature To-do)

A feature registra um reducer puro, quatro actions e dois seletores. O effect escuta `loadTodos`, faz um GET e despacha sucesso ou erro. A URL é fictícia. Não há servidor, banco nem mock de rotas. `toggleTodoComplete` só muda o estado local, porque a questão não pediu outra action de rede para a troca.

Um id ausente devolve o mesmo estado, e um erro de carga conserva a lista que já estava na tela.

```ts
export const TODO_FEATURE_KEY = 'todo';

export interface Todo {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
}

export interface TodoState {
  readonly todos: readonly Todo[];
  readonly loading: boolean;
  readonly error: string | null;
}

export const initialTodoState: TodoState = {
  todos: [],
  loading: false,
  error: null,
};
```

```ts
import { createAction, props } from '@ngrx/store';
import { Todo } from './todo.model';

export const loadTodos = createAction('[Todo] Load');

export const loadTodosSuccess = createAction('[Todo] Load Success', props<{ todos: readonly Todo[] }>());

export const loadTodosError = createAction('[Todo] Load Error', props<{ error: string }>());

export const toggleTodoComplete = createAction('[Todo] Toggle Complete', props<{ id: string }>());
```

```ts
import { createReducer, on } from '@ngrx/store';
import { loadTodos, loadTodosError, loadTodosSuccess, toggleTodoComplete } from './todo.actions';
import { initialTodoState } from './todo.model';

export const todoReducer = createReducer(
  initialTodoState,
  on(loadTodos, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(loadTodosSuccess, (state, { todos }) => ({
    ...state,
    todos,
    loading: false,
    error: null,
  })),
  on(loadTodosError, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(toggleTodoComplete, (state, { id }) => {
    const index = state.todos.findIndex((todo) => todo.id === id);
    if (index === -1) {
      return state;
    }
    const todos = state.todos.map((todo, todoIndex) =>
      todoIndex === index ? { ...todo, completed: !todo.completed } : todo,
    );
    return { ...state, todos };
  }),
);
```

```ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TODO_FEATURE_KEY, TodoState } from './todo.model';

const selectTodoState = createFeatureSelector<TodoState>(TODO_FEATURE_KEY);

export const selectAllTodos = createSelector(selectTodoState, (state) => state.todos);

export const selectPendingTodos = createSelector(selectAllTodos, (todos) =>
  todos.filter((todo) => !todo.completed),
);
```

```ts
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { loadTodos, loadTodosError, loadTodosSuccess } from './todo.actions';
import { Todo } from './todo.model';

@Injectable()
export class TodoEffects {
  private readonly actions$ = inject(Actions);
  private readonly http = inject(HttpClient);

  /** GET against a stand-in URL. No backend is implemented. */
  readonly loadTodos$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTodos),
      switchMap(() =>
        this.http.get<readonly Todo[]>('https://example.invalid/api/todos').pipe(
          map((todos) => loadTodosSuccess({ todos })),
          catchError((error: unknown) =>
            of(
              loadTodosError({
                error: error instanceof HttpErrorResponse ? error.message : 'Could not load todos.',
              }),
            ),
          ),
        ),
      ),
    ),
  );
}
```

```ts
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { TodoEffects } from './todo.effects';
import { TODO_FEATURE_KEY } from './todo.model';
import { todoReducer } from './todo.reducer';

export const todoFeatureProviders = [
  provideState(TODO_FEATURE_KEY, todoReducer),
  provideEffects(TodoEffects),
];
```

`todoFeatureProviders` entra ao lado de um `provideStore()` já existente. `provideHttpClient()` fica no bootstrap da aplicação, uma vez. `switchMap` descarta um GET antigo se `loadTodos` disparar de novo. O `catchError` fica no observable interno para o effect continuar vivo depois de uma falha. `selectAllTodos` devolve a lista inteira. `selectPendingTodos` devolve só as tarefas com `completed === false`.
