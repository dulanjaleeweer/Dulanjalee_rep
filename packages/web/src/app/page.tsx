import React from 'react';

export default function HomePage() {
  return (
    <main style={{ padding: '48px 24px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 600 }}>ABC EarlySteps</h1>
      <p style={{ color: '#718096', marginBottom: '24px' }}>
        Education support for autistic children under five.
      </p>
      <a
        href="/register"
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: '#2b6cb0',
          color: '#ffffff',
          borderRadius: '6px',
          textDecoration: 'none',
          fontWeight: 500,
        }}
      >
        Create an account
      </a>
    </main>
  );
}
