import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RegisterForm } from './RegisterForm';

// Mock the shared package's registerUser
jest.mock('@abc-earlysteps/shared', () => {
  const actual = jest.requireActual('@abc-earlysteps/shared');
  return {
    ...actual,
    registerUser: jest.fn(),
  };
});

import { registerUser } from '@abc-earlysteps/shared';
const mockRegisterUser = registerUser as jest.MockedFunction<typeof registerUser>;

/** Helper: get the password input by its exact label text */
function getPasswordInput() {
  // The label text "Password" is for="password", use the ID
  return document.getElementById('password') as HTMLInputElement;
}

describe('RegisterForm', () => {
  beforeEach(() => {
    mockRegisterUser.mockClear();
  });

  it('should render the registration form', () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(getPasswordInput()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('should render role selector with public roles', () => {
    render(<RegisterForm />);

    expect(screen.getByText('Family Owner')).toBeInTheDocument();
    expect(screen.getByText('Caregiver')).toBeInTheDocument();
    expect(screen.getByText('Professional Therapist')).toBeInTheDocument();
  });

  it('should show password strength indicator when typing', () => {
    render(<RegisterForm />);

    fireEvent.change(getPasswordInput(), { target: { value: 'SecurePass123!' } });

    expect(screen.getByText(/password strength/i)).toBeInTheDocument();
  });

  it('should toggle password visibility', () => {
    render(<RegisterForm />);

    const passwordInput = getPasswordInput();
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: /show password/i });
    fireEvent.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('should show validation errors on invalid client-side data', async () => {
    render(<RegisterForm />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('should show success screen after successful registration', async () => {
    mockRegisterUser.mockResolvedValue({
      success: true,
      data: { status: 'ok' },
    });

    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: 'Jane Doe' },
    });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(getPasswordInput(), {
      target: { value: 'SecurePass123!' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });

  it('should show anti-enumeration message on success', async () => {
    mockRegisterUser.mockResolvedValue({
      success: true,
      data: { status: 'ok' },
    });

    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: 'Jane Doe' },
    });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(getPasswordInput(), {
      target: { value: 'SecurePass123!' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/if an account was created/i)).toBeInTheDocument();
    });
  });

  it('should display server errors', async () => {
    mockRegisterUser.mockResolvedValue({
      success: false,
      errors: ['Password must be at least 12 characters'],
      statusCode: 400,
    });

    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: 'Jane Doe' },
    });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(getPasswordInput(), {
      target: { value: 'SecurePass123!' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 12 characters/i)).toBeInTheDocument();
    });
  });

  it('should show loading state while submitting', async () => {
    mockRegisterUser.mockReturnValue(new Promise(() => {}));

    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: 'Jane Doe' },
    });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(getPasswordInput(), {
      target: { value: 'SecurePass123!' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    });

    expect(screen.getByText(/creating account/i)).toBeInTheDocument();
  });

  it('should validate email on blur', () => {
    render(<RegisterForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);

    expect(screen.getByText(/valid email/i)).toBeInTheDocument();
  });

  it('should have accessible form structure', () => {
    render(<RegisterForm />);

    expect(screen.getByRole('form', { name: /create an account/i })).toBeInTheDocument();
    expect(screen.getByText(/i am a\.\.\./i)).toBeInTheDocument();
  });
});
