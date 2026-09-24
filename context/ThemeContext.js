import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNaxTheme } from '../theme/NaxTheme';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system');
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  useEffect(() => {
    AsyncStorage.getItem('nax_theme_mode').then((mode) => {
      if (!mode) return;
      setThemeMode(mode);
      setIsDark(mode === 'dark' ? true : mode === 'light' ? false : systemColorScheme === 'dark');
    }).catch(() => {});
  }, [systemColorScheme]);

  const changeTheme = async (mode) => {
    setThemeMode(mode);
    await AsyncStorage.setItem('nax_theme_mode', mode).catch(() => {});
    setIsDark(mode === 'dark' ? true : mode === 'light' ? false : systemColorScheme === 'dark');
  };

  const theme = getNaxTheme(isDark);
  return (
    <ThemeContext.Provider value={{ isDark, themeMode, changeTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    const theme = getNaxTheme(false);
    return { isDark: false, themeMode: 'light', changeTheme: () => {}, theme };
  }
  return context;
}
