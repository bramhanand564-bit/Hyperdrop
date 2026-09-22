import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system');
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  useEffect(() => {
    AsyncStorage.getItem('nax_theme_mode').then((mode) => {
      if (mode) {
        setThemeMode(mode);
        if (mode === 'dark') setIsDark(true);
        else if (mode === 'light') setIsDark(false);
        else setIsDark(systemColorScheme === 'dark');
      }
    }).catch(() => {});
  }, [systemColorScheme]);

  const changeTheme = async (mode) => {
    setThemeMode(mode);
    await AsyncStorage.setItem('nax_theme_mode', mode).catch(() => {});
    if (mode === 'dark') setIsDark(true);
    else if (mode === 'light') setIsDark(false);
    else setIsDark(systemColorScheme === 'dark');
  };

  return (
    <ThemeContext.Provider value={{ isDark, themeMode, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return { isDark: false, themeMode: 'light', changeTheme: () => {} };
  }
  return context;
}
