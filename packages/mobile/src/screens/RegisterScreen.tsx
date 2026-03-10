import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { RegisterForm } from '../components/RegisterForm';

export function RegisterScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <RegisterForm />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
});
