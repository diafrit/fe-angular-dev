import { HttpErrorResponse } from '@angular/common/http';
import {
  cleanDraft,
  digitsOnly,
  initials,
  isFullName,
  isValidCpf,
  isValidPhone,
  maskCpf,
  maskPhone,
  nextPhoneType,
  normalizeText,
  readApiError,
} from './user-text';

describe('user text', () => {
  it('masks and validates a CPF', () => {
    expect(maskCpf('52998224725')).toBe('529.982.247-25');
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('529.982.247-26')).toBe(false);
  });

  it('masks phones and accepts only a 9-digit mobile or an 8-digit landline', () => {
    expect(maskPhone('11988214401')).toBe('(11) 98821-4401');
    expect(maskPhone('5132214470')).toBe('(51) 3221-4470');
    expect(maskPhone('12312333333')).toBe('(12) 31233-3333');
    expect(isValidPhone('(11) 98821-4401')).toBe(true);
    expect(isValidPhone('(51) 3221-4470')).toBe(true);
    expect(isValidPhone('(12) 31233-3333')).toBe(false);
    expect(isFullName('joao')).toBe(false);
    expect(isFullName('joao silva')).toBe(true);
    expect(nextPhoneType('(11) 97777-0101', '')).toBe('mobile');
    expect(nextPhoneType('(11) 98821-4401', 'mobile')).toBe('mobile');
    expect(nextPhoneType('(11) 3333-4444', '')).toBe('');
    expect(nextPhoneType('(11) 3333-4444', 'home')).toBe('home');
    expect(nextPhoneType('(11) 3333-4444', 'mobile')).toBe('');
    expect(nextPhoneType('', 'work')).toBe('');
    expect(nextPhoneType('(11) 988', 'home')).toBe('home');
  });

  it('normalizes names and builds initials', () => {
    expect(normalizeText('Otávio Nunes')).toBe('otavio nunes');
    expect(digitsOnly('(11) 98821-4401')).toBe('11988214401');
    expect(initials('Giana Sandrini')).toBe('GS');
    expect(initials('Caio')).toBe('C');
  });

  it('trims a draft and reports a duplicate email', () => {
    expect(
      cleanDraft({
        name: '  Helena Duarte  ',
        email: ' helena@attornatus.com.br ',
        cpf: '39053344705',
        phone: '21997102284',
        phoneType: 'mobile',
      }),
    ).toEqual({
      name: 'Helena Duarte',
      email: 'helena@attornatus.com.br',
      cpf: '390.533.447-05',
      phone: '(21) 99710-2284',
      phoneType: 'mobile',
    });
    expect(readApiError(new HttpErrorResponse({ status: 409 }), 'fallback')).toBe(
      'Já existe um usuário com esse e-mail.',
    );
    expect(readApiError(new Error('offline'), 'Não foi possível salvar o usuário.')).toBe(
      'Não foi possível salvar o usuário.',
    );
  });
});
