import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Modal, Animated, SafeAreaView, Platform, Alert, TextInput } from 'react-native';
import { Ionicons, FontAwesome5, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';

// FIREBASE INTEGRATION
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

export default function MomentsScreen() {
  const { isDark } = useTheme();
  const currentUser = auth.currentUser;
  
  // Real-time Data States
  const [feedPosts, setFeedPosts] = useState([]);
  const [stories, setStories] = useState([]);
  
  const [activeTab, setActiveTab] = useState('For You');
  const [viewingStory, setViewingStory] = useState(null);
  
  // Working Creator States
  const [showCreator, setShowCreator] = useState(false);
  const [creatorMode, setCreatorMode] = useState('Camera'); // 'Text' or 'Camera'
  const [publishType, setPublishType] = useState('Post'); // 'Post', 'Story', 'Reel'
  const [creatorText, setCreatorText] = useState('');
  const [creatorMedia, setCreatorMedia] = useState(null);
  
  const progressAnim = useRef(new Animated.Value(0)).current;

  // ================= GLASSY WATER BUBBLE COLORS =================
  const bg = isDark ? '#0A1520' : '#E8F1F5'; 
  const textMain = isDark ? '#F0F4F8' : '#1A2C3A';
  const textSub = isDark ? '#8AA2B5' : '#6A8296';
  
  const glassPanelBg = isDark ? 'rgba(20, 35, 50, 0.65)' : 'rgba(255, 255, 255, 0.75)';
  const glassBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.4)';
  const cardBg = isDark ? 'rgba(25, 40, 55, 0.7)' : 'rgba(255, 255, 255, 0.9)';

  // ================= REAL-TIME FIREBASE SYNC =================
  useEffect(() => {
    // 1. Fetch Real Feed (Posts/Reels)
    const qFeed = query(collection(db, 'global_moments'), orderBy('createdAt', 'desc'));
    const unsubFeed = onSnapshot(qFeed, (snapshot) => {
      setFeedPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Fetch Real Stories
    const qStories = query(collection(db, 'global_stories'), orderBy('createdAt', 'desc'));
    const unsubStories = onSnapshot(qStories, (snapshot) => {
      setStories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubFeed(); unsubStories(); };
  }, []);

  // ================= WORKING STORY LOGIC =================
  const openStory = (story) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(()=>{});
    setViewingStory(story);
    startStoryTimer();
  };

  const startStoryTimer = () => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, { toValue: 1, duration: 5000, useNativeDriver: false }).start(({ finished }) => {
      if (finished) closeStory();
    });
  };

  const closeStory = () => { setViewingStory(null); progressAnim.setValue(0); };

  // ================= WORKING CREATOR (CAMERA & PUBLISH) =================
  const launchCamera = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(()=>{});
    try {
      const p = await ImagePicker.requestCameraPermissionsAsync();
      if(!p.granted) { Alert.alert("Permission", "Camera access required"); return; }
      const r = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.3 });
      if(!r.canceled && r.assets?.[0]?.base64) {
        setCreatorMedia(`data:image/jpeg;base64,${r.assets[0].base64}`);
        setCreatorMode('Camera');
        setShowCreator(true);
      }
    } catch(e){}
  };

  const pickGallery = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.3 });
      if(!r.canceled && r.assets?.[0]?.base64) {
        setCreatorMedia(`data:image/jpeg;base64,${r.assets[0].base64}`);
        setCreatorMode('Camera');
      }
    } catch(e){}
  };

  const handlePublish = async () => {
    if (!creatorText.trim() && !creatorMedia) {
      Alert.alert("Empty", "Please add text or a photo."); return;
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{});
    
    const collectionName = publishType === 'Story' ? 'global_stories' : 'global_moments';
    const isReel = publishType === 'Reel';

    try {
      await addDoc(collection(db, collectionName), {
        userId: currentUser?.uid || 'unknown',
        userName: currentUser?.displayName || 'User',
        userImg: currentUser?.photoURL || `https://ui-avatars.com/api/?name=${currentUser?.displayName || 'U'}&background=random`,
        text: creatorText.trim(),
        media: creatorMedia,
        isVideo: isReel,
        likes: [],
        commentsCount: 0,
        createdAt: serverTimestamp()
      });

      setShowCreator(false);
      setCreatorText('');
      setCreatorMedia(null);
      Alert.alert("Success", `${publishType} published globally! 🌊`);
    } catch (e) {
      Alert.alert("Error", "Failed to publish.");
    }
  };

  // ================= WORKING LIKES =================
  const handleLikePost = async (postId, currentLikes) => {
    if(!currentUser) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{});
    
    const hasLiked = currentLikes.includes(currentUser.uid);
    const updatedLikes = hasLiked 
      ? currentLikes.filter(id => id !== currentUser.uid) 
      : [...currentLikes, currentUser.uid];

    try {
      await updateDoc(doc(db, 'global_moments', postId), { likes: updatedLikes });
    } catch(e){}
  };

  // ================= UI HELPERS =================
  const formatTime = (createdAt) => {
    if (!createdAt) return 'Just now';
    try {
      const diff = new Date() - createdAt.toDate();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      return `${Math.floor(hours / 24)}d ago`;
    } catch(e) { return 'Just now'; }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      {/* ================= GLASS HEADER ================= */}
      <View style={[styles.header, { backgroundColor: glassPanelBg, borderBottomColor: glassBorder }]}>
        <Text style={[styles.headerTitle, { color: textMain }]}>Moments</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => Alert.alert('Archive', 'Saved Memories')}><Ionicons name="time-outline" size={26} color={textMain} /></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => Alert.alert('Activity', 'Likes & Mentions')}><Ionicons name="heart-outline" size={26} color={textMain} /></TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        
        {/* ================= REAL STORIES SECTION ================= */}
        <View style={[styles.storySection, { borderBottomColor: glassBorder }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
            
            {/* My Story Button */}
            <TouchableOpacity style={styles.storyItem} onPress={() => { setCreatorMode('Camera'); setPublishType('Story'); setShowCreator(true); }}>
              <View style={[styles.storyRing, { borderColor: glassBorder }]}>
                <Image source={{ uri: currentUser?.photoURL || `https://ui-avatars.com/api/?name=${currentUser?.displayName || 'Me'}&background=007AFF&color=fff` }} style={styles.storyImg} />
                <View style={styles.addStoryBtn}><Ionicons name="add" size={16} color="#FFF" /></View>
              </View>
              <Text style={[styles.storyName, { color: textMain }]} numberOfLines={1}>Add Story</Text>
            </TouchableOpacity>

            {/* Fetched Stories */}
            {stories.map((s) => (
              <TouchableOpacity key={s.id} style={styles.storyItem} onPress={() => openStory(s)}>
                <View style={[styles.storyRing, { borderColor: '#007AFF' }]}>
                  <Image source={{ uri: s.userImg }} style={styles.storyImg} />
                </View>
                <Text style={[styles.storyName, { color: textMain }]} numberOfLines={1}>{s.userName}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ================= TABS ================= */}
        <View style={[styles.tabsContainer, { borderBottomColor: glassBorder }]}>
          {['For You', 'Following', 'Live', 'Reels'].map((tab) => (
            <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === tab && { borderBottomColor: '#007AFF', borderBottomWidth: 2 }]} onPress={() => { Haptics.selectionAsync().catch(()=>{}); setActiveTab(tab); }}>
              <Text style={[styles.tabText, { color: activeTab === tab ? '#007AFF' : textSub, fontWeight: activeTab === tab ? '700' : '500' }]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ================= REAL-TIME FEED ================= */}
        {feedPosts.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="water-outline" size={60} color={textSub} style={{ opacity: 0.5 }} />
            <Text style={{ color: textSub, marginTop: 10 }}>No moments yet. Be the first!</Text>
          </View>
        ) : (
          feedPosts.map((post) => {
            const hasLiked = post.likes?.includes(currentUser?.uid);
            
            return (
              <View key={post.id} style={[styles.feedCard, { backgroundColor: cardBg, borderColor: glassBorder }]}>
                
                {/* Post Header */}
                <View style={styles.feedHeader}>
                  <Image source={{ uri: post.userImg }} style={styles.feedAvatar} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.feedUser, { color: textMain }]}>{post.userName}</Text>
                    <Text style={{ color: textSub, fontSize: 12, marginTop: 2 }}>{formatTime(post.createdAt)} • 🌎 Public</Text>
                  </View>
                  {post.userId === currentUser?.uid && (
                    <TouchableOpacity onPress={() => deleteDoc(doc(db, 'global_moments', post.id))}><Ionicons name="trash-outline" size={20} color="#FF3B30" /></TouchableOpacity>
                  )}
                </View>

                {/* Post Content */}
                {post.text ? <Text style={[styles.feedText, { color: textMain }]}>{post.text}</Text> : null}
                
                {/* Post Media */}
                {post.media && (
                  <TouchableOpacity activeOpacity={0.9} onDoublePress={() => handleLikePost(post.id, post.likes || [])} style={[styles.feedMediaPlaceholder, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)', borderColor: glassBorder }]}>
                    <Image source={{ uri: post.media }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                    {post.isVideo && <Ionicons name="play-circle" size={60} color="rgba(255,255,255,0.7)" style={{ position: 'absolute' }} />}
                  </TouchableOpacity>
                )}

                {/* Engagement Actions */}
                <View style={styles.feedActions}>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity style={styles.feedActionBtn} onPress={() => handleLikePost(post.id, post.likes || [])}>
                      <Ionicons name={hasLiked ? "heart" : "heart-outline"} size={26} color={hasLiked ? "#FF3B30" : textMain} />
                      <Text style={[styles.actionNum, { color: hasLiked ? "#FF3B30" : textMain }]}>{post.likes?.length || 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.feedActionBtn}>
                      <Ionicons name="chatbubble-outline" size={24} color={textMain} />
                      <Text style={[styles.actionNum, { color: textMain }]}>{post.commentsCount || 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.feedActionBtn}>
                      <Feather name="send" size={24} color={textMain} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ================= FLOATING BUBBLE BUTTONS ================= */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={[styles.fabMini, { backgroundColor: glassPanelBg, borderColor: glassBorder }]} onPress={() => { setCreatorMode('Text'); setPublishType('Post'); setShowCreator(true); }}>
          <Ionicons name="pencil" size={20} color={textMain} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.fabMain, { backgroundColor: '#007AFF', shadowColor: '#007AFF' }]} onPress={launchCamera}>
          <Ionicons name="add" size={32} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* ================= REAL STORY VIEWER ================= */}
      <Modal visible={!!viewingStory} transparent={false} animationType="fade" onRequestClose={closeStory}>
        <View style={styles.viewerContainer}>
          <TouchableOpacity activeOpacity={1} style={styles.viewerTapArea} onLongPress={() => { progressAnim.stopAnimation(); Haptics.selectionAsync().catch(()=>{}); }} onPressOut={startStoryTimer}>
            
            {/* Story Content Background */}
            <Image source={{ uri: viewingStory?.media || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop' }} style={StyleSheet.absoluteFillObject} />
            <View style={styles.viewerOverlay}>
              {viewingStory?.text ? <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold', textAlign: 'center', padding: 20 }}>{viewingStory.text}</Text> : null}
            </View>

            {/* Header & Progress */}
            <SafeAreaView style={styles.viewerHeader}>
              <View style={styles.progressBarBg}>
                <Animated.View style={[styles.progressBarFill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
              </View>
              <View style={styles.viewerUserInfo}>
                <Image source={{ uri: viewingStory?.userImg }} style={styles.viewerAvatar} />
                <Text style={styles.viewerName}>{viewingStory?.userName}</Text>
                <Text style={styles.viewerTime}>{formatTime(viewingStory?.createdAt)}</Text>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={closeStory} style={{ padding: 5 }}><Ionicons name="close" size={28} color="#FFF" /></TouchableOpacity>
              </View>
            </SafeAreaView>

            {/* Bottom Reply Box */}
            <SafeAreaView style={styles.viewerFooter}>
              <TouchableOpacity style={styles.viewerReplyBox} onPress={() => Alert.alert("Reply", "Keyboard opens...")}>
                <Text style={{ color: '#FFF', fontSize: 15 }}>Reply to {viewingStory?.userName}...</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginHorizontal: 12 }} onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{})}><Ionicons name="heart" size={34} color="#FF3B30" /></TouchableOpacity>
              <TouchableOpacity><Feather name="send" size={28} color="#FFF" /></TouchableOpacity>
            </SafeAreaView>

          </TouchableOpacity>
        </View>
      </Modal>

      {/* ================= REAL PUBLISH CREATOR ================= */}
      <Modal visible={showCreator} animationType="slide" transparent={false} onRequestClose={() => setShowCreator(false)}>
        <SafeAreaView style={[styles.creatorContainer, { backgroundColor: '#0A0A0A' }]}>
          
          <View style={styles.creatorHeader}>
            <TouchableOpacity onPress={() => { setShowCreator(false); setCreatorMedia(null); setCreatorText(''); }}><Ionicons name="close" size={32} color="#FFF" /></TouchableOpacity>
            <TouchableOpacity style={styles.publishBtn} onPress={handlePublish}>
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Publish</Text>
              <Ionicons name="send" size={16} color="#FFF" style={{ marginLeft: 5 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.creatorCanvas}>
            {creatorMedia ? (
              <Image source={{ uri: creatorMedia }} style={{ width: '100%', height: '100%', borderRadius: 30 }} />
            ) : null}
            
            {(creatorMode === 'Text' || creatorText) && (
              <TextInput 
                style={[styles.creatorTextInput, creatorMedia ? styles.creatorTextOverlay : {}]} 
                placeholder="Type your moment..." 
                placeholderTextColor="rgba(255,255,255,0.5)" 
                multiline 
                autoFocus={creatorMode === 'Text'}
                value={creatorText} 
                onChangeText={setCreatorText} 
              />
            )}
          </View>

          <View style={styles.creatorFooter}>
            <View style={styles.modeSelector}>
              {['Post', 'Story', 'Reel'].map((mode) => (
                <TouchableOpacity key={mode} onPress={() => setPublishType(mode)} style={{ paddingHorizontal: 15 }}>
                  <Text style={{ color: publishType === mode ? '#FFF' : '#666', fontWeight: publishType === mode ? 'bold' : 'normal', fontSize: 16 }}>{mode}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.bottomActions}>
              <TouchableOpacity style={styles.galleryBtn} onPress={pickGallery}><Ionicons name="images-outline" size={24} color="#FFF" /></TouchableOpacity>
              <TouchableOpacity style={styles.captureBtn} onPress={launchCamera}><View style={styles.captureInner} /></TouchableOpacity>
              <TouchableOpacity style={styles.flipBtn}><Ionicons name="camera-reverse-outline" size={28} color="#FFF" /></TouchableOpacity>
            </View>
          </View>

        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, 
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 10 : 45, paddingBottom: 15, borderBottomWidth: 1 }, 
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: 0.5 }, 
  headerIcons: { flexDirection: 'row', alignItems: 'center' }, 
  iconBtn: { marginLeft: 20 },

  storySection: { paddingVertical: 18, borderBottomWidth: 1 }, 
  storyItem: { alignItems: 'center', marginRight: 18 }, 
  storyRing: { width: 76, height: 76, borderRadius: 38, borderWidth: 2.5, justifyContent: 'center', alignItems: 'center', padding: 3 }, 
  storyImg: { width: 64, height: 64, borderRadius: 32 }, 
  addStoryBtn: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#007AFF', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' }, 
  storyName: { fontSize: 12, marginTop: 8, fontWeight: '600' },

  tabsContainer: { flexDirection: 'row', justifyContent: 'space-around', borderBottomWidth: 1 }, 
  tabBtn: { paddingVertical: 14, paddingHorizontal: 15 }, 
  tabText: { fontSize: 15 },

  feedCard: { marginHorizontal: 12, marginTop: 15, paddingVertical: 15, borderRadius: 24, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 4 }, 
  feedHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, marginBottom: 12 }, 
  feedAvatar: { width: 42, height: 42, borderRadius: 21 }, 
  feedUser: { fontSize: 16, fontWeight: '700' }, 
  feedText: { fontSize: 15, paddingHorizontal: 15, marginBottom: 12, lineHeight: 22, fontWeight: '400' }, 
  feedMediaPlaceholder: { width: '100%', height: 380, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderLeftWidth: 0, borderRightWidth: 0 }, 
  feedActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: 15 }, 
  feedActionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 22 },
  actionNum: { marginLeft: 6, fontSize: 14, fontWeight: '500' },

  fabContainer: { position: 'absolute', bottom: 90, right: 20, alignItems: 'center' }, 
  fabMini: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 }, 
  fabMain: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 8 },

  // Viewer Styles
  viewerContainer: { flex: 1, backgroundColor: '#000' }, 
  viewerTapArea: { flex: 1 }, 
  viewerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }, 
  viewerHeader: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, left: 0, right: 0, zIndex: 10 }, 
  progressBarBg: { height: 2.5, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 10, borderRadius: 2, overflow: 'hidden' }, 
  progressBarFill: { height: '100%', backgroundColor: '#FFF' }, 
  viewerUserInfo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingTop: 15 }, 
  viewerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 }, 
  viewerName: { color: '#FFF', fontSize: 15, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3 }, 
  viewerTime: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginLeft: 10 }, 
  viewerFooter: { position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 20, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, zIndex: 10 }, 
  viewerReplyBox: { flex: 1, height: 48, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', paddingHorizontal: 20, backgroundColor: 'rgba(0,0,0,0.2)' },

  // Creator Styles
  creatorContainer: { flex: 1 }, 
  creatorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 50 : 20, zIndex: 10 }, 
  publishBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  creatorCanvas: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#151515', marginVertical: 10, borderRadius: 30, marginHorizontal: 10, overflow: 'hidden', position: 'relative' }, 
  creatorTextInput: { color: '#FFF', fontSize: 26, fontWeight: 'bold', textAlign: 'center', width: '90%' },
  creatorTextOverlay: { position: 'absolute', zIndex: 20, backgroundColor: 'rgba(0,0,0,0.4)', padding: 10, borderRadius: 10 },
  creatorFooter: { paddingBottom: Platform.OS === 'ios' ? 40 : 20, paddingTop: 10 }, 
  modeSelector: { flexDirection: 'row', justifyContent: 'center', marginBottom: 25 }, 
  bottomActions: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 30 }, 
  galleryBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 2, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center' }, 
  captureBtn: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center' }, 
  captureInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#FFF' }, 
  flipBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }
});
