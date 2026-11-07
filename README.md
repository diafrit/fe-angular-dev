# Desafio frontend Attus

Listagem de usuários com busca por nome ou e-mail, cadastro e edição em modal. Os dados ficam em uma API mockada no próprio cliente.

## Respostas

As respostas das questões 1 a 3 estão em [respostas-do-desafio.md](respostas-do-desafio.md).

## Requisitos

- Listagem em cards com nome, e-mail e ação de editar.
- Filtro por nome ou e-mail com debounce de 300 ms.
- Estado de carregamento e mensagem de erro quando a consulta falha.
- Cadastro e edição no modal aberto pelo botão vermelho.
- Formulário com e-mail, nome, CPF, telefone e tipo de telefone, todos obrigatórios.
- Mensagem de erro por campo e botão Salvar desabilitado enquanto o formulário é inválido.
- Na edição, o formulário abre preenchido.
- Componentes standalone, Signals, formulário reativo (`FormGroup` e `FormControl`) e RxJS (`debounceTime`, `switchMap`, `catchError`, `distinctUntilChanged`).
- Testes unitários com Vitest e testes de ponta a ponta com Playwright.
- Interface com Angular Material.

## Como instalar

Requer Node.js `^22.22.3`, `^24.15` ou `>=26`.

```bash
npm install
npm run e2e:install
```

O `e2e:install` baixa o Chromium usado pelos testes e2e.

## Como iniciar

```bash
npm start
```

A aplicação sobe em `http://127.0.0.1:4320`.

## Como rodar os testes unitários

```bash
npm test
```

Para ver a cobertura:

```bash
npm run test:coverage
```

## Como rodar os testes e2e

O Playwright sobe a aplicação automaticamente (`npm start`) e reutiliza o servidor se ele já estiver no ar em `http://127.0.0.1:4320`:

```bash
npm run e2e
```
