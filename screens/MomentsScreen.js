import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Modal, Animated, SafeAreaView, Platform, Alert, TextInput, Share } from 'react-native';
import { Ionicons, FontAwesome5, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import GlassScene from '../components/ui/GlassScene';

// FIREBASE INTEGRATION
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, increment, getDocs, getDoc } from 'firebase/firestore';
import { Video } from 'expo-av';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';

const { width } = Dimensions.get('window');

export default function MomentsScreen() {
  const { isDark, theme } = useTheme();
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
  const [commentTarget, setCommentTarget] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [followingIds, setFollowingIds] = useState([]);
  const [cameraFacing, setCameraFacing] = useState('back');
  const [creatorIsVideo, setCreatorIsVideo] = useState(false);
  const [storyReply, setStoryReply] = useState('');
  
  const progressAnim = useRef(new Animated.Value(0)).current;

  // ================= GLASSY WATER BUBBLE COLORS =================
  const bg = theme.bg; 
  const textMain = theme.text;
  const textSub = theme.sub;
  
  const glassPanelBg = theme.surface;
  const glassBorder = theme.border;
  const cardBg = theme.surfaceStrong;

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
    const uid = currentUser?.uid;
    if (uid) getDoc(doc(db, 'users', uid)).then(snap => {
      const data = snap.exists() ? snap.data() : {};
      const ids = Array.isArray(data.followingIds) ? data.followingIds : (Array.isArray(data.following) ? data.following : []);
      setFollowingIds(ids);
    }).catch(() => setFollowingIds([]));

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
      const wantVideo = publishType === 'Reel';
      const r = await ImagePicker.launchCameraAsync({ quality: 0.75, cameraType: cameraFacing, mediaTypes: wantVideo ? ['videos'] : ['images'] });
      if(!r.canceled && r.assets?.[0]?.uri) {
        const asset = r.assets[0];
        const mimeType = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
        const fileName = asset.fileName || (asset.type === 'video' ? 'moment.mp4' : 'moment.jpg');
        const upload = await uploadToCloudinary({ fileUri: asset.uri, fileName, mimeType });
        setCreatorMedia(upload.secureUrl);
        setCreatorIsVideo(asset.type === 'video' || mimeType.startsWith('video/'));
        setCreatorMode('Camera');
        setShowCreator(true);
      }
    } catch(e){}
  };

  const pickGallery = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.75, mediaTypes: ['images', 'videos'] });
      if(!r.canceled && r.assets?.[0]?.uri) {
        const asset = r.assets[0];
        const mimeType = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
        const fileName = asset.fileName || (asset.type === 'video' ? 'moment.mp4' : 'moment.jpg');
        const upload = await uploadToCloudinary({ fileUri: asset.uri, fileName, mimeType });
        setCreatorMedia(upload.secureUrl);
        setCreatorIsVideo(asset.type === 'video' || mimeType.startsWith('video/'));
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
    if (isReel && !creatorIsVideo) { Alert.alert('Reel video required', 'Choose or record a video for a Reel.'); return; }

    try {
      await addDoc(collection(db, collectionName), {
        userId: currentUser?.uid || 'unknown',
        userName: currentUser?.displayName || 'User',
        userImg: currentUser?.photoURL || `https://ui-avatars.com/api/?name=${currentUser?.displayName || 'U'}&background=random`,
        text: creatorText.trim(),
        media: creatorMedia,
        isVideo: isReel || creatorIsVideo,
        likes: [],
        commentsCount: 0,
        createdAt: serverTimestamp()
      });

      setShowCreator(false);
      setCreatorText('');
      setCreatorMedia(null);
      setCreatorIsVideo(false);
      Alert.alert("Success", `${publishType} published globally! 🌊`);
    } catch (e) {
      Alert.alert("Error", "Failed to publish.");
    }
  };

  // ================= WORKING LIKES =================
  const handleCommentOpen = async (post) => {
    setCommentTarget(post);
    setCommentText('');
    try {
      const snap = await getDocs(query(collection(db, 'global_moments', post.id, 'comments'), orderBy('createdAt', 'asc')));
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { setComments([]); }
  };

  const handleCommentSend = async () => {
    const text = commentText.trim();
    if (!currentUser?.uid || !commentTarget?.id || !text) return;
    try {
      await addDoc(collection(db, 'global_moments', commentTarget.id, 'comments'), {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'User',
        text: text.slice(0, 500),
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'global_moments', commentTarget.id), { commentsCount: increment(1) });
      setComments(items => [...items, { id: `local-${Date.now()}`, userId: currentUser.uid, userName: currentUser.displayName || 'User', text }]);
      setCommentText('');
    } catch (e) { Alert.alert('Comment failed', 'Please try again.'); }
  };

  const handleSharePost = async (post) => {
    try {
      await Share.share({ message: `${post.userName || 'Someone'} shared a Moment${post.text ? `: ${post.text}` : ''}${post.media ? `\n${post.media}` : ''}` });
    } catch (e) {}
  };

  const handleStoryReply = async () => {
    const text = storyReply.trim();
    if (!currentUser?.uid || !viewingStory?.id || !text) return;
    try {
      await addDoc(collection(db, 'global_stories', viewingStory.id, 'replies'), { userId: currentUser.uid, userName: currentUser.displayName || 'User', text: text.slice(0, 500), createdAt: serverTimestamp() });
      setStoryReply('');
      Alert.alert('Reply sent', 'Your reply was added to the story.');
    } catch (e) { Alert.alert('Reply failed', 'Please try again.'); }
  };

  const handleLikeStory = async (story) => {
    if (!currentUser?.uid || !story?.id) return;
    const liked = Array.isArray(story.likes) && story.likes.includes(currentUser.uid);
    try {
      const nextLiked = !liked;
      await updateDoc(doc(db, 'global_stories', story.id), { likes: nextLiked ? arrayUnion(currentUser.uid) : arrayRemove(currentUser.uid) });
      setViewingStory(prev => prev ? { ...prev, likes: nextLiked ? [...(prev.likes || []), currentUser.uid] : (prev.likes || []).filter(id => id !== currentUser.uid) } : prev);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{});
    } catch (e) { Alert.alert('Story like failed', 'Please try again.'); }
  };

  const handleLikePost = async (postId, currentLikes) => {
    if(!currentUser) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{});
    
    const hasLiked = currentLikes.includes(currentUser.uid);
    try {
      await updateDoc(doc(db, 'global_moments', postId), {
        likes: hasLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
      });
    } catch(e) { Alert.alert('Like failed', 'Please try again.'); }
  };

  // ================= UI HELPERS =================
  const visiblePosts = feedPosts.filter(post => {
    if (activeTab === 'Reels') return post.isVideo === true;
    if (activeTab === 'Live') return post.isLive === true;
    if (activeTab === 'Following') return followingIds.includes(post.userId);
    return true;
  });

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
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}><GlassScene>
      
      {/* ================= GLASS HEADER ================= */}
      <View style={[styles.header, { backgroundColor: glassPanelBg, borderBottomColor: glassBorder }]}>
        <Text style={[styles.headerTitle, { color: textMain }]}>Moments</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => Alert.alert('Your Archive', `You have ${feedPosts.filter(post => post.userId === currentUser?.uid).length} published moments and ${stories.filter(story => story.userId === currentUser?.uid).length} stories in your account.`)} accessibilityLabel="View archive summary"><Ionicons name="time-outline" size={26} color={textMain} /></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => { const own = feedPosts.filter(post => post.userId === currentUser?.uid); const likes = own.reduce((sum, post) => sum + (post.likes?.length || 0), 0); const comments = own.reduce((sum, post) => sum + Number(post.commentsCount || 0), 0); Alert.alert('Your Activity', `${likes} likes and ${comments} comments received across your moments.`); }} accessibilityLabel="View activity summary"><Ionicons name="heart-outline" size={26} color={textMain} /></TouchableOpacity>
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
        {visiblePosts.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="water-outline" size={60} color={textSub} style={{ opacity: 0.5 }} />
            <Text style={{ color: textSub, marginTop: 10 }}>No moments yet. Be the first!</Text>
          </View>
        ) : (
          visiblePosts.map((post) => {
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
                  <TouchableOpacity activeOpacity={0.9} onPress={() => post.isVideo ? null : handleLikePost(post.id, post.likes || [])} style={[styles.feedMediaPlaceholder, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)', borderColor: glassBorder }]}>
                    {post.isVideo ? <Video source={{ uri: post.media }} style={{ width: '100%', height: '100%' }} resizeMode="cover" useNativeControls isLooping /> : <Image source={{ uri: post.media }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />}
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
              <TextInput value={storyReply} onChangeText={setStoryReply} placeholder={`Reply to ${viewingStory?.userName || 'story'}...`} placeholderTextColor="rgba(255,255,255,0.7)" style={styles.viewerReplyInput} />
              <TouchableOpacity style={styles.storyReplySend} onPress={handleStoryReply}><Feather name="send" size={18} color="#FFF" /></TouchableOpacity>
              <TouchableOpacity style={{ marginHorizontal: 12 }} onPress={() => handleLikeStory(viewingStory)}><Ionicons name={viewingStory?.likes?.includes(currentUser?.uid) ? "heart" : "heart-outline"} size={34} color="#FF3B30" /></TouchableOpacity>
              <TouchableOpacity onPress={() => handleSharePost(viewingStory)}><Feather name="send" size={28} color="#FFF" /></TouchableOpacity>
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
            {creatorMedia ? (creatorIsVideo ? <Video source={{ uri: creatorMedia }} style={{ width: '100%', height: '100%', borderRadius: 30 }} resizeMode="cover" useNativeControls isLooping /> : <Image source={{ uri: creatorMedia }} style={{ width: '100%', height: '100%', borderRadius: 30 }} />) : null}
            
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
              <TouchableOpacity style={styles.flipBtn} onPress={() => setCameraFacing(value => value === 'back' ? 'front' : 'back')}><Ionicons name="camera-reverse-outline" size={28} color="#FFF" /></TouchableOpacity>
            </View>
          </View>

        </SafeAreaView>
      </Modal>

      <Modal visible={!!commentTarget} transparent animationType="slide" onRequestClose={() => setCommentTarget(null)}>
        <View style={styles.commentBackdrop}>
          <View style={[styles.commentSheet, { backgroundColor: cardBg, borderColor: glassBorder }]}>
            <View style={styles.commentHeader}>
              <Text style={[styles.commentTitle, { color: textMain }]}>Comments</Text>
              <TouchableOpacity onPress={() => setCommentTarget(null)}><Ionicons name="close" size={24} color={textMain} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ paddingBottom: 10 }}>
              {comments.length === 0 ? <Text style={{ color: textSub, textAlign: 'center', padding: 24 }}>No comments yet.</Text> : comments.map(item => <View key={item.id} style={styles.commentRow}><Text style={[styles.commentUser, { color: textMain }]}>{item.userName}</Text><Text style={{ color: textSub, flex: 1 }}>{item.text}</Text></View>)}
            </ScrollView>
            <View style={styles.commentComposer}>
              <TextInput value={commentText} onChangeText={setCommentText} placeholder="Write a comment..." placeholderTextColor={textSub} style={[styles.commentInput, { color: textMain, borderColor: glassBorder }]} multiline />
              <TouchableOpacity onPress={handleCommentSend} style={styles.commentSend}><Feather name="send" size={18} color="#FFF" /></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </GlassScene></SafeAreaView>
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
  viewerReplyInput: { flex: 1, height: 48, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 18, color: '#FFF', backgroundColor: 'rgba(0,0,0,0.2)' },
  storyReplySend: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(8,126,255,0.9)', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },

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
  flipBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  commentBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  commentSheet: { maxHeight: '70%', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: 18 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  commentTitle: { fontSize: 20, fontWeight: '800' },
  commentRow: { paddingVertical: 10, gap: 3 },
  commentUser: { fontWeight: '700' },
  commentComposer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 8 },
  commentInput: { flex: 1, minHeight: 44, maxHeight: 100, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  commentSend: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#087EFF', justifyContent: 'center', alignItems: 'center' }
});
