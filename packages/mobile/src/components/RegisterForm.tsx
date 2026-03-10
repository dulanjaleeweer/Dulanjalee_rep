import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { UserRole } from '@abc-earlysteps/shared';
import { useRegister } from '../hooks/useRegister';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { RoleSelector } from './RoleSelector';

interface RegisterFormProps {
  onLoginPress?: () => void;
}

export function RegisterForm({ onLoginPress }: RegisterFormProps) {
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
      <View style={styles.successContainer} accessibilityRole="alert">
        <Text style={styles.successTitle}>Check your email</Text>
        <Text style={styles.successText}>
          If an account was created, we have sent a verification link to your email address.
          Please check your inbox and follow the link to verify your account.
        </Text>
        <Text style={styles.successHint}>
          Did not receive it? Check your spam folder or try again in a few minutes.
        </Text>
        <TouchableOpacity
          onPress={reset}
          style={styles.secondaryButton}
          accessibilityRole="button"
          accessibilityLabel="Back to registration"
        >
          <Text style={styles.secondaryButtonText}>Back to registration</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSubmit = () => {
    submit({ email, password, displayName, role, acceptTerms });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>
          Join ABC EarlySteps to support your child&apos;s learning journey.
        </Text>

        {/* Error summary */}
        {errors.length > 0 && (
          <View style={styles.errorBox} accessibilityRole="alert">
            {errors.map((err, i) => (
              <Text key={i} style={styles.errorText}>
                {'\u2022'} {err}
              </Text>
            ))}
          </View>
        )}

        {/* Display Name */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Display name</Text>
          <TextInput
            value={displayName}
            onChangeText={(text) => {
              setDisplayName(text);
              validateField('displayName', text);
            }}
            onBlur={() => validateField('displayName', displayName)}
            editable={!isSubmitting}
            autoComplete="name"
            textContentType="name"
            style={[styles.input, displayNameError ? styles.inputError : undefined]}
            accessibilityLabel="Display name"
            accessibilityState={{ disabled: isSubmitting }}
          />
          {displayNameError && (
            <Text style={styles.fieldError} accessibilityRole="alert">
              {displayNameError}
            </Text>
          )}
        </View>

        {/* Email */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (emailError) validateField('email', text);
            }}
            onBlur={() => validateField('email', email)}
            editable={!isSubmitting}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            style={[styles.input, emailError ? styles.inputError : undefined]}
            accessibilityLabel="Email address"
            accessibilityState={{ disabled: isSubmitting }}
          />
          {emailError && (
            <Text style={styles.fieldError} accessibilityRole="alert">
              {emailError}
            </Text>
          )}
        </View>

        {/* Password */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                validateField('password', text);
              }}
              editable={!isSubmitting}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              style={[styles.input, styles.passwordInput]}
              accessibilityLabel="Password"
              accessibilityState={{ disabled: isSubmitting }}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.showPasswordButton}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Text style={styles.showPasswordText}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>
          <PasswordStrengthIndicator validation={passwordValidation} password={password} />
        </View>

        {/* Role Selector */}
        <RoleSelector value={role} onChange={setRole} disabled={isSubmitting} />

        {/* Terms */}
        <TouchableOpacity
          onPress={() => setAcceptTerms(!acceptTerms)}
          disabled={isSubmitting}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptTerms, disabled: isSubmitting }}
          accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
          style={styles.termsRow}
        >
          <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
            {acceptTerms && <Text style={styles.checkmark}>{'\u2713'}</Text>}
          </View>
          <Text style={styles.termsText}>
            I agree to the Terms of Service and Privacy Policy
          </Text>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          accessibilityRole="button"
          accessibilityLabel={isSubmitting ? 'Creating account' : 'Create account'}
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Create account</Text>
          )}
        </TouchableOpacity>

        {/* Sign in link */}
        <TouchableOpacity
          onPress={onLoginPress}
          style={styles.loginLink}
          accessibilityRole="link"
          accessibilityLabel="Already have an account? Sign in"
        >
          <Text style={styles.loginLinkText}>
            Already have an account? <Text style={styles.loginLinkBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 8,
  },
  subtitle: {
    color: '#718096',
    marginBottom: 24,
    fontSize: 15,
    lineHeight: 22,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#1a202c',
  },
  inputError: {
    borderColor: '#e53e3e',
  },
  passwordRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 60,
  },
  showPasswordButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  showPasswordText: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '500',
  },
  fieldError: {
    color: '#e53e3e',
    fontSize: 13,
    marginTop: 4,
  },
  errorBox: {
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#feb2b2',
    borderRadius: 6,
  },
  errorText: {
    color: '#c53030',
    fontSize: 14,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#2b6cb0',
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#a0aec0',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#718096',
  },
  loginLinkBold: {
    color: '#2b6cb0',
    fontWeight: '500',
  },
  successContainer: {
    padding: 32,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    color: '#1a202c',
    fontWeight: '600',
    marginBottom: 16,
  },
  successText: {
    color: '#4a5568',
    lineHeight: 22,
    textAlign: 'center',
    fontSize: 15,
  },
  successHint: {
    color: '#718096',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  secondaryButton: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: {
    color: '#2d3748',
    fontSize: 14,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 24,
    padding: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginTop: 2,
  },
  checkboxChecked: {
    borderColor: '#2b6cb0',
    backgroundColor: '#2b6cb0',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
  },
});
