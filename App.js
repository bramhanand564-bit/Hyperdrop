import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { ThemeProvider, useTheme } from './context/ThemeContext';

import PresenceManager from './managers/PresenceManager';
import P2PManager from './managers/P2PManager';
import CallManager from './managers/CallManager';
import EventBus from './event-bus/EventBus';
import AnalyticsService from './analytics/AnalyticsService';
import NotificationManager from './notifications/NotificationManager';

import MainAppTabs from './navigation/MainAppTabs';
import ChatRoomScreen from './screens/ChatRoomScreen';
import AuthScreen from './screens/AuthScreen';
import TicTacToeScreen from './screens/TicTacToeScreen';
import NaxStudioScreen from './screens/NaxStudioScreen';
import BotChatScreen from './screens/BotChatScreen';
import BotCreateScreen from './screens/BotCreateScreen';
import CallScreen from './screens/CallScreen';
import AutomateScreen from './screens/AutomateScreen';
import DiscoverScreen from './screens/DiscoverScreen';
import MomentsScreen from './screens/MomentsScreen';
import PortalsScreen from './screens/PortalsScreen';
import QRHubScreen from './screens/QRHubScreen';
import SecurityPermissionsScreen from './screens/SecurityPermissionsScreen';
import WalletScreen from './screens/WalletScreen';
import SettingsScreen from './screens/SettingsScreen';
import AISettingsScreen from './screens/AISettingsScreen';
import OnDeviceAISettingsScreen from './screens/OnDeviceAISettingsScreen';
import DeveloperDashboardScreen from './screens/DeveloperDashboardScreen';
import WebPortalScreen from './screens/WebPortalScreen';

import PortalHome from './portal/PortalHome';
import PortalSearch from './portal/PortalSearch';
import PortalCategories from './portal/PortalCategories';
import PortalFeatured from './portal/PortalFeatured';
import PortalTrending from './portal/PortalTrending';

import MiniAppHome from './mini-apps/MiniAppHome';
import MiniAppViewer from './mini-apps/MiniAppViewer';
import MiniAppInstall from './mini-apps/MiniAppInstall';

import StudioHome from './studio/StudioHome';
import StudioPrompt from './studio/StudioPrompt';
import StudioGenerator from './studio/StudioGenerator';
import StudioPreview from './studio/StudioPreview';
import StudioTester from './studio/StudioTester';
import StudioPublisher from './studio/StudioPublisher';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

function AppNavigator() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribeAnalytics = AnalyticsService.attach(EventBus);
    const unsubscribeNotifications = NotificationManager.attach();
    return () => { unsubscribeAnalytics?.(); unsubscribeNotifications?.(); };
  }, [user]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#121212' : '#F5F5F7' }]}>
        <ActivityIndicator size="large" color="#087EFF" />
      </View>
    );
  }

  return (
    <>
      {user && <>
        <PresenceManager user={user} />
        <P2PManager user={user} />
        <CallManager user={user} navigationRef={navigationRef} />
      </>}

      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? <>
            <Stack.Screen name="MainTabs" component={MainAppTabs} />
            <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
            <Stack.Screen name="TicTacToe" component={TicTacToeScreen} />
            <Stack.Screen name="NaxStudio" component={NaxStudioScreen} />
            <Stack.Screen name="BotChat" component={BotChatScreen} />
            <Stack.Screen name="BotCreate" component={BotCreateScreen} />
            <Stack.Screen name="Call" component={CallScreen} />
            <Stack.Screen name="Automate" component={AutomateScreen} />
            <Stack.Screen name="Discover" component={DiscoverScreen} />
            <Stack.Screen name="Moments" component={MomentsScreen} />
            <Stack.Screen name="Portals" component={PortalsScreen} />
            <Stack.Screen name="QRHub" component={QRHubScreen} />
            <Stack.Screen name="SecurityPermissions" component={SecurityPermissionsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="AISettings" component={AISettingsScreen} />
            <Stack.Screen name="OnDeviceAISettings" component={OnDeviceAISettingsScreen} />
            <Stack.Screen name="Wallet" component={WalletScreen} />
            <Stack.Screen name="DeveloperDashboard" component={DeveloperDashboardScreen} />
            <Stack.Screen name="WebPortal" component={WebPortalScreen} />

            <Stack.Screen name="PortalHome" component={PortalHome} />
            <Stack.Screen name="PortalSearch" component={PortalSearch} />
            <Stack.Screen name="PortalCategories" component={PortalCategories} />
            <Stack.Screen name="PortalFeatured" component={PortalFeatured} />
            <Stack.Screen name="PortalTrending" component={PortalTrending} />

            <Stack.Screen name="MiniAppHome" component={MiniAppHome} />
            <Stack.Screen name="MiniAppViewer" component={MiniAppViewer} />
            <Stack.Screen name="MiniAppInstall" component={MiniAppInstall} />

            <Stack.Screen name="StudioHome" component={StudioHome} />
            <Stack.Screen name="StudioPrompt" component={StudioPrompt} />
            <Stack.Screen name="StudioGenerator" component={StudioGenerator} />
            <Stack.Screen name="StudioPreview" component={StudioPreview} />
            <Stack.Screen name="StudioTester" component={StudioTester} />
            <Stack.Screen name="StudioPublisher" component={StudioPublisher} />
          </> : <Stack.Screen name="Auth" component={AuthScreen} />}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return <ThemeProvider><AppNavigator /></ThemeProvider>;
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
