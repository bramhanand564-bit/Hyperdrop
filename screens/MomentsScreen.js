import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { auth, db } from '../firebaseConfig';
import { useTheme } from '../context/ThemeContext';
import GlassScene from '../components/ui/GlassScene';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';

const SCREEN_WIDTH = Dimensions.get('window').width;
const STORY_SIZE = 74;
const STORY_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const STORY_IMAGE_DURATION_MS = 5000;
const STORY_VIDEO_FALLBACK_DURATION_MS = 10000;

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function fireHaptic(type = 'light') {
  try {
    if (type === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (type === 'selection') {
      Haptics.selectionAsync();
    } else {
      Haptics.impactAsync(
        type === 'medium'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light
      );
    }
  } catch (e) {}
}

function toDate(timestamp) {
  try {
    if (!timestamp) return new Date();
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    return new Date(timestamp);
  } catch (e) {
    return new Date();
  }
}

function formatTime(timestamp) {
  const diff = Math.max(0, Date.now() - toDate(timestamp).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return toDate(timestamp).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function safeAvatar(name = 'U', photoURL) {
  return (
    photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=0C77FF&color=fff&size=160`
  );
}

function clampText(text, max = 320) {
  return String(text || '').trim().slice(0, max);
}

function pickerErrorMessage(error, fallback) {
  const message = String(error?.message || error?.exception || '').trim();
  if (!message) return fallback;
  return message;
}

function getPickerMediaTypes(type) {
  const legacyEnum = ImagePicker.MediaTypeOptions;
  if (legacyEnum) {
    return type === 'Reel' ? legacyEnum.Videos : legacyEnum.All;
  }
  return type === 'Reel' ? ['videos'] : ['images', 'videos'];
}

function getPickerCameraType(facing) {
  const cameraEnum = ImagePicker.CameraType;
  if (cameraEnum) {
    return facing === 'front' ? cameraEnum.front : cameraEnum.back;
  }
  return facing;
}

function storyIsFresh(story) {
  const age = Date.now() - toDate(story?.createdAt).getTime();
  return age < STORY_MAX_AGE_MS;
}

function initials(name = 'U') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

function ActionButton({ icon, activeIcon, label, active, color, onPress, accessibilityLabel }) {
  const scale = useRef(new Animated.Value(1)).current;

  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 70, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, speed: 22, bounciness: 8, useNativeDriver: true }),
    ]).start();
    fireHaptic('light');
    onPress?.();
  };

  return (
    <TouchableOpacity
      onPress={press}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.actionButton}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={active && activeIcon ? activeIcon : icon}
          size={22}
          color={active ? color : '#AFC4D8'}
        />
      </Animated.View>
      {!!label && <Text style={[styles.actionLabel, active && { color }]}>{label}</Text>}
    </TouchableOpacity>
  );
}

function FeedCard({
  item,
  currentUser,
  theme,
  isDark,
  onLike,
  onComment,
  onShare,
  onSave,
  onDelete,
  onOpenMedia,
  isConnected = false,
  onConnect,
}) {
  const entrance = useRef(new Animated.Value(0)).current;
  const isReel = item.contentType === 'reel' || item.type === 'reel';
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const saved = Array.isArray(item.savedBy) && item.savedBy.includes(currentUser?.uid);
  const liked = Array.isArray(item.likes) && item.likes.includes(currentUser?.uid);

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 6,
    }).start();
  }, [entrance]);

  const doubleTap = () => {
    if (!liked) onLike(item);
    heartScale.setValue(0.55);
    heartOpacity.setValue(1);
    Animated.parallel([
      Animated.spring(heartScale, { toValue: 1.25, useNativeDriver: true, speed: 16 }),
      Animated.sequence([
        Animated.delay(250),
        Animated.timing(heartOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]),
    ]).start();
  };

  return (
    <Animated.View
      style={[
        styles.feedCard,
        isReel && styles.reelCard,
        {
          backgroundColor: isDark ? 'rgba(10, 26, 40, 0.74)' : theme.surfaceStrong,
          borderColor: theme.border,
          opacity: entrance,
          transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        },
      ]}
    >
      <View style={styles.feedHeader}>
        <Image source={{ uri: safeAvatar(item.userName, item.userImg) }} style={styles.feedAvatar} />
        <View style={styles.feedIdentity}>
          <View style={styles.nameRow}>
            <Text style={[styles.feedUser, { color: theme.text }]} numberOfLines={1}>
              {item.userName || 'User'}
            </Text>
            {item.userId === currentUser?.uid ? (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>YOU</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.feedMeta, { color: theme.sub }]}>
            {formatTime(item.createdAt)} • {item.audience === 'friends' ? 'Friends' : 'Public'}
          </Text>
        </View>

        <View style={styles.feedHeaderActions}>
          {item.userId !== currentUser?.uid ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={isConnected ? 'In Circle' : 'Connect'}
              hitSlop={8}
              onPress={() => onConnect?.(item)}
              style={[
                styles.connectButton,
                isConnected && styles.connectButtonActive,
                { borderColor: isConnected ? theme.blue : theme.border },
              ]}
            >
              <Ionicons
                name={isConnected ? 'checkmark' : 'person-add-outline'}
                size={14}
                color={isConnected ? theme.blue : theme.text}
              />
              <Text style={[styles.connectButtonText, { color: isConnected ? theme.blue : theme.text }]}>
                {isConnected ? 'In Circle' : 'Connect'}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="More options"
            hitSlop={10}
            onPress={() => {
              fireHaptic('selection');
              onDelete?.(item);
            }}
            style={styles.moreButton}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={theme.sub} />
          </TouchableOpacity>
        </View>
      </View>

      {!!item.text && (
        <Text style={[styles.feedText, { color: theme.text }]}>{item.text}</Text>
      )}

      {!!item.media && (
        <Pressable onPress={doubleTap} onLongPress={onOpenMedia ? () => onOpenMedia(item) : undefined}>
          <View style={styles.mediaWrap}>
            {item.isVideo ? (
              <Pressable style={styles.videoPressArea} onPress={() => openMediaViewer(item)}>
                <Video
                  source={{ uri: item.media }}
                  style={styles.feedMedia}
                  resizeMode={isReel ? ResizeMode.COVER : ResizeMode.CONTAIN}
                  shouldPlay={false}
                  isLooping
                />
                <View style={styles.inlinePlayButton} pointerEvents="none">
                  <Ionicons name="expand" size={25} color="#fff" />
                </View>
              </Pressable>
            ) : (
              <Image source={{ uri: item.media }} style={styles.feedMedia} />
            )}

            <Animated.View
              pointerEvents="none"
              style={[
                styles.doubleHeart,
                {
                  opacity: heartOpacity,
                  transform: [{ scale: heartScale }],
                },
              ]}
            >
              <Ionicons name="heart" size={82} color="#FFFFFF" />
            </Animated.View>

            {item.isVideo ? (
              <View style={styles.mediaExpandHint} pointerEvents="none">
                <Ionicons name="expand-outline" size={15} color="#fff" />
              </View>
            ) : null}

            {item.isVideo ? (
              <View style={styles.mediaTypePill}>
                <Ionicons name={isReel ? 'flash' : 'play'} size={13} color="#fff" />
                <Text style={styles.mediaTypeText}>{isReel ? 'CLIP' : 'VIDEO'}</Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      )}

      <View style={styles.engagementSummary}>
        <View style={styles.engagementLeft}>
          <View style={styles.miniHeart}>
            <Ionicons name="heart" size={11} color="#fff" />
          </View>
          <Text style={[styles.engagementText, { color: theme.sub }]}>
            {item.likes?.length || 0} {item.likes?.length === 1 ? 'like' : 'likes'}
          </Text>
          <Text style={[styles.engagementDot, { color: theme.sub }]}>•</Text>
          <Text style={[styles.engagementText, { color: theme.sub }]}>
            {Number(item.commentsCount || 0)} comments
          </Text>
        </View>
        {saved ? (
          <Text style={[styles.savedHint, { color: theme.blue }]}>Saved</Text>
        ) : null}
      </View>

      <View style={[styles.actionBar, { borderTopColor: theme.border }]}>
        <ActionButton
          icon="heart-outline"
          activeIcon="heart"
          label={item.likes?.length ? String(item.likes.length) : ''}
          active={liked}
          color="#FF4F78"
          onPress={() => onLike(item)}
          accessibilityLabel={liked ? 'Unlike moment' : 'Like moment'}
        />
        <ActionButton
          icon="chatbubble-ellipses-outline"
          label={item.commentsCount ? String(item.commentsCount) : ''}
          onPress={() => onComment(item)}
          accessibilityLabel="Open comments"
        />
        <ActionButton
          icon="arrow-redo-outline"
          onPress={() => onShare(item)}
          accessibilityLabel="Share moment"
        />
        <ActionButton
          icon="bookmark-outline"
          activeIcon="bookmark"
          active={saved}
          color={theme.blue}
          onPress={() => onSave(item)}
          accessibilityLabel={saved ? 'Remove bookmark' : 'Save moment'}
        />
      </View>
    </Animated.View>
  );
}

function StoryBubble({ story, onPress, theme, isOwn }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isOwn) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.03, duration: 1100, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isOwn, pulse]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.86}
      accessibilityRole="button"
      accessibilityLabel={`${story.userName || 'User'} story`}
      style={styles.storyItem}
    >
      <Animated.View
        style={[
          styles.storyRingOuter,
          {
            borderColor: isOwn ? theme.border : '#5C8CFF',
            transform: [{ scale: pulse }],
          },
        ]}
      >
        <Image source={{ uri: safeAvatar(story.userName, story.userImg) }} style={styles.storyImage} />
        {isOwn ? (
          <View style={styles.storyAdd}>
            <Ionicons name="add" size={16} color="#fff" />
          </View>
        ) : null}
      </Animated.View>
      <Text style={[styles.storyLabel, { color: theme.text }]} numberOfLines={1}>
        {isOwn ? 'Create' : story.userName || 'Story'}
      </Text>
    </TouchableOpacity>
  );
}

export default function MomentsScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const currentUser = auth.currentUser;

  const [feedPosts, setFeedPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [followingIds, setFollowingIds] = useState([]);
  const [activeTab, setActiveTab] = useState('For You');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [listenerKey, setListenerKey] = useState(0);

  const [creatorOpen, setCreatorOpen] = useState(false);
  const [publishType, setPublishType] = useState('Post');
  const [creatorText, setCreatorText] = useState('');
  const [creatorMedia, setCreatorMedia] = useState(null);
  const [creatorIsVideo, setCreatorIsVideo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cameraFacing, setCameraFacing] = useState('back');

  const [commentTarget, setCommentTarget] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const [viewingStoryIndex, setViewingStoryIndex] = useState(null);
  const [storyReply, setStoryReply] = useState('');
  const [storyDurationMs, setStoryDurationMs] = useState(STORY_VIDEO_FALLBACK_DURATION_MS);
  const storyVideoRef = useRef(null);

  const [mediaTarget, setMediaTarget] = useState(null);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  const [infoModal, setInfoModal] = useState(null);

  const tabIndicator = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(0.85)).current;
  const creatorTranslate = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const storyProgressAnim = useRef(new Animated.Value(0)).current;

  const tabs = ['For You', 'Circle', 'Live', 'Clips'];

  // Android may destroy MainActivity while the system picker is open.
  // Expo exposes getPendingResultAsync so the selected media can be recovered.
  useEffect(() => {
    let mounted = true;
    ImagePicker.getPendingResultAsync?.()
      .then(result => {
        if (!mounted || !result || result.canceled || !result.assets?.[0]) return;
        uploadAsset(result.assets[0]);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    Animated.spring(fabScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 9,
    }).start();
  }, [fabScale]);

  useEffect(() => {
    const index = tabs.indexOf(activeTab);
    Animated.spring(tabIndicator, {
      toValue: index,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  }, [activeTab, tabIndicator]);

  useEffect(() => {
    if (!creatorOpen) return;
    creatorTranslate.setValue(SCREEN_WIDTH);
    Animated.spring(creatorTranslate, {
      toValue: 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  }, [creatorOpen, creatorTranslate]);

  const closeCreator = useCallback(() => {
    Animated.timing(creatorTranslate, {
      toValue: SCREEN_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setCreatorOpen(false);
    });
  }, [creatorTranslate]);

  useEffect(() => {
    let unsubFeed = () => {};
    let unsubStories = () => {};

    setLoading(true);
    setLoadError('');

    try {
      const feedQuery = query(collection(db, 'global_moments'), orderBy('createdAt', 'desc'));
      unsubFeed = onSnapshot(
        feedQuery,
        snapshot => {
          const next = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setFeedPosts(next);
          setLoading(false);
          setLoadError('');
        },
        error => {
          console.warn('Moments feed listener:', error);
          setLoading(false);
          setLoadError('Feed could not be loaded. Check your connection and try again.');
        }
      );

      const storyQuery = query(collection(db, 'global_stories'), orderBy('createdAt', 'desc'));
      unsubStories = onSnapshot(
        storyQuery,
        snapshot => {
          const fresh = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(storyIsFresh);

          const seen = new Set();
          const unique = [];
          for (const story of fresh) {
            const key = story.userId || story.id;
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push(story);
          }
          setStories(unique);
        },
        error => {
          console.warn('Moments story listener:', error);
        }
      );
    } catch (error) {
      setLoading(false);
      setLoadError('Unable to connect to Moments.');
    }

    const uid = currentUser?.uid;
    if (uid) {
      getDoc(doc(db, 'users', uid))
        .then(snapshot => {
          if (!snapshot.exists()) return;
          const data = snapshot.data() || {};
          const ids = Array.isArray(data.followingIds)
            ? data.followingIds
            : Array.isArray(data.following)
              ? data.following
              : [];
          setFollowingIds(ids.filter(Boolean));
        })
        .catch(() => setFollowingIds([]));
    }

    return () => {
      unsubFeed();
      unsubStories();
    };
  }, [currentUser?.uid, listenerKey]);

  useEffect(() => {
    if (!commentTarget?.id) return;
    setCommentLoading(true);
    const commentQuery = query(
      collection(db, 'global_moments', commentTarget.id, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(
      commentQuery,
      snapshot => {
        setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setCommentLoading(false);
      },
      () => {
        setComments([]);
        setCommentLoading(false);
      }
    );
    return unsubscribe;
  }, [commentTarget?.id]);

  const freshStories = useMemo(() => {
    const mine = {
      id: '__create__',
      userId: currentUser?.uid,
      userName: 'Create',
      userImg: currentUser?.photoURL,
      own: true,
    };
    return [mine, ...stories];
  }, [stories, currentUser?.uid, currentUser?.photoURL]);

  const filteredPosts = useMemo(() => {
    let next = [...feedPosts];

    if (activeTab === 'Circle') {
      next = next.filter(item => followingIds.includes(item.userId));
    } else if (activeTab === 'Clips') {
      next = next.filter(item => item.isVideo === true && (item.contentType === 'reel' || item.type === 'reel' || !item.contentType));
    } else if (activeTab === 'Live') {
      next = next.filter(item => item.isLive === true);
    }

    const q = searchText.trim().toLowerCase();
    if (q) {
      next = next.filter(item =>
        [item.userName, item.text].some(value => String(value || '').toLowerCase().includes(q))
      );
    }

    return next;
  }, [activeTab, feedPosts, followingIds, searchText]);

  const mediaItems = useMemo(() => filteredPosts.filter(item => !!item.media), [filteredPosts]);

  const openMediaViewer = useCallback(item => {
    const index = mediaItems.findIndex(media => media.id === item?.id);
    setMediaViewerIndex(index >= 0 ? index : 0);
    setMediaTarget(item || null);
    fireHaptic('selection');
  }, [mediaItems]);

  const openCreator = useCallback(type => {
    setPublishType(type);
    setCreatorText('');
    setCreatorMedia(null);
    setCreatorIsVideo(false);
    setUploadProgress(0);
    setSearchOpen(false);
    setCreatorOpen(true);
    fireHaptic('medium');
  }, []);

  const uploadAsset = useCallback(async asset => {
    if (!asset?.uri) return;
    const mimeType =
      asset.mimeType ||
      (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');

    setUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadToCloudinary({
        fileUri: asset.uri,
        fileName: asset.fileName || (asset.type === 'video' ? 'moment.mp4' : 'moment.jpg'),
        mimeType,
        onProgress: progress => setUploadProgress(progress),
      });

      setCreatorMedia(result.secureUrl);
      setCreatorIsVideo(asset.type === 'video' || mimeType.startsWith('video/'));
      setUploadProgress(100);
      fireHaptic('success');
    } catch (error) {
      Alert.alert('Upload failed', error?.message || 'Could not upload this file.');
    } finally {
      setUploading(false);
    }
  }, []);

  const pickGallery = useCallback(async () => {
    try {
      // Android's system media picker does not require a runtime media-library
      // permission in the normal picker flow. Requesting it first can block the
      // picker on devices using the modern Photo Picker.
      if (Platform.OS !== 'android') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          if (permission.canAskAgain === false) {
            Alert.alert(
              'Photos access is blocked',
              'Enable Photos/Media access from Android/iOS app settings, then try again.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open settings', onPress: () => Linking.openSettings().catch(() => {}) },
              ]
            );
          } else {
            Alert.alert('Photos permission', 'Allow photo access to select media for Moments.');
          }
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: getPickerMediaTypes(publishType),
        quality: 0.82,
        allowsEditing: false,
        videoMaxDuration: publishType === 'Reel' ? 60 : 120,
        allowsMultipleSelection: false,
        legacy: Platform.OS === 'android',
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert('No media selected', 'Please choose a photo or video and try again.');
        return;
      }
      await uploadAsset(asset);
    } catch (error) {
      console.warn('Moments gallery picker error:', error);
      Alert.alert(
        'Gallery error',
        pickerErrorMessage(error, 'Could not open your media library.'),
        [{ text: 'OK' }]
      );
    }
  }, [publishType, uploadAsset]);

  const captureCamera = useCallback(async () => {
    try {
      const permission = await ImagePicker.getCameraPermissionsAsync();
      let finalPermission = permission;

      if (!permission.granted && permission.canAskAgain !== false) {
        finalPermission = await ImagePicker.requestCameraPermissionsAsync();
      }

      if (!finalPermission.granted) {
        if (finalPermission.canAskAgain === false) {
          Alert.alert(
            'Camera access is blocked',
            'Enable Camera permission in app settings, then try again.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open settings', onPress: () => Linking.openSettings().catch(() => {}) },
            ]
          );
        } else {
          Alert.alert('Camera permission', 'Allow camera access to create a Moment.');
        }
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: getPickerMediaTypes(publishType),
        cameraType: getPickerCameraType(cameraFacing),
        quality: 0.82,
        videoMaxDuration: publishType === 'Reel' ? 60 : 120,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert('No media captured', 'Try taking a photo or recording a video again.');
        return;
      }
      await uploadAsset(asset);
    } catch (error) {
      console.warn('Moments camera picker error:', error);
      Alert.alert(
        'Camera error',
        pickerErrorMessage(error, 'Could not start the camera on this device.'),
        [{ text: 'OK' }]
      );
    }
  }, [cameraFacing, publishType, uploadAsset]);

  const publish = useCallback(async () => {
    if (uploading) return;

    const text = clampText(creatorText);
    if (!text && !creatorMedia) {
      Alert.alert('Nothing to publish', 'Add a message, photo, or video first.');
      return;
    }

    if (publishType === 'Reel' && !creatorIsVideo) {
      Alert.alert('Clip needs a video', 'Choose or record a video for a Clip.');
      return;
    }

    if (!currentUser?.uid) {
      Alert.alert('Sign in required', 'Please sign in before publishing.');
      return;
    }

    try {
      setUploading(true);
      const targetCollection = publishType === 'Story' ? 'global_stories' : 'global_moments';

      await addDoc(collection(db, targetCollection), {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'User',
        userImg: safeAvatar(currentUser.displayName || 'User', currentUser.photoURL),
        text,
        media: creatorMedia || null,
        isVideo: creatorIsVideo,
        contentType: publishType.toLowerCase(),
        isLive: false,
        audience: 'public',
        likes: [],
        savedBy: [],
        commentsCount: 0,
        createdAt: serverTimestamp(),
      });

      fireHaptic('success');
      closeCreator();
      await wait(150);
      setCreatorText('');
      setCreatorMedia(null);
      setCreatorIsVideo(false);
      setUploadProgress(0);
    } catch (error) {
      Alert.alert('Publish failed', error?.message || 'Could not publish this Moment.');
    } finally {
      setUploading(false);
    }
  }, [
    closeCreator,
    creatorIsVideo,
    creatorMedia,
    creatorText,
    currentUser?.displayName,
    currentUser?.photoURL,
    currentUser?.uid,
    publishType,
    uploading,
  ]);

  const likePost = useCallback(async post => {
    if (!currentUser?.uid || !post?.id) return;
    const likes = Array.isArray(post.likes) ? post.likes : [];
    const hasLiked = likes.includes(currentUser.uid);

    setFeedPosts(items =>
      items.map(item =>
        item.id === post.id
          ? {
              ...item,
              likes: hasLiked
                ? likes.filter(id => id !== currentUser.uid)
                : [...likes, currentUser.uid],
            }
          : item
      )
    );

    try {
      await updateDoc(doc(db, 'global_moments', post.id), {
        likes: hasLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
      });
    } catch (error) {
      setFeedPosts(items =>
        items.map(item =>
          item.id === post.id ? { ...item, likes } : item
        )
      );
      Alert.alert('Like failed', 'Your change could not be saved.');
    }
  }, [currentUser?.uid]);

  const toggleConnection = useCallback(async post => {
    const targetId = post?.userId;
    const uid = currentUser?.uid;
    if (!uid || !targetId || uid === targetId) return;

    const connected = followingIds.includes(targetId);
    const previous = followingIds;
    const next = connected
      ? followingIds.filter(id => id !== targetId)
      : [...followingIds, targetId];

    setFollowingIds(next);
    fireHaptic(connected ? 'light' : 'success');

    try {
      await updateDoc(doc(db, 'users', uid), {
        followingIds: connected ? arrayRemove(targetId) : arrayUnion(targetId),
      });
    } catch (error) {
      setFollowingIds(previous);
      Alert.alert('Connection failed', 'Could not update your Circle right now.');
    }
  }, [currentUser?.uid, followingIds]);

  const toggleSave = useCallback(async post => {
    if (!currentUser?.uid || !post?.id) return;
    const savedBy = Array.isArray(post.savedBy) ? post.savedBy : [];
    const saved = savedBy.includes(currentUser.uid);

    setFeedPosts(items =>
      items.map(item =>
        item.id === post.id
          ? {
              ...item,
              savedBy: saved
                ? savedBy.filter(id => id !== currentUser.uid)
                : [...savedBy, currentUser.uid],
            }
          : item
      )
    );

    try {
      await updateDoc(doc(db, 'global_moments', post.id), {
        savedBy: saved ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
      });
      fireHaptic('selection');
    } catch (error) {
      setFeedPosts(items =>
        items.map(item => (item.id === post.id ? { ...item, savedBy } : item))
      );
      Alert.alert('Save failed', 'Could not update your saved Moments.');
    }
  }, [currentUser?.uid]);

  const deletePost = useCallback(async post => {
    if (!post || post.userId !== currentUser?.uid) return;

    Alert.alert(
      'Delete this Moment?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'global_moments', post.id));
              fireHaptic('success');
            } catch (error) {
              Alert.alert('Delete failed', 'Could not remove this Moment.');
            }
          },
        },
      ]
    );
  }, [currentUser?.uid]);

  const sharePost = useCallback(async post => {
    try {
      await Share.share({
        message: `${post.userName || 'Someone'} shared a Moment${post.text ? `: ${post.text}` : ''}${post.media ? `\\n${post.media}` : ''}`,
      });
    } catch (error) {}
  }, []);

  const postOptions = useCallback(post => {
    const isOwner = post.userId === currentUser?.uid;
    Alert.alert(
      post.userName || 'Moment',
      'Choose an action',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: () => sharePost(post) },
        {
          text: post.savedBy?.includes(currentUser?.uid) ? 'Remove from Saved' : 'Save Moment',
          onPress: () => toggleSave(post),
        },
        ...(isOwner
          ? [{ text: 'Delete', style: 'destructive', onPress: () => deletePost(post) }]
          : []),
      ]
    );
  }, [currentUser?.uid, deletePost, sharePost, toggleSave]);

  const openComments = useCallback(post => {
    setCommentTarget(post);
    setCommentText('');
    fireHaptic('selection');
  }, []);

  const sendComment = useCallback(async () => {
    const text = clampText(commentText, 500);
    if (!text || !currentUser?.uid || !commentTarget?.id) return;

    try {
      await addDoc(
        collection(db, 'global_moments', commentTarget.id, 'comments'),
        {
          userId: currentUser.uid,
          userName: currentUser.displayName || 'User',
          text,
          createdAt: serverTimestamp(),
        }
      );
      await updateDoc(doc(db, 'global_moments', commentTarget.id), {
        commentsCount: increment(1),
      });
      setCommentText('');
      fireHaptic('success');
    } catch (error) {
      Alert.alert('Comment failed', 'Please try again.');
    }
  }, [commentText, commentTarget?.id, currentUser?.displayName, currentUser?.uid]);

  const openStory = useCallback(index => {
    if (index <= 0) {
      openCreator('Story');
      return;
    }
    setViewingStoryIndex(index - 1);
    setStoryReply('');
    fireHaptic('medium');
  }, [openCreator]);

  const visibleStory = viewingStoryIndex === null ? null : stories[viewingStoryIndex];

  useEffect(() => {
    if (!visibleStory) {
      storyProgressAnim.stopAnimation();
      storyProgressAnim.setValue(0);
      setStoryDurationMs(STORY_VIDEO_FALLBACK_DURATION_MS);
      storyVideoRef.current?.pauseAsync?.().catch(() => {});
      return;
    }

    const duration = visibleStory.isVideo
      ? Math.max(1000, storyDurationMs || STORY_VIDEO_FALLBACK_DURATION_MS)
      : STORY_IMAGE_DURATION_MS;

    storyProgressAnim.stopAnimation();
    storyProgressAnim.setValue(0);

    const anim = Animated.timing(storyProgressAnim, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    });

    anim.start(({ finished }) => {
      if (!finished) return;
      setViewingStoryIndex(index => {
        if (index === null) return null;
        if (index >= stories.length - 1) return null;
        return index + 1;
      });
    });

    return () => storyProgressAnim.stopAnimation();
  }, [stories.length, visibleStory?.id, visibleStory?.isVideo, storyDurationMs, storyProgressAnim]);

  const closeStory = useCallback(() => {
    storyProgressAnim.stopAnimation();
    storyVideoRef.current?.pauseAsync?.().catch(() => {});
    setViewingStoryIndex(null);
    setStoryReply('');
  }, [storyProgressAnim]);

  const nextStory = useCallback(() => {
    setViewingStoryIndex(index => {
      if (index === null) return null;
      return index >= stories.length - 1 ? null : index + 1;
    });
  }, [stories.length]);

  const previousStory = useCallback(() => {
    setViewingStoryIndex(index => {
      if (index === null) return null;
      return Math.max(0, index - 1);
    });
  }, []);

  const likeStory = useCallback(async () => {
    if (!visibleStory?.id || !currentUser?.uid) return;
    const likes = Array.isArray(visibleStory.likes) ? visibleStory.likes : [];
    const liked = likes.includes(currentUser.uid);

    setStories(items =>
      items.map(item =>
        item.id === visibleStory.id
          ? {
              ...item,
              likes: liked
                ? likes.filter(id => id !== currentUser.uid)
                : [...likes, currentUser.uid],
            }
          : item
      )
    );

    try {
      await updateDoc(doc(db, 'global_stories', visibleStory.id), {
        likes: liked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
      });
    } catch (error) {
      Alert.alert('Story like failed', 'Please try again.');
    }
  }, [currentUser?.uid, visibleStory]);

  const replyToStory = useCallback(async () => {
    const text = clampText(storyReply, 500);
    if (!text || !visibleStory?.id || !currentUser?.uid) return;

    try {
      await addDoc(
        collection(db, 'global_stories', visibleStory.id, 'replies'),
        {
          userId: currentUser.uid,
          userName: currentUser.displayName || 'User',
          text,
          createdAt: serverTimestamp(),
        }
      );
      setStoryReply('');
      fireHaptic('success');
    } catch (error) {
      Alert.alert('Reply failed', 'Please try again.');
    }
  }, [currentUser?.displayName, currentUser?.uid, storyReply, visibleStory?.id]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setLoadError('');
    setListenerKey(value => value + 1);
    await wait(650);
    setRefreshing(false);
  }, []);

  const openInfo = useCallback(type => {
    const ownPosts = feedPosts.filter(item => item.userId === currentUser?.uid);
    const ownStories = stories.filter(item => item.userId === currentUser?.uid);
    if (type === 'archive') {
      setInfoModal({
        title: 'Your Archive',
        body: `${ownPosts.length} published Moment${ownPosts.length === 1 ? '' : 's'}\\n${ownStories.length} active stor${ownStories.length === 1 ? 'y' : 'ies'}`,
      });
    } else {
      const receivedLikes = ownPosts.reduce((sum, item) => sum + (item.likes?.length || 0), 0);
      const receivedComments = ownPosts.reduce((sum, item) => sum + Number(item.commentsCount || 0), 0);
      setInfoModal({
        title: 'Your Activity',
        body: `${receivedLikes} likes received\\n${receivedComments} comments received\\n${ownPosts.length} Moments published`,
      });
    }
  }, [currentUser?.uid, feedPosts, stories]);

  const renderEmpty = () => {
    let title = 'Your space is quiet';
    let body = 'Share something to start the conversation.';
    let icon = 'sparkles-outline';

    if (activeTab === 'Circle') {
      title = followingIds.length ? 'Nothing from your circle yet' : 'Build your circle to fill this feed';
      body = followingIds.length
        ? 'New moments from your circle will appear here.'
        : 'Connect with people, then come back here.';
      icon = 'people-outline';
    } else if (activeTab === 'Live') {
      title = 'No live Moments';
      body = 'Live moments will appear here when someone starts one.';
      icon = 'radio-outline';
    } else if (activeTab === 'Clips') {
      title = 'No clips yet';
      body = 'Short videos from Moments will show up here.';
      icon = 'play-circle-outline';
    }

    if (searchText.trim()) {
      title = 'No results found';
      body = `Nothing matches “${searchText.trim()}”.`;
      icon = 'search-outline';
    }

    return (
      <View style={styles.emptyState}>
        <View style={[styles.emptyIcon, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Ionicons name={icon} size={34} color={theme.blue} />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.emptyBody, { color: theme.sub }]}>{body}</Text>
        <TouchableOpacity
          style={[styles.emptyCta, { backgroundColor: theme.blue }]}
          onPress={() => openCreator(activeTab === 'Clips' ? 'Reel' : 'Post')}
          accessibilityRole="button"
          accessibilityLabel="Create a new Moment"
        >
          <Ionicons name="add" size={17} color="#fff" />
          <Text style={styles.emptyCtaText}>{activeTab === 'Clips' ? 'Create a Clip' : 'Create a Moment'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeader = () => (
    <>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerTitleBlock}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Moments</Text>
          <Text style={[styles.headerSubtitle, { color: theme.sub }]}>
            Share • Explore • Connect
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => {
              setSearchOpen(value => !value);
              fireHaptic('selection');
            }}
            accessibilityRole="button"
            accessibilityLabel="Search moments"
          >
            <Ionicons name={searchOpen ? 'close' : 'search-outline'} size={24} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => openInfo('archive')}
            accessibilityRole="button"
            accessibilityLabel="Open archive"
          >
            <Ionicons name="time-outline" size={25} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => openInfo('activity')}
            accessibilityRole="button"
            accessibilityLabel="Open activity"
          >
            <Ionicons name="heart-outline" size={25} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {searchOpen ? (
        <Animated.View style={[styles.searchWrap, { borderBottomColor: theme.border }]}>
          <Ionicons name="search-outline" size={19} color={theme.sub} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            autoFocus
            placeholder="Search people or moments"
            placeholderTextColor={theme.sub}
            style={[styles.searchInput, { color: theme.text }]}
            returnKeyType="search"
          />
          {!!searchText && (
            <TouchableOpacity
              onPress={() => setSearchText('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={19} color={theme.sub} />
            </TouchableOpacity>
          )}
        </Animated.View>
      ) : null}

      <View style={styles.storiesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesContent}
        >
          {freshStories.map((story, index) => (
            <StoryBubble
              key={story.id}
              story={story}
              isOwn={index === 0}
              theme={theme}
              onPress={() => openStory(index)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={[styles.tabShell, { backgroundColor: isDark ? 'rgba(6, 23, 37, 0.86)' : theme.surface, borderColor: theme.border }]}>
        <View style={styles.tabRow}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.tabIndicator,
              {
                backgroundColor: theme.blue,
                transform: [{
                  translateX: tabIndicator.interpolate({
                    inputRange: [0, 1, 2, 3],
                    outputRange: [0, SCREEN_WIDTH * 0.225, SCREEN_WIDTH * 0.45, SCREEN_WIDTH * 0.675],
                  }),
                }],
              },
            ]}
          />
          {tabs.map(tab => {
            const active = tab === activeTab;
            const icon =
              tab === 'For You' ? 'sparkles-outline' :
              tab === 'Following' ? 'people-outline' :
              tab === 'Live' ? 'radio-outline' :
              'play-circle-outline';

            return (
              <TouchableOpacity
                key={tab}
                style={styles.tabButton}
                onPress={() => {
                  setActiveTab(tab);
                  fireHaptic('selection');
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab}
              >
                <Ionicons name={icon} size={18} color={active ? theme.blue : theme.sub} />
                <Text style={[styles.tabLabel, { color: active ? theme.text : theme.sub }]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <GlassScene showBubbles>
        <FlatList
          data={filteredPosts}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <FeedCard
              item={item}
              currentUser={currentUser}
              theme={theme}
              isDark={isDark}
              onLike={likePost}
              onComment={openComments}
              onShare={sharePost}
              onSave={toggleSave}
              onDelete={postOptions}
              onOpenMedia={openMediaViewer}
              isConnected={followingIds.includes(item.userId)}
              onConnect={toggleConnection}
            />
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={!loading ? renderEmpty : null}
          contentContainerStyle={[
            styles.listContent,
            filteredPosts.length === 0 && styles.listEmptyContainer,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={theme.blue}
              colors={[theme.blue]}
              progressBackgroundColor={theme.surface}
            />
          }
        />

        {loading && feedPosts.length === 0 ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <View style={[styles.loadingCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <ActivityIndicator size="small" color={theme.blue} />
              <Text style={[styles.loadingText, { color: theme.sub }]}>Loading Moments…</Text>
            </View>
          </View>
        ) : null}

        {!!loadError ? (
          <TouchableOpacity
            style={[styles.errorBanner, { backgroundColor: theme.surfaceStrong, borderColor: theme.border }]}
            onPress={refresh}
            accessibilityRole="button"
            accessibilityLabel="Retry loading Moments"
          >
            <Ionicons name="cloud-offline-outline" size={20} color="#FFB020" />
            <Text style={[styles.errorText, { color: theme.text }]}>{loadError}</Text>
            <Ionicons name="refresh" size={18} color={theme.blue} />
          </TouchableOpacity>
        ) : null}

        <Animated.View style={[styles.fabWrap, { transform: [{ scale: fabScale }] }]}>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => openCreator('Post')}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Create a new Moment"
          >
            <Ionicons name="add" size={31} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

        <Modal visible={creatorOpen} animationType="none" transparent onRequestClose={closeCreator}>
          <Animated.View
            style={[
              styles.creatorOverlay,
              {
                backgroundColor: isDark ? '#07131E' : theme.bg,
                transform: [{ translateX: creatorTranslate }],
              },
            ]}
          >
            <SafeAreaView style={styles.creatorSafe}>
              <View style={styles.creatorHeader}>
                <TouchableOpacity
                  onPress={closeCreator}
                  style={styles.creatorClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close creator"
                >
                  <Ionicons name="close" size={26} color="#fff" />
                </TouchableOpacity>

                <View style={styles.creatorTitleWrap}>
                  <Text style={styles.creatorTitle}>Create</Text>
                  <Text style={styles.creatorModeText}>{publishType === 'Reel' ? 'Clip' : publishType}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.publishButton, uploading && { opacity: 0.5 }]}
                  onPress={publish}
                  disabled={uploading}
                  accessibilityRole="button"
                  accessibilityLabel="Publish Moment"
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.publishButtonText}>Publish</Text>
                      <Ionicons name="arrow-up" size={16} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.typeSelector}>
                {['Post', 'Story', 'Reel'].map(type => {
                  const active = publishType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => {
                        setPublishType(type);
                        if (type !== 'Reel' && creatorIsVideo) {
                          setCreatorIsVideo(false);
                        }
                        fireHaptic('selection');
                      }}
                      style={[styles.typeChip, active && styles.typeChipActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Ionicons
                        name={
                          type === 'Post' ? 'document-text-outline' :
                          type === 'Story' ? 'play-circle-outline' :
                          'videocam-outline'
                        }
                        size={17}
                        color={active ? '#fff' : '#AFC4D8'}
                      />
                      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                        {type === 'Reel' ? 'Clip' : type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <KeyboardAvoidingView
                style={styles.creatorBody}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              >
                <View style={styles.creatorCanvas}>
                  {creatorMedia ? (
                    creatorIsVideo ? (
                      <Video
                        source={{ uri: creatorMedia }}
                        style={styles.creatorMedia}
                        resizeMode={ResizeMode.CONTAIN}
                        useNativeControls
                      />
                    ) : (
                      <Image source={{ uri: creatorMedia }} style={styles.creatorMedia} resizeMode="contain" />
                    )
                  ) : (
                    <View style={styles.creatorPlaceholder}>
                      <View style={styles.creatorPlaceholderIcon}>
                        <Ionicons name="sparkles-outline" size={34} color="#65B2FF" />
                      </View>
                      <Text style={styles.creatorPlaceholderTitle}>Make it yours</Text>
                      <Text style={styles.creatorPlaceholderBody}>
                        Write a thought, add a photo, or record something.
                      </Text>
                    </View>
                  )}

                  <TextInput
                    value={creatorText}
                    onChangeText={setCreatorText}
                    placeholder={
                      publishType === 'Story'
                        ? 'Add a story caption…'
                        : publishType === 'Reel'
                          ? 'Tell people what this clip is about…'
                          : 'What’s happening?'
                    }
                    placeholderTextColor="rgba(255,255,255,0.52)"
                    multiline
                    maxLength={320}
                    style={styles.creatorTextInput}
                    textAlignVertical="top"
                  />

                  {uploading && uploadProgress > 0 ? (
                    <View style={styles.uploadProgressWrap}>
                      <View style={styles.uploadProgressTrack}>
                        <View style={[styles.uploadProgressFill, { width: `${uploadProgress}%` }]} />
                      </View>
                      <Text style={styles.uploadProgressText}>{uploadProgress}% uploading</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.creatorTools}>
                  <TouchableOpacity onPress={pickGallery} style={styles.creatorTool}>
                    <Ionicons name="images-outline" size={23} color="#fff" />
                    <Text style={styles.creatorToolText}>Gallery</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={captureCamera} style={styles.captureButton}>
                    <View style={styles.captureInner} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setCameraFacing(value => (value === 'back' ? 'front' : 'back'))}
                    style={styles.creatorTool}
                    accessibilityRole="button"
                    accessibilityLabel="Switch camera"
                  >
                    <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
                    <Text style={styles.creatorToolText}>Flip</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.creatorHint}>
                  {publishType === 'Reel'
                    ? 'Clips support video up to 60 seconds.'
                    : 'Your Moment will appear instantly in the live feed.'}
                </Text>
              </KeyboardAvoidingView>
            </SafeAreaView>
          </Animated.View>
        </Modal>

        <Modal
          visible={!!commentTarget}
          animationType="slide"
          transparent
          onRequestClose={() => setCommentTarget(null)}
        >
          <View style={styles.sheetBackdrop}>
            <View style={[styles.commentSheet, { backgroundColor: theme.surfaceStrong, borderColor: theme.border }]}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={[styles.sheetTitle, { color: theme.text }]}>Comments</Text>
                  <Text style={[styles.sheetSubtitle, { color: theme.sub }]}>
                    {commentTarget?.commentsCount || 0} conversations
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setCommentTarget(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Close comments"
                >
                  <Ionicons name="close-circle" size={27} color={theme.sub} />
                </TouchableOpacity>
              </View>

              {commentLoading ? (
                <View style={styles.centerLoader}>
                  <ActivityIndicator color={theme.blue} />
                </View>
              ) : (
                <ScrollView
                  style={{ maxHeight: 360 }}
                  contentContainerStyle={comments.length ? { paddingBottom: 14 } : styles.commentEmptyWrap}
                  showsVerticalScrollIndicator={false}
                >
                  {comments.length ? (
                    comments.map(comment => (
                      <View key={comment.id} style={styles.commentRow}>
                        <View style={[styles.commentAvatar, { backgroundColor: theme.blue }]}>
                          <Text style={styles.commentAvatarText}>{initials(comment.userName)}</Text>
                        </View>
                        <View style={styles.commentBubble}>
                          <Text style={[styles.commentUser, { color: theme.text }]}>{comment.userName}</Text>
                          <Text style={[styles.commentBody, { color: theme.sub }]}>{comment.text}</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.commentEmpty}>
                      <Ionicons name="chatbubble-ellipses-outline" size={30} color={theme.sub} />
                      <Text style={[styles.commentEmptyTitle, { color: theme.text }]}>Be the first to reply</Text>
                      <Text style={[styles.commentEmptyText, { color: theme.sub }]}>Start a conversation.</Text>
                    </View>
                  )}
                </ScrollView>
              )}

              <View style={[styles.commentComposer, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Write a comment…"
                  placeholderTextColor={theme.sub}
                  style={[styles.commentInput, { color: theme.text }]}
                  maxLength={500}
                  multiline
                />
                <TouchableOpacity
                  onPress={sendComment}
                  style={[styles.commentSend, { backgroundColor: theme.blue }]}
                  accessibilityRole="button"
                  accessibilityLabel="Send comment"
                >
                  <Ionicons name="arrow-up" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={viewingStoryIndex !== null}
          animationType="fade"
          onRequestClose={closeStory}
          statusBarTranslucent
        >
          <View style={styles.storyViewer}>
            {visibleStory?.media ? (
              visibleStory.isVideo ? (
                <Video
                  key={visibleStory.id}
                  ref={storyVideoRef}
                  source={{ uri: visibleStory.media }}
                  style={styles.storyMedia}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay
                  isLooping={false}
                  onPlaybackStatusUpdate={status => {
                    if (!status?.isLoaded) return;
                    if (status.durationMillis && Math.abs(status.durationMillis - storyDurationMs) > 250) {
                      setStoryDurationMs(status.durationMillis);
                    }
                  }}
                />
              ) : (
                <Image source={{ uri: visibleStory.media }} style={styles.storyMedia} />
              )
            ) : (
              <View style={styles.storyTextOnly}>
                <Ionicons name="sparkles" size={36} color="#65B2FF" />
                <Text style={styles.storyTextOnlyBody}>{visibleStory?.text || 'A moment worth sharing.'}</Text>
              </View>
            )}

            <View style={styles.storyShade} />

            <SafeAreaView style={styles.storyChrome}>
              <View style={styles.storyProgressTrack}>
                <Animated.View
                  style={[
                    styles.storyProgressFill,
                    {
                      width: storyProgressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>

              <View style={styles.storyTopRow}>
                <View style={styles.storyUserWrap}>
                  <Image source={{ uri: safeAvatar(visibleStory?.userName, visibleStory?.userImg) }} style={styles.storyViewerAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.storyViewerName}>{visibleStory?.userName || 'User'}</Text>
                    <Text style={styles.storyViewerTime}>{formatTime(visibleStory?.createdAt)}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={closeStory}
                  accessibilityRole="button"
                  accessibilityLabel="Close story"
                >
                  <Ionicons name="close" size={29} color="#fff" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>

            <View style={styles.storyTapLayer} pointerEvents="box-none">
              <Pressable style={styles.storyTapSide} onPress={previousStory} />
              <Pressable style={[styles.storyTapSide, { right: 0, left: undefined }]} onPress={nextStory} />
              {!!visibleStory?.text && visibleStory.media ? (
                <View pointerEvents="none" style={styles.storyCaption}>
                  <Text style={styles.storyCaptionText}>{visibleStory.text}</Text>
                </View>
              ) : null}
            </View>

            <SafeAreaView style={styles.storyBottom}>
              <View style={styles.storyReplyBox}>
                <TextInput
                  value={storyReply}
                  onChangeText={setStoryReply}
                  placeholder="Reply to story…"
                  placeholderTextColor="rgba(255,255,255,0.68)"
                  style={styles.storyReplyInput}
                  onFocus={() => {
                    storyProgressAnim.stopAnimation();
                    storyVideoRef.current?.pauseAsync?.().catch(() => {});
                  }}
                  onBlur={() => {
                    if (viewingStoryIndex !== null) {
                      storyVideoRef.current?.playAsync?.().catch(() => {});
                      storyProgressAnim.setValue(0);
                      Animated.timing(storyProgressAnim, {
                        toValue: 1,
                        duration: visibleStory?.isVideo
                          ? Math.max(1000, storyDurationMs || STORY_VIDEO_FALLBACK_DURATION_MS)
                          : STORY_IMAGE_DURATION_MS,
                        useNativeDriver: false,
                      }).start();
                    }
                  }}
                />
                <TouchableOpacity
                  onPress={replyToStory}
                  accessibilityRole="button"
                  accessibilityLabel="Reply to story"
                >
                  <Ionicons name="send" size={21} color="#fff" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={likeStory}
                style={styles.storyRoundButton}
                accessibilityRole="button"
                accessibilityLabel="Like story"
              >
                <Ionicons
                  name={visibleStory?.likes?.includes(currentUser?.uid) ? 'heart' : 'heart-outline'}
                  size={26}
                  color={visibleStory?.likes?.includes(currentUser?.uid) ? '#FF4F78' : '#fff'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => sharePost(visibleStory || {})}
                style={styles.storyRoundButton}
                accessibilityRole="button"
                accessibilityLabel="Share story"
              >
                <Ionicons name="arrow-redo-outline" size={25} color="#fff" />
              </TouchableOpacity>
            </SafeAreaView>
          </View>
        </Modal>

        <Modal
          visible={!!mediaTarget}
          animationType="fade"
          presentationStyle="fullScreen"
          onRequestClose={() => setMediaTarget(null)}
        >
          <View style={styles.mediaViewerBackdrop}>
            <FlatList
              data={mediaItems}
              keyExtractor={item => `viewer-${item.id}`}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              initialScrollIndex={Math.min(mediaViewerIndex, Math.max(0, mediaItems.length - 1))}
              getItemLayout={(_, index) => ({
                length: Dimensions.get('window').height,
                offset: Dimensions.get('window').height * index,
                index,
              })}
              onMomentumScrollEnd={event => {
                const height = Dimensions.get('window').height || 1;
                const nextIndex = Math.round(event.nativeEvent.contentOffset.y / height);
                setMediaViewerIndex(nextIndex);
              }}
              renderItem={({ item, index }) => (
                <View style={styles.fullMediaPage}>
                  {item.isVideo ? (
                    <Video
                      source={{ uri: item.media }}
                      style={styles.fullMedia}
                      resizeMode={ResizeMode.CONTAIN}
                      shouldPlay={index === mediaViewerIndex}
                      isLooping
                    />
                  ) : (
                    <Image source={{ uri: item.media }} style={styles.fullMedia} resizeMode="contain" />
                  )}
                  <View style={styles.fullMediaTop} pointerEvents="none">
                    <View style={styles.fullMediaBadge}>
                      <Ionicons name={item.isVideo ? 'videocam-outline' : 'image-outline'} size={15} color="#fff" />
                      <Text style={styles.fullMediaBadgeText}>
                        {item.isVideo ? (item.contentType === 'reel' ? 'CLIP' : 'VIDEO') : 'PHOTO'}
                      </Text>
                    </View>
                    <Text style={styles.fullMediaCounter}>
                      {index + 1} / {mediaItems.length}
                    </Text>
                  </View>
                  <View style={styles.fullMediaBottom} pointerEvents="none">
                    <Text style={styles.fullMediaUser} numberOfLines={1}>{item.userName || 'User'}</Text>
                    {!!item.text && (
                      <Text style={styles.fullMediaCaption} numberOfLines={3}>{item.text}</Text>
                    )}
                    <Text style={styles.fullMediaHint}>Swipe up or down • full-screen media</Text>
                  </View>
                </View>
              )}
            />
            <TouchableOpacity
              style={styles.mediaViewerClose}
              onPress={() => setMediaTarget(null)}
              accessibilityRole="button"
              accessibilityLabel="Close full screen media"
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </Modal>

        <Modal visible={!!infoModal} transparent animationType="fade" onRequestClose={() => setInfoModal(null)}>
          <View style={styles.infoBackdrop}>
            <View style={[styles.infoCard, { backgroundColor: theme.surfaceStrong, borderColor: theme.border }]}>
              <View style={styles.infoIcon}>
                <Ionicons name={infoModal?.title === 'Your Archive' ? 'time-outline' : 'heart-outline'} size={26} color={theme.blue} />
              </View>
              <Text style={[styles.infoTitle, { color: theme.text }]}>{infoModal?.title}</Text>
              <Text style={[styles.infoBody, { color: theme.sub }]}>{infoModal?.body}</Text>
              <TouchableOpacity
                style={[styles.infoButton, { backgroundColor: theme.blue }]}
                onPress={() => setInfoModal(null)}
              >
                <Text style={styles.infoButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </GlassScene>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingBottom: 120 },
  listEmptyContainer: { flexGrow: 1 },

  header: {
    minHeight: 86,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 8 : 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleBlock: { flex: 1 },
  headerTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderBottomWidth: 1,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, paddingVertical: 2 },

  storiesSection: { paddingVertical: 15, borderBottomWidth: 0 },
  storiesContent: { paddingHorizontal: 16 },
  storyItem: { width: 86, alignItems: 'center', marginRight: 4 },
  storyRingOuter: {
    width: STORY_SIZE,
    height: STORY_SIZE,
    borderRadius: STORY_SIZE / 2,
    borderWidth: 2.5,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyImage: { width: 61, height: 61, borderRadius: 31 },
  storyAdd: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: '#087EFF',
    borderWidth: 2,
    borderColor: '#07131E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyLabel: { fontSize: 12, fontWeight: '700', marginTop: 7, maxWidth: 76 },

  tabShell: {
    marginHorizontal: 12,
    marginBottom: 2,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tabRow: { height: 54, flexDirection: 'row', position: 'relative' },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { fontSize: 11, fontWeight: '800' },
  tabIndicator: {
    position: 'absolute',
    top: 0,
    left: 2,
    width: SCREEN_WIDTH * 0.225 - 4,
    height: 3,
    borderRadius: 2,
  },

  feedCard: {
    marginHorizontal: 12,
    marginTop: 14,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  reelCard: {
    backgroundColor: '#05080C',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  feedHeader: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedAvatar: { width: 44, height: 44, borderRadius: 22 },
  feedIdentity: { flex: 1, marginLeft: 11 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  feedUser: { fontSize: 16, fontWeight: '800', maxWidth: '80%' },
  youBadge: {
    backgroundColor: 'rgba(8,126,255,0.18)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  youBadgeText: { color: '#66B2FF', fontSize: 9, fontWeight: '900' },
  feedMeta: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  feedHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  connectButton: {
    height: 32,
    paddingHorizontal: 9,
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  connectButtonActive: { backgroundColor: 'rgba(8,126,255,0.10)' },
  connectButtonText: { fontSize: 10, fontWeight: '900' },
  moreButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  feedText: { paddingHorizontal: 15, paddingBottom: 13, fontSize: 15, lineHeight: 23, fontWeight: '500' },

  mediaWrap: {
    height: 370,
    backgroundColor: '#07131E',
    overflow: 'hidden',
    position: 'relative',
  },
  feedMedia: { width: '100%', height: '100%' },
  videoPressArea: { width: '100%', height: '100%', position: 'relative' },
  inlinePlayButton: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -28,
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doubleHeart: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -41,
    marginTop: -41,
  },
  mediaExpandHint: {
    position: 'absolute',
    left: 12,
    top: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaTypePill: {
    position: 'absolute',
    right: 12,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  mediaTypeText: { color: '#fff', fontSize: 9, fontWeight: '900' },

  engagementSummary: {
    paddingHorizontal: 15,
    paddingTop: 11,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  engagementLeft: { flexDirection: 'row', alignItems: 'center' },
  miniHeart: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF4F78',
    justifyContent: 'center',
    alignItems: 'center',
  },
  engagementText: { fontSize: 12, fontWeight: '600', marginLeft: 6 },
  engagementDot: { marginLeft: 8, marginRight: 3 },
  savedHint: { fontSize: 11, fontWeight: '800' },

  actionBar: {
    paddingHorizontal: 13,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    minWidth: 50,
    height: 44,
  },
  actionLabel: { color: '#AFC4D8', fontSize: 11, fontWeight: '800', marginLeft: 4 },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 180,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 19, fontWeight: '900', marginTop: 16 },
  emptyBody: { textAlign: 'center', fontSize: 13, lineHeight: 20, marginTop: 7, maxWidth: 310 },
  emptyCta: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 15,
  },
  emptyCtaText: { color: '#fff', fontSize: 13, fontWeight: '900' },

  loadingOverlay: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 15,
    borderWidth: 1,
  },
  loadingText: { fontSize: 12, fontWeight: '700' },

  errorBanner: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 108,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  errorText: { flex: 1, fontSize: 12, fontWeight: '700' },

  fabWrap: {
    position: 'absolute',
    right: 18,
    bottom: 104,
  },
  fab: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#087EFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#087EFF',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  creatorOverlay: { flex: 1 },
  creatorSafe: { flex: 1 },
  creatorHeader: {
    height: 70,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  creatorClose: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorTitleWrap: { flex: 1, alignItems: 'center' },
  creatorTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  creatorModeText: { color: '#77B9F8', fontSize: 11, fontWeight: '800', marginTop: 2 },
  publishButton: {
    height: 40,
    minWidth: 88,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#087EFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  publishButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },

  typeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  typeChipActive: { backgroundColor: '#087EFF', borderColor: '#087EFF' },
  typeChipText: { color: '#AFC4D8', fontSize: 12, fontWeight: '800' },
  typeChipTextActive: { color: '#fff' },

  creatorBody: { flex: 1, paddingHorizontal: 12 },
  creatorCanvas: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#0B1C2B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    position: 'relative',
  },
  creatorMedia: { width: '100%', height: '100%' },
  creatorPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  creatorPlaceholderIcon: {
    width: 70,
    height: 70,
    borderRadius: 23,
    backgroundColor: 'rgba(8,126,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },
  creatorPlaceholderTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  creatorPlaceholderBody: { color: '#93AABD', fontSize: 13, textAlign: 'center', lineHeight: 20, marginTop: 6 },
  creatorTextInput: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 18,
    bottom: 18,
    color: '#fff',
    fontSize: 23,
    lineHeight: 31,
    fontWeight: '800',
    textAlignVertical: 'top',
  },
  uploadProgressWrap: {
    position: 'absolute',
    left: 15,
    right: 15,
    bottom: 15,
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: 14,
    padding: 10,
  },
  uploadProgressTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  uploadProgressFill: { height: '100%', backgroundColor: '#2D98FF', borderRadius: 3 },
  uploadProgressText: { color: '#fff', fontSize: 10, fontWeight: '800', marginTop: 5 },

  creatorTools: {
    height: 86,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  creatorTool: { alignItems: 'center', gap: 4, minWidth: 64 },
  creatorToolText: { color: '#B8CBDC', fontSize: 10, fontWeight: '800' },
  captureButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff' },
  creatorHint: {
    textAlign: 'center',
    color: '#7E98AD',
    fontSize: 10,
    paddingBottom: 12,
    fontWeight: '600',
  },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.58)', justifyContent: 'flex-end' },
  commentSheet: {
    minHeight: 320,
    maxHeight: '72%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 22 : 14,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', alignSelf: 'center', marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 9 },
  sheetTitle: { fontSize: 20, fontWeight: '900' },
  sheetSubtitle: { fontSize: 11, marginTop: 2, fontWeight: '700' },
  centerLoader: { paddingVertical: 45, alignItems: 'center' },
  commentEmptyWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  commentEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  commentEmptyTitle: { marginTop: 8, fontSize: 15, fontWeight: '900' },
  commentEmptyText: { fontSize: 12, marginTop: 4 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
  commentAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  commentBubble: { flex: 1, marginLeft: 9 },
  commentUser: { fontSize: 12, fontWeight: '900' },
  commentBody: { marginTop: 3, fontSize: 13, lineHeight: 18 },
  commentComposer: {
    marginTop: 10,
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 5,
  },
  commentInput: { flex: 1, maxHeight: 90, fontSize: 13, paddingVertical: 9 },
  commentSend: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  storyViewer: { flex: 1, backgroundColor: '#000' },
  storyMedia: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  storyTextOnly: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, backgroundColor: '#07131E' },
  storyTextOnlyBody: { color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center', marginTop: 18, lineHeight: 38 },
  storyShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.16)' },
  storyChrome: { position: 'absolute', top: 0, left: 0, right: 0 },
  storyProgressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.28)', marginHorizontal: 10, marginTop: Platform.OS === 'ios' ? 10 : 18, borderRadius: 2, overflow: 'hidden' },
  storyProgressFill: { height: '100%', backgroundColor: '#fff' },
  storyTopRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingTop: 13 },
  storyUserWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  storyViewerAvatar: { width: 38, height: 38, borderRadius: 19, marginRight: 9 },
  storyViewerName: { color: '#fff', fontSize: 14, fontWeight: '900' },
  storyViewerTime: { color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 1 },
  storyTapLayer: { ...StyleSheet.absoluteFillObject },
  storyTapSide: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '32%' },
  storyCaption: { position: 'absolute', left: 18, right: 18, bottom: 142, alignItems: 'center' },
  storyCaptionText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowRadius: 6,
  },
  storyBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Platform.OS === 'ios' ? 18 : 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  storyReplyBox: {
    flex: 1,
    height: 47,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.38)',
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyReplyInput: { flex: 1, color: '#fff', fontSize: 13 },
  storyRoundButton: {
    width: 43,
    height: 43,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  mediaViewerBackdrop: { flex: 1, backgroundColor: '#000' },
  fullMediaPage: {
    width: '100%',
    height: Dimensions.get('window').height,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullMedia: { width: '100%', height: '100%' },
  fullMediaTop: {
    position: 'absolute',
    left: 16,
    right: 70,
    top: Platform.OS === 'ios' ? 54 : 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fullMediaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  fullMediaBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  fullMediaCounter: { color: 'rgba(255,255,255,0.82)', fontSize: 11, fontWeight: '800' },
  fullMediaBottom: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: Platform.OS === 'ios' ? 42 : 28,
  },
  fullMediaUser: { color: '#fff', fontSize: 16, fontWeight: '900' },
  fullMediaCaption: { color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 19, marginTop: 5 },
  fullMediaHint: { color: 'rgba(255,255,255,0.58)', fontSize: 10, fontWeight: '700', marginTop: 9 },
  mediaViewerClose: {
    position: 'absolute',
    right: 18,
    top: Platform.OS === 'ios' ? 54 : 30,
    zIndex: 2,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.58)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  infoCard: { width: '100%', maxWidth: 360, borderRadius: 26, borderWidth: 1, padding: 24, alignItems: 'center' },
  infoIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: 'rgba(8,126,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  infoTitle: { fontSize: 20, fontWeight: '900', marginTop: 13 },
  infoBody: { textAlign: 'center', fontSize: 13, lineHeight: 21, marginTop: 8 },
  infoButton: { width: '100%', height: 46, borderRadius: 15, marginTop: 18, alignItems: 'center', justifyContent: 'center' },
  infoButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },
});
