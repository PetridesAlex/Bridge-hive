'use client';

import { useId, useState } from 'react';

export function AuthPasswordField({
  id,
  name = 'password',
  label = 'Password',
  autoComplete = 'current-password',
}: {
  id?: string;
  name?: string;
  label?: string;
  autoComplete?: string;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth-field">
      <label htmlFor={fieldId}>{label}</label>
      <div className="auth-password-wrap">
        <input
          id={fieldId}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          placeholder=" "
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}
