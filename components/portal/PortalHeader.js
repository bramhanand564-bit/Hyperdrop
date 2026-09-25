import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { auth } from '../../firebaseConfig';

export default function PortalHeader({ onSearchPress, onAiHubPress }) {
  const { isDark } = useTheme();
  const user = auth.currentUser;

  // Colors
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const searchBg = isDark ? '#1A222C' : '#E8EEF2';
  const accentCol = '#087EFF'; // Nax Blue

  return (
    <View style={[styles.headerContainer, { backgroundColor: bg }]}>
      
      {/* 🟢 TOP ROW: Greeting & Profile */}
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.greeting, { color: textSub }]}>Welcome to Portal</Text>
          <Text style={[styles.userName, { color: textMain }]}>
            {user?.displayName ? user.displayName.split(' ')[0] : 'Explorer'} ✨
          </Text>
        </View>

        <View style={styles.actionIcons}>
          {/* 🤖 NAYA FEATURE: AI Hub Button (Local AI & API Manager) */}
          <TouchableOpacity onPress={onAiHubPress} style={[styles.iconButton, { backgroundColor: 'rgba(8, 126, 255, 0.1)' }]}>
            <MaterialCommunityIcons name="robot-outline" size={24} color={accentCol} />
          </TouchableOpacity>
          
          <View style={styles.profilePicWrap}>
            <Image 
              source={{ uri: user?.photoURL || 'https://via.placeholder.com/150' }} 
              style={styles.profilePic} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 🔍 BOTTOM ROW: Smart Search Bar */}
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={onSearchPress} 
        style={[styles.searchBar, { backgroundColor: searchBg }]}
      >
        <Ionicons name="search" size={20} color={textSub} style={styles.searchIcon} />
        <Text style={[styles.searchText, { color: textSub }]}>
          Search Apps, Games, AI Bots...
        </Text>
        <View style={[styles.qrButton, { backgroundColor: accentCol }]}>
          <Ionicons name="qr-code-outline" size={16} color="#FFF" />
        </View>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 2,
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profilePicWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#087EFF',
    overflow: 'hidden',
  },
  profilePic: {
    width: '100%',
    height: '100%',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 16,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchText: {
    flex: 1,
    fontSize: 15,
  },
  qrButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
