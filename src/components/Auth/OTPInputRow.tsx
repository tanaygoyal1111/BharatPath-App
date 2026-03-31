import React, { useRef, useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';

interface OTPInputRowProps {
  length?: number;
  value: string;
  onCodeChange: (code: string) => void;
}

const COLORS = {
  bg: '#F3F3F3',
  borderIdle: '#E2E8F0',
  borderFocus: '#1A237E',
  text: '#1A1C1C',
};

export default function OTPInputRow({ length = 6, value, onCodeChange }: OTPInputRowProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(0);
  const inputs = useRef<Array<TextInput | null>>([]);

  const handleTextChange = (text: string, index: number) => {
    // Only allow numeric input
    const cleanText = text.replace(/[^0-9]/g, '');
    
    if (cleanText.length > 0) {
      // If user pastes multiple digits (or just types one)
      const newChars = cleanText.split('');
      let currentVal = value.split('');
      
      // Merge pasted chars
      newChars.forEach((char, idx) => {
        if (index + idx < length) {
          currentVal[index + idx] = char;
        }
      });
      
      onCodeChange(currentVal.join('').substring(0, length));
      
      // Auto advance
      const nextIndex = Math.min(index + cleanText.length, length - 1);
      inputs.current[nextIndex]?.focus();
    } else {
      // Empty input
      let currentVal = value.split('');
      currentVal[index] = '';
      onCodeChange(currentVal.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      // Move to previous immediately if current is empty
      if (value[index] === undefined || value[index] === '') {
         const prevIndex = Math.max(index - 1, 0);
         inputs.current[prevIndex]?.focus();
      }
    }
  };

  // Helper to ensure length is correct array
  const boxes = Array.from({ length }).map((_, i) => i);

  return (
    <View style={styles.container}>
      {boxes.map((index) => {
        const char = value[index] || '';
        const isFocused = focusedIndex === index;

        return (
          <TextInput
            key={index}
            ref={(ref) => { inputs.current[index] = ref; }}
            style={[
              styles.inputBox,
              isFocused && styles.inputFocused,
            ]}
            keyboardType="number-pad"
            maxLength={1} // Prevent pasting whole string into one uncaptured box natively, rely on onChange logic if pasted
            value={char}
            onChangeText={(text) => handleTextChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex(null)}
            selectTextOnFocus
            autoFocus={index === 0}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 10,
  },
  inputBox: {
    width: 48,
    height: 60,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inputFocused: {
    borderColor: COLORS.borderFocus,
    backgroundColor: '#FFFFFF',
    shadowColor: COLORS.borderFocus,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});
