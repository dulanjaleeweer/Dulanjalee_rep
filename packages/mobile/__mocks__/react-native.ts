/**
 * Minimal React Native mock for Jest tests.
 * Provides just enough to test component logic without the native runtime.
 */
import React from 'react';

const createMockComponent = (name: string) => {
  const component = ({ children, ...props }: Record<string, unknown>) => {
    return React.createElement(name, props, children as React.ReactNode);
  };
  component.displayName = name;
  return component;
};

export const View = createMockComponent('View');
export const Text = createMockComponent('Text');
export const TextInput = createMockComponent('TextInput');
export const TouchableOpacity = createMockComponent('TouchableOpacity');
export const ScrollView = createMockComponent('ScrollView');
export const SafeAreaView = createMockComponent('SafeAreaView');
export const ActivityIndicator = createMockComponent('ActivityIndicator');
export const KeyboardAvoidingView = createMockComponent('KeyboardAvoidingView');

export const Platform = { OS: 'ios', select: (obj: Record<string, unknown>) => obj.ios };

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
};
