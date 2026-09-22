// ==========================================
// FILE: components/chat/MessageBubble.js
// ==========================================
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, SafeAreaView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Video, ResizeMode } from 'expo-av'; // 🚀 REAL VIDEO PLAYER IMPORT

// 🚀 IMPORTS FOR AUTO-DOWNLOAD & DELETE MASTER PLAN
import * as FileSystem from 'expo-file-system';
import { deleteCloudinaryByToken } from '../../utils/cloudinaryUpload';

export default function MessageBubble({ item, isMe, isGlobal }) {
  const { isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false); // For Fullscreen Image

  // 🚀 STATE: To switch from Cloudinary URL to Offline Local File
  const [localMediaUri, setLocalMediaUri] = useState(item.fileUri);

  // --- ORIGINAL COLORS PRESERVED (LOCKED) ---
  const bubbleMe = '#087EFF';
  const bubbleOther = isDark ? '#1A2A3A' : '#FFFFFF';
  const textOther = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  // 🕒 TIME FORMATTER (LOCKED)
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // 📄 REAL DOCUMENT OPENER (LOCKED)
  const openDocument = () => {
    const targetUri = localMediaUri || item.fileUri;
    if (targetUri) {
      Linking.openURL(targetUri).catch(() => alert("Can't open this file."));
    }
  };

  // 💥 THE MASTERSTROKE LOGIC (AUTO-DOWNLOAD & DELETE - NOW WITH DYNAMIC EXTENSION)
  useEffect(() => {
    let isMounted = true;

    const processAutoDownloadAndDelete = async () => {
      if (!isMe && item.fileUri && item.deleteToken) {
        try {
          // 1. 🚀 FIX: Extract REAL extension from fileName or fileUri instead of hardcoding .mp4
          let ext = '';
          if (item.fileName && item.fileName.includes('.')) {
            ext = item.fileName.substring(item.fileName.lastIndexOf('.'));
          } else if (item.fileUri && item.fileUri.split('?')[0].includes('.')) {
            const urlWithoutParams = item.fileUri.split('?')[0];
            ext = urlWithoutParams.substring(urlWithoutParams.lastIndexOf('.'));
          }
          
          // Fallback just in case extension is missing or weird
          if (!ext || ext.length > 6 || ext.includes('/')) {
            ext = item.type === 'video' ? '.mp4' : (item.type === 'image' ? '.jpg' : '.pdf');
          }

          const localPath = `${FileSystem.documentDirectory}nax_media_${item.id || Date.now()}${ext}`;

          // 2. Check karenge ki kya receiver ne pehle hi isko download kar liya hai?
          const fileInfo = await FileSystem.getInfoAsync(localPath);

          if (fileInfo.exists) {
            if (isMounted) setLocalMediaUri(localPath);
          } else {
            // 3. Background me Cloudinary se download karo
            const downloadRes = await FileSystem.downloadAsync(item.fileUri, localPath);
            
            if (downloadRes.status === 200) {
              if (isMounted) setLocalMediaUri(downloadRes.uri);

              // 4. Download 100% hote hi Cloudinary se Delete kar do!
              await deleteCloudinaryByToken(item.deleteToken);
            }
          }
        } catch (error) {
          console.log("Auto-Download/Delete Error:", error);
        }
      }
    };

    processAutoDownloadAndDelete();

    return () => { isMounted = false; };
  }, [item.fileUri, item.deleteToken, isMe, item.id, item.type, item.fileName]);


  return (
    <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}>
      
      {!isMe && isGlobal && (
        <Text style={[styles.senderName, { color: textSub }]}>@{item.senderName}</Text>
      )}
      
      <View style={[
        styles.messageBubble,
        isMe 
          ? { backgroundColor: bubbleMe, borderBottomRightRadius: 4 } 
          : { backgroundColor: bubbleOther, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: border }
      ]}>
        
        {/* 📷 100% REAL IMAGE VIEWER */}
        {item.type === 'image' && item.fileUri && (
          <>
            <TouchableOpacity activeOpacity={0.9} onPress={() => setModalVisible(true)}>
              <Image source={{ uri: localMediaUri || item.fileUri }} style={styles.mediaImage} resizeMode="cover" />
            </TouchableOpacity>
            
            {/* FULLSCREEN IMAGE MODAL */}
            <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
              <SafeAreaView style={styles.modalContainer}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={32} color="#FFF" />
                </TouchableOpacity>
                <Image source={{ uri: localMediaUri || item.fileUri }} style={styles.fullScreenImage} resizeMode="contain" />
              </SafeAreaView>
            </Modal>
          </>
        )}

        {/* 🎥 100% REAL VIDEO PLAYER */}
        {item.type === 'video' && item.fileUri && (
          <View style={styles.videoContainer}>
            <Video
              style={styles.mediaVideo}
              source={{ uri: localMediaUri || item.fileUri }}
              useNativeControls={true}
              resizeMode={ResizeMode.COVER}
              isLooping={false}
            />
          </View>
        )}

        {/* 📄 100% REAL DOCUMENT DOWNLOADER */}
        {item.type === 'file' && (
          <TouchableOpacity activeOpacity={0.8} style={[styles.mediaDocument, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)' }]} onPress={openDocument}>
            <Ionicons name="document-text" size={28} color={isMe ? "#FFF" : "#087EFF"} />
            <Text style={[styles.docText, { color: isMe ? '#FFF' : textOther }]} numberOfLines={1}>
              {item.fileName || 'Document File'}
            </Text>
          </TouchableOpacity>
        )}

        {/* 💬 TEXT RENDERING (LOCKED) */}
        {item.text ? (
          <Text style={[styles.messageText, { color: isMe ? '#FFF' : textOther, marginTop: (item.type && item.type !== 'text') ? 6 : 0 }]}>
            {item.text}
          </Text>
        ) : null}

        {/* 🕒 TIMESTAMP (LOCKED) */}
        <Text style={[styles.timestamp, { color: isMe ? 'rgba(255,255,255,0.7)' : textSub }]}>
          {formatTime(item.createdAt)}
        </Text>

      </View>
    </View>
  );
}

// STYLES 100% LOCKED
const styles = StyleSheet.create({
  messageWrapper: { marginBottom: 15, maxWidth: '82%' },
  messageWrapperMe: { alignSelf: 'flex-end' },
  messageWrapperOther: { alignSelf: 'flex-start' },
  senderName: { fontSize: 11, marginBottom: 5, marginLeft: 4, fontWeight: '700' },
  messageBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  messageText: { fontSize: 15, lineHeight: 22 },
  timestamp: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
  
  // Real Media Styles
  mediaImage: { width: 220, height: 220, borderRadius: 12, marginBottom: 5 },
  videoContainer: { width: 220, height: 220, borderRadius: 12, overflow: 'hidden', marginBottom: 5, backgroundColor: '#000' },
  mediaVideo: { width: '100%', height: '100%' },
  mediaDocument: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, marginBottom: 5, width: 220 },
  docText: { marginLeft: 10, fontSize: 14, fontWeight: '600', flex: 1 },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20 },
  fullScreenImage: { width: '100%', height: '80%' }
});
