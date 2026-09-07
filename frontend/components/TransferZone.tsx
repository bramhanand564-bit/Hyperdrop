import React, { useCallback, useState } from 'react';
import { UploadCloud, File as FileIcon, X, CheckCircle, Loader2 } from 'lucide-react';

interface TransferZoneProps {
  status: string;
  progress: number;
  onSendFile: (file: File) => void;
  onCancel?: () => void;
}

export default function TransferZone({ status, progress, onSendFile, onCancel }: TransferZoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleStartTransfer = () => {
    if (selectedFile) {
      onSendFile(selectedFile);
    }
  };

  // Format file size helper
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (status === 'transferring' || status === 'success') {
    return (
      <div className="w-full max-w-md mx-auto bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-xl animate-in fade-in zoom-in-95">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center">
            {status === 'success' ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : (
              <FileIcon className="w-6 h-6 text-indigo-400" />
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="text-white font-medium truncate">{selectedFile?.name || 'Incoming File...'}</h4>
            <p className="text-slate-400 text-sm">{selectedFile ? formatSize(selectedFile.size) : 'Calculating size...'}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">{status === 'success' ? 'Completed' : 'Transferring...'}</span>
            <span className="text-white font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${status === 'success' ? 'bg-green-500' : 'bg-gradient-to-r from-indigo-500 to-cyan-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4">
      {!selectedFile ? (
        <label 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
            isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 bg-slate-900/50 hover:bg-slate-800 hover:border-slate-600'
          }`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className={`w-12 h-12 mb-4 ${isDragging ? 'text-indigo-400' : 'text-slate-500'}`} />
            <p className="mb-2 text-sm text-slate-300"><span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-slate-500">Any file size (100GB+ Supported)</p>
          </div>
          <input type="file" className="hidden" onChange={handleFileSelect} />
        </label>
      ) : (
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl relative">
          <button 
            onClick={() => setSelectedFile(null)}
            className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
              <FileIcon className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="flex-1 overflow-hidden pr-6">
              <h4 className="text-white font-medium truncate">{selectedFile.name}</h4>
              <p className="text-slate-400 text-sm">{formatSize(selectedFile.size)}</p>
            </div>
          </div>
          <button 
            onClick={handleStartTransfer}
            className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white py-3 rounded-xl font-medium shadow-lg shadow-indigo-500/25 transition-all transform active:scale-95"
          >
            Start Transfer
          </button>
        </div>
      )}
    </div>
  );
}
