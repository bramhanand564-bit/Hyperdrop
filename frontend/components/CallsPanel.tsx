'use client';

import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, RotateCcw } from 'lucide-react';

type CallType = 'audio' | 'video';

export default function CallsPanel({ peerName = 'Nax User' }: { peerName?: string }) {
  const [type, setType] = useState<CallType | null>(null);
  const [status, setStatus] = useState('Ready');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const localRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const start = async (callType: CallType) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' });
      streamRef.current = stream;
      if (localRef.current) localRef.current.srcObject = stream;
      setType(callType); setStatus('Calling…');
    } catch { setStatus('Camera/microphone permission required'); }
  };
  const end = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; setType(null); setStatus('Ready'); };
  const toggleMic = () => { const track = streamRef.current?.getAudioTracks()[0]; if (!track) return; track.enabled = !track.enabled; setMuted(!track.enabled); };
  const toggleCamera = () => { const track = streamRef.current?.getVideoTracks()[0]; if (!track) return; track.enabled = !track.enabled; setCameraOff(!track.enabled); };
  const switchCamera = async () => { if (!streamRef.current || type !== 'video') return; const old = streamRef.current.getVideoTracks()[0]; const nextFacing = facing === 'user' ? 'environment' : 'user'; try { const next = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: nextFacing } }); const nextTrack = next.getVideoTracks()[0]; old?.stop(); streamRef.current.removeTrack(old); streamRef.current.addTrack(nextTrack); if (localRef.current) localRef.current.srcObject = streamRef.current; setFacing(nextFacing); } catch { setStatus('Camera switch unavailable'); } };

  useEffect(() => () => streamRef.current?.getTracks().forEach(t => t.stop()), []);

  if (!type) return <div className="glass rounded-3xl p-5"><h2 className="font-bold">Calls</h2><p className="mt-1 text-sm text-slate-500">Voice and video calling controls from Nax Chat.</p><div className="mt-5 grid grid-cols-2 gap-3"><button onClick={() => start('audio')} className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 py-3"><Phone className="h-5 w-5"/> Voice</button><button onClick={() => start('video')} className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 py-3 font-bold"><Video className="h-5 w-5"/> Video</button></div></div>;

  return <div className="glass overflow-hidden rounded-3xl p-4"><div className="relative aspect-video overflow-hidden rounded-2xl bg-black"><video ref={localRef} autoPlay muted playsInline className={`h-full w-full object-cover ${cameraOff ? 'opacity-0' : ''}`}/>{cameraOff && <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-slate-500"><VideoOff className="h-10 w-10"/></div>}<div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs">{peerName} · {status}</div></div><div className="mt-4 flex items-center justify-center gap-3"><button onClick={toggleMic} className="rounded-full bg-white/10 p-3">{muted?<MicOff/>:<Mic/>}</button>{type==='video'&&<><button onClick={toggleCamera} className="rounded-full bg-white/10 p-3">{cameraOff?<VideoOff/>:<Video/>}</button><button onClick={switchCamera} className="rounded-full bg-white/10 p-3"><RotateCcw/></button></>}<button onClick={end} className="rounded-full bg-red-500 p-3"><PhoneOff/></button></div></div>;
}
