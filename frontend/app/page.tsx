'use client';

import React, { useState } from 'react';
import { Send, Download, Smartphone, Clock3, FileUp, Settings, Trash2, Loader2, ShieldCheck, Zap, Wifi, Copy, Check, Sparkles, X, Gauge } from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';
import TransferZone from '../components/TransferZone';

const initialSavedDevices = [
  { id: '1', name: "Aarav's Phone", lastConnected: '2 hours ago', icon: 'smartphone' },
  { id: '2', name: 'MacBook Pro', lastConnected: 'Yesterday', icon: 'laptop' },
];

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
};

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s`;
};

export default function HyperDropHome() {
  const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'history'>('send');
  const [receiveCode, setReceiveCode] = useState('');
  const [savedDevices, setSavedDevices] = useState(initialSavedDevices);
  const [copied, setCopied] = useState(false);

  const { init, sendFile, acceptDownload, cancelTransfer, status, progress, roomCode, incomingFile, stats } = useWebRTC(
    process.env.NEXT_PUBLIC_SIGNALING_URL || 'ws://localhost:8080'
  );

  const handleSendStart = () => init();
  const handleReceiveStart = () => { if (receiveCode.length === 6) init(receiveCode); };
  const deleteDevice = (id: string) => setSavedDevices((devices) => devices.filter((device) => device.id !== id));

  const copyCode = async () => {
    if (!roomCode) return;
    try { await navigator.clipboard.writeText(roomCode); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch {}
  };

  return (
    <div className="min-h-screen overflow-hidden text-slate-100 font-sans selection:bg-indigo-500/30">
      <div className="pointer-events-none fixed inset-0 -z-10"><div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl" /><div className="absolute -right-24 top-48 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" /></div>
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/55 backdrop-blur-2xl">
        <div className="mx-auto flex h-[72px] max-w-5xl items-center justify-between px-5">
          <div className="flex items-center gap-3"><div className="glass glow-ring flex h-10 w-10 items-center justify-center rounded-2xl"><FileUp className="h-5 w-5 text-cyan-300" /></div><div><div className="text-lg font-bold tracking-tight">HyperDrop</div><div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-slate-500"><ShieldCheck className="h-3 w-3 text-emerald-400" /> private P2P</div></div></div>
          <button type="button" className="glass glass-hover rounded-xl p-2.5" aria-label="Settings"><Settings className="h-5 w-5 text-slate-400" /></button>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-5 py-8 md:py-12">
        <header className="mb-8 text-center"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-400 backdrop-blur-xl"><Sparkles className="h-3.5 w-3.5 text-cyan-300" /> Fast. Private. Direct.</div><h1 className="text-4xl font-black tracking-tight md:text-5xl">Drop files. <span className="bg-gradient-to-r from-indigo-300 via-cyan-300 to-sky-300 bg-clip-text text-transparent">Anywhere.</span></h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400 md:text-base">Direct device-to-device transfer with live speed, progress, cancellation and recovery controls.</p></header>

        <div className="glass mb-5 rounded-2xl p-1.5"><div className="grid grid-cols-3 gap-1"><TabButton active={activeTab === 'send'} onClick={() => setActiveTab('send')} icon={<Send className="h-4 w-4" />} label="Send" /><TabButton active={activeTab === 'receive'} onClick={() => setActiveTab('receive')} icon={<Download className="h-4 w-4" />} label="Receive" /><TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<Clock3 className="h-4 w-4" />} label="Devices" /></div></div>

        <div className="glass relative min-h-[470px] overflow-hidden rounded-[28px] p-6 md:p-10">
          <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
          {activeTab === 'send' && status === 'disconnected' && <EmptyState icon={<Send className="h-9 w-9 text-indigo-300" />} title="Ready to send" text="Create a private room, share the 6-digit code, then choose any file." action="Create transfer room" onAction={handleSendStart} />}
          {activeTab === 'send' && status === 'waiting_for_receiver' && <div className="mx-auto flex max-w-sm flex-col items-center justify-center py-10 text-center"><div className="glass glow-ring mb-7 flex h-24 w-24 items-center justify-center rounded-[28px]"><Wifi className="h-10 w-10 animate-pulse text-cyan-300" /></div><p className="mb-2 text-xs uppercase tracking-[0.25em] text-slate-500">Transfer code</p><button type="button" onClick={copyCode} className="group mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-5 py-3 font-mono text-5xl tracking-[0.18em] text-white transition hover:border-cyan-400/30">{roomCode || '------'}{copied ? <Check className="h-5 w-5 text-emerald-400" /> : <Copy className="h-5 w-5 text-slate-500 transition group-hover:text-cyan-300" />}</button><p className="flex items-center gap-2 text-sm text-slate-400"><span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" /> Waiting for receiver</p><div className="mt-8 flex flex-wrap justify-center gap-2 text-xs text-slate-500"><Badge icon={<ShieldCheck />} text="P2P" /><Badge icon={<Zap />} text="Direct" /><Badge icon={<Wifi />} text="Encrypted transport" /></div></div>}
          {activeTab === 'send' && (status === 'connected' || status === 'ready_to_transfer') && <TransferZone status={status} progress={progress} onSendFile={sendFile} />}
          {activeTab === 'receive' && status === 'disconnected' && <div className="mx-auto flex max-w-sm flex-col items-center justify-center py-10 text-center"><div className="glass mb-7 flex h-24 w-24 items-center justify-center rounded-[28px]"><Download className="h-10 w-10 text-cyan-300" /></div><h2 className="text-3xl font-bold">Receive files</h2><p className="mt-2 text-sm leading-6 text-slate-400">Enter the sender's 6-digit code to establish a direct connection.</p><div className="mt-7 w-full space-y-3"><input type="text" inputMode="numeric" maxLength={6} value={receiveCode} onChange={(e) => setReceiveCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" aria-label="Transfer code" className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-center text-4xl font-mono tracking-[0.22em] text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-400/10" /><button type="button" onClick={handleReceiveStart} disabled={receiveCode.length !== 6} className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 py-4 font-semibold text-white shadow-lg shadow-cyan-500/15 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30">Connect device</button></div></div>}
          {activeTab === 'history' && status === 'disconnected' && <div className="mx-auto max-w-lg py-2"><div className="mb-7 text-center"><h2 className="text-2xl font-bold">Saved devices</h2><p className="mt-1 text-sm text-slate-500">Your recent connections, one tap away.</p></div><div className="space-y-3">{savedDevices.map((device) => <div key={device.id} className="glass glass-hover group flex items-center justify-between rounded-2xl p-4"><div className="flex min-w-0 items-center gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10"><Smartphone className="h-6 w-6 text-indigo-300" /></div><div className="min-w-0 text-left"><h4 className="truncate font-medium text-white">{device.name}</h4><p className="text-xs text-slate-500">Last connected {device.lastConnected}</p></div></div><div className="flex items-center gap-2"><button type="button" className="rounded-xl bg-white/[0.06] px-4 py-2 text-sm font-medium text-indigo-300 transition hover:bg-indigo-500 hover:text-white">Connect</button><button type="button" onClick={() => deleteDevice(device.id)} className="rounded-xl p-2 text-slate-600 transition hover:bg-red-400/10 hover:text-red-300" aria-label={`Delete ${device.name}`}><Trash2 className="h-4 w-4" /></button></div></div>)}{savedDevices.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-slate-500">No saved devices yet.</div>}</div></div>}
          {status === 'incoming_file' && incomingFile && <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/85 p-6 text-center backdrop-blur-2xl"><div className="glass glow-ring mb-6 flex h-20 w-20 items-center justify-center rounded-2xl"><FileUp className="h-9 w-9 text-cyan-300" /></div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Incoming file</p><h3 className="mt-2 max-w-[280px] truncate text-2xl font-bold text-white">{incomingFile.name}</h3><p className="mt-2 font-mono text-sm text-slate-400">{formatBytes(incomingFile.size)}</p><button type="button" onClick={acceptDownload} className="mt-8 w-full max-w-xs rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 py-4 font-semibold shadow-lg shadow-cyan-500/20 transition hover:brightness-110">Accept &amp; save</button><button type="button" onClick={cancelTransfer} className="mt-3 rounded-xl px-4 py-2 text-sm text-slate-500 hover:bg-white/[0.05] hover:text-white"><X className="mr-1 inline h-4 w-4" /> Decline</button></div>}
          {(status === 'transferring' || status === 'waiting_for_receiver_accept' || status === 'success') && <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 p-6 backdrop-blur-2xl"><TransferZone status={status} progress={progress} onSendFile={sendFile} /><div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-400"><span className="glass rounded-full px-3 py-1.5"><Gauge className="mr-1 inline h-3.5 w-3.5 text-cyan-300" /> {formatBytes(stats.speed)}/s</span><span className="glass rounded-full px-3 py-1.5">{formatBytes(stats.transferred)} / {formatBytes(stats.total)}</span><span className="glass rounded-full px-3 py-1.5">ETA {formatDuration(stats.eta)}</span>{status !== 'success' && <button type="button" onClick={cancelTransfer} className="rounded-full border border-red-300/10 bg-red-400/10 px-3 py-1.5 text-red-200 hover:bg-red-400/20"><X className="mr-1 inline h-3.5 w-3.5" /> Cancel</button>}{status === 'waiting_for_receiver_accept' && <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-cyan-300" /> Waiting for receiver approval…</span>}{status === 'success' && <button type="button" onClick={() => window.location.reload()} className="text-cyan-300 underline-offset-4 hover:underline">Send another file</button>}</div></div>}
        </div>
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) { return <button type="button" onClick={onClick} className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${active ? 'bg-white/10 text-white shadow-inner' : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-200'}`}>{icon}{label}</button>; }
function EmptyState({ icon, title, text, action, onAction }: { icon: React.ReactNode; title: string; text: string; action: string; onAction: () => void }) { return <div className="flex flex-col items-center justify-center py-10 text-center"><div className="glass glow-ring mb-7 flex h-24 w-24 items-center justify-center rounded-[28px]">{icon}</div><h2 className="text-3xl font-bold">{title}</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{text}</p><button type="button" onClick={onAction} className="mt-7 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-7 py-4 font-semibold shadow-lg shadow-indigo-500/20 transition hover:brightness-110 active:scale-[.98]">{action}</button></div>; }
function Badge({ icon, text }: { icon: React.ReactNode; text: string }) { return <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">{React.cloneElement(icon as React.ReactElement, { className: 'h-3 w-3 text-cyan-300' })}{text}</span>; }
