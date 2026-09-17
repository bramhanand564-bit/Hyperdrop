import React, { useCallback, useRef, useState } from 'react';
import { UploadCloud, File as FileIcon, X, CheckCircle, FileArchive, Film, Image as ImageIcon, Music2 } from 'lucide-react';

interface TransferZoneProps {
  status: string;
  progress: number;
  onSendFile: (file: File) => void;
  onCancel?: () => void;
}

export default function TransferZone({ status, progress, onSendFile }: TransferZoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const chooseFile = (file?: File) => { if (file) setSelectedFile(file); };
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); chooseFile(e.dataTransfer.files?.[0]); }, []);
  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
  };
  const fileIcon = (file: File) => file.type.startsWith('image/') ? <ImageIcon className="h-6 w-6 text-cyan-300" /> : file.type.startsWith('video/') ? <Film className="h-6 w-6 text-violet-300" /> : file.type.startsWith('audio/') ? <Music2 className="h-6 w-6 text-fuchsia-300" /> : file.type.includes('zip') || file.type.includes('compressed') ? <FileArchive className="h-6 w-6 text-amber-300" /> : <FileIcon className="h-6 w-6 text-indigo-300" />;

  if (status === 'transferring' || status === 'success') {
    return <div className="glass mx-auto w-full max-w-md rounded-3xl p-6"><div className="mb-6 flex items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06]">{status === 'success' ? <CheckCircle className="h-7 w-7 text-emerald-300" /> : selectedFile ? fileIcon(selectedFile) : <FileIcon className="h-6 w-6 text-indigo-300" />}</div><div className="min-w-0"><h4 className="truncate font-semibold text-white">{selectedFile?.name || 'Incoming file'}</h4><p className="text-sm text-slate-500">{selectedFile ? formatSize(selectedFile.size) : 'Receiving…'}</p></div></div><div className="space-y-3"><div className="flex justify-between text-sm"><span className="text-slate-400">{status === 'success' ? 'Completed' : 'Transferring'}</span><span className="font-semibold text-white">{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-cyan-400 to-sky-300 transition-[width] duration-300" style={{ width: `${progress}%` }} /></div></div></div>;
  }

  return <div className="mx-auto w-full max-w-xl"><button type="button" onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} onClick={() => inputRef.current?.click()} className={`group relative flex min-h-72 w-full flex-col items-center justify-center overflow-hidden rounded-[28px] border border-dashed p-8 text-center transition-all ${isDragging ? 'border-cyan-300/70 bg-cyan-400/10 shadow-[0_0_70px_rgba(34,211,238,.12)]' : 'border-white/15 bg-white/[0.025] hover:border-white/25 hover:bg-white/[0.05]'}`}><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,.12),transparent_55%)] opacity-70" /><div className={`relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.06] transition-transform duration-300 group-hover:scale-105 ${isDragging ? 'scale-110' : ''}`}><UploadCloud className="h-9 w-9 text-cyan-300" /></div><p className="relative text-base font-semibold text-white">Drop any file here</p><p className="relative mt-2 text-sm text-slate-500">or click to browse your device</p><div className="relative mt-6 flex flex-wrap justify-center gap-2 text-[11px] text-slate-500"><span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Images</span><span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Video</span><span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Documents</span><span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Archives</span></div><input ref={inputRef} type="file" className="hidden" onChange={(e) => chooseFile(e.target.files?.[0])} /></button>
      {selectedFile && <div className="glass mt-4 rounded-2xl p-4"><div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">{fileIcon(selectedFile)}</div><div className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-medium text-white">{selectedFile.name}</p><p className="text-xs text-slate-500">{formatSize(selectedFile.size)}</p></div><button type="button" onClick={() => setSelectedFile(null)} className="rounded-xl p-2 text-slate-500 hover:bg-white/[0.06] hover:text-white" aria-label="Remove selected file"><X className="h-4 w-4" /></button></div><button type="button" onClick={() => onSendFile(selectedFile)} className="mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 py-3.5 font-semibold text-white shadow-lg shadow-indigo-500/15 transition hover:brightness-110 active:scale-[.99]">Start secure transfer</button></div>}
    </div>;
}
