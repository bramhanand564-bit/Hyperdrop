import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

function Bubble({ size, left, top, duration, delay }) {
  const y = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(y, { toValue: -18, duration, useNativeDriver: true }),
        Animated.timing(x, { toValue: 7, duration: duration * 0.7, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(y, { toValue: 0, duration, useNativeDriver: true }),
        Animated.timing(x, { toValue: 0, duration: duration * 0.7, useNativeDriver: true }),
      ]),
    ]));
    loop.start();
    return () => loop.stop();
  }, [delay, duration, x, y]);

  return <Animated.View pointerEvents="none" style={[
    styles.bubble,
    { width: size, height: size, borderRadius: size / 2, left, top, transform: [{ translateX: x }, { translateY: y }] },
  ]} />;
}

export default function GlassScene({ children, style, showBubbles = true }) {
  const { isDark, theme } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.bg }, style]}>
      <View pointerEvents="none" style={styles.glowTop}>
        <View style={[styles.softOrb, { backgroundColor: isDark ? 'rgba(90,169,255,0.10)' : 'rgba(90,169,255,0.18)' }]} />
      </View>
      <View pointerEvents="none" style={styles.glowSide}>
        <View style={[styles.sideOrb, { backgroundColor: isDark ? 'rgba(111,231,255,0.045)' : 'rgba(111,231,255,0.10)' }]} />
      </View>
      {showBubbles && <>
        <Bubble size={22} left="16%" top="20%" duration={3400} delay={0} />
        <Bubble size={13} left="80%" top="58%" duration={3800} delay={500} />
        <Bubble size={8} left="58%" top="34%" duration={3000} delay={900} />
      </>}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  content: { flex: 1 },
  glowTop: { position: 'absolute', top: -100, left: -70, right: -70, height: 230, alignItems: 'center' },
  softOrb: { width: 390, height: 200, borderRadius: 200, opacity: 0.8 },
  glowSide: { position: 'absolute', right: -130, top: '38%', width: 260, height: 260, borderRadius: 130, alignItems: 'center', justifyContent: 'center' },
  sideOrb: { width: 220, height: 220, borderRadius: 110 },
  bubble: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.40)',
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
});
