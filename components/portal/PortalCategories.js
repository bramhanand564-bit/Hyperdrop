import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

// 🗺️ ROADMAP ALIGNED CATEGORIES
const CATEGORIES = [
  { id: 'games', name: 'Games', icon: 'game-controller-outline', type: 'ion', color: '#FF3B30' },
  { id: 'miniapps', name: 'Mini Apps', icon: 'apps-outline', type: 'ion', color: '#007AFF' },
  { id: 'bots', name: 'Bots', icon: 'robot-outline', type: 'mci', color: '#34C759' },
  { id: 'automate', name: 'Automate', icon: 'lightning-bolt-outline', type: 'mci', color: '#FF9500' },
  { id: 'aihub', name: 'AI Hub', icon: 'brain', type: 'mci', color: '#AF52DE' },
  { id: 'studio', name: 'Nax Studio', icon: 'code-slash-outline', type: 'ion', color: '#5856D6' },
];

export default function PortalCategories({ onCategoryPress }) {
  const { isDark } = useTheme();
  
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const cardBg = isDark ? '#1A222C' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  const renderIcon = (item) => {
    if (item.type === 'ion') {
      return <Ionicons name={item.icon} size={28} color={item.color} />;
    } else if (item.type === 'mci') {
      return <MaterialCommunityIcons name={item.icon} size={28} color={item.color} />;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: textMain }]}>Explore Portal</Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity 
            key={cat.id} 
            style={[styles.categoryCard, { backgroundColor: cardBg, borderColor: borderCol }]}
            onPress={() => onCategoryPress && onCategoryPress(cat.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrapper, { backgroundColor: `${cat.color}15` }]}>
              {renderIcon(cat)}
            </View>
            <Text style={[styles.categoryText, { color: textMain }]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 20,
    marginBottom: 15,
  },
  scrollContent: {
    paddingHorizontal: 15,
  },
  categoryCard: {
    width: 85,
    height: 100,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    elevation: 2, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  }
});
