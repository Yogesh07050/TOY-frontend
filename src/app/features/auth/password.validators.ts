import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Mirrors the backend password policy so users see problems before submitting. */
export const passwordStrength: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value: string = control.value ?? '';
  if (!value) return null;

  const problems: string[] = [];
  if (value.length < 8) problems.push('at least 8 characters');
  if (!/[a-z]/.test(value)) problems.push('a lowercase letter');
  if (!/[A-Z]/.test(value)) problems.push('an uppercase letter');
  if (!/\d/.test(value)) problems.push('a number');

  return problems.length ? { weak: `Password needs ${problems.join(', ')}` } : null;
};

/** Group-level validator putting the error on the confirmation control. */
export const passwordsMatch =
  (passwordKey = 'password', confirmKey = 'confirmPassword'): ValidatorFn =>
  (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordKey)?.value;
    const confirm = group.get(confirmKey);
    if (!confirm || !password || !confirm.value) return null;

    if (password !== confirm.value) {
      confirm.setErrors({ ...(confirm.errors ?? {}), mismatch: true });
      return { mismatch: true };
    }

    // Clear only our own error, leaving any others intact.
    if (confirm.errors?.['mismatch']) {
      const { mismatch, ...rest } = confirm.errors;
      confirm.setErrors(Object.keys(rest).length ? rest : null);
    }
    return null;
  };

/** 0–4 strength score for the meter shown next to the password field. */
export function strengthScore(value: string): number {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
  return Math.min(score, 4);
}
