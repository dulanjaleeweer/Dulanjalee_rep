import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { validatePassword } from '@abc-earlysteps/shared';

describe('PasswordStrengthIndicator', () => {
  it('should not render when password is empty', () => {
    const validation = validatePassword('');
    const { container } = render(
      <PasswordStrengthIndicator validation={validation} password="" />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('should show strength label for weak password', () => {
    const validation = validatePassword('abc');
    render(<PasswordStrengthIndicator validation={validation} password="abc" />);
    expect(screen.getByText(/too short/i)).toBeInTheDocument();
  });

  it('should show strength label for strong password', () => {
    // 16+ chars, 4 categories, not common = strength 4 "Strong"
    const pw = 'MyV3ryStr0ng!Pass';
    const validation = validatePassword(pw);
    render(<PasswordStrengthIndicator validation={validation} password={pw} />);
    expect(screen.getByText(/strong/i)).toBeInTheDocument();
  });

  it('should display individual rule items', () => {
    const validation = validatePassword('SecurePass123!');
    render(<PasswordStrengthIndicator validation={validation} password="SecurePass123!" />);

    expect(screen.getByText(/at least 12 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/lowercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/number/i)).toBeInTheDocument();
    expect(screen.getByText(/special character/i)).toBeInTheDocument();
  });

  it('should have accessible status role', () => {
    const validation = validatePassword('Test1234!abc');
    render(<PasswordStrengthIndicator validation={validation} password="Test1234!abc" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should have accessible list of requirements', () => {
    const validation = validatePassword('Test1234!abc');
    render(<PasswordStrengthIndicator validation={validation} password="Test1234!abc" />);

    expect(screen.getByRole('list', { name: /password requirements/i })).toBeInTheDocument();
  });
});
