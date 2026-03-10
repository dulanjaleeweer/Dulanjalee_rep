'use client';

import React, { useState, FormEvent } from 'react';
import { UserRole } from '@abc-earlysteps/shared';
import { useRegister } from '../hooks/useRegister';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { RoleSelector } from './RoleSelector';

export function RegisterForm() {
  const {
    state,
    errors,
    passwordValidation,
    emailError,
    displayNameError,
    validateField,
    submit,
    reset,
  } = useRegister();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.FAMILY_OWNER);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSubmitting = state === 'submitting';

  if (state === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          maxWidth: '440px',
          margin: '0 auto',
          padding: '32px',
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontSize: '24px', color: '#1a202c', marginBottom: '16px' }}>
          Check your email
        </h2>
        <p style={{ color: '#4a5568', lineHeight: 1.6 }}>
          If an account was created, we have sent a verification link to your email address.
          Please check your inbox and follow the link to verify your account.
        </p>
        <p style={{ color: '#718096', fontSize: '14px', marginTop: '16px' }}>
          Did not receive it? Check your spam folder or try again in a few minutes.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: '24px',
            padding: '10px 24px',
            border: '1px solid #cbd5e0',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            color: '#2d3748',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Back to registration
        </button>
      </div>
    );
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit({ email, password, displayName, role, acceptTerms });
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{ maxWidth: '440px', margin: '0 auto' }}
      aria-label="Create an account"
    >
      <h1
        style={{
          fontSize: '28px',
          fontWeight: 600,
          color: '#1a202c',
          marginBottom: '8px',
        }}
      >
        Create your account
      </h1>
      <p style={{ color: '#718096', marginBottom: '24px', fontSize: '15px' }}>
        Join ABC EarlySteps to support your child&#39;s learning journey.
      </p>

      {/* Error summary */}
      {errors.length > 0 && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            marginBottom: '16px',
            backgroundColor: '#fff5f5',
            border: '1px solid #feb2b2',
            borderRadius: '6px',
            color: '#c53030',
            fontSize: '14px',
          }}
        >
          <ul style={{ margin: 0, paddingLeft: '16px' }}>
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Display Name */}
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="displayName"
          style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px', color: '#374151' }}
        >
          Display name
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            validateField('displayName', e.target.value);
          }}
          onBlur={() => validateField('displayName', displayName)}
          disabled={isSubmitting}
          autoComplete="name"
          aria-invalid={displayNameError ? 'true' : undefined}
          aria-describedby={displayNameError ? 'displayName-error' : undefined}
          required
          style={{
            width: '100%',
            padding: '10px 12px',
            border: `1px solid ${displayNameError ? '#e53e3e' : '#d1d5db'}`,
            borderRadius: '6px',
            fontSize: '16px',
            boxSizing: 'border-box',
          }}
        />
        {displayNameError && (
          <p id="displayName-error" role="alert" style={{ color: '#e53e3e', fontSize: '13px', margin: '4px 0 0' }}>
            {displayNameError}
          </p>
        )}
      </div>

      {/* Email */}
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="email"
          style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px', color: '#374151' }}
        >
          Email address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) validateField('email', e.target.value);
          }}
          onBlur={() => validateField('email', email)}
          disabled={isSubmitting}
          autoComplete="email"
          aria-invalid={emailError ? 'true' : undefined}
          aria-describedby={emailError ? 'email-error' : undefined}
          required
          style={{
            width: '100%',
            padding: '10px 12px',
            border: `1px solid ${emailError ? '#e53e3e' : '#d1d5db'}`,
            borderRadius: '6px',
            fontSize: '16px',
            boxSizing: 'border-box',
          }}
        />
        {emailError && (
          <p id="email-error" role="alert" style={{ color: '#e53e3e', fontSize: '13px', margin: '4px 0 0' }}>
            {emailError}
          </p>
        )}
      </div>

      {/* Password */}
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="password"
          style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px', color: '#374151' }}
        >
          Password
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              validateField('password', e.target.value);
            }}
            disabled={isSubmitting}
            autoComplete="new-password"
            aria-describedby="password-requirements"
            required
            style={{
              width: '100%',
              padding: '10px 48px 10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '16px',
              boxSizing: 'border-box',
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#718096',
              padding: '4px 8px',
            }}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        <div id="password-requirements">
          <PasswordStrengthIndicator validation={passwordValidation} password={password} />
        </div>
      </div>

      {/* Role Selector */}
      <RoleSelector value={role} onChange={setRole} disabled={isSubmitting} />

      {/* Terms */}
      <div style={{ marginBottom: '24px' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            fontSize: '14px',
            color: '#4a5568',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            disabled={isSubmitting}
            style={{ marginTop: '3px' }}
          />
          <span>
            I agree to the{' '}
            <a href="/terms" style={{ color: '#2b6cb0', textDecoration: 'underline' }}>
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" style={{ color: '#2b6cb0', textDecoration: 'underline' }}>
              Privacy Policy
            </a>
          </span>
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting || undefined}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: isSubmitting ? '#a0aec0' : '#2b6cb0',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          fontWeight: 500,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
        }}
      >
        {isSubmitting ? 'Creating account...' : 'Create account'}
      </button>

      <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#718096' }}>
        Already have an account?{' '}
        <a href="/login" style={{ color: '#2b6cb0', textDecoration: 'underline' }}>
          Sign in
        </a>
      </p>
    </form>
  );
}
