export const phoneTypes = [
  { value: 'mobile', label: 'Celular' },
  { value: 'home', label: 'Residencial' },
  { value: 'work', label: 'Comercial' },
] as const;

export type PhoneType = (typeof phoneTypes)[number]['value'];

export interface UserDraft {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  phoneType: PhoneType;
}

export interface User extends UserDraft {
  id: string;
}

export interface UserFormModel {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  phoneType: PhoneType;
}

export function emptyUserForm(): UserFormModel {
  return {
    name: '',
    email: '',
    cpf: '',
    phone: '',
    phoneType: 'mobile',
  };
}

export function isPhoneType(value: string): value is PhoneType {
  return phoneTypes.some((type) => type.value === value);
}
