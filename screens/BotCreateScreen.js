import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, SafeAreaView, ActivityIndicator, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../firebaseConfig';
import { BotService } from '../services/BotService';

export default function BotCreateScreen({ navigation }) {
  const { isDark } = useTheme();

  // --- STATES ---
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [description, setDescription] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  // --- COLORS ---
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const cardBg = isDark ? '#101A26' : '#FFFFFF';
  const inputBg = isDark ? '#14202E' : '#EEF3F7';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const blue = '#087EFF';
  const danger = '#FF3B30';

  // --- CREATE BOT LOGIC ---
  const handleCreateBot = async () => {
    if (!name.trim() || !username.trim()) {
      Alert.alert('Required', 'Bot Name and @username are required.');
      return;
    }

    // Username format validation (3-20 chars, alphanumeric)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      setUsernameError('Username must be 3-20 chars, letters, numbers, or underscores.');
      return;
    }

    setLoading(true);
    setUsernameError('');

    try {
      // 1. Check if username is available using our BotService
      const isAvailable = await BotService.checkUsernameAvailable(username);
      if (!isAvailable) {
        setUsernameError(`@${username} is already taken.`);
        setLoading(false);
        return;
      }

      // 2. Get Current User
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to create a bot.');
        setLoading(false);
        return;
      }

      // 3. Prepare Bot Data
      const botData = {
        name: name.trim(),
        username: username.trim(),
        description: description.trim(),
        welcomeMessage: welcomeMessage.trim()
      };

      // 4. Save to Firestore
      await BotService.createBot(currentUser.uid, botData);
      
      // 5. Success Action
      Alert.alert('Success! 🎉', `Your bot @${username.toLowerCase()} is ready.`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);

    } catch (error) {
      console.log('Bot Creation Error:', error);
      Alert.alert('Error', 'Failed to create bot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={26} color={textMain} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textMain }]}>Create New Bot</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* ICON PLACEHOLDER */}
          <View style={styles.iconContainer}>
            <View style={[styles.botIcon, { backgroundColor: cardBg, borderColor: border }]}>
              <Ionicons name="hardware-chip" size={50} color={blue} />
              <View style={[styles.plusBadge, { backgroundColor: blue, borderColor: bg }]}>
                <Ionicons name="add" size={16} color="#FFF" />
              </View>
            </View>
            <Text style={[styles.iconText, { color: textSub }]}>Set Bot Profile Photo</Text>
          </View>

          {/* FORM */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            
            {/* Bot Name */}
            <Text style={[styles.label, { color: textSub }]}>Bot Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: textMain, borderColor: border }]}
              placeholder="e.g. Nax Translator Bot"
              placeholderTextColor={textSub}
              value={name}
              onChangeText={setName}
              maxLength={40}
            />

            {/* Username */}
            <Text style={[styles.label, { color: textSub }]}>Username *</Text>
            <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: usernameError ? danger : border }]}>
              <Text style={{ color: textSub, fontSize: 16, marginRight: 2 }}>@</Text>
              <TextInput
                style={[styles.inputFlex, { color: textMain }]}
                placeholder="translator_bot"
                placeholderTextColor={textSub}
                value={username}
                onChangeText={(text) => {
                  setUsername(text.toLowerCase());
                  setUsernameError('');
                }}
                autoCapitalize="none"
                maxLength={20}
              />
            </View>
            {usernameError ? <Text style={[styles.errorText, { color: danger }]}>{usernameError}</Text> : null}

            {/* Description */}
            <Text style={[styles.label, { color: textSub, marginTop: 15 }]}>Short Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: inputBg, color: textMain, borderColor: border }]}
              placeholder="What can this bot do?"
              placeholderTextColor={textSub}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={120}
            />

            {/* Welcome Message */}
            <Text style={[styles.label, { color: textSub }]}>Welcome Message</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: inputBg, color: textMain, borderColor: border }]}
              placeholder="Message sent when user types /start"
              placeholderTextColor={textSub}
              value={welcomeMessage}
              onChangeText={setWelcomeMessage}
              multiline
              maxLength={300}
            />

          </View>
        </ScrollView>

        {/* CREATE BUTTON */}
        <View style={[styles.footer, { backgroundColor: headerBg, borderTopColor: border }]}>
          <TouchableOpacity 
            style={[styles.createBtn, { backgroundColor: blue, opacity: loading ? 0.7 : 1 }]} 
            onPress={handleCreateBot}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.createBtnText}>Create Bot</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, borderBottomWidth: 1 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  iconContainer: { alignItems: 'center', marginBottom: 25, marginTop: 10 },
  botIcon: { width: 100, height: 100, borderRadius: 50, borderWidth: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  plusBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  iconText: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  card: { padding: 18, borderRadius: 20, borderWidth: 1 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 15, fontSize: 16, marginBottom: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'center', height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 15, marginBottom: 5 },
  inputFlex: { flex: 1, fontSize: 16, height: '100%' },
  textArea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  errorText: { fontSize: 12, fontWeight: '500', marginBottom: 15, marginLeft: 5 },
  footer: { padding: 15, paddingBottom: Platform.OS === 'ios' ? 25 : 15, borderTopWidth: 1 },
  createBtn: { height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', elevation: 2 },
  createBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' }
});
