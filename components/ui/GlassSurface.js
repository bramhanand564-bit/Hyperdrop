import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function GlassSurface({ children, style, strong = false, radius = 24 }) {
  const { theme } = useTheme();
  const innerRadius = Math.max(1, radius - 1);
  return (
    <View style={[
      styles.base,
      {
        backgroundColor: strong ? theme.surfaceStrong : theme.surface,
        borderColor: theme.border,
        borderRadius: radius,
        shadowColor: theme.shadow,
      },
      style,
    ]}>
      <View pointerEvents="none" style={[styles.sheen, { borderRadius: innerRadius }]} />
      <View pointerEvents="none" style={[styles.glow, { borderRadius: innerRadius }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 5,
    overflow: 'hidden',
  },
  sheen: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  glow: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 0,
    height: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
});
