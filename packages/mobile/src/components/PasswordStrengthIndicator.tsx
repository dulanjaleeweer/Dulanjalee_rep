import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
  const strengthColor = STRENGTH_COLORS[strength] || STRENGTH_COLORS[0];

  return (
    <View accessibilityRole="summary" accessibilityLabel="Password strength feedback">
      {/* Strength bar */}
      <View style={styles.barContainer}>
        {[1, 2, 3, 4].map((level) => (
          <View
            key={level}
            style={[
              styles.barSegment,
              { backgroundColor: strength >= level ? strengthColor : '#e0e0e0' },
            ]}
          />
        ))}
      </View>

      {/* Strength label */}
      <Text
        style={[styles.strengthLabel, { color: strengthColor }]}
        accessibilityRole="text"
      >
        Password strength: {STRENGTH_LABELS[strength] || 'Too short'}
      </Text>

      {/* Individual rules */}
      {rules.map((rule) => (
        <View key={rule.key} style={styles.ruleRow}>
          <Text style={[styles.ruleIcon, { color: rule.met ? '#38a169' : '#718096' }]}>
            {rule.met ? '\u2713' : '\u25CB'}
          </Text>
          <Text
            style={[styles.ruleText, { color: rule.met ? '#38a169' : '#718096' }]}
            accessibilityLabel={`${rule.label} — ${rule.met ? 'requirement met' : 'requirement not met'}`}
          >
            {rule.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  barContainer: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
    marginBottom: 8,
  },
  barSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  ruleIcon: {
    fontSize: 13,
    width: 16,
  },
  ruleText: {
    fontSize: 13,
    flex: 1,
  },
});
