import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import ExperienceAPI from '../api/ExperienceAPI';

const TEMPLATES = [
  { id: 'task', icon: '📋', name: 'Daily Task', description: 'Assign, accept and complete work.' },
  { id: 'reward', icon: '🎁', name: 'Reward Challenge', description: 'Points, streaks and milestones.' },
  { id: 'game', icon: '🎮', name: 'Game', description: 'Challenges, scores and rematches.' },
  { id: 'quiz', icon: '🧠', name: 'Quiz', description: 'Questions, answers and results.' },
  { id: 'form', icon: '📝', name: 'Form', description: 'Collect structured responses.' },
  { id: 'community', icon: '👥', name: 'Community', description: 'Group actions, polls and events.' },
  { id: 'media', icon: '🎬', name: 'Media', description: 'Shareable media and watch sessions.' },
  { id: 'transfer', icon: '📦', name: 'P2P Transfer', description: 'Create a transfer experience.' },
  { id: 'custom', icon: '⚡', name: 'Blank', description: 'Build your own experience.' },
];

export default function ExperienceHome({ navigation }) {
  const { theme } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await ExperienceAPI.list());
    } catch (e) {
      console.log('Experience load:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = template => {
    navigation.navigate('ExperienceBuilder', {
      template: template.id,
      templateMeta: template,
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={load}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.eyebrow, { color: theme.sub }]}>HYPERDROP</Text>
                <Text style={[styles.title, { color: theme.text }]}>Experiences</Text>
                <Text style={[styles.subtitle, { color: theme.sub }]}>
                  Create anything people can use and share in Chat.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.createTop, { backgroundColor: theme.blue }]}
                onPress={() => create(TEMPLATES[TEMPLATES.length - 1])}
              >
                <Ionicons name="add" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={[styles.hero, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.heroTitle, { color: theme.text }]}>Create your own experience</Text>
              <Text style={[styles.heroText, { color: theme.sub }]}>
                Build tasks, games, rewards, forms, communities and more. Share the live experience directly in chat.
              </Text>
              <TouchableOpacity
                style={[styles.heroButton, { backgroundColor: theme.text }]}
                onPress={() => create(TEMPLATES[TEMPLATES.length - 1])}
              >
                <Text style={{ color: theme.bg, fontWeight: '900' }}>Start Creating</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.section, { color: theme.text }]}>Start from a template</Text>
            <View style={styles.templateGrid}>
              {TEMPLATES.map(template => (
                <TouchableOpacity
                  key={template.id}
                  style={[styles.template, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => create(template)}
                  activeOpacity={0.82}
                >
                  <Text style={styles.templateIcon}>{template.icon}</Text>
                  <Text style={[styles.templateName, { color: theme.text }]}>{template.name}</Text>
                  <Text style={[styles.templateDesc, { color: theme.sub }]} numberOfLines={2}>
                    {template.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.section, { color: theme.text }]}>Community experiences</Text>
            {loading ? (
              <ActivityIndicator color={theme.blue} style={{ marginVertical: 25 }} />
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => navigation.navigate('ExperienceRuntime', { experienceId: item.id })}
          >
            <Text style={styles.itemIcon}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
              <Text style={[styles.itemDesc, { color: theme.sub }]} numberOfLines={2}>
                {item.description || 'Interactive Hyperdrop experience'}
              </Text>
              <Text style={[styles.meta, { color: theme.sub }]}>
                {item.users} users · {item.runs} runs · by {item.creatorName}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color={theme.sub} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={styles.emptyIcon}>✨</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No experiences yet</Text>
              <Text style={[styles.emptyText, { color: theme.sub }]}>
                Create the first one and share it with your group.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 18, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.7 },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { fontSize: 13, lineHeight: 18, marginTop: 3, maxWidth: 310 },
  createTop: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  hero: { borderWidth: 1, borderRadius: 24, padding: 20, marginBottom: 22 },
  heroTitle: { fontSize: 20, fontWeight: '900' },
  heroText: { fontSize: 13, lineHeight: 19, marginTop: 6 },
  heroButton: { alignSelf: 'flex-start', paddingHorizontal: 18, paddingVertical: 11, borderRadius: 13, marginTop: 15 },
  section: { fontSize: 18, fontWeight: '900', marginBottom: 11 },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  template: { width: '48%', minHeight: 135, borderWidth: 1, borderRadius: 18, padding: 14 },
  templateIcon: { fontSize: 26 },
  templateName: { fontSize: 14, fontWeight: '900', marginTop: 8 },
  templateDesc: { fontSize: 11, lineHeight: 15, marginTop: 4 },
  item: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  itemIcon: { fontSize: 29, width: 48 },
  itemName: { fontSize: 16, fontWeight: '900' },
  itemDesc: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  meta: { fontSize: 10, marginTop: 6, fontWeight: '700' },
  empty: { borderWidth: 1, borderRadius: 20, padding: 28, alignItems: 'center' },
  emptyIcon: { fontSize: 34 },
  emptyTitle: { fontSize: 17, fontWeight: '900', marginTop: 7 },
  emptyText: { textAlign: 'center', fontSize: 12, marginTop: 4 },
});
