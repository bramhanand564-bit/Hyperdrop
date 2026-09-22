// ==========================================
// FILE: hooks/useMediaStream.js
// ==========================================
import { useState, useRef } from 'react';
import { mediaDevices } from 'react-native-webrtc';
import { Alert } from 'react-native';

export default function useMediaStream(type) {
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(type !== 'video');
  const [facing, setFacing] = useState('front');
  const localStreamRef = useRef(null);

  const createLocalStream = async () => {
    const constraints = {
      audio: true,
      video: type === 'video' ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } } : false,
    };
    try {
      const stream = await mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.log("Media Access Error:", err);
      Alert.alert("Permission Denied", "Camera ya Mic ki permission nahi mili.");
      throw err;
    }
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = !track.enabled; });
    setIsMuted(v => !v);
  };

  const toggleCamera = () => {
    if (type !== 'video' || !localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach(track => { track.enabled = !track.enabled; });
    setIsCameraOff(v => !v);
  };

  const switchCamera = () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack && typeof videoTrack._switchCamera === 'function') {
      videoTrack._switchCamera();
      setFacing(v => v === 'front' ? 'back' : 'front');
    }
  };

  const stopLocalStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch {}
      });
      localStreamRef.current = null;
      setLocalStream(null);
    }
  };

  return {
    localStream, localStreamRef, isMuted, isCameraOff, facing,
    createLocalStream, toggleMute, toggleCamera, switchCamera, stopLocalStream
  };
}
