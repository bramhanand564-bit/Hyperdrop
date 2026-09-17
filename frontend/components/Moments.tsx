'use client';

import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Heart, ImagePlus, MessageCircle, Send, Sparkles, Trash2 } from 'lucide-react';
import { auth, db } from '../lib/firebase';

export default function Moments() {
  const [posts, setPosts] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [media, setMedia] = useState('');
  const [tab, setTab] = useState('For You');

  useEffect(() => onSnapshot(query(collection(db, 'global_moments'), orderBy('createdAt', 'desc')), s => setPosts(s.docs.map(d => ({ id: d.id, ...d.data() })))), []);

  const publish = async () => {
    if (!text.trim() && !media.trim()) return;
    const u = auth.currentUser;
    await addDoc(collection(db, 'global_moments'), { userId: u?.uid, userName: u?.displayName || u?.email?.split('@')[0] || 'User', userImg: u?.photoURL || '', text: text.trim(), media: media.trim(), likes: [], commentsCount: 0, createdAt: serverTimestamp() });
    setText(''); setMedia('');
  };

  const like = async (post: any) => {
    const uid = auth.currentUser?.uid; if (!uid) return;
    const likes = Array.isArray(post.likes) ? post.likes : [];
    await updateDoc(doc(db, 'global_moments', post.id), { likes: likes.includes(uid) ? likes.filter((x: string) => x !== uid) : [...likes, uid] });
  };

  return <section className="mx-auto max-w-3xl"><div className="mb-5 flex items-center justify-between"><div><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-cyan-300" /><h1 className="text-3xl font-black">Moments</h1></div><p className="mt-1 text-sm text-slate-500">Stories, posts and public updates.</p></div></div>
    <div className="glass mb-5 rounded-3xl p-4"><div className="mb-3 flex gap-2">{['For You','Following','Live','Reels'].map(x => <button key={x} onClick={() => setTab(x)} className={`rounded-full px-4 py-2 text-xs ${tab === x ? 'bg-cyan-400/15 text-cyan-300' : 'bg-white/5 text-slate-500'}`}>{x}</button>)}</div><textarea value={text} onChange={e => setText(e.target.value)} placeholder="Share a moment…" className="min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none"/><div className="mt-3 flex gap-2"><div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3"><ImagePlus className="h-4 w-4 text-slate-500"/><input value={media} onChange={e => setMedia(e.target.value)} placeholder="Image URL (optional)" className="w-full bg-transparent py-3 text-xs outline-none"/></div><button onClick={publish} className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 font-bold"><Send className="h-4 w-4"/></button></div></div>
    <div className="space-y-4">{posts.map(post => { const liked = post.likes?.includes(auth.currentUser?.uid); return <article key={post.id} className="glass overflow-hidden rounded-3xl p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-bold">{(post.userName || 'U')[0].toUpperCase()}</div><div className="flex-1"><b className="text-sm">{post.userName || 'User'}</b><p className="text-[11px] text-slate-600">Public moment</p></div>{post.userId === auth.currentUser?.uid && <button onClick={() => deleteDoc(doc(db,'global_moments',post.id))}><Trash2 className="h-4 w-4 text-slate-600 hover:text-red-300"/></button>}</div>{post.text && <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{post.text}</p>}{post.media && <img src={post.media} alt="Moment" className="mt-4 max-h-[520px] w-full rounded-2xl object-cover"/>}<div className="mt-4 flex items-center gap-5"><button onClick={() => like(post)} className={`flex items-center gap-2 text-xs ${liked ? 'text-pink-300' : 'text-slate-500'}`}><Heart className="h-5 w-5" fill={liked ? 'currentColor' : 'none'}/>{post.likes?.length || 0}</button><button className="flex items-center gap-2 text-xs text-slate-500"><MessageCircle className="h-5 w-5"/>{post.commentsCount || 0}</button></div></article>})}{posts.length === 0 && <div className="glass rounded-3xl py-16 text-center text-sm text-slate-600">No moments yet. Be the first to post.</div>}</div></section>;
}
