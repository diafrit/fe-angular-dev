import { HttpErrorResponse } from '@angular/common/http';
import { PhoneType, UserDraft } from './user.model';

export type PhoneCategory = 'mobile' | 'landline';

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function maskCpf(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);
  let masked = digits.slice(0, 3);
  if (digits.length > 3) {
    masked += `.${digits.slice(3, 6)}`;
  }
  if (digits.length > 6) {
    masked += `.${digits.slice(6, 9)}`;
  }
  if (digits.length > 9) {
    masked += `-${digits.slice(9, 11)}`;
  }
  return masked;
}

export function isValidCpf(value: string): boolean {
  const digits = digitsOnly(value);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }
  const checkDigit = (length: number): number => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * (length + 1 - index);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return checkDigit(9) === Number(digits[9]) && checkDigit(10) === Number(digits[10]);
}

export function maskPhone(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length === 0) {
    return '';
  }
  const area = digits.slice(0, 2);
  if (digits.length <= 2) {
    return `(${area}`;
  }
  const local = digits.slice(2);
  const headLength = local.length > 8 ? 5 : 4;
  const head = local.slice(0, headLength);
  const tail = local.slice(headLength);
  return tail.length > 0 ? `(${area}) ${head}-${tail}` : `(${area}) ${head}`;
}

export function phoneCategory(value: string): PhoneCategory | null {
  const digits = digitsOnly(value);
  if (digits.length <= 2) {
    return null;
  }
  const local = digits.slice(2);
  if (local.length === 9 && local.startsWith('9')) {
    return 'mobile';
  }
  if (local.length === 8) {
    return 'landline';
  }
  return null;
}

export function isValidPhone(value: string): boolean {
  return phoneCategory(value) !== null;
}

export function isFullName(value: string): boolean {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  return parts.length >= 2 && parts.every((part) => part.length >= 2);
}

export function nextPhoneType(phone: string, current: PhoneType | ''): PhoneType | '' {
  if (digitsOnly(phone).length === 0) {
    return '';
  }
  const category = phoneCategory(phone);
  if (category === 'mobile') {
    return 'mobile';
  }
  if (category === 'landline') {
    return current === 'home' || current === 'work' ? current : '';
  }
  return current;
}

export function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toLocaleUpperCase('pt-BR');
}

export function cleanDraft(draft: UserDraft): UserDraft {
  return {
    name: draft.name.trim(),
    email: draft.email.trim(),
    cpf: maskCpf(draft.cpf),
    phone: maskPhone(draft.phone),
    phoneType: draft.phoneType,
  };
}

export function readApiError(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse && error.status === 409) {
    return 'Já existe um usuário com esse e-mail.';
  }
  return fallback;
}
