import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { getNaxTheme } from '../../theme/NaxTheme';

export default function GlassSurface({ children, style, strong = false, radius = 24 }) {
  const { isDark } = useTheme();
  const t = getNaxTheme(isDark);
  return (
    <View style={[
      styles.base,
      { backgroundColor: strong ? t.surfaceStrong : t.surface, borderColor: t.border, borderRadius: radius, shadowColor: t.shadow },
      style,
    ]}>
      <View pointerEvents="none" style={[styles.highlight, { borderRadius: radius - 1 }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
    overflow: 'hidden',
  },
  highlight: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
});
