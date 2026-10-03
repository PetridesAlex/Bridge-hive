'use client';

import { Eye, EyeOff, Lock } from 'lucide-react';
import { useId, useState } from 'react';

export function AuthPasswordField({
  id,
  name = 'password',
  label = 'Password',
  autoComplete = 'current-password',
  placeholder = 'Enter your password',
}: {
  id?: string;
  name?: string;
  label?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth-field">
      <label htmlFor={fieldId}>{label}</label>
      <div className="auth-field-input auth-password-wrap">
        <Lock className="auth-field-icon" size={16} strokeWidth={1.75} aria-hidden="true" />
        <input
          id={fieldId}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          placeholder={placeholder}
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? (
            <EyeOff size={17} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Eye size={17} strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
