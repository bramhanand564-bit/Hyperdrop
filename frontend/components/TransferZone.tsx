import React, { useCallback, useRef, useState } from 'react';
import { UploadCloud, File as FileIcon, X, CheckCircle, FileArchive, Film, Image as ImageIcon, Music2, Plus, Layers3 } from 'lucide-react';
import { formatBytes, getFileCategory } from '../lib/fileUtils';

interface TransferZoneProps {
  status: string;
  progress: number;
  onSendFile: (file: File) => void;
  onCancel?: () => void;
}

export default function TransferZone({ status, progress, onSendFile, onCancel }: TransferZoneProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[] | undefined) => {
    if (!files) return;
    const incoming = Array.from(files);
    setSelectedFiles((current) => {
      const seen = new Set(current.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
      return [...current, ...incoming.filter((file) => !seen.has(`${file.name}:${file.size}:${file.lastModified}`))];
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const fileIcon = (file: File) => {
    switch (getFileCategory(file)) {
      case 'image': return <ImageIcon className="h-5 w-5 text-cyan-300" />;
      case 'video': return <Film className="h-5 w-5 text-violet-300" />;
      case 'audio': return <Music2 className="h-5 w-5 text-fuchsia-300" />;
      case 'archive': return <FileArchive className="h-5 w-5 text-amber-300" />;
      default: return <FileIcon className="h-5 w-5 text-indigo-300" />;
    }
  };

  if (status === 'transferring' || status === 'success') {
    return <div className="glass mx-auto w-full max-w-md rounded-3xl p-6"><div className="mb-6 flex items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06]">{status === 'success' ? <CheckCircle className="h-7 w-7 text-emerald-300" /> : selectedFiles[0] ? fileIcon(selectedFiles[0]) : <Layers3 className="h-6 w-6 text-cyan-300" />}</div><div className="min-w-0 flex-1"><h4 className="truncate font-semibold text-white">{selectedFiles.length > 1 ? `${selectedFiles.length} files queued` : selectedFiles[0]?.name || 'Incoming file'}</h4><p className="text-sm text-slate-500">{selectedFiles.length > 1 ? formatBytes(selectedFiles.reduce((sum, file) => sum + file.size, 0)) : selectedFiles[0] ? formatBytes(selectedFiles[0].size) : 'Receiving…'}</p></div></div><div className="space-y-3"><div className="flex justify-between text-sm"><span className="text-slate-400">{status === 'success' ? 'Completed' : 'Transferring'}</span><span className="font-semibold text-white">{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-cyan-400 to-sky-300 transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>{onCancel && status === 'transferring' && <button type="button" onClick={onCancel} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm text-slate-300 transition hover:bg-red-400/10 hover:text-red-200">Cancel transfer</button>}</div></div>;
  }

  return <div className="mx-auto w-full max-w-xl"><button type="button" onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} onClick={() => inputRef.current?.click()} className={`group relative flex min-h-72 w-full flex-col items-center justify-center overflow-hidden rounded-[28px] border border-dashed p-8 text-center transition-all ${isDragging ? 'border-cyan-300/70 bg-cyan-400/10 shadow-[0_0_70px_rgba(34,211,238,.12)]' : 'border-white/15 bg-white/[0.025] hover:border-white/25 hover:bg-white/[0.05]'}`}><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,.12),transparent_55%)] opacity-70" /><div className={`relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.06] transition-transform duration-300 group-hover:scale-105 ${isDragging ? 'scale-110' : ''}`}><UploadCloud className="h-9 w-9 text-cyan-300" /></div><p className="relative text-base font-semibold text-white">Drop files here</p><p className="relative mt-2 text-sm text-slate-500">Select one or multiple files</p><div className="relative mt-6 flex flex-wrap justify-center gap-2 text-[11px] text-slate-500"><span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Multi-file</span><span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">P2P</span><span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Any type</span></div><input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => { addFiles(e.target.files || undefined); e.currentTarget.value = ''; }} /></button>{selectedFiles.length > 0 && <div className="glass mt-4 rounded-2xl p-4"><div className="mb-3 flex items-center justify-between"><span className="text-sm font-semibold text-white">Queue · {selectedFiles.length}</span><button type="button" onClick={() => setSelectedFiles([])} className="text-xs text-slate-500 hover:text-white">Clear all</button></div><div className="max-h-48 space-y-2 overflow-auto">{selectedFiles.map((file, index) => <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-3 rounded-xl bg-black/20 p-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">{fileIcon(file)}</div><div className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-medium text-white">{file.name}</p><p className="text-xs text-slate-500">{formatBytes(file.size)}</p></div><button type="button" onClick={() => setSelectedFiles((files) => files.filter((_, i) => i !== index))} className="rounded-lg p-2 text-slate-600 hover:bg-white/[0.06] hover:text-white" aria-label={`Remove ${file.name}`}><X className="h-4 w-4" /></button></div>)}</div><button type="button" onClick={() => inputRef.current?.click()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.05]"><Plus className="h-4 w-4" /> Add more files</button><button type="button" onClick={() => onSendFile(selectedFiles[0])} className="mt-3 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 py-3.5 font-semibold text-white shadow-lg shadow-indigo-500/15 transition hover:brightness-110 active:scale-[.99]">Start transfer{selectedFiles.length > 1 ? ` · ${selectedFiles.length} selected` : ''}</button></div>}</div>;
}
