'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Bot, ExternalLink, Globe2, Layers3, Sparkles } from 'lucide-react';
import { db } from '../lib/firebase';

export default function ExploreHub() {
  const [bots, setBots] = useState<any[]>([]);
  const [portals, setPortals] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'bots'), limit(12)), s => setBots(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'portals'), limit(12)), s => setPortals(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'mini_apps'), limit(12)), s => setApps(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  return <section className="mx-auto max-w-5xl space-y-8"><div><div className="flex items-center gap-2"><Globe2 className="h-5 w-5 text-cyan-300"/><h1 className="text-3xl font-black">Explore</h1></div><p className="mt-1 text-sm text-slate-500">Portals, bots and mini apps from the Nax ecosystem.</p></div>
    <ExploreSection title="Bots" icon={<Bot/>} items={bots} empty="No public bots yet." render={(x:any)=><><b>{x.name || x.displayName || x.username || 'Nax Bot'}</b><p className="mt-1 line-clamp-2 text-xs text-slate-500">{x.description || x.bio || 'Interactive Nax bot'}</p></>} />
    <ExploreSection title="Portals" icon={<Globe2/>} items={portals} empty="No portals published yet." render={(x:any)=><><b>{x.title || x.name || 'Portal'}</b><p className="mt-1 line-clamp-2 text-xs text-slate-500">{x.description || x.url || 'Web portal'}</p></>} />
    <ExploreSection title="Mini Apps" icon={<Layers3/>} items={apps} empty="No mini apps published yet." render={(x:any)=><><b>{x.name || x.title || 'Mini App'}</b><p className="mt-1 line-clamp-2 text-xs text-slate-500">{x.description || 'Interactive mini app'}</p></>} />
    <div className="glass rounded-3xl p-5"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-cyan-300"/><b>Nax Studio</b></div><p className="mt-2 text-sm text-slate-500">Studio publishing can feed projects into Mini Apps and Portals without changing the HyperDrop shell.</p></div>
  </section>;
}

function ExploreSection({ title, icon, items, empty, render }: any) { return <section><div className="mb-3 flex items-center gap-2">{icon}<h2 className="text-lg font-bold">{title}</h2></div>{items.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((x:any)=><div key={x.id} className="glass rounded-2xl p-4"><div>{render(x)}</div>{x.url && <a href={x.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs text-cyan-300">Open <ExternalLink className="h-3 w-3"/></a>}</div>)}</div> : <div className="glass rounded-2xl p-6 text-sm text-slate-600">{empty}</div>}</section>; }
