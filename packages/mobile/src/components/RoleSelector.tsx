import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
    "Primary family account holder managing your child's learning journey",
  [UserRole.CAREGIVER]:
    "Family member or caregiver supporting a child's development",
  [UserRole.PROFESSIONAL_THERAPIST]:
    'Licensed professional providing therapy or educational services',
};

export function RoleSelector({ value, onChange, disabled }: RoleSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.legend}>I am a...</Text>
      {PUBLIC_REGISTRATION_ROLES.map((role) => {
        const isSelected = value === role;
        return (
          <TouchableOpacity
            key={role}
            onPress={() => onChange(role)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected, disabled }}
            accessibilityLabel={`${USER_ROLE_LABELS[role]}: ${ROLE_DESCRIPTIONS[role]}`}
            style={[
              styles.option,
              isSelected && styles.optionSelected,
              disabled && styles.optionDisabled,
            ]}
          >
            <View style={styles.radioOuter}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.roleName}>{USER_ROLE_LABELS[role]}</Text>
              <Text style={styles.roleDescription}>{ROLE_DESCRIPTIONS[role]}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  legend: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  optionSelected: {
    borderColor: '#2b6cb0',
    backgroundColor: '#ebf4ff',
  },
  optionDisabled: {
    opacity: 0.6,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#718096',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2b6cb0',
  },
  textContainer: {
    flex: 1,
  },
  roleName: {
    fontWeight: '500',
    fontSize: 14,
    color: '#1a202c',
  },
  roleDescription: {
    marginTop: 4,
    fontSize: 13,
    color: '#718096',
  },
});
