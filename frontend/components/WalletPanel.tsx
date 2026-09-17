'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Wallet, Copy, Save } from 'lucide-react';

export default function WalletPanel(){
 const [username,setUsername]=useState(''); const [displayName,setDisplayName]=useState(''); const [saved,setSaved]=useState(false);
 useEffect(()=>{const u=auth.currentUser;if(!u)return;return onSnapshot(doc(db,'users',u.uid),s=>{const d=s.data()||{};setUsername(d.username||'');setDisplayName(d.displayName||u.displayName||'')})},[]);
 const save=async()=>{const u=auth.currentUser;if(!u)return;await setDoc(doc(db,'users',u.uid),{username:username.trim().toLowerCase(),usernameLower:username.trim().toLowerCase(),displayName:displayName.trim()},{merge:true});setSaved(true)};
 const copy=()=>navigator.clipboard?.writeText(auth.currentUser?.uid||'');
 return <div className="space-y-4"><div className="glass rounded-3xl p-5"><div className="flex items-center gap-3"><div className="rounded-2xl bg-cyan-500/15 p-3"><Wallet/></div><div><h2 className="font-bold">Wallet & Profile</h2><p className="text-sm text-slate-500">Manage your Nax identity.</p></div></div><div className="mt-5 space-y-3"><input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Display name" className="w-full rounded-2xl bg-white/10 px-4 py-3 outline-none"/><input value={username} onChange={e=>setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g,''))} placeholder="username" className="w-full rounded-2xl bg-white/10 px-4 py-3 outline-none"/><button onClick={save} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-500 py-3 font-bold"><Save className="h-4 w-4"/> Save Profile</button>{saved&&<p className="text-center text-sm text-emerald-400">Profile saved.</p>}</div></div><div className="glass rounded-3xl p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Account ID</p><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 truncate text-xs">{auth.currentUser?.uid||'Not signed in'}</code><button onClick={copy} className="rounded-xl bg-white/10 p-2"><Copy className="h-4 w-4"/></button></div><p className="mt-2 text-xs text-slate-500">Crypto/private-key wallet functionality is not fabricated here; this panel keeps the identity/profile layer safe.</p></div></div>;
}
