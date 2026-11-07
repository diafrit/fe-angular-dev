import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { UserStore } from '../../core/user-store';
import { isPhoneType, PhoneType, phoneTypes, User } from '../../core/user.model';
import {
  cleanDraft,
  isFullName,
  isValidCpf,
  isValidPhone,
  maskCpf,
  maskPhone,
  nextPhoneType,
  phoneCategory,
  readApiError,
} from '../../core/user-text';

export interface UserDialogContext {
  mode: 'create' | 'edit';
  user?: User;
}

@Component({
  selector: 'app-user-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './user-form-dialog.html',
  styleUrl: './user-form-dialog.css',
})
export class UserFormDialog {
  private readonly dialogRef = inject(MatDialogRef<UserFormDialog>);
  private readonly context = inject<UserDialogContext>(MAT_DIALOG_DATA);
  private readonly store = inject(UserStore);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  private applyingSnapshot = false;

  protected readonly phoneTypes = phoneTypes;
  protected readonly saving = this.store.saving;
  protected readonly saveError = signal<string | null>(null);
  protected readonly editing = this.context.mode === 'edit' ? this.context.user : undefined;

  protected readonly userForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    name: ['', [Validators.required, fullNameValidator]],
    cpf: ['', [Validators.required, cpfValidator]],
    phone: ['', [Validators.required, phoneValidator]],
    phoneType: this.formBuilder.control<PhoneType | ''>('', [
      Validators.required,
      phoneTypeValidator,
    ]),
  });

  constructor() {
    this.userForm.controls.cpf.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.applyMask(this.userForm.controls.cpf, maskCpf(value));
    });
    this.userForm.controls.phone.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.applyMask(this.userForm.controls.phone, maskPhone(value));
      this.syncPhoneType(this.userForm.controls.phone.value);
    });
    this.userForm.controls.phoneType.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.userForm.controls.phone.updateValueAndValidity({ emitEvent: false });
    });

    if (this.editing) {
      this.applyingSnapshot = true;
      this.userForm.setValue({
        name: this.editing.name,
        email: this.editing.email,
        cpf: this.editing.cpf,
        phone: this.editing.phone,
        phoneType: this.editing.phoneType,
      });
      this.applyingSnapshot = false;
    }
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  protected save(): void {
    if (this.userForm.invalid || this.saving()) {
      this.userForm.markAllAsTouched();
      return;
    }
    const phoneType = this.userForm.controls.phoneType.value;
    if (!isPhoneType(phoneType)) {
      this.userForm.controls.phoneType.markAsTouched();
      return;
    }
    this.saveError.set(null);
    const draft = cleanDraft({ ...this.userForm.getRawValue(), phoneType });
    const request = this.editing
      ? this.store.update(this.editing.id, draft)
      : this.store.create(draft);
    request.subscribe({
      next: () => this.dialogRef.close(),
      error: (error: unknown) => {
        this.saveError.set(readApiError(error, 'Não foi possível salvar o usuário.'));
      },
    });
  }

  private applyMask(control: AbstractControl<string>, masked: string): void {
    if (masked !== control.value) {
      control.setValue(masked, { emitEvent: false });
    }
  }

  private syncPhoneType(phone: string): void {
    if (this.applyingSnapshot) {
      return;
    }
    const typeControl = this.userForm.controls.phoneType;
    const next = nextPhoneType(phone, typeControl.value);
    if (next !== typeControl.value) {
      typeControl.setValue(next);
    } else {
      typeControl.updateValueAndValidity({ emitEvent: false });
    }
  }
}

function cpfValidator(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value ?? '';
  if (value.trim().length === 0 || isValidCpf(value)) {
    return null;
  }
  return { cpf: true };
}

function fullNameValidator(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value ?? '';
  if (value.trim().length === 0 || isFullName(value)) {
    return null;
  }
  return { fullName: true };
}

function phoneValidator(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value ?? '';
  if (value.trim().length === 0 || isValidPhone(value)) {
    return null;
  }
  return { phone: true };
}

function phoneTypeValidator(control: AbstractControl<PhoneType | ''>): ValidationErrors | null {
  const type = control.value;
  if (!isPhoneType(type)) {
    return null;
  }
  const phone = String(control.parent?.get('phone')?.value ?? '');
  const category = phoneCategory(phone);
  if (category === 'mobile' && type !== 'mobile') {
    return { mismatch: true };
  }
  if (category === 'landline' && type === 'mobile') {
    return { mismatch: true };
  }
  return null;
}
