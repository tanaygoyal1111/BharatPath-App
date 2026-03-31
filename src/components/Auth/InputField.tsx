import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface InputFieldProps extends TextInputProps {
  iconName?: keyof typeof Feather.glyphMap;
  onClear?: () => void;
  error?: boolean;
}

const COLORS = {
  bg: '#F3F3F3',
  borderIdle: 'transparent',
  borderFocus: '#1A237E',
  borderError: '#E53935',
  text: '#1A1C1C',
  placeholder: '#9E9E9E',
  icon: '#757575',
};

export default function InputField({ iconName, onClear, error, ...props }: InputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View
      style={[
        styles.container,
        isFocused && styles.focusedContainer,
        error && styles.errorContainer,
      ]}
    >
      {iconName && (
        <Feather name={iconName} size={20} color={isFocused ? COLORS.borderFocus : COLORS.icon} style={styles.icon} />
      )}
      <TextInput
        {...props}
        style={[styles.input, props.style]}
        placeholderTextColor={COLORS.placeholder}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {Boolean(props.value && props.value.length > 0 && onClear) && (
        <TouchableOpacity onPress={onClear} style={styles.clearIcon}>
          <Feather name="x-circle" size={18} color={COLORS.icon} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.borderIdle,
    paddingHorizontal: 16,
    height: 56,
  },
  focusedContainer: {
    borderColor: COLORS.borderFocus,
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    borderColor: COLORS.borderError,
  },
  icon: {
    marginRight: 12,
  },
  clearIcon: {
    padding: 4,
    marginLeft: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
    height: '100%',
  },
});
