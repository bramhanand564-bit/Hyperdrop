// ==========================================
// FILE: screens/CallScreen.js
// ==========================================
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { Ionicons } from '@expo/vector-icons';

// 🚀 IMPORT OUR NEW CUSTOM HOOK
import useCallLogic from '../hooks/useCallLogic';

export default function CallScreen({ route, navigation }) {
  // 🧠 Fetching all the Logic and States from our Hook
  const {
    type, name, isCaller,
    localStream, remoteStream, isMuted, isCameraOff, facing, status, connected, timer, busy,
    acceptCall, declineCall, endCall, toggleMute, toggleCamera, switchCamera, formatTime
  } = useCallLogic(route, navigation);

  /* =========================
     ⏳ 1. LOADING SCREEN
  ========================= */
  if (busy && !localStream && status !== 'Incoming...') {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#1687FF" />
        <Text style={styles.loadingTitle}>{isCaller ? `Calling ${name}...` : `Connecting with ${name}...`}</Text>
        <Text style={styles.loadingSub}>{type === 'video' ? 'Video call' : 'Voice call'}</Text>
      </View>
    );
  }

  /* =========================
     📞 2. INCOMING CALL SCREEN
  ========================= */
  if (status === 'Incoming...') {
    return (
      <SafeAreaView style={styles.voiceContainer}>
        <View style={styles.voiceCenter}>
          <View style={[styles.voiceAvatar, { backgroundColor: '#1A2A3A' }]}>
            <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.voiceName}>{name}</Text>
          <Text style={[styles.voiceStatus, { color: '#087EFF', fontWeight: 'bold' }]}>
            Incoming {type === 'video' ? 'Video' : 'Voice'} Call...
          </Text>
        </View>
        <View style={styles.incomingControls}>
          <TouchableOpacity style={[styles.endButton, { backgroundColor: '#FF3B30', width: 70, height: 70, borderRadius: 35 }]} onPress={declineCall}>
            <Ionicons name="close" size={36} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.endButton, { backgroundColor: '#34C759', width: 70, height: 70, borderRadius: 35 }]} onPress={acceptCall}>
            <Ionicons name="call" size={36} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* =========================
     📹 3. VIDEO CALL SCREEN
  ========================= */
  if (type === 'video') {
    return (
      <View style={styles.videoContainer}>
        {/* Remote Video (Friend) */}
        {remoteStream ? (
          <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} objectFit="cover" mirror={false} />
        ) : (
          <View style={styles.waitingVideo}>
            <Ionicons name="videocam" size={55} color="#5E7485" />
            <Text style={styles.waitingName}>{name}</Text>
            <Text style={styles.waitingStatus}>{status}</Text>
          </View>
        )}

        {/* Local Video (You) */}
        {localStream && !isCameraOff && (
          <RTCView streamURL={localStream.toURL()} style={styles.localVideo} objectFit="cover" mirror={facing === 'front'} />
        )}

        <SafeAreaView style={styles.videoOverlay}>
          {/* Header Controls */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.topButton} onPress={endCall}>
              <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{connected ? formatTime(timer) : status}</Text>
            </View>
            <View style={styles.topButton} />
          </View>

          {/* Bottom Controls */}
          <View style={styles.videoControls}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}>
              <Ionicons name={isCameraOff ? 'videocam-off' : 'videocam'} size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
              <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlButton, isMuted && styles.activeControl]} onPress={toggleMute}>
              <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color={isMuted ? '#111111' : '#FFFFFF'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.endButton} onPress={endCall}>
              <Ionicons name="call" size={27} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  /* =========================
     🎙️ 4. VOICE CALL SCREEN
  ========================= */
  return (
    <SafeAreaView style={styles.voiceContainer}>
      {/* Header */}
      <View style={styles.voiceTop}>
        <TouchableOpacity style={styles.topButton} onPress={endCall}>
          <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{connected ? formatTime(timer) : status}</Text>
        </View>
        <View style={styles.topButton} />
      </View>

      {/* Center Profile */}
      <View style={styles.voiceCenter}>
        <View style={styles.voiceAvatar}>
          <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.voiceName}>{name}</Text>
        <Text style={styles.voiceStatus}>{connected ? formatTime(timer) : status}</Text>
      </View>

      {/* Bottom Controls */}
      <View style={styles.voiceControls}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
          <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={25} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton}>
          <Ionicons name="volume-high" size={25} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.endButton} onPress={endCall}>
          <Ionicons name="call" size={27} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// 🎨 PRESERVED EXACT STYLES
const styles = StyleSheet.create({
  loadingScreen: { flex: 1, backgroundColor: '#050A10', alignItems: 'center', justifyContent: 'center', padding: 30 },
  loadingTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginTop: 18, textAlign: 'center' },
  loadingSub: { color: '#8FA6B9', fontSize: 14, marginTop: 7 },
  videoContainer: { flex: 1, backgroundColor: '#000000' },
  remoteVideo: { ...StyleSheet.absoluteFillObject },
  waitingVideo: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#07111A' },
  waitingName: { color: '#FFFFFF', fontSize: 25, fontWeight: '800', marginTop: 15 },
  waitingStatus: { color: '#8FA6B9', fontSize: 14, marginTop: 6 },
  localVideo: { position: 'absolute', width: 110, height: 155, top: 58, right: 15, borderRadius: 16, overflow: 'hidden' },
  videoOverlay: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 8 },
  topButton: { width: 45, height: 45, alignItems: 'center', justifyContent: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.48)' },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34C759', marginRight: 7 },
  statusText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  videoControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingBottom: 25 },
  controlButton: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  activeControl: { backgroundColor: '#FFFFFF' },
  endButton: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF3B30' },
  voiceContainer: { flex: 1, backgroundColor: '#050A10' },
  voiceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 10 },
  voiceCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  voiceAvatar: { width: 150, height: 150, borderRadius: 75, backgroundColor: '#1687FF', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#FFFFFF', fontSize: 62, fontWeight: '800' },
  voiceName: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', marginTop: 25 },
  voiceStatus: { color: '#8FA6B9', fontSize: 15, marginTop: 8 },
  voiceControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, paddingBottom: 35 },
  incomingControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 60, paddingBottom: 60 }
});
