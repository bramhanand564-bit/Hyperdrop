'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Globe2, ExternalLink, Bot, AppWindow } from 'lucide-react';

type Portal={id:string;name?:string;title?:string;description?:string;url?:string;type?:string};
export default function PortalsHub(){const [items,setItems]=useState<Portal[]>([]);useEffect(()=>{return onSnapshot(query(collection(db,'portals'),orderBy('createdAt','desc'),limit(30)),s=>setItems(s.docs.map(d=>({id:d.id,...(d.data() as Omit<Portal,'id'>)}))))},[]);return <div className="glass rounded-3xl p-5"><div className="flex items-center gap-3"><div className="rounded-2xl bg-cyan-500/15 p-3"><Globe2/></div><div><h2 className="font-bold">Portals</h2><p className="text-sm text-slate-500">Discover bots, apps and community destinations.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{items.map(x=><button key={x.id} onClick={()=>x.url&&window.open(x.url,'_blank','noopener,noreferrer')} className="rounded-2xl bg-white/5 p-4 text-left hover:bg-white/10"><div className="flex gap-3"><div className="rounded-xl bg-cyan-500/15 p-2">{x.type==='bot'?<Bot className="h-5 w-5"/>:<AppWindow className="h-5 w-5"/>}</div><div className="min-w-0 flex-1"><div className="font-semibold">{x.name||x.title||'Portal'}</div><p className="mt-1 text-xs text-slate-500">{x.description||'Community portal'}</p></div>{x.url&&<ExternalLink className="h-4 w-4 text-slate-500"/>}</div></button>)}{!items.length&&<div className="col-span-full py-10 text-center text-sm text-slate-500">No portals published yet.</div>}</div></div>}
