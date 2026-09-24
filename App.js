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
import MainAppTabs from './navigation/MainAppTabs';

const lazyRequire = loader => {
  let Screen = null;
  return function DeferredScreen(props) {
    if (!Screen) Screen = loader();
    return <Screen {...props} />;
  };
};

const ChatRoomScreen = lazyRequire(() => require('./screens/ChatRoomScreen').default);
const AuthScreen = lazyRequire(() => require('./screens/AuthScreen').default);
const TicTacToeScreen = lazyRequire(() => require('./screens/TicTacToeScreen').default);
const NaxStudioScreen = lazyRequire(() => require('./screens/NaxStudioScreen').default);
const BotChatScreen = lazyRequire(() => require('./screens/BotChatScreen').default);
const BotCreateScreen = lazyRequire(() => require('./screens/BotCreateScreen').default);
const CallScreen = lazyRequire(() => require('./screens/CallScreen').default);
const AutomateScreen = lazyRequire(() => require('./screens/AutomateScreen').default);
const DiscoverScreen = lazyRequire(() => require('./screens/DiscoverScreen').default);
const MomentsScreen = lazyRequire(() => require('./screens/MomentsScreen').default);
const PortalsScreen = lazyRequire(() => require('./screens/PortalsScreen').default);
const QRHubScreen = lazyRequire(() => require('./screens/QRHubScreen').default);
const SecurityPermissionsScreen = lazyRequire(() => require('./screens/SecurityPermissionsScreen').default);
const WalletScreen = lazyRequire(() => require('./screens/WalletScreen').default);
const SettingsScreen = lazyRequire(() => require('./screens/SettingsScreen').default);
const AISettingsScreen = lazyRequire(() => require('./screens/AISettingsScreen').default);
const OnDeviceAISettingsScreen = lazyRequire(() => require('./screens/OnDeviceAISettingsScreen').default);
const DeveloperDashboardScreen = lazyRequire(() => require('./screens/DeveloperDashboardScreen').default);
const TelegramBotFeaturesScreen = lazyRequire(() => require('./screens/TelegramBotFeaturesScreen').default);
const PortalStoreScreen = lazyRequire(() => require('./screens/PortalStoreScreen').default);
const AppPublishScreen = lazyRequire(() => require('./screens/portal/AppPublishScreen').default);
const BotEdit = lazyRequire(() => require('./bots/BotEdit').default);
const BotCommands = lazyRequire(() => require('./bots/BotCommands').default);
const WebPortalScreen = lazyRequire(() => require('./screens/WebPortalScreen').default);
const ChatSettingsScreen = lazyRequire(() => require('./screens/ChatSettingsScreen').default);
const MessagingHubScreen = lazyRequire(() => require('./screens/MessagingHubScreen').default);
const ForwardPickerScreen = lazyRequire(() => require('./screens/ForwardPickerScreen').default);
const PortalHome = lazyRequire(() => require('./portal/PortalHome').default);
const PortalSearch = lazyRequire(() => require('./portal/PortalSearch').default);
const PortalCategories = lazyRequire(() => require('./portal/PortalCategories').default);
const PortalFeatured = lazyRequire(() => require('./portal/PortalFeatured').default);
const PortalTrending = lazyRequire(() => require('./portal/PortalTrending').default);
const MiniAppHome = lazyRequire(() => require('./mini-apps/MiniAppHome').default);
const MiniAppViewer = lazyRequire(() => require('./mini-apps/MiniAppViewer').default);
const MiniAppInstall = lazyRequire(() => require('./mini-apps/MiniAppInstall').default);
const StudioHome = lazyRequire(() => require('./studio/StudioHome').default);
const StudioPrompt = lazyRequire(() => require('./studio/StudioPrompt').default);
const StudioGenerator = lazyRequire(() => require('./studio/StudioGenerator').default);
const StudioPreview = lazyRequire(() => require('./studio/StudioPreview').default);
const StudioTester = lazyRequire(() => require('./studio/StudioTester').default);
const StudioPublisher = lazyRequire(() => require('./studio/StudioPublisher').default);

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
            <Stack.Screen name="ChatSettings" component={ChatSettingsScreen} />
            <Stack.Screen name="MessagingHub" component={MessagingHubScreen} />
            <Stack.Screen name="ForwardPicker" component={ForwardPickerScreen} />
            <Stack.Screen name="TicTacToe" component={TicTacToeScreen} />
            <Stack.Screen name="NaxStudio" component={NaxStudioScreen} />
            <Stack.Screen name="BotChat" component={BotChatScreen} />
            <Stack.Screen name="BotCreate" component={BotCreateScreen} />
            <Stack.Screen name="BotEdit" component={BotEdit} />
            <Stack.Screen name="BotCommands" component={BotCommands} />
            <Stack.Screen name="TelegramBotFeatures" component={TelegramBotFeaturesScreen} />
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
            <Stack.Screen name="PortalStore" component={PortalStoreScreen} />
            <Stack.Screen name="AppPublish" component={AppPublishScreen} />

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
