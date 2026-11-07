import { expect, test } from '@playwright/test';

test('lists users, filters by name, creates a user and edits it', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Usuários', exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('Pesquisar')).toBeVisible();
  await expect(page.getByText('Giana Sandrini')).toBeVisible();
  await expect(page.getByText('giana@attornatus.com.br')).toBeVisible();

  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await expect(page.getByRole('heading', { name: 'Attus', exact: true })).toBeVisible();
  await expect(page.getByText('Procuradoria Digital')).toBeVisible();
  await page.getByRole('button', { name: 'Fechar menu' }).click();

  const search = page.getByLabel('Pesquisar por nome ou e-mail');
  await search.fill('Giana');
  await expect(page.getByText('Helena Duarte')).toHaveCount(0);
  await expect(page.getByText('Giana Sandrini')).toBeVisible();

  await search.fill('helena.duarte@');
  await expect(page.getByText('Giana Sandrini')).toHaveCount(0);
  await expect(page.getByText('Helena Duarte')).toBeVisible();
  await page.getByRole('button', { name: 'Limpar pesquisa' }).click();
  await expect(search).toHaveValue('');
  await expect(page.getByText('Giana Sandrini')).toBeVisible();

  await search.fill('ninguém-aqui');
  await expect(page.getByText('Nenhum usuário encontrado')).toBeVisible();

  await search.fill('');
  await expect(page.getByText('Giana Sandrini')).toBeVisible();

  await page.getByRole('button', { name: 'Adicionar usuário' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Adicionar novo usuário' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  await expect(
    dialog.getByText('O usuário receberá uma senha provisória para acesso ao sistema por SMS.'),
  ).toBeVisible();

  await dialog.getByLabel('Usuário (e-mail) *').fill('ana.prado@attornatus.com.br');
  await dialog.getByLabel('Nome completo *').fill('Ana Prado');
  await dialog.getByLabel('CPF *').fill('52998224725');
  await dialog.getByLabel('Número do telefone *').fill('11977770101');
  await dialog.getByLabel('Tipo de telefone *').click();
  await page.getByRole('option', { name: 'Celular' }).click();
  await expect(dialog.getByRole('button', { name: 'Salvar' })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Salvar' }).click();

  await expect(page.getByText('Ana Prado')).toBeVisible();
  await page.getByRole('button', { name: 'Editar Ana Prado' }).click();
  await expect(page.getByRole('heading', { name: 'Editar usuário' })).toBeVisible();
  await expect(page.getByLabel('Usuário (e-mail) *')).toHaveValue('ana.prado@attornatus.com.br');
  await page.getByLabel('Nome completo *').fill('Ana Prado Alves');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Ana Prado Alves')).toBeVisible();
});

test('explains a failed directory load and recovers', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('attus-users-unavailable', '1'));
  await page.goto('/');
  await expect(page.getByText('Não foi possível carregar os usuários.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();

  await page.evaluate(() => localStorage.removeItem('attus-users-unavailable'));
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByText('Giana Sandrini')).toBeVisible();
});
