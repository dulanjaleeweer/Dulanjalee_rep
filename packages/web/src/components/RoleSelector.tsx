'use client';

import React from 'react';
import {
  UserRole,
  USER_ROLE_LABELS,
  PUBLIC_REGISTRATION_ROLES,
} from '@abc-earlysteps/shared';

interface RoleSelectorProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  [UserRole.FAMILY_OWNER]:
    'Primary family account holder managing your child\'s learning journey',
  [UserRole.CAREGIVER]:
    'Family member or caregiver supporting a child\'s development',
  [UserRole.PROFESSIONAL_THERAPIST]:
    'Licensed professional providing therapy or educational services',
};

export function RoleSelector({ value, onChange, disabled }: RoleSelectorProps) {
  return (
    <fieldset style={{ border: 'none', padding: 0, margin: '0 0 16px 0' }}>
      <legend
        style={{
          fontSize: '14px',
          fontWeight: 500,
          color: '#374151',
          marginBottom: '8px',
          padding: 0,
        }}
      >
        I am a...
      </legend>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {PUBLIC_REGISTRATION_ROLES.map((role) => (
          <label
            key={role}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px',
              border: `2px solid ${value === role ? '#2b6cb0' : '#e2e8f0'}`,
              borderRadius: '8px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              backgroundColor: value === role ? '#ebf4ff' : '#ffffff',
              opacity: disabled ? 0.6 : 1,
              transition: 'border-color 0.15s, background-color 0.15s',
            }}
          >
            <input
              type="radio"
              name="role"
              value={role}
              checked={value === role}
              onChange={() => onChange(role)}
              disabled={disabled}
              style={{ marginTop: '2px' }}
            />
            <div>
              <span style={{ fontWeight: 500, fontSize: '14px', color: '#1a202c' }}>
                {USER_ROLE_LABELS[role]}
              </span>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#718096' }}>
                {ROLE_DESCRIPTIONS[role]}
              </p>
            </div>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
