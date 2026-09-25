import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function GlassButton({
  title,
  icon,
  onPress,
  variant = 'primary',
  disabled = false,
  compact = false,
}) {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const primary = variant === 'primary';
  const danger = variant === 'danger';

  const pressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }], opacity: disabled ? 0.5 : 1 }}>
      <TouchableOpacity
        activeOpacity={0.9}
        disabled={disabled}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
        style={[
          styles.button,
          compact && styles.compact,
          {
            backgroundColor: primary ? theme.blue : danger ? 'rgba(255,59,48,0.12)' : theme.surfaceStrong,
            borderColor: primary ? 'rgba(255,255,255,0.28)' : danger ? 'rgba(255,59,48,0.25)' : theme.border,
          },
        ]}
      >
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={compact ? 18 : 19} color={primary ? '#FFF' : danger ? '#FF3B30' : theme.text} /> : null}
          <Text style={[styles.text, { color: primary ? '#FFF' : danger ? '#FF3B30' : theme.text, marginLeft: icon ? 7 : 0 }]}>
            {title}
          </Text>
        </View>
        <View pointerEvents="none" style={styles.highlight} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: 17,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
    overflow: 'hidden',
  },
  compact: { minHeight: 40, paddingHorizontal: 14, borderRadius: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 14, fontWeight: '800' },
  highlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
});
