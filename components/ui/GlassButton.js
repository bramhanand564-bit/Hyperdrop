import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { getNaxTheme } from '../../theme/NaxTheme';

export default function GlassButton({ title, icon, onPress, variant = 'blue', compact = false, style }) {
  const { isDark } = useTheme();
  const t = getNaxTheme(isDark);
  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -2, duration: 1800, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [float]);
  const fill = variant === 'green' ? t.green : variant === 'clear' ? t.surface : t.blue;
  const textColor = variant === 'clear' ? t.text : '#FFFFFF';
  return (
    <Animated.View style={{ transform: [{ translateY: float }] }}>
      <TouchableOpacity activeOpacity={0.86} onPress={onPress} style={[
        styles.button,
        compact && styles.compact,
        { backgroundColor: fill, borderColor: variant === 'clear' ? t.border : 'rgba(255,255,255,0.28)' },
        style,
      ]}>
        {icon ? <Ionicons name={icon} size={compact ? 18 : 20} color={textColor} /> : null}
        {title ? <Text style={[styles.title, { color: textColor }]}>{title}</Text> : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 4,
  },
  compact: { minHeight: 40, paddingHorizontal: 14, borderRadius: 15 },
  title: { fontSize: 14, fontWeight: '800' },
});
