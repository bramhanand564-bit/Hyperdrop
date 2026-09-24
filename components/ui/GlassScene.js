import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { getNaxTheme } from '../../theme/NaxTheme';

function Bubble({ size, left, top, duration, delay }) {
  const y = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(y, { toValue: -18, duration, useNativeDriver: true }),
          Animated.timing(x, { toValue: 7, duration: duration * 0.7, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(y, { toValue: 0, duration, useNativeDriver: true }),
          Animated.timing(x, { toValue: 0, duration: duration * 0.7, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay, duration, x, y]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bubble,
        { width: size, height: size, borderRadius: size / 2, left, top, transform: [{ translateX: x }, { translateY: y }] },
      ]}
    />
  );
}

export default function GlassScene({ children, style, showBubbles = true }) {
  const { isDark } = useTheme();
  const t = getNaxTheme(isDark);
  return (
    <View style={[styles.root, { backgroundColor: t.bg }, style]}>
      <View pointerEvents="none" style={styles.glowTop}>
        <View style={[styles.softOrb, { backgroundColor: isDark ? 'rgba(90,169,255,0.09)' : 'rgba(90,169,255,0.16)' }]} />
      </View>
      {showBubbles && (
        <>
          <Bubble size={18} left="18%" top="18%" duration={2800} delay={0} />
          <Bubble size={10} left="72%" top="28%" duration={3300} delay={500} />
          <Bubble size={24} left="82%" top="66%" duration={3600} delay={900} />
          <Bubble size={12} left="12%" top="74%" duration={3100} delay={300} />
        </>
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  content: { flex: 1 },
  glowTop: { position: 'absolute', top: -90, left: -50, right: -50, height: 220, alignItems: 'center' },
  softOrb: { width: 360, height: 180, borderRadius: 180, opacity: 0.75 },
  bubble: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
});
