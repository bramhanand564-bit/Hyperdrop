'use client';

import BotHub from '../../components/BotHub';
import NaxStudio from '../../components/NaxStudio';
import MiniAppsHub from '../../components/MiniAppsHub';
import PortalsHub from '../../components/PortalsHub';

export default function EcosystemPage(){return <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100"><div className="mx-auto max-w-6xl space-y-5"><header><p className="text-xs font-bold uppercase tracking-[.25em] text-cyan-400">Nax Ecosystem</p><h1 className="mt-2 text-4xl font-black">Bots · Studio · Portals · Mini Apps</h1><p className="mt-2 text-sm text-slate-500">Web modules ported from Nax Chat into HyperDrop.</p></header><BotHub/><NaxStudio/><PortalsHub/><MiniAppsHub/></div></main>}
