import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, SafeAreaView, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
// 🛡️ Security Engine Import (Jo humne pehle banaya tha)
import { URLValidator } from '../../security/URLValidator';

export default function AppPublishScreen({ navigation }) {
  const { isDark } = useTheme();

  // Colors
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const cardBg = isDark ? '#1A222C' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const accentCol = '#087EFF'; // Nax Blue

  // Form State
  const [appName, setAppName] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [description, setDescription] = useState('');
  const [appCategory, setAppCategory] = useState('Game');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = ['Game', 'Mini-App', 'AI Bot', 'Utility', 'Watch Party'];

  const handlePublish = () => {
    if (!appName || !appUrl || !description) {
      Alert.alert("Missing Fields", "Please fill in all the required details.");
      return;
    }

    setIsSubmitting(true);

    // 🛡️ SECURITY CHECK: Nax Sandbox URL Validator
    setTimeout(() => {
      const securityCheck = URLValidator.scanMiniAppUrl(appUrl);
      
      if (!securityCheck.isSafe) {
        setIsSubmitting(false);
        Alert.alert("Security Block 🛑", `Your App URL failed the security scan:\n\n${securityCheck.message}`);
        return;
      }

      // ✅ SUCCESS: Publish to Database
      setTimeout(() => {
        setIsSubmitting(false);
        Alert.alert(
          "Published Successfully! 🎉", 
          `"${appName}" is now live on the Nax Portal. Users can now discover and play your app!`,
          [{ text: "Go to Dashboard", onPress: () => navigation.goBack() }]
        );
      }, 1500);
      
    }, 1000); // Simulating network delay
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* 🛠️ HEADER */}
      <View style={[styles.header, { borderBottomColor: borderCol }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="close" size={26} color={textMain} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textMain }]}>Publish to Portal</Text>
        <View style={{ width: 36 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="rocket-launch" size={45} color={accentCol} />
          <Text style={[styles.infoTitle, { color: textMain }]}>Launch Your App</Text>
          <Text style={[styles.infoDesc, { color: textSub }]}>Join the Creator Economy. Submit your Game, Bot, or Web-App to the global Nax ecosystem.</Text>
        </View>

        {/* 📝 FORM FIELDS */}
        <View style={[styles.formCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
          
          <Text style={[styles.inputLabel, { color: textMain }]}>App Name *</Text>
          <TextInput 
            style={[styles.input, { color: textMain, borderColor: borderCol, backgroundColor: bg }]} 
            placeholder="e.g., Nax Ludo Multi" 
            placeholderTextColor={textSub}
            value={appName}
            onChangeText={setAppName}
          />

          <Text style={[styles.inputLabel, { color: textMain }]}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
            {categories.map(cat => (
              <TouchableOpacity 
                key={cat} 
                style={[styles.catChip, { backgroundColor: appCategory === cat ? accentCol : bg, borderColor: appCategory === cat ? accentCol : borderCol }]}
                onPress={() => setAppCategory(cat)}
              >
                <Text style={{ color: appCategory === cat ? '#FFF' : textSub, fontWeight: 'bold' }}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.inputLabel, { color: textMain }]}>App / Web URL *</Text>
          <TextInput 
            style={[styles.input, { color: textMain, borderColor: borderCol, backgroundColor: bg }]} 
            placeholder="https://your-game-link.com" 
            placeholderTextColor={textSub}
            autoCapitalize="none"
            value={appUrl}
            onChangeText={setAppUrl}
          />

          <Text style={[styles.inputLabel, { color: textMain }]}>Icon URL (Optional)</Text>
          <TextInput 
            style={[styles.input, { color: textMain, borderColor: borderCol, backgroundColor: bg }]} 
            placeholder="https://image-link.com/icon.png" 
            placeholderTextColor={textSub}
            autoCapitalize="none"
            value={iconUrl}
            onChangeText={setIconUrl}
          />

          <Text style={[styles.inputLabel, { color: textMain }]}>Short Description *</Text>
          <TextInput 
            style={[styles.textArea, { color: textMain, borderColor: borderCol, backgroundColor: bg }]} 
            placeholder="What does your app do? (Max 100 words)" 
            placeholderTextColor={textSub}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />

        </View>

        {/* 🚀 SUBMIT BUTTON */}
        <TouchableOpacity 
          style={[styles.submitBtn, { backgroundColor: isSubmitting ? textSub : accentCol }]} 
          onPress={handlePublish}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.submitText}>Submit for Review</Text>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
        
        <Text style={[styles.termsText, { color: textSub }]}>By submitting, you agree to the Nax Developer Terms & Sandbox Security Policies.</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1 },
  iconBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  
  infoBox: { alignItems: 'center', marginBottom: 25, marginTop: 10 },
  infoTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 12 },
  infoDesc: { textAlign: 'center', marginTop: 8, paddingHorizontal: 10, lineHeight: 20, fontSize: 13 },
  
  formCard: { padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 25 },
  inputLabel: { fontSize: 13, fontWeight: 'bold', marginBottom: 8, marginTop: 15 },
  input: { height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, fontSize: 15 },
  textArea: { height: 100, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, paddingTop: 15, fontSize: 15, textAlignVertical: 'top' },
  
  categoryRow: { flexDirection: 'row', marginBottom: 5 },
  catChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, marginRight: 10 },
  
  submitBtn: { flexDirection: 'row', height: 55, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  termsText: { textAlign: 'center', fontSize: 11, paddingHorizontal: 20 }
});
