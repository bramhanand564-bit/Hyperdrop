'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Gamepad2, ExternalLink, Smartphone } from 'lucide-react';

type AppItem={id:string;name?:string;title?:string;description?:string;url?:string;category?:string;icon?:string};
export default function MiniAppsHub(){const [apps,setApps]=useState<AppItem[]>([]);useEffect(()=>{try{return onSnapshot(query(collection(db,'mini_apps'),orderBy('createdAt','desc'),limit(30)),s=>setApps(s.docs.map(d=>({id:d.id,...(d.data() as Omit<AppItem,'id'>)}))))}catch{return undefined}},[]);return <div className="glass rounded-3xl p-5"><div className="flex items-center gap-3"><div className="rounded-2xl bg-violet-500/15 p-3"><Gamepad2/></div><div><h2 className="font-bold">Mini Apps</h2><p className="text-sm text-slate-500">Nax ecosystem apps, games and tools.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{apps.map(a=><button key={a.id} onClick={()=>a.url&&window.open(a.url,'_blank','noopener,noreferrer')} className="rounded-2xl bg-white/5 p-4 text-left hover:bg-white/10"><div className="flex items-center gap-3"><div className="rounded-xl bg-violet-500/15 p-2"><Smartphone className="h-5 w-5"/></div><div className="min-w-0 flex-1"><div className="font-semibold">{a.name||a.title||'Mini App'}</div><p className="mt-1 text-xs text-slate-500">{a.description||a.category||'Nax Mini App'}</p></div>{a.url&&<ExternalLink className="h-4 w-4 text-slate-500"/>}</div></button>)}{!apps.length&&<div className="col-span-full py-10 text-center text-sm text-slate-500">No mini apps published yet.</div>}</div></div>}
