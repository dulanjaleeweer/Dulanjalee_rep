'use client';

import React from 'react';
import { RegisterForm } from '../../components/RegisterForm';

export default function RegisterPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <RegisterForm />
    </main>
  );
}
