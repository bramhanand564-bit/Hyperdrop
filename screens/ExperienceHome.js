import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
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
  { id: 'custom', icon: '⚡', name: 'Blank', description: 'Build anything with actions.' },
];

export default function ExperienceHome({ navigation }) {
  const { theme } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await ExperienceAPI.list({ search }));
    } catch (e) {
      console.log('Experience load:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => items, [items]);

  const create = template => navigation.navigate('ExperienceBuilder', {
    template: template.id,
    templateMeta: template,
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onRefresh={load}
        refreshing={loading}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.eyebrow, { color: theme.sub }]}>HYPERDROP</Text>
                <Text style={[styles.title, { color: theme.text }]}>Create</Text>
                <Text style={[styles.subtitle, { color: theme.sub }]}>
                  Build something people can use, share and complete in Chat.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => navigation.navigate('ExperienceDashboard')}
              >
                <Ionicons name="analytics-outline" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="search-outline" size={17} color={theme.sub} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search experiences"
                placeholderTextColor={theme.sub}
                style={{ flex: 1, marginLeft: 8, color: theme.text }}
                returnKeyType="search"
              />
              {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={theme.sub} /></TouchableOpacity> : null}
            </View>

            <View style={[styles.hero, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.heroTitle, { color: theme.text }]}>One creator system</Text>
                <Text style={[styles.heroText, { color: theme.sub }]}>
                  Tasks, games, rewards, forms, media, workflows and more—share the same live experience in Chat.
                </Text>
              </View>
              <TouchableOpacity style={[styles.heroButton, { backgroundColor: theme.blue }]} onPress={() => create(TEMPLATES[TEMPLATES.length - 1])}>
                <Ionicons name="add" size={19} color="#FFF" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.section, { color: theme.text }]}>Start from a template</Text>
            <View style={styles.templateGrid}>
              {TEMPLATES.map(template => (
                <TouchableOpacity key={template.id} onPress={() => create(template)} style={[styles.template, { backgroundColor: theme.surface, borderColor: theme.border }]} activeOpacity={0.82}>
                  <Text style={styles.templateIcon}>{template.icon}</Text>
                  <Text style={[styles.templateName, { color: theme.text }]}>{template.name}</Text>
                  <Text style={[styles.templateDesc, { color: theme.sub }]} numberOfLines={2}>{template.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.listHeader}>
              <Text style={[styles.section, { color: theme.text }]}>Community experiences</Text>
              <Text style={[styles.count, { color: theme.sub }]}>{filtered.length}</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => navigation.navigate('ExperienceRuntime', { experienceId: item.id })}
            activeOpacity={0.84}
          >
            <Text style={styles.itemIcon}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
              <Text style={[styles.itemDesc, { color: theme.sub }]} numberOfLines={2}>{item.description || 'Interactive experience'}</Text>
              <Text style={[styles.meta, { color: theme.sub }]}>{item.template} · by {item.creatorName}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.sub} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={theme.blue} style={{ marginTop: 20 }} />
          ) : (
            <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={styles.emptyIcon}>✨</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Nothing here yet</Text>
              <Text style={[styles.emptyText, { color: theme.sub }]}>Create one above and share it to a chat.</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({
 safe:{flex:1},content:{padding:18,paddingBottom:120},header:{flexDirection:'row',alignItems:'center',marginBottom:14},eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:1.7},title:{fontSize:30,fontWeight:'900',letterSpacing:-.8},subtitle:{fontSize:13,lineHeight:18,marginTop:3,maxWidth:320},iconBtn:{width:44,height:44,borderRadius:14,borderWidth:1,alignItems:'center',justifyContent:'center'},search:{height:46,borderRadius:14,borderWidth:1,paddingHorizontal:12,flexDirection:'row',alignItems:'center',marginBottom:12},hero:{borderWidth:1,borderRadius:22,padding:17,flexDirection:'row',alignItems:'center'},heroTitle:{fontSize:18,fontWeight:'900'},heroText:{fontSize:12,lineHeight:18,marginTop:5},heroButton:{width:45,height:45,borderRadius:15,alignItems:'center',justifyContent:'center',marginLeft:12},section:{fontSize:17,fontWeight:'900',marginTop:20,marginBottom:10},templateGrid:{flexDirection:'row',flexWrap:'wrap',gap:9},template:{width:'48%',minHeight:126,borderWidth:1,borderRadius:17,padding:13},templateIcon:{fontSize:26},templateName:{fontSize:14,fontWeight:'900',marginTop:8},templateDesc:{fontSize:11,lineHeight:15,marginTop:4},listHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:0},count:{fontSize:11,fontWeight:'800'},item:{borderWidth:1,borderRadius:18,padding:14,flexDirection:'row',alignItems:'center',marginBottom:10},itemIcon:{fontSize:28,width:46},itemName:{fontSize:16,fontWeight:'900'},itemDesc:{fontSize:12,lineHeight:17,marginTop:3},meta:{fontSize:10,marginTop:6,fontWeight:'700'},empty:{borderWidth:1,borderRadius:20,padding:28,alignItems:'center',marginTop:10},emptyIcon:{fontSize:34},emptyTitle:{fontSize:17,fontWeight:'900',marginTop:7},emptyText:{textAlign:'center',fontSize:12,marginTop:4}
});
