'use client';

import React from 'react';
import { PasswordValidationResult } from '@abc-earlysteps/shared';

interface PasswordStrengthIndicatorProps {
  validation: PasswordValidationResult;
  password: string;
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['#e0e0e0', '#e53e3e', '#ed8936', '#38a169', '#2b6cb0'];

export function PasswordStrengthIndicator({
  validation,
  password,
}: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const { rules, strength } = validation;

  return (
    <div role="status" aria-live="polite" aria-label="Password strength feedback">
      {/* Strength bar */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          marginTop: '8px',
          marginBottom: '8px',
        }}
        aria-hidden="true"
      >
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              backgroundColor: strength >= level ? STRENGTH_COLORS[strength] : '#e0e0e0',
            }}
          />
        ))}
      </div>

      {/* Strength label (screen-reader accessible) */}
      <p
        style={{
          fontSize: '14px',
          color: STRENGTH_COLORS[strength],
          margin: '0 0 8px 0',
          fontWeight: 500,
        }}
      >
        Password strength: {STRENGTH_LABELS[strength] || 'Too short'}
      </p>

      {/* Individual rules */}
      <ul
        style={{ listStyle: 'none', padding: 0, margin: 0 }}
        aria-label="Password requirements"
      >
        {rules.map((rule) => (
          <li
            key={rule.key}
            style={{
              fontSize: '13px',
              color: rule.met ? '#38a169' : '#718096',
              padding: '2px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span aria-hidden="true">{rule.met ? '\u2713' : '\u25CB'}</span>
            <span>
              {rule.label}
              <span className="sr-only">
                {rule.met ? ' — requirement met' : ' — requirement not met'}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
