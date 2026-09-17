'use client';

import { useEffect, useState } from 'react';
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Bot, Plus, Send, Sparkles } from 'lucide-react';

type Rule = { trigger: string; reply: string };
type BotItem = { id: string; name: string; username: string; description?: string; welcomeMessage?: string; ownerId?: string; rules?: Rule[] };

export default function BotHub() {
  const [bots, setBots] = useState<BotItem[]>([]);
  const [selected, setSelected] = useState<BotItem | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ text: string; sender: 'bot' | 'user' }[]>([]);
  const [create, setCreate] = useState(false);
  const [name, setName] = useState(''); const [username, setUsername] = useState(''); const [description, setDescription] = useState('');

  useEffect(() => onSnapshot(query(collection(db, 'bots')), s => setBots(s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<BotItem,'id'>) })))), []);
  const openBot = (bot: BotItem) => { setSelected(bot); setMessages([{ text: bot.welcomeMessage || `Hi! I am ${bot.name} 🤖`, sender: 'bot' }]); };
  const send = () => { const text=input.trim(); if(!text || !selected) return; setInput(''); setMessages(m => [...m, {text, sender:'user'}]); const rule=selected.rules?.find(r=>text.toLowerCase().includes(r.trigger.toLowerCase())); setTimeout(()=>setMessages(m=>[...m,{text:rule?.reply || "I'm still learning! I didn't understand that command. 🤔",sender:'bot'}]),500); };
  const createBot = async () => { const uid=auth.currentUser?.uid; if(!uid || !name.trim() || !/^[a-z0-9_]{3,20}$/.test(username)) return; await addDoc(collection(db,'bots'),{name:name.trim(),username:username.toLowerCase(),description:description.trim(),welcomeMessage:`Hi! I am ${name.trim()} 🤖`,ownerId:uid,createdAt:serverTimestamp(),rules:[]}); setName('');setUsername('');setDescription('');setCreate(false); };

  if (selected) return <div className="glass rounded-3xl p-5"><button onClick={()=>setSelected(null)} className="mb-4 text-sm text-slate-500">← Back to Bots</button><div className="flex items-center gap-3"><div className="rounded-2xl bg-indigo-500/15 p-3"><Bot/></div><div><h2 className="font-bold">{selected.name}</h2><p className="text-xs text-slate-500">@{selected.username}</p></div></div><div className="mt-5 space-y-3">{messages.map((m,i)=><div key={i} className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${m.sender==='user'?'ml-auto bg-indigo-500 text-white':'bg-white/10'}`}>{m.text}</div>)}</div><div className="mt-5 flex gap-2"><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Message the bot..." className="min-w-0 flex-1 rounded-2xl bg-white/10 px-4 py-3 outline-none"/><button onClick={send} className="rounded-2xl bg-indigo-500 p-3"><Send/></button></div></div>;

  return <div className="glass rounded-3xl p-5"><div className="flex items-center justify-between"><div><h2 className="flex items-center gap-2 font-bold"><Sparkles className="h-5 w-5"/> Bots</h2><p className="text-sm text-slate-500">Chat with community bots or create your own.</p></div><button onClick={()=>setCreate(!create)} className="rounded-2xl bg-indigo-500 p-3"><Plus/></button></div>{create&&<div className="mt-4 rounded-2xl bg-white/5 p-4 space-y-2"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Bot name" className="w-full rounded-xl bg-white/10 px-3 py-2"/><input value={username} onChange={e=>setUsername(e.target.value.toLowerCase())} placeholder="username (3-20 chars)" className="w-full rounded-xl bg-white/10 px-3 py-2"/><input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Short description" className="w-full rounded-xl bg-white/10 px-3 py-2"/><button onClick={createBot} className="w-full rounded-xl bg-indigo-500 py-2 font-bold">Create Bot</button></div>}<div className="mt-5 grid gap-3 sm:grid-cols-2">{bots.map(b=><button key={b.id} onClick={()=>openBot(b)} className="rounded-2xl bg-white/5 p-4 text-left hover:bg-white/10"><div className="flex gap-3"><div className="rounded-xl bg-indigo-500/15 p-2"><Bot/></div><div><div className="font-semibold">{b.name}</div><div className="text-xs text-slate-500">@{b.username}</div><p className="mt-1 text-sm text-slate-400">{b.description||'Community bot'}</p></div></div></button>)}{!bots.length&&<div className="col-span-full rounded-2xl bg-white/5 p-6 text-center text-sm text-slate-500">No bots yet. Create the first one.</div>}</div></div>;
}
