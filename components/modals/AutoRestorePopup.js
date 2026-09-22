import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { checkExistingBackup, downloadBackupFromDrive } from '../../utils/googleDriveBackup';

export default function AutoRestorePopup() {
  const [visible, setVisible] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [backupFile, setBackupFile] = useState(null);

  useEffect(() => {
    const scanDriveForBackup = async () => {
      try {
        const file = await checkExistingBackup();
        if (file) {
          setBackupFile(file);
          setVisible(true); 
        }
      } catch (e) {
        console.log("No backup found.");
      }
    };
    
    setTimeout(() => scanDriveForBackup(), 1500); 
  }, []);

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const backupData = await downloadBackupFromDrive(backupFile.id);
      console.log("Downloaded Data:", backupData);
      
      Alert.alert("Restore Complete! 🎉", `${backupData.totalChats || 0} chats have been restored successfully.`);
      setVisible(false);
    } catch (error) {
      // 🔥 Hardcoded की जगह असली एरर मैसेज
      Alert.alert("Restore Error", error.message || "Restore failed. Please check your connection.");
    } finally {
      setRestoring(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      "Skip Restore?",
      "If you skip now, your old chats won't show up. You can't undo this easily.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Yes, Skip", onPress: () => setVisible(false), style: "destructive" }
      ]
    );
  };

  if (!visible) return null; 

  return (
    <Modal transparent animationType="slide" visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.popupCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="cloud-download" size={40} color="#007AFF" />
          </View>
          
          <Text style={styles.title}>Backup Found</Text>
          <Text style={styles.subtitle}>
            We found a chat backup in your Google Drive. Would you like to restore your messages now?
          </Text>

          {restoring ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Restoring your data... Please wait.</Text>
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore}>
                <Text style={styles.restoreBtnText}>Restore Now</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                <Text style={styles.skipBtnText}>Skip</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  popupCard: { backgroundColor: '#FFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, alignItems: 'center', paddingBottom: 40 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,122,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#000', marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  buttonContainer: { width: '100%' },
  restoreBtn: { backgroundColor: '#007AFF', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  restoreBtnText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
  skipBtn: { height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  skipBtnText: { color: '#FF3B30', fontSize: 17, fontWeight: '600' },
  loadingBox: { alignItems: 'center', marginVertical: 20 },
  loadingText: { marginTop: 15, color: '#666', fontSize: 14 }
});
